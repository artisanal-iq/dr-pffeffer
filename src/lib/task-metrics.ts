import type { TaskCompletionMetric } from "@/types/models";

export type TaskCompletionBuckets = Map<string, number>;

function normaliseDateKey(input: string): string {
  if (!/\d{4}-\d{2}-\d{2}/.test(input)) {
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid bucket date: ${input}`);
    }
    return date.toISOString().slice(0, 10);
  }
  return input.slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function toUtcDate(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

export function createTaskCompletionBuckets(initial?: Iterable<[string, number]>): TaskCompletionBuckets {
  const map = new Map<string, number>();
  if (!initial) return map;
  for (const [key, value] of initial) {
    const normalised = normaliseDateKey(key);
    if (value <= 0) continue;
    map.set(normalised, value);
  }
  return map;
}

export function applyCompletionDelta(
  buckets: TaskCompletionBuckets,
  bucketDate: string,
  delta: number
): TaskCompletionBuckets {
  const next = new Map(buckets);
  const key = normaliseDateKey(bucketDate);
  const current = next.get(key) ?? 0;
  const updated = current + delta;

  if (updated <= 0) {
    next.delete(key);
    return next;
  }

  next.set(key, updated);
  return next;
}

export function bucketsFromMetrics(records: TaskCompletionMetric[]): TaskCompletionBuckets {
  const entries: [string, number][] = records.map((record) => [record.bucket_date, record.completed_count]);
  return createTaskCompletionBuckets(entries);
}

export type TaskMetricsSummary = {
  totalCompleted: number;
  completedLast7Days: number;
  completedToday: number;
  mostRecentCompletionDate: string | null;
};

export function summarizeTaskCompletion(
  buckets: TaskCompletionBuckets,
  now: Date = new Date()
): TaskMetricsSummary {
  const today = startOfUtcDay(now);
  const windowStart = new Date(today);
  windowStart.setUTCDate(windowStart.getUTCDate() - 6);
  const todayKey = today.toISOString().slice(0, 10);

  let totalCompleted = 0;
  let completedLast7Days = 0;
  let completedToday = 0;
  let mostRecent: { key: string; time: number } | null = null;

  for (const [key, count] of buckets) {
    if (count <= 0) continue;
    totalCompleted += count;
    const asDate = toUtcDate(key);
    if (asDate >= windowStart) {
      completedLast7Days += count;
    }
    if (key === todayKey) {
      completedToday = count;
    }
    if (!mostRecent || asDate.getTime() > mostRecent.time) {
      mostRecent = { key, time: asDate.getTime() };
    }
  }

  return {
    totalCompleted,
    completedLast7Days,
    completedToday,
    mostRecentCompletionDate: mostRecent?.key ?? null,
  };
}
