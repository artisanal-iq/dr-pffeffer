import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";

const tagSchema = z
  .string()
  .min(1)
  .max(32)
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, { message: "Tag cannot be blank" });

const createSchema = z.object({
  entry: z.string().min(1).max(8000),
  date: z.string().min(10).max(10),
  tags: z.array(tagSchema).max(12).default([]),
});

export async function GET(req: NextRequest) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });

  const search = req.nextUrl.searchParams;
  const from = search.get("from");
  const to = search.get("to");
  const limit = Number(search.get("limit") ?? 50);
  const offset = Number(search.get("offset") ?? 0);
  const tags = search
    .getAll("tags")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  let q = supabase.from("journals").select("*", { count: "exact" }).eq("user_id", user.id).order("date", { ascending: false }).range(offset, offset + limit - 1);
  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);
  if (tags.length) q = q.contains("tags", tags);

  const { data, error, count } = await q;
  if (error) return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return respond({ items: data, count });
}

export async function POST(req: NextRequest) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return respond({ error: { code: "invalid_body", message: parsed.error.message } }, { status: 400 });

  const { entry, date, tags } = parsed.data;
  const { data, error } = await supabase
    .from("journals")
    .insert({ user_id: user.id, entry, date, tags })
    .select()
    .single();
  if (error) return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return respond(data, { status: 201 });
}
