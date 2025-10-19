import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";

const patchSchema = z.object({
  name: z.string().max(200).optional(),
  org: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  last_contact: z.string().datetime().optional().nullable(),
  next_action: z.string().max(1000).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const { id } = await context.params;
  const { data, error } = await supabase.from("connections").select("*").eq("user_id", user.id).eq("id", id).single();
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
  const { data, error } = await supabase.from("connections").update(parsed.data).eq("user_id", user.id).eq("id", id).select().single();
  if (error) return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return respond(data);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const { id } = await context.params;
  const { error } = await supabase.from("connections").delete().eq("user_id", user.id).eq("id", id);
  if (error) return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return respond({ ok: true });
}
