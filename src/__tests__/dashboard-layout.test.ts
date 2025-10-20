import { describe, expect, it } from "vitest";

import {
  DEFAULT_DAILY_METRIC_LIMIT,
  METRIC_GRID_BREAKPOINTS,
  describeResponsiveColumns,
  getDashboardColumnCount,
  limitDailyMetrics,
  type DailyMetric,
} from "@/lib/dashboard";

describe("dashboard performance budgets", () => {
  it("limits the number of daily metrics to the configured budget", () => {
    const metrics: DailyMetric[] = Array.from({ length: DEFAULT_DAILY_METRIC_LIMIT + 5 }).map((_, index) => ({
      bucketDate: new Date(2024, 0, index + 1).toISOString(),
      completedCount: index,
      updatedAt: null,
    }));

    const limited = limitDailyMetrics(metrics);
    expect(limited).toHaveLength(DEFAULT_DAILY_METRIC_LIMIT);
    expect(limited[0].bucketDate).toBe(metrics[metrics.length - 1].bucketDate);
  });
});

describe("dashboard responsive layout", () => {
  it("computes column counts for key breakpoints", () => {
    expect(getDashboardColumnCount(360)).toBe(1);
    expect(getDashboardColumnCount(900)).toBe(2);
    expect(getDashboardColumnCount(1440)).toBe(4);
  });

  it("describes the responsive layout for assistive tech", () => {
    const description = describeResponsiveColumns(METRIC_GRID_BREAKPOINTS);
    expect(description).toContain("1 column");
    expect(description).toContain("from 768px");
    expect(description).toContain("4 columns");
  });
});
