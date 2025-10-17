 import { NextRequest, NextResponse } from "next/server";
 import { z } from "zod";
 import { createSupabaseServerClient } from "@/lib/supabase-server";

const createSchema = z.object({
  entry: z.string().min(1).max(8000),
  date: z.string().min(10).max(10),
});

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });

  const search = req.nextUrl.searchParams;
  const from = search.get("from");
  const to = search.get("to");
  const limit = Number(search.get("limit") ?? 50);
  const offset = Number(search.get("offset") ?? 0);

  let q = supabase.from("journals").select("*", { count: "exact" }).eq("user_id", user.id).order("date", { ascending: false }).range(offset, offset + limit - 1);
  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return NextResponse.json({ items: data, count });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_body", message: parsed.error.message } }, { status: 400 });

  const { entry, date } = parsed.data;
  const { data, error } = await supabase.from("journals").insert({ user_id: user.id, entry, date }).select().single();
  if (error) return NextResponse.json({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
