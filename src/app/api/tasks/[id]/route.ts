import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { taskUpdateSchema } from "@/lib/validation/tasks";
import type { Task } from "@/types/models";

type RouteContext = { params: Promise<{ id: string }> };

function createResponder(applyCookies: (response: NextResponse) => NextResponse) {
  return <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
}

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = createResponder(applyCookies);

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
    .single<Task>();

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
  context: RouteContext
) {
  const params = await context.params;
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = createResponder(applyCookies);

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
  const parsed = taskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return respond(
      { error: { code: "invalid_body", message: parsed.error.message } },
      { status: 400 }
    );
  }

  const {
    title,
    status,
    priority,
    scheduledTime,
    durationMinutes,
    context: contextPatch,
  } = parsed.data;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (contextPatch !== undefined) updates.context = contextPatch;
  if (scheduledTime !== undefined) updates.scheduled_time = scheduledTime;
  if (durationMinutes !== undefined) updates.duration_minutes = durationMinutes;
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
    .single<Task>();

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

export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = createResponder(applyCookies);

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
    .delete()
    .eq("user_id", user.id)
    .eq("id", params.id)
    .select()
    .single<Task>();

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
