import { cache } from "react";
import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase-server";

type SummaryRow = {
  total_completed: number | null;
  completed_last_7_days: number | null;
  completed_today: number | null;
  most_recent_completion_date: string | null;
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

export const loadDashboardData = cache(async function loadDashboardData(
  userId: string
): Promise<DashboardData> {
  noStore();
  const supabase = await createSupabaseServerClient();

  const summaryResult = await supabase
    .from("task_dashboard_metrics")
    .select(
      "total_completed, completed_last_7_days, completed_today, most_recent_completion_date"
    )
    .eq("user_id", userId)
    .maybeSingle();

  const summary = toSummary(summaryResult.data);

  return { summary };
});
