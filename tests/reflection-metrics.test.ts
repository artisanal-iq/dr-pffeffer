import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeReflections, type ReflectionInput } from "../src/lib/reflection-metrics";

const baseNow = new Date("2024-05-08T12:00:00Z");

test("summarizeReflections computes averages and streaks", () => {
  const inputs: ReflectionInput[] = [
    { date: "2024-05-01", reflection: "Good momentum", rating: 3 },
    { date: "2024-05-02", reflection: "Stayed focused", rating: 4 },
    { date: "2024-05-03", reflection: null, rating: 5 },
    { date: "2024-05-05", reflection: "", rating: null },
    { date: "2024-05-06", reflection: "Challenging day", rating: 2 },
  ];

  const summary = summarizeReflections(inputs, baseNow);

  assert.equal(summary.latestReflectionDate, "2024-05-06");
  assert.equal(summary.currentStreak, 1);
  assert.equal(summary.bestStreak, 3);
  assert.equal(summary.reflectionsLast7Days, 3);
  assert.equal(summary.averageConfidenceAllTime?.toFixed(2), "3.50");
  assert.equal(summary.averageConfidenceLast7Days?.toFixed(2), "3.67");
});

test("invalid ratings are ignored but reflections still count toward streaks", () => {
  const inputs: ReflectionInput[] = [
    { date: "2024-05-01", reflection: "Deep work", rating: 6 },
    { date: "2024-05-02", reflection: "Stayed the course", rating: null },
    { date: "2024-05-03", reflection: "", rating: 4 },
  ];

  const summary = summarizeReflections(inputs, baseNow);

  assert.equal(summary.averageConfidenceAllTime, 4);
  assert.equal(summary.averageConfidenceLast7Days, 4);
  assert.equal(summary.bestStreak, 3);
  assert.equal(summary.currentStreak, 3);
});

test("summaries remain stable when multiple entries share a date", () => {
  const inputs: ReflectionInput[] = [
    { date: "2024-05-06", reflection: "Morning", rating: 4 },
    { date: "2024-05-06T18:00:00Z", reflection: "Evening", rating: 5 },
    { date: "2024-05-07", reflection: null, rating: 3 },
    { date: "2024-05-08", reflection: "Wrap-up", rating: null },
  ];

  const summary = summarizeReflections(inputs, baseNow);

  assert.equal(summary.bestStreak, 3);
  assert.equal(summary.currentStreak, 3);
  assert.equal(summary.reflectionsLast7Days, 3);
  assert.equal(summary.averageConfidenceAllTime?.toFixed(2), "4.00");
});
