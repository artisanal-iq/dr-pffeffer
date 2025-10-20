import { describe, expect, it } from "vitest";

import { buildHeatmapMatrix, calculateWeeksForWidth, createHeatmapColorScale, HEATMAP_COLOR_STOPS } from "@/lib/heatmap";
import type { TaskCompletionMetric } from "@/types/models";

describe("heatmap utilities", () => {
  const baseRecords: TaskCompletionMetric[] = [
    {
      user_id: "user-1",
      bucket_date: "2024-01-10",
      completed_count: 2,
      updated_at: "2024-01-10T00:00:00Z",
    },
    {
      user_id: "user-1",
      bucket_date: "2024-01-14",
      completed_count: 4,
      updated_at: "2024-01-14T00:00:00Z",
    },
    {
      user_id: "user-1",
      bucket_date: "2024-01-22",
      completed_count: 1,
      updated_at: "2024-01-22T00:00:00Z",
    },
  ];

  it("builds a matrix with placeholder boundaries and max value", () => {
    const matrix = buildHeatmapMatrix(baseRecords, {
      weeks: 4,
      endDate: new Date("2024-01-24T00:00:00Z"),
    });

    expect(matrix.cells).toHaveLength(4 * 7);
    expect(matrix.maxValue).toBe(4);

    const jan14 = matrix.cells.find((cell) => cell.date === "2024-01-14");
    expect(jan14?.count).toBe(4);
    expect(jan14?.isPlaceholder).toBe(false);

    const earliest = matrix.cells.find((cell) => cell.date === "2024-01-01");
    expect(earliest?.isPlaceholder).toBe(true);

    const future = matrix.cells.find((cell) => cell.date === "2024-01-27");
    expect(future?.isFuture).toBe(true);
  });

  it("generates an accessible color scale", () => {
    const scale = createHeatmapColorScale(6);
    expect(scale(0)).toBe(HEATMAP_COLOR_STOPS[0]);
    expect(scale(1)).toBe(HEATMAP_COLOR_STOPS[1]);
    expect(scale(3)).toBe(HEATMAP_COLOR_STOPS[3]);
    expect(scale(6)).toBe(HEATMAP_COLOR_STOPS[HEATMAP_COLOR_STOPS.length - 1]);
  });

  it("adjusts the number of weeks displayed based on width", () => {
    expect(calculateWeeksForWidth(undefined)).toBe(8);
    expect(calculateWeeksForWidth(480)).toBe(8);
    expect(calculateWeeksForWidth(600)).toBe(12);
    expect(calculateWeeksForWidth(820)).toBe(16);
    expect(calculateWeeksForWidth(1100)).toBe(20);
    expect(calculateWeeksForWidth(1400)).toBe(24);
  });
});
