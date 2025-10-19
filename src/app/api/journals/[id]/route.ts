import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { decryptJournalRow, encryptString } from "@/lib/encryption";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";

const summaryMetadataSchema = z.object({
  tone: z.enum(["positive", "neutral", "negative"]),
  confidence: z.enum(["low", "medium", "high"]),
  influence: z.enum(["low", "medium", "high"]),
  key_themes: z.array(z.string()),
  behavior_cue: z.string(),
  word_count: z.number().int().nonnegative(),
  evidence: z.array(z.string()),
  generated_at: z.string(),
});

const patchSchema = z.object({
  entry: z.string().max(8000).optional(),
  ai_summary: z.string().optional().nullable(),
  summary_metadata: summaryMetadataSchema.optional().nullable(),
  date: z.string().min(10).max(10).optional(),
});

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const { id } = await context.params;
  const { data, error } = await supabase
    .from("journals")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  if (error) return respond({ error: { code: "not_found", message: error.message } }, { status: 404 });
  try {
    const decrypted = await decryptJournalRow(data);
    return respond(decrypted);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to decrypt journal entry";
    return respond({ error: { code: "encryption_error", message } }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return respond({ error: { code: "invalid_body", message: parsed.error.message } }, { status: 400 });
  const { id } = await context.params;
  try {
    const patch: Record<string, unknown> = {};
    if (parsed.data.entry !== undefined) {
      patch.entry = await encryptString(parsed.data.entry);
    }
    if (parsed.data.ai_summary !== undefined) {
      patch.ai_summary =
        parsed.data.ai_summary === null ? null : await encryptString(parsed.data.ai_summary);
    }
    if (parsed.data.date !== undefined) {
      patch.date = parsed.data.date;
    }
    const { data, error } = await supabase
      .from("journals")
      .update(patch)
      .eq("user_id", user.id)
      .eq("id", id)
      .select()
      .single();
    if (error) return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
    const decrypted = await decryptJournalRow(data);
    return respond(decrypted);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process encrypted journal entry";
    return respond({ error: { code: "encryption_error", message } }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const { id } = await context.params;
  const { error } = await supabase.from("journals").delete().eq("user_id", user.id).eq("id", id);
  if (error) return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return respond({ ok: true });
}
