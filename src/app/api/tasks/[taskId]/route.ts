import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { taskUpdateSchema } from "@/lib/validation/tasks";

function respondWith<T>(applyCookies: (response: NextResponse) => NextResponse, body: T, init?: ResponseInit) {
  return applyCookies(NextResponse.json(body, init));
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ taskId: string }> },
) {
  const params = await context.params;
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => respondWith(applyCookies, body, init);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_task", { p_task_id: params.taskId });
  if (error) {
    const status = error.code === "P0002" ? 404 : 500;
    const code = status === 404 ? "not_found" : "db_error";
    return respond({ error: { code, message: error.message } }, { status });
  }
  return respond(data);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ taskId: string }> },
) {
  const params = await context.params;
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => respondWith(applyCookies, body, init);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = taskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return respond({ error: { code: "invalid_body", message: parsed.error.message } }, { status: 400 });
  }

  const patchInput = parsed.data;
  const patch: Record<string, unknown> = {};
  if (patchInput.title !== undefined) patch.title = patchInput.title;
  if (patchInput.status !== undefined) patch.status = patchInput.status;
  if (patchInput.priority !== undefined) patch.priority = patchInput.priority;
  if (patchInput.scheduledTime !== undefined) patch.scheduled_time = patchInput.scheduledTime;
  if (patchInput.durationMinutes !== undefined) patch.duration_minutes = patchInput.durationMinutes;
  if (patchInput.context !== undefined) patch.context = patchInput.context;

  const { data, error } = await supabase.rpc("update_task", {
    p_task_id: params.taskId,
    p_patch: patch,
  });

  if (error) {
    const status = error.code === "P0002" ? 404 : 500;
    const code = status === 404 ? "not_found" : "db_error";
    return respond({ error: { code, message: error.message } }, { status });
  }

  return respond(data);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ taskId: string }> },
) {
  const params = await context.params;
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => respondWith(applyCookies, body, init);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("delete_task", { p_task_id: params.taskId });
  if (error) {
    const status = error.code === "P0002" ? 404 : 500;
    const code = status === 404 ? "not_found" : "db_error";
    return respond({ error: { code, message: error.message } }, { status });
  }

  return respond(data);
}
