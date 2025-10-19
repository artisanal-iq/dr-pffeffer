import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  org: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  last_contact: z.string().datetime().optional().nullable(),
  next_action: z.string().max(1000).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const search = req.nextUrl.searchParams;
  const qtext = search.get("q");
  let q = supabase.from("connections").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
  if (qtext) q = q.ilike("name", `%${qtext}%`);
  const { data, error } = await q;
  if (error) return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return respond({ items: data });
}

export async function POST(req: NextRequest) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return respond({ error: { code: "invalid_body", message: parsed.error.message } }, { status: 400 });
  const { last_contact, ...rest } = parsed.data;
  const insert = { ...rest, last_contact: last_contact ?? null };
  const { data, error } = await supabase.from("connections").insert({ user_id: user.id, ...insert }).select().single();
  if (error) return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return respond(data, { status: 201 });
}
