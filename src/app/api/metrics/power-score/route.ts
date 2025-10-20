import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import {
  buildDailyPowerScoreInputs,
  computeDailyPowerScores,
  defaultPowerScoreConfig,
  type DailyPowerScoreResult,
} from "@/lib/scoring";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_RANGE_DAYS = 6;

export async function GET(req: NextRequest) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return respond({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  }

  const search = req.nextUrl.searchParams;
  const toParam = search.get("to");
  const fromParam = search.get("from");

  const toDate = normaliseDate(toParam) ?? todayKey();
  const fromDate = normaliseDate(fromParam) ?? offsetDateKey(toDate, -DEFAULT_RANGE_DAYS);

  if (compareDateKeys(fromDate, toDate) > 0) {
    return respond({ error: { code: "invalid_range", message: "from must be on or before to" } }, { status: 400 });
  }

  const [completionResult, journalResult, practiceResult] = await Promise.all([
    supabase
      .from("task_completion_metrics")
      .select("bucket_date, completed_count")
      .eq("user_id", user.id)
      .gte("bucket_date", fromDate)
      .lte("bucket_date", toDate),
    supabase
      .from("journals")
      .select("date, entry")
      .eq("user_id", user.id)
      .gte("date", fromDate)
      .lte("date", toDate),
    supabase
      .from("power_practices")
      .select("date, rating, reflection")
      .eq("user_id", user.id)
      .gte("date", fromDate)
      .lte("date", toDate),
  ]);

  if (completionResult.error) {
    return respond({ error: { code: "db_error", message: completionResult.error.message } }, { status: 500 });
  }
  if (journalResult.error) {
    return respond({ error: { code: "db_error", message: journalResult.error.message } }, { status: 500 });
  }
  if (practiceResult.error) {
    return respond({ error: { code: "db_error", message: practiceResult.error.message } }, { status: 500 });
  }

  const inputs = buildDailyPowerScoreInputs(
    { from: fromDate, to: toDate },
    completionResult.data ?? [],
    journalResult.data ?? [],
    practiceResult.data ?? []
  );

  const scores: DailyPowerScoreResult[] = computeDailyPowerScores(inputs, defaultPowerScoreConfig);

  return respond({
    range: { from: fromDate, to: toDate },
    config: defaultPowerScoreConfig,
    scores,
  });
}

function normaliseDate(input: string | null): string | null {
  if (!input) return null;
  if (!ISO_DATE_PATTERN.test(input)) {
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }
  return input;
}

function todayKey(): string {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function offsetDateKey(base: string, deltaDays: number): string {
  const date = new Date(`${base}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function compareDateKeys(a: string, b: string): number {
  return a.localeCompare(b);
}
