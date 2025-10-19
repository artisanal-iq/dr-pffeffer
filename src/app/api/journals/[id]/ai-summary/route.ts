import { NextRequest, NextResponse } from "next/server";
import { generateRuleBasedSummary, SummaryGenerationError } from "@/lib/journal-summary";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });

  const { id } = await context.params;
  const { data: journal, error: jerr } = await supabase.from("journals").select("id, entry").eq("user_id", user.id).eq("id", id).single();
  if (jerr || !journal) return respond({ error: { code: "not_found", message: jerr?.message ?? "Not found" } }, { status: 404 });

  try {
    const { summary, metadata } = generateRuleBasedSummary(journal.entry);
    const { data, error } = await supabase
      .from("journals")
      .update({ ai_summary: summary, summary_metadata: metadata })
      .eq("user_id", user.id)
      .eq("id", id)
      .select()
      .single();
    if (error) return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
    return respond(data);
  } catch (error) {
    if (error instanceof SummaryGenerationError) {
      return respond({ error: { code: "unprocessable", message: error.message } }, { status: 422 });
    }
    return respond({ error: { code: "summary_failed", message: "Unable to generate summary" } }, { status: 500 });
  }
}
