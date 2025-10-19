import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { taskCreateSchema, taskListQuerySchema } from "@/lib/validation/tasks";
import type { TaskListResponse } from "@/types/models";

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
  const parsed = taskListQuerySchema.safeParse({
    status: search.get("status"),
    priority: search.get("priority"),
    from: search.get("from") || undefined,
    to: search.get("to") || undefined,
    limit: search.get("limit") ?? undefined,
    offset: search.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return respond(
      { error: { code: "invalid_query", message: parsed.error.message } },
      { status: 400 }
    );
  }

  const filters = parsed.data;
  const { data, error } = await supabase.rpc("list_tasks", {
    p_status: filters.status ?? null,
    p_priority: filters.priority ?? null,
    p_from: filters.from ?? null,
    p_to: filters.to ?? null,
    p_limit: filters.limit,
    p_offset: filters.offset,
  });

  if (error) {
    return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  }

  const payload: TaskListResponse = data ?? { items: [], count: 0 };
  return respond(payload);
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
  const parsed = taskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return respond(
      { error: { code: "invalid_body", message: parsed.error.message } },
      { status: 400 }
    );
  }
  const payload = parsed.data;
  const { data, error } = await supabase.rpc("create_task", {
    p_title: payload.title,
    p_status: payload.status,
    p_priority: payload.priority,
    p_scheduled_time: payload.scheduledTime ?? null,
    p_context: payload.context ?? {},
  });

  if (error) {
    return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  }
  return respond(data, { status: 201 });
}
