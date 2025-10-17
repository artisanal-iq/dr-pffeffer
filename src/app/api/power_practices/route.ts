 import { NextRequest, NextResponse } from "next/server";
 import { z } from "zod";
 import { createSupabaseServerClient } from "@/lib/supabase-server";

const createSchema = z.object({
  date: z.string().min(10).max(10),
  focus: z.string().min(1).max(2000),
  reflection: z.string().max(4000).optional().nullable(),
  rating: z.number().int().min(1).max(10).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });

  const search = req.nextUrl.searchParams;
  const date = search.get("date");
  let q = supabase.from("power_practices").select("*").eq("user_id", user.id).order("date", { ascending: false });
  if (date) q = q.eq("date", date);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return NextResponse.json({ items: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_body", message: parsed.error.message } }, { status: 400 });
  const { data, error } = await supabase.from("power_practices").insert({ user_id: user.id, ...parsed.data }).select().single();
  if (error) return NextResponse.json({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
