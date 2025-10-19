import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";

const patchSchema = z.object({
  focus: z.string().max(2000).optional(),
  reflection: z.string().max(4000).optional().nullable(),
  rating: z.number().int().min(1).max(10).optional().nullable(),
});

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const { id } = await context.params;
  const { data, error } = await supabase.from("power_practices").select("*").eq("user_id", user.id).eq("id", id).single();
  if (error) return respond({ error: { code: "not_found", message: error.message } }, { status: 404 });
  return respond(data);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return respond({ error: { code: "invalid_body", message: parsed.error.message } }, { status: 400 });
  const { id } = await context.params;
  const { data, error } = await supabase.from("power_practices").update(parsed.data).eq("user_id", user.id).eq("id", id).select().single();
  if (error) return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return respond(data);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const { id } = await context.params;
  const { error } = await supabase.from("power_practices").delete().eq("user_id", user.id).eq("id", id);
  if (error) return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return respond({ ok: true });
}
