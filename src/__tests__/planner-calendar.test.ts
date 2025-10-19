import { describe, expect, it } from "vitest";
import { __testComputeEventPosition, type WeekCalendarDragState } from "@/lib/calendar";

const WIDTH = 700;
const columnWidth = WIDTH / 7;
const bounds = {
  width: WIDTH,
} as DOMRect;

const weekStart = new Date("2024-04-01T00:00:00Z");

describe("week calendar interactions", () => {
  it("moves events vertically by snapping to 15 minute increments", () => {
    const drag: WeekCalendarDragState = {
      id: "task-1",
      kind: "move",
      originX: 0,
      originY: 100,
      start: new Date("2024-04-01T09:00:00Z"),
      end: new Date("2024-04-01T10:00:00Z"),
    };

    const result = __testComputeEventPosition(
      { clientX: 0, clientY: 100 + 56 },
      drag,
      bounds,
      weekStart
    );

    expect(result.start.toISOString()).toBe("2024-04-01T10:00:00.000Z");
    expect(result.end.toISOString()).toBe("2024-04-01T11:00:00.000Z");
  });

  it("moves events horizontally to adjacent days", () => {
    const drag: WeekCalendarDragState = {
      id: "task-2",
      kind: "move",
      originX: 200,
      originY: 50,
      start: new Date("2024-04-02T14:00:00Z"),
      end: new Date("2024-04-02T15:30:00Z"),
    };

    const result = __testComputeEventPosition(
      { clientX: 200 + columnWidth, clientY: 50 },
      drag,
      bounds,
      weekStart
    );

    expect(result.start.toISOString()).toBe("2024-04-03T14:00:00.000Z");
    expect(result.end.toISOString()).toBe("2024-04-03T15:30:00.000Z");
  });

  it("resizes the start of an event with bounds enforcement", () => {
    const drag: WeekCalendarDragState = {
      id: "task-3",
      kind: "resize-start",
      originX: 0,
      originY: 0,
      start: new Date("2024-04-04T09:00:00Z"),
      end: new Date("2024-04-04T10:30:00Z"),
    };

    const result = __testComputeEventPosition(
      { clientX: 0, clientY: 28 },
      drag,
      bounds,
      weekStart
    );

    expect(result.start.toISOString()).toBe("2024-04-04T09:30:00.000Z");
    expect(result.end.toISOString()).toBe("2024-04-04T10:30:00.000Z");
  });

  it("resizes the end of an event but never below the minimum duration", () => {
    const drag: WeekCalendarDragState = {
      id: "task-4",
      kind: "resize-end",
      originX: 0,
      originY: 0,
      start: new Date("2024-04-05T12:00:00Z"),
      end: new Date("2024-04-05T13:00:00Z"),
    };

    const result = __testComputeEventPosition(
      { clientX: 0, clientY: -200 },
      drag,
      bounds,
      weekStart
    );

    expect(result.start.toISOString()).toBe("2024-04-05T12:00:00.000Z");
    expect(result.end.toISOString()).toBe("2024-04-05T12:15:00.000Z");
  });
});
