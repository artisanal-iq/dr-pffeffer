import { NextRequest, NextResponse } from "next/server";
import { summarizeForDashboard } from "@/lib/journal-summary";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import type { Journal } from "@/types/models";

export async function GET(req: NextRequest) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? 30);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), 100) : 30;
  const { data, error } = await supabase
    .from("journals")
    .select("id, date, ai_summary, summary_metadata")
    .eq("user_id", user.id)
    .not("summary_metadata", "is", null)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });

  const items = (data ?? []) as (Pick<Journal, "id" | "date" | "ai_summary" | "summary_metadata">)[];
  const aggregates = summarizeForDashboard(
    items.flatMap((item) => (item.summary_metadata ? [item.summary_metadata] : []))
  );

  return respond({ items, aggregates });
}
