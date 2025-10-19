import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { decryptJournalRow, encryptString } from "@/lib/encryption";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";

const createSchema = z.object({
  entry: z.string().min(1).max(8000),
  date: z.string().min(10).max(10),
});

export async function GET(req: NextRequest) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });

  const search = req.nextUrl.searchParams;
  const from = search.get("from");
  const to = search.get("to");
  const limit = Number(search.get("limit") ?? 50);
  const offset = Number(search.get("offset") ?? 0);

  let q = supabase
    .from("journals")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1);
  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);

  const { data, error, count } = await q;
  if (error) return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  try {
    const items = await Promise.all((data ?? []).map((row) => decryptJournalRow(row)));
    return respond({ items, count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to decrypt journal entries";
    return respond({ error: { code: "encryption_error", message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return respond({ error: { code: "invalid_body", message: parsed.error.message } }, { status: 400 });

  const { entry, date } = parsed.data;
  try {
    const encryptedEntry = await encryptString(entry);
    const { data, error } = await supabase
      .from("journals")
      .insert({ user_id: user.id, entry: encryptedEntry, date })
      .select()
      .single();
    if (error) return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
    const decrypted = await decryptJournalRow(data);
    return respond(decrypted, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to encrypt journal entry";
    return respond({ error: { code: "encryption_error", message } }, { status: 500 });
  }
}
