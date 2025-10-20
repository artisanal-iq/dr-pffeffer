"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { qk } from "./keys";
import type { TaskCompletionMetric, TaskDashboardMetric } from "@/types/models";

type MetricsRange = { from?: string | null; to?: string | null } | undefined;

type MetricsDetailResponse = TaskDashboardMetric & {
  daily_breakdown?: TaskCompletionMetric[];
};

export type TaskMetricsSummary = {
  totalCompleted: number;
  completedLast7Days: number;
  completedToday: number;
  mostRecentCompletionDate: string | null;
};

export type TaskMetricsDetail = {
  summary: TaskMetricsSummary;
  daily: TaskCompletionMetric[];
};

function toSummary(response: TaskDashboardMetric): TaskMetricsSummary {
  return {
    totalCompleted: response.total_completed ?? 0,
    completedLast7Days: response.completed_last_7_days ?? 0,
    completedToday: response.completed_today ?? 0,
    mostRecentCompletionDate: response.most_recent_completion_date ?? null,
  };
}

export function useTaskMetrics(range?: MetricsRange) {
  const params = useMemo(() => {
    if (!range) return null;
    const from = range.from ?? null;
    const to = range.to ?? null;
    if (!from && !to) return null;
    return { from, to } as { from?: string | null; to?: string | null };
  }, [range?.from, range?.to]);

  return useQuery<TaskMetricsDetail, Error>({
    queryKey: qk.metrics.daily(params ?? null),
    queryFn: async () => {
      const search = new URLSearchParams();
      search.set("detail", "daily");
      if (params?.from) search.set("from", params.from);
      if (params?.to) search.set("to", params.to);
      const response = await apiFetch<MetricsDetailResponse>(`/api/metrics?${search.toString()}`);
      return {
        summary: toSummary(response),
        daily: response.daily_breakdown ?? [],
      } satisfies TaskMetricsDetail;
    },
  });
}
