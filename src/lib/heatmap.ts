import type { TaskCompletionMetric } from "@/types/models";

export type HeatmapCell = {
  date: string;
  count: number;
  weekIndex: number;
  dayIndex: number;
  isFuture: boolean;
  isPlaceholder: boolean;
};

export type HeatmapMatrix = {
  weeks: HeatmapCell[][];
  cells: HeatmapCell[];
  maxValue: number;
};

export const HEATMAP_COLOR_STOPS = [
  "#f5f5f5",
  "#dbeafe",
  "#bfdbfe",
  "#93c5fd",
  "#60a5fa",
  "#2563eb",
];

const WEEK_LENGTH = 7;
const DEFAULT_WEEKS = 20;

function cloneUtc(date: Date): Date {
  return new Date(date.getTime());
}

function normaliseToUtcDay(date: Date): Date {
  const copy = cloneUtc(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function formatIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toUtcDate(input: string): Date {
  return new Date(`${input}T00:00:00Z`);
}

function computeEndBoundary(endDate: Date, weekStartsOn = 1): Date {
  const boundary = cloneUtc(endDate);
  const offset =
    (WEEK_LENGTH - ((boundary.getUTCDay() - weekStartsOn + WEEK_LENGTH) % WEEK_LENGTH) - 1 + WEEK_LENGTH) % WEEK_LENGTH;
  boundary.setUTCDate(boundary.getUTCDate() + offset);
  return boundary;
}

export function buildHeatmapMatrix(
  records: TaskCompletionMetric[],
  options?: { weeks?: number; endDate?: Date; weekStartsOn?: number }
): HeatmapMatrix {
  const { weeks = DEFAULT_WEEKS, endDate = new Date(), weekStartsOn = 1 } = options ?? {};
  const end = normaliseToUtcDay(endDate);
  const endBoundary = computeEndBoundary(end, weekStartsOn);
  const totalDays = weeks * WEEK_LENGTH;
  const start = cloneUtc(endBoundary);
  start.setUTCDate(start.getUTCDate() - (totalDays - 1));

  const dateToCount = new Map<string, number>();
  let maxValue = 0;
  let earliestTime: number | null = null;

  for (const record of records) {
    const iso = record.bucket_date.slice(0, 10);
    const safeCount = Math.max(0, record.completed_count);
    dateToCount.set(iso, safeCount);
    if (safeCount > maxValue) {
      maxValue = safeCount;
    }
    const recordTime = toUtcDate(iso).getTime();
    if (earliestTime === null || recordTime < earliestTime) {
      earliestTime = recordTime;
    }
  }

  const cells: HeatmapCell[] = [];
  const weeksResult: HeatmapCell[][] = [];
  const earliest = earliestTime ?? Number.POSITIVE_INFINITY;

  for (let index = 0; index < totalDays; index += 1) {
    const current = cloneUtc(start);
    current.setUTCDate(start.getUTCDate() + index);
    const iso = formatIsoDay(current);
    const count = dateToCount.get(iso) ?? 0;
    const isFuture = current.getTime() > end.getTime();
    const isBeforeData = current.getTime() < earliest;
    const cell: HeatmapCell = {
      date: iso,
      count,
      weekIndex: Math.floor(index / WEEK_LENGTH),
      dayIndex: index % WEEK_LENGTH,
      isFuture,
      isPlaceholder: isFuture || isBeforeData,
    };
    cells.push(cell);
    if (!weeksResult[cell.weekIndex]) {
      weeksResult[cell.weekIndex] = [];
    }
    weeksResult[cell.weekIndex].push(cell);
  }

  return {
    weeks: weeksResult,
    cells,
    maxValue,
  };
}

export function createHeatmapColorScale(maxValue: number) {
  const stops = HEATMAP_COLOR_STOPS;
  const activeStops = stops.slice(1);
  const bucketCount = activeStops.length;

  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return () => stops[0];
  }

  const step = maxValue / bucketCount;

  return (value: number) => {
    if (!Number.isFinite(value) || value <= 0) {
      return stops[0];
    }
    const normalized = Math.min(maxValue, Math.max(0, value));
    const index = Math.min(bucketCount - 1, Math.floor((normalized - Number.EPSILON) / step));
    return activeStops[index];
  };
}

export function calculateWeeksForWidth(width: number | null | undefined): number {
  if (!width || width <= 0) {
    return 8;
  }
  if (width >= 1280) return 24;
  if (width >= 1024) return 20;
  if (width >= 768) return 16;
  if (width >= 560) return 12;
  return 8;
}
