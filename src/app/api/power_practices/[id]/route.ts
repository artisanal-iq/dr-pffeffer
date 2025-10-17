 import { NextRequest, NextResponse } from "next/server";
 import { z } from "zod";
 import { createSupabaseServerClient } from "@/lib/supabase-server";

const patchSchema = z.object({
  focus: z.string().max(2000).optional(),
  reflection: z.string().max(4000).optional().nullable(),
  rating: z.number().int().min(1).max(10).optional().nullable(),
});

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const { id } = await context.params;
  const { data, error } = await supabase.from("power_practices").select("*").eq("user_id", user.id).eq("id", id).single();
  if (error) return NextResponse.json({ error: { code: "not_found", message: error.message } }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_body", message: parsed.error.message } }, { status: 400 });
  const { id } = await context.params;
  const { data, error } = await supabase.from("power_practices").update(parsed.data).eq("user_id", user.id).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const { id } = await context.params;
  const { error } = await supabase.from("power_practices").delete().eq("user_id", user.id).eq("id", id);
  if (error) return NextResponse.json({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return NextResponse.json({ ok: true });
}
