import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return respond(
      { error: { code: "unauthorized", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const search = req.nextUrl.searchParams;
  const detail = search.get("detail");
  const from = search.get("from");
  const to = search.get("to");

  const { data, error } = await supabase
    .from("task_dashboard_metrics")
    .select(
      "user_id, total_completed, completed_last_7_days, completed_today, most_recent_completion_date, daily_check_ins_last_7_days, last_check_in_at, auto_plan_percentage_last_7_days"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  }

  const summary = {
    user_id: user.id,
    total_completed: data?.total_completed ?? 0,
    completed_last_7_days: data?.completed_last_7_days ?? 0,
    completed_today: data?.completed_today ?? 0,
    most_recent_completion_date: data?.most_recent_completion_date ?? null,
    daily_check_ins_last_7_days: data?.daily_check_ins_last_7_days ?? 0,
    last_check_in_at: data?.last_check_in_at ?? null,
    auto_plan_percentage_last_7_days: data?.auto_plan_percentage_last_7_days
      ? Number(data.auto_plan_percentage_last_7_days)
      : 0,
  };

  if (detail !== "daily") {
    return respond(summary);
  }

  let daily = [] as Array<{
    bucket_date: string;
    completed_count: number;
    updated_at: string;
  }>;

  let dailyQuery = supabase
    .from("task_completion_metrics")
    .select("bucket_date, completed_count, updated_at")
    .eq("user_id", user.id)
    .order("bucket_date", { ascending: false });

  if (from) {
    dailyQuery = dailyQuery.gte("bucket_date", from);
  }
  if (to) {
    dailyQuery = dailyQuery.lte("bucket_date", to);
  }

  const { data: rows, error: dailyError } = await dailyQuery;
  if (dailyError) {
    return respond({ error: { code: "db_error", message: dailyError.message } }, { status: 500 });
  }

  daily = rows ?? [];
  return respond({ ...summary, daily_breakdown: daily });
}
