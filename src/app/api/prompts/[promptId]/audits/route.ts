import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { isAdminUser } from "@/lib/rbac";
import {
  promptAuditQuerySchema,
  promptIdParamSchema,
} from "@/lib/validation/prompts";
import type { PromptAuditListResponse } from "@/types/models";

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

export async function GET(req: NextRequest, { params }: { params: { promptId: string } }) {
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

  const search = req.nextUrl.searchParams;
  const parsedQuery = promptAuditQuerySchema.safeParse({ limit: search.get("limit") ?? undefined });
  if (!parsedQuery.success) {
    return respondError(applyCookies, "invalid_query", parsedQuery.error.message, 400);
  }

  const { promptId } = parsedParams.data;
  const limit = parsedQuery.data.limit ?? 20;

  const { data, error } = await supabase.rpc("list_prompt_audits", {
    p_prompt_id: promptId,
    p_limit: limit,
  });

  if (error) {
    return respondError(applyCookies, "db_error", error.message, 500);
  }

  const payload: PromptAuditListResponse = { items: data ?? [] };
  return respond(applyCookies, payload);
}
