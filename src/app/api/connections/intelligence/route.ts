import { NextRequest, NextResponse } from "next/server";

import {
  buildInfluenceGraph,
  computeFollowUpRecommendations,
  summarizeRelationshipHealth,
} from "@/lib/connections/intelligence";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("connections")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  }

  const now = new Date();
  const graph = buildInfluenceGraph(data ?? [], now);
  const followUps = computeFollowUpRecommendations(data ?? [], now).slice(0, 12);
  const summary = summarizeRelationshipHealth(data ?? [], now);

  return respond({ graph, followUps, summary });
}
