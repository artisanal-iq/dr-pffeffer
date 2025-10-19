import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";

const reflectionMetricsSchema = z.object({
  user_id: z.string().uuid(),
  avg_confidence_all_time: z.number().nullable(),
  avg_confidence_last_7_days: z.number().nullable(),
  reflections_last_7_days: z.number().int().nonnegative(),
  current_reflection_streak: z.number().int().nonnegative(),
  best_reflection_streak: z.number().int().nonnegative(),
  latest_reflection_date: z.string().nullable(),
});

const numberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const integerOrZero = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.trunc(parsed);
};

export async function GET(req: NextRequest) {
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const respond = <T>(body: T, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return respond(
      { error: { code: "unauthorized", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("reflection_dashboard_metrics")
    .select(
      "user_id, avg_confidence_all_time, avg_confidence_last_7_days, reflections_last_7_days, current_reflection_streak, best_reflection_streak, latest_reflection_date"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[reflection-metrics] failed to load metrics", {
      userId: user.id,
      message: error.message,
    });
    return respond({ error: { code: "db_error", message: error.message } }, { status: 500 });
  }

  if (!data) {
    return respond({
      user_id: user.id,
      avg_confidence_all_time: null,
      avg_confidence_last_7_days: null,
      reflections_last_7_days: 0,
      current_reflection_streak: 0,
      best_reflection_streak: 0,
      latest_reflection_date: null,
    });
  }

  const parsed = reflectionMetricsSchema.safeParse({
    user_id: data.user_id,
    avg_confidence_all_time: numberOrNull(data.avg_confidence_all_time),
    avg_confidence_last_7_days: numberOrNull(data.avg_confidence_last_7_days),
    reflections_last_7_days: integerOrZero(data.reflections_last_7_days),
    current_reflection_streak: integerOrZero(data.current_reflection_streak),
    best_reflection_streak: integerOrZero(data.best_reflection_streak),
    latest_reflection_date: data.latest_reflection_date,
  });

  if (!parsed.success) {
    console.error("[reflection-metrics] validation failure", {
      userId: user.id,
      issues: parsed.error.flatten(),
    });
    return respond({ error: { code: "invalid_metrics", message: "Metrics validation failed" } }, { status: 500 });
  }

  const metrics = parsed.data;
  const anomalies: string[] = [];

  const checkAverage = (label: string, value: number | null) => {
    if (value === null) return;
    if (value < 1 || value > 5) {
      anomalies.push(`${label} out of range (${value})`);
    }
  };

  checkAverage("avg_confidence_all_time", metrics.avg_confidence_all_time);
  checkAverage("avg_confidence_last_7_days", metrics.avg_confidence_last_7_days);

  if (metrics.current_reflection_streak > metrics.best_reflection_streak) {
    anomalies.push(
      `current streak (${metrics.current_reflection_streak}) exceeds best streak (${metrics.best_reflection_streak})`
    );
  }

  if (anomalies.length > 0) {
    console.warn("[reflection-metrics] anomalies detected", {
      userId: user.id,
      anomalies,
      metrics,
    });
  }

  return respond(metrics);
}
