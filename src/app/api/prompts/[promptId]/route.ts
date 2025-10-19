import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { isAdminUser } from "@/lib/rbac";
import { promptIdParamSchema, promptUpdateSchema } from "@/lib/validation/prompts";

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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ promptId: string }> },
) {
  const params = await context.params;
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

  const parsedParams = promptIdParamSchema.safeParse(params);
  if (!parsedParams.success) {
    return respondError(applyCookies, "invalid_params", parsedParams.error.message, 400);
  }

  const { promptId } = parsedParams.data;
  const { data, error } = await supabase.rpc("get_prompt", { p_id: promptId });

  if (error) {
    return respondError(applyCookies, "db_error", error.message, 500);
  }

  if (!data) {
    return respondError(applyCookies, "not_found", "Prompt not found", 404);
  }

  return respond(applyCookies, data);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ promptId: string }> },
) {
  const params = await context.params;
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

  const parsedParams = promptIdParamSchema.safeParse(params);
  if (!parsedParams.success) {
    return respondError(applyCookies, "invalid_params", parsedParams.error.message, 400);
  }

  const body = await req.json().catch(() => null);
  const parsedBody = promptUpdateSchema.safeParse(body);
  if (!parsedBody.success) {
    return respondError(applyCookies, "invalid_body", parsedBody.error.message, 400);
  }

  const { promptId } = parsedParams.data;
  const payload = parsedBody.data;
  const { data, error } = await supabase.rpc("update_prompt", {
    p_id: promptId,
    p_slug: payload.slug ?? null,
    p_title: payload.title ?? null,
    p_body: payload.body ?? null,
    p_category: payload.category ?? null,
    p_is_active: payload.isActive ?? null,
    p_user_id: user.id,
    p_user_email: user.email ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return respondError(applyCookies, "conflict", error.message, 409);
    }
    return respondError(applyCookies, "db_error", error.message, 500);
  }

  if (!data) {
    return respondError(applyCookies, "not_found", "Prompt not found", 404);
  }

  return respond(applyCookies, data);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ promptId: string }> },
) {
  const params = await context.params;
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

  const parsedParams = promptIdParamSchema.safeParse(params);
  if (!parsedParams.success) {
    return respondError(applyCookies, "invalid_params", parsedParams.error.message, 400);
  }

  const { promptId } = parsedParams.data;
  const { data, error } = await supabase.rpc("update_prompt", {
    p_id: promptId,
    p_slug: null,
    p_title: null,
    p_body: null,
    p_category: null,
    p_is_active: false,
    p_user_id: user.id,
    p_user_email: user.email ?? null,
  });

  if (error) {
    return respondError(applyCookies, "db_error", error.message, 500);
  }

  if (!data) {
    return respondError(applyCookies, "not_found", "Prompt not found", 404);
  }

  return respond(applyCookies, data);
}
