import { cache } from "react";
import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase-server";

type SummaryRow = {
  total_completed: number | null;
  completed_last_7_days: number | null;
  completed_today: number | null;
  most_recent_completion_date: string | null;
};

type DailyRow = {
  bucket_date: string;
  completed_count: number | null;
  updated_at: string | null;
};

export type DashboardSummary = {
  totalCompleted: number;
  completedLast7Days: number;
  completedToday: number;
  mostRecentCompletionDate: string | null;
};

export type DailyMetric = {
  bucketDate: string;
  completedCount: number;
  updatedAt: string | null;
};

export type DashboardData = {
  summary: DashboardSummary;
  daily: DailyMetric[];
};

export type ResponsiveBreakpoint = {
  minWidth: number;
  columns: number;
};

export const METRIC_GRID_BREAKPOINTS: ResponsiveBreakpoint[] = [
  { minWidth: 0, columns: 1 },
  { minWidth: 768, columns: 2 },
  { minWidth: 1280, columns: 4 },
];

export const DEFAULT_DAILY_METRIC_LIMIT = 42;

export function getDashboardColumnCount(
  width: number,
  breakpoints: ResponsiveBreakpoint[] = METRIC_GRID_BREAKPOINTS
) {
  const sorted = [...breakpoints].sort((a, b) => a.minWidth - b.minWidth);
  let last = sorted[0];
  for (const breakpoint of sorted) {
    if (width >= breakpoint.minWidth) {
      last = breakpoint;
    }
  }
  return last.columns;
}

export function describeResponsiveColumns(
  breakpoints: ResponsiveBreakpoint[] = METRIC_GRID_BREAKPOINTS
) {
  const sorted = [...breakpoints].sort((a, b) => a.minWidth - b.minWidth);
  return sorted
    .map((breakpoint, index) => {
      const next = sorted[index + 1];
      const rangeLabel = next
        ? `to ${next.minWidth - 1}px`
        : "and wider";
      if (breakpoint.minWidth === 0) {
        return `${breakpoint.columns} column${
          breakpoint.columns === 1 ? "" : "s"
        } up to ${rangeLabel}`;
      }
      return `${breakpoint.columns} column${
        breakpoint.columns === 1 ? "" : "s"
      } from ${breakpoint.minWidth}px ${rangeLabel}`;
    })
    .join("; ");
}

export function limitDailyMetrics(
  metrics: DailyMetric[],
  limit = DEFAULT_DAILY_METRIC_LIMIT
) {
  const normalized = [...metrics].sort(
    (a, b) => new Date(b.bucketDate).getTime() - new Date(a.bucketDate).getTime()
  );
  return normalized.slice(0, Math.max(limit, 0));
}

function toSummary(row: SummaryRow | null | undefined): DashboardSummary {
  return {
    totalCompleted: row?.total_completed ?? 0,
    completedLast7Days: row?.completed_last_7_days ?? 0,
    completedToday: row?.completed_today ?? 0,
    mostRecentCompletionDate: row?.most_recent_completion_date ?? null,
  };
}

function toDailyMetrics(rows: DailyRow[] | null | undefined): DailyMetric[] {
  if (!rows) {
    return [];
  }
  return rows.map((row) => ({
    bucketDate: row.bucket_date,
    completedCount: row.completed_count ?? 0,
    updatedAt: row.updated_at,
  }));
}

export const loadDashboardData = cache(async function loadDashboardData(
  userId: string
): Promise<DashboardData> {
  noStore();
  const supabase = await createSupabaseServerClient();

  const [summaryResult, dailyResult] = await Promise.all([
    supabase
      .from("task_dashboard_metrics")
      .select(
        "total_completed, completed_last_7_days, completed_today, most_recent_completion_date"
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("task_completion_metrics")
      .select("bucket_date, completed_count, updated_at")
      .eq("user_id", userId)
      .order("bucket_date", { ascending: false })
      .limit(DEFAULT_DAILY_METRIC_LIMIT),
  ]);

  const summary = toSummary(summaryResult.data);
  const daily = limitDailyMetrics(toDailyMetrics(dailyResult.data));

  return { summary, daily };
});
