import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });

  const { id } = await context.params;
  const { data: journal, error: jerr } = await supabase.from("journals").select("id, entry").eq("user_id", user.id).eq("id", id).single();
  if (jerr || !journal) return respond({ error: { code: "not_found", message: jerr?.message ?? "Not found" } }, { status: 404 });

  const apiKey = process.env.OPENAI_API_KEY;
  let summary = "";
  if (!apiKey) {
    // Deterministic stub
    summary = journal.entry.slice(0, 120) + (journal.entry.length > 120 ? "..." : "");
  } else {
    // Minimal remote call using fetch (Vercel AI SDK optional)
    try {
      const prompt = `Summarize this reflection in 2 sentences highlighting confidence, influence, and emotional tone. Suggest one behavioral tweak.\n\nReflection:\n${journal.entry}`;
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] }),
      });
      const json = await resp.json();
      summary = json.choices?.[0]?.message?.content ?? "";
    } catch {
      summary = "";
    }
  }

  const { data, error } = await supabase.from("journals").update({ ai_summary: summary }).eq("user_id", user.id).eq("id", id).select().single();
  if (error) return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  return respond(data);
}
