import process from "node:process";
import { describe, expect, it } from "vitest";
import { detectConflicts, formatLocalRange, getWeekRange, minutesBetween, toIsoString } from "@/lib/planner/utils";
import type { CalendarEvent } from "@/lib/calendar";

process.env.TZ = "America/Los_Angeles";

describe("planner utilities", () => {
  it("computes the same Monday-based range across DST transitions", () => {
    const { start, end } = getWeekRange(new Date("2024-03-10T10:00:00"));
    expect(start.toISOString()).toBe("2024-03-04T08:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("serializes updates to UTC regardless of local timezone", () => {
    const local = new Date("2024-11-03T09:30:00");
    expect(toIsoString(local)).toBe("2024-11-03T17:30:00.000Z");
  });

  it("detects conflicts when events overlap", () => {
    const events: CalendarEvent[] = [
      {
        id: "a",
        title: "Deep Work",
        start: new Date("2024-05-01T16:00:00.000Z"),
        end: new Date("2024-05-01T17:00:00.000Z"),
      },
      {
        id: "b",
        title: "One-on-one",
        start: new Date("2024-05-01T17:15:00.000Z"),
        end: new Date("2024-05-01T18:00:00.000Z"),
      },
    ];
    const conflicts = detectConflicts(events, {
      id: "candidate",
      start: new Date("2024-05-01T16:30:00.000Z"),
      end: new Date("2024-05-01T17:30:00.000Z"),
    });
    expect(conflicts.map((event) => event.id)).toEqual(["a", "b"]);
  });

  it("formats local ranges for display", () => {
    const start = new Date("2024-06-01T16:00:00Z");
    const end = new Date("2024-06-01T17:30:00Z");
    expect(formatLocalRange(start, end, "en-US", "America/Los_Angeles")).toBe("9:00 AM – 10:30 AM");
  });

  it("computes minute differences with rounding", () => {
    const start = new Date("2024-06-02T12:00:00Z");
    const end = new Date("2024-06-02T12:44:31Z");
    expect(minutesBetween(start, end)).toBe(45);
  });
});
