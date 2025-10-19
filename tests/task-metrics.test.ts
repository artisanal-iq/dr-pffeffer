import { test } from "node:test";
import assert from "node:assert/strict";

import {
  applyCompletionDelta,
  createTaskCompletionBuckets,
  summarizeTaskCompletion,
  type TaskCompletionBuckets,
} from "../src/lib/task-metrics";

function applySequence(
  buckets: TaskCompletionBuckets,
  date: string,
  deltas: number[]
): TaskCompletionBuckets {
  return deltas.reduce((acc, delta) => applyCompletionDelta(acc, date, delta), buckets);
}

test("frequent status toggles never push counts negative", () => {
  const date = "2024-05-01";
  let buckets = createTaskCompletionBuckets();
  buckets = applySequence(buckets, date, Array.from({ length: 120 }, () => 1));
  buckets = applySequence(buckets, date, Array.from({ length: 70 }, () => -1));
  assert.equal(buckets.get(date), 50);

  // additional decrements beyond the current count should clamp at zero
  buckets = applySequence(buckets, date, Array.from({ length: 80 }, () => -1));
  assert.equal(buckets.has(date), false);
});

test("daily buckets fold into rolling summaries", () => {
  let buckets = createTaskCompletionBuckets([
    ["2024-05-01", 3],
    ["2024-05-03", 2],
    ["2024-05-06", 4],
  ]);

  // Add completions for today and the previous week
  buckets = applyCompletionDelta(buckets, "2024-05-08", 5);
  buckets = applyCompletionDelta(buckets, "2024-05-02", 1);

  const summary = summarizeTaskCompletion(buckets, new Date("2024-05-08T12:00:00Z"));
  assert.deepEqual(summary, {
    totalCompleted: 15,
    completedLast7Days: 12,
    completedToday: 5,
    mostRecentCompletionDate: "2024-05-08",
  });
});

test("metrics remain stable under alternating updates across days", () => {
  let buckets = createTaskCompletionBuckets();
  const days = ["2024-05-05", "2024-05-06", "2024-05-07", "2024-05-08"];

  for (let i = 0; i < 25; i++) {
    const day = days[i % days.length];
    buckets = applyCompletionDelta(buckets, day, 1);
    if (i % 3 === 0) {
      // simulate a quick undo on the previous day
      const previousDay = days[(i + days.length - 1) % days.length];
      buckets = applyCompletionDelta(buckets, previousDay, -1);
    }
  }

  for (const day of days) {
    const count = buckets.get(day) ?? 0;
    assert.ok(count >= 0, `bucket ${day} dropped below zero`);
  }

  const summary = summarizeTaskCompletion(buckets, new Date("2024-05-09T09:00:00Z"));
  assert.ok(summary.totalCompleted >= summary.completedLast7Days);
  assert.ok(summary.completedLast7Days >= summary.completedToday);
});
