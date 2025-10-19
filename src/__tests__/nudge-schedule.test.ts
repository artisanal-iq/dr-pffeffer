import { describe, expect, it } from "vitest";

import {
  addNudgeScheduleTime,
  buildNudgePlannerEvents,
  toggleNudgeScheduleTime,
  NudgeScheduleError,
} from "@/lib/nudges/schedule";
import type { NudgeScheduleEntry } from "@/types/models";

describe("nudge schedule", () => {
  it("adds times uniquely and sorts them", () => {
    const base: NudgeScheduleEntry[] = [{ time: "09:00", enabled: true }];
    const next = addNudgeScheduleTime(base, "13:30");

    expect(next).toEqual([
      { time: "09:00", enabled: true },
      { time: "13:30", enabled: true },
    ]);
    expect(base).toEqual([{ time: "09:00", enabled: true }]);
    expect(() => addNudgeScheduleTime(next, "13:30")).toThrow(NudgeScheduleError);
  });

  it("toggles enabled state and supports overrides", () => {
    const base: NudgeScheduleEntry[] = [
      { time: "12:00", enabled: true },
      { time: "15:00", enabled: false },
    ];
    const toggled = toggleNudgeScheduleTime(base, "12:00");
    expect(toggled.find((entry) => entry.time === "12:00")?.enabled).toBe(false);
    const forced = toggleNudgeScheduleTime(toggled, "15:00", true);
    expect(forced.find((entry) => entry.time === "15:00")?.enabled).toBe(true);
  });

  it("builds planner events for the selected week", () => {
    const schedule: NudgeScheduleEntry[] = [
      { time: "12:00", enabled: true },
      { time: "14:15", enabled: false },
    ];
    const anchor = new Date("2024-01-03T10:00:00Z");
    const events = buildNudgePlannerEvents(schedule, anchor, {
      idPrefix: "nudge",
      title: "Midday nudge",
      durationMinutes: 5,
    });

    expect(events).toHaveLength(7);
    expect(events[0].id).toBe("nudge-12:00-0");
    expect(events[0].title).toBe("Midday nudge");
    expect(events[0].start.toISOString()).toBe("2024-01-01T12:00:00.000Z");
    expect(events[0].end.toISOString()).toBe("2024-01-01T12:05:00.000Z");
    expect(events[6].start.toISOString()).toBe("2024-01-07T12:00:00.000Z");
    expect(events[6].metadata).toMatchObject({ kind: "nudge", time: "12:00" });
  });

  it("returns empty events when nothing is enabled", () => {
    const schedule: NudgeScheduleEntry[] = [
      { time: "12:00", enabled: false },
      { time: "14:15", enabled: false },
    ];
    expect(buildNudgePlannerEvents(schedule, new Date())).toEqual([]);
  });
});
