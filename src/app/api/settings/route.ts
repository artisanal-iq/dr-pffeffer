import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { profilePreferencesSchema, timeStringToMinutes } from "@/lib/profile-schema";
import { z } from "zod";

const upsertSchema = profilePreferencesSchema
  .extend({
    theme: profilePreferencesSchema.shape.theme,
    notifications: z.boolean().optional(),
    ai_persona: z.string().max(2000).optional().nullable(),
  })
  .refine(
    (value) => {
      if (!value.work_start && !value.work_end) return true;
      if (!value.work_start || !value.work_end) return false;
      return timeStringToMinutes(value.work_start) < timeStringToMinutes(value.work_end);
    },
    {
      message: "Provide a start and end time with the end after the start.",
      path: ["work_end"],
    },
  );

export async function GET(req: NextRequest) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const { data, error } = await supabase.from("settings").select("*").eq("user_id", user.id).limit(1).maybeSingle();
  if (error) return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return respond(data ?? null);
}

export async function POST(req: NextRequest) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return respond({ error: { code: "invalid_body", message: parsed.error.message } }, { status: 400 });

  // Upsert by user_id
  const { data, error } = await supabase
    .from("settings")
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  await logSettingsChange(supabase, { userId: user.id, metadata: { changes: parsed.data } });
  return respond(data, { status: 201 });
}
