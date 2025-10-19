import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  scheduledTime: z.string().datetime().nullable().optional(),
  durationMinutes: z.number().int().min(15).max(24 * 60).optional(),
  context: z.string().nullable().optional(),
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
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

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", params.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return respond(
        { error: { code: "not_found", message: "Task not found" } },
        { status: 404 }
      );
    }
    return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  }

  return respond(data);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
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
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return respond(
      { error: { code: "invalid_body", message: parsed.error.message } },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const updates: Record<string, unknown> = {};
  if (payload.title !== undefined) updates.title = payload.title;
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.priority !== undefined) updates.priority = payload.priority;
  if (payload.context !== undefined) updates.context = payload.context;
  if (payload.scheduledTime !== undefined) updates.scheduled_time = payload.scheduledTime;
  if (payload.durationMinutes !== undefined) updates.duration_minutes = payload.durationMinutes;
  if (Object.keys(updates).length === 0) {
    return respond(
      { error: { code: "empty_patch", message: "No valid fields provided" } },
      { status: 400 }
    );
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("user_id", user.id)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return respond(
        { error: { code: "not_found", message: "Task not found" } },
        { status: 404 }
      );
    }
    return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  }

  return respond(data);
}
