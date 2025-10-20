import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { isAdminUser } from "@/lib/rbac";
import { promptCreateSchema, promptListQuerySchema } from "@/lib/validation/prompts";
import type { PromptListResponse } from "@/types/models";

type ApplyCookies = (response: NextResponse) => NextResponse;

type ErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

function respond<T>(applyCookies: ApplyCookies, body: T, init?: ResponseInit) {
  return applyCookies(NextResponse.json(body, init));
}

function respondError(applyCookies: ApplyCookies, code: string, message: string, status: number) {
  return respond<ErrorBody>(applyCookies, { error: { code, message } }, { status });
}

export async function GET(req: NextRequest) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return respondError(applyCookies, "unauthorized", "Not authenticated", 401);
  }

  if (!isAdminUser(user)) {
    return respondError(applyCookies, "forbidden", "Admin access required", 403);
  }

  const search = req.nextUrl.searchParams;
  const parsed = promptListQuerySchema.safeParse({ includeArchived: search.get("includeArchived") ?? undefined });
  if (!parsed.success) {
    return respondError(applyCookies, "invalid_query", parsed.error.message, 400);
  }

  const includeArchived = parsed.data.includeArchived;
  const { data, error } = await supabase.rpc("list_prompts", { p_include_archived: includeArchived });

  if (error) {
    return respondError(applyCookies, "db_error", error.message, 500);
  }

  const payload: PromptListResponse = { items: data ?? [] };
  return respond(applyCookies, payload);
}

export async function POST(req: NextRequest) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return respondError(applyCookies, "unauthorized", "Not authenticated", 401);
  }

  if (!isAdminUser(user)) {
    return respondError(applyCookies, "forbidden", "Admin access required", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = promptCreateSchema.safeParse(body);
  if (!parsed.success) {
    return respondError(applyCookies, "invalid_body", parsed.error.message, 400);
  }

  const payload = parsed.data;
  const { data, error } = await supabase.rpc("create_prompt", {
    p_slug: payload.slug,
    p_title: payload.title,
    p_body: payload.body,
    p_category: payload.category,
    p_user_id: user.id,
    p_user_email: user.email ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return respondError(applyCookies, "conflict", error.message, 409);
    }
    return respondError(applyCookies, "db_error", error.message, 500);
  }

  return respond(applyCookies, data, { status: 201 });
}
