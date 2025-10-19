import { describe, expect, test } from "vitest";

import {
  PRACTICE_PROMPTS,
  calculateStreaks,
  determinePracticeAction,
  findPracticeForDate,
  getPracticeDate,
} from "@/lib/power-practices";

const samplePractices = PRACTICE_PROMPTS.map((prompt, index) => ({
  id: `id-${index}`,
  user_id: "user",
  date: `2024-03-0${index + 1}`,
  focus: prompt.title,
  reflection: null,
  rating: null,
  ai_feedback: null,
  created_at: "2024-03-01T00:00:00Z",
  updated_at: "2024-03-01T00:00:00Z",
}));

describe("getPracticeDate", () => {
  test("respects timezone boundaries when before local midnight", () => {
    const now = new Date("2024-03-10T07:30:00Z");
    expect(getPracticeDate(now, "America/Los_Angeles")).toBe("2024-03-09");
  });

  test("respects timezone boundaries when after local midnight", () => {
    const now = new Date("2024-03-10T07:30:00Z");
    expect(getPracticeDate(now, "Asia/Tokyo")).toBe("2024-03-10");
  });
});

describe("determinePracticeAction", () => {
  test("returns create when no entry exists for the date", () => {
    expect(determinePracticeAction([], "2024-03-01")).toBe("create");
  });

  test("returns update when entry exists for the date", () => {
    expect(determinePracticeAction(samplePractices, "2024-03-02")).toBe("update");
  });

  test("guards against duplicates when multiple entries share the same date", () => {
    const duplicates = [
      { date: "2024-03-05" },
      { date: "2024-03-05" },
      { date: "2024-03-06" },
    ];
    expect(determinePracticeAction(duplicates, "2024-03-05")).toBe("update");
  });
});

describe("findPracticeForDate", () => {
  test("returns matching entry", () => {
    const practice = findPracticeForDate(samplePractices, "2024-03-02");
    expect(practice?.focus).toBe(PRACTICE_PROMPTS[1].title);
  });

  test("returns null when missing", () => {
    expect(findPracticeForDate(samplePractices, "2024-03-30")).toBeNull();
  });
});

describe("calculateStreaks", () => {
  test("computes current and best streaks", () => {
    const today = "2024-03-04";
    const streaks = calculateStreaks(samplePractices, today);
    expect(streaks.current).toBe(4);
    expect(streaks.best).toBe(4);
  });

  test("ignores gaps when calculating best streak", () => {
    const practices = [
      { date: "2024-03-01" },
      { date: "2024-03-02" },
      { date: "2024-03-04" },
      { date: "2024-03-05" },
      { date: "2024-03-06" },
    ];
    const streaks = calculateStreaks(practices, "2024-03-06");
    expect(streaks.current).toBe(3);
    expect(streaks.best).toBe(3);
  });
});
