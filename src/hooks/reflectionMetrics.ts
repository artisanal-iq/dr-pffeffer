"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { qk } from "./keys";
import type { ReflectionDashboardMetric } from "@/types/models";

export type ReflectionMetrics = {
  avgConfidenceAllTime: number | null;
  avgConfidenceLast7Days: number | null;
  reflectionsLast7Days: number;
  currentReflectionStreak: number;
  bestReflectionStreak: number;
  latestReflectionDate: string | null;
};

function normalizeMetrics(metric: ReflectionDashboardMetric): ReflectionMetrics {
  return {
    avgConfidenceAllTime: metric.avg_confidence_all_time,
    avgConfidenceLast7Days: metric.avg_confidence_last_7_days,
    reflectionsLast7Days: metric.reflections_last_7_days ?? 0,
    currentReflectionStreak: metric.current_reflection_streak ?? 0,
    bestReflectionStreak: metric.best_reflection_streak ?? 0,
    latestReflectionDate: metric.latest_reflection_date ?? null,
  } satisfies ReflectionMetrics;
}

export function useReflectionMetrics() {
  return useQuery<ReflectionMetrics, Error>({
    queryKey: qk.metrics.reflections(),
    queryFn: async () => {
      const response = await apiFetch<ReflectionDashboardMetric>("/api/metrics/reflections");
      return normalizeMetrics(response);
    },
  });
}
