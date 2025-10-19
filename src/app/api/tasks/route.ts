import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  scheduledTime: z.string().datetime().optional().nullable(),
  durationMinutes: z.number().int().min(15).max(24 * 60).optional(),
  context: z.string().optional().nullable(),
});

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
  const status = search.get("status");
  const from = search.get("from");
  const to = search.get("to");
  const limit = Number(search.get("limit") ?? 50);
  const offset = Number(search.get("offset") ?? 0);

  let query = supabase.from("tasks").select("*", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (from) query = query.gte("scheduled_time", from);
  if (to) query = query.lte("scheduled_time", to);

  const { data, error, count } = await query;
  if (error) {
    return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  }
  return respond({ items: data, count });
}

export async function POST(req: NextRequest) {
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

  const body = await req.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return respond(
      { error: { code: "invalid_body", message: parsed.error.message } },
      { status: 400 }
    );
  }
  const payload = parsed.data;
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title: payload.title,
      status: payload.status,
      priority: payload.priority,
      scheduled_time: payload.scheduledTime ?? null,
      duration_minutes: payload.durationMinutes ?? 30,
      context: payload.context ?? null,
    })
    .select()
    .single();

  if (error) {
    return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  }
  return respond(data, { status: 201 });
}
