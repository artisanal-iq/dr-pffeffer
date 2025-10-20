import { describe, expect, it } from "vitest";

import {
  buildDailyPowerScoreInputs,
  computeDailyPowerScore,
  defaultPowerScoreConfig,
  type DailyPowerScoreInputs,
} from "@/lib/scoring";

describe("computeDailyPowerScore", () => {
  it("computes weighted score for typical data", () => {
    const input: DailyPowerScoreInputs = {
      date: "2024-01-01",
      completedTasks: 4,
      journalWordCount: 100,
      powerPracticeRating: 4,
      consistencyStreak: 3,
    };

    const result = computeDailyPowerScore(input, defaultPowerScoreConfig);
    expect(result.score).toBe(52.6);
    expect(result.components).toEqual({
      tasks: 22.5,
      journaling: 8,
      powerPractice: 20,
      consistency: 2.1,
    });
  });

  it("returns zero score when all inputs are missing", () => {
    const input: DailyPowerScoreInputs = {
      date: "2024-01-01",
      completedTasks: 0,
      journalWordCount: 0,
      powerPracticeRating: null,
      consistencyStreak: 0,
    };

    const result = computeDailyPowerScore(input, defaultPowerScoreConfig);
    expect(result.score).toBe(0);
    expect(result.components).toEqual({
      tasks: 0,
      journaling: 0,
      powerPractice: 0,
      consistency: 0,
    });
  });

  it("caps contributions for extreme inputs", () => {
    const input: DailyPowerScoreInputs = {
      date: "2024-01-01",
      completedTasks: 20,
      journalWordCount: 1000,
      powerPracticeRating: 10,
      consistencyStreak: 30,
    };

    const result = computeDailyPowerScore(input, defaultPowerScoreConfig);
    expect(result.score).toBe(100);
    expect(result.components).toEqual({
      tasks: 45,
      journaling: 20,
      powerPractice: 25,
      consistency: 10,
    });
  });
});

describe("buildDailyPowerScoreInputs", () => {
  it("builds inputs with word counts and streaks", () => {
    const inputs = buildDailyPowerScoreInputs(
      { from: "2024-01-01", to: "2024-01-03" },
      [
        { bucket_date: "2024-01-01", completed_count: 3 },
        { bucket_date: "2024-01-02", completed_count: 0 },
        { bucket_date: "2024-01-03", completed_count: 2 },
      ],
      [
        { date: "2024-01-01", entry: "Today I completed three major tasks." },
        { date: "2024-01-03", entry: "Focused deep work session with notes." },
      ],
      [
        { date: "2024-01-01", rating: 4, reflection: null },
        { date: "2024-01-03", rating: 2.5, reflection: "Felt distracted" },
      ]
    );

    expect(inputs).toEqual([
      {
        date: "2024-01-01",
        completedTasks: 3,
        journalWordCount: 6,
        powerPracticeRating: 4,
        consistencyStreak: 1,
      },
      {
        date: "2024-01-02",
        completedTasks: 0,
        journalWordCount: 0,
        powerPracticeRating: null,
        consistencyStreak: 0,
      },
      {
        date: "2024-01-03",
        completedTasks: 2,
        journalWordCount: 6,
        powerPracticeRating: 2.5,
        consistencyStreak: 1,
      },
    ]);
  });

  it("throws when range is invalid", () => {
    expect(() =>
      buildDailyPowerScoreInputs(
        { from: "2024-01-04", to: "2024-01-03" },
        [],
        [],
        []
      )
    ).toThrowError("Range start must be on or before end");
  });
});
