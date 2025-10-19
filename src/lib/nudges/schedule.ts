import type { CalendarEvent } from "@/lib/calendar";
import { getWeekRange } from "@/lib/planner/utils";
import { timeStringSchema } from "@/lib/profile-schema";
import type { NudgeScheduleEntry } from "@/types/models";

const MINUTE = 60_000;
const DEFAULT_DURATION_MINUTES = 10;

export class NudgeScheduleError extends Error {}

function cloneSchedule(schedule: NudgeScheduleEntry[]) {
  return schedule.map((entry) => ({ ...entry }));
}

export function addNudgeScheduleTime(
  schedule: NudgeScheduleEntry[],
  time: string
): NudgeScheduleEntry[] {
  const parsed = timeStringSchema.safeParse(time);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new NudgeScheduleError(issue?.message ?? "Enter a valid time.");
  }
  const normalized = parsed.data;
  if (schedule.some((entry) => entry.time === normalized)) {
    throw new NudgeScheduleError("That time is already scheduled.");
  }
  const next = [...cloneSchedule(schedule), { time: normalized, enabled: true }];
  next.sort((a, b) => a.time.localeCompare(b.time));
  return next;
}

export function toggleNudgeScheduleTime(
  schedule: NudgeScheduleEntry[],
  time: string,
  nextValue?: boolean
): NudgeScheduleEntry[] {
  const index = schedule.findIndex((entry) => entry.time === time);
  if (index === -1) {
    throw new NudgeScheduleError("Scheduled time not found.");
  }
  const next = cloneSchedule(schedule);
  const current = next[index];
  next[index] = { ...current, enabled: nextValue ?? !current.enabled };
  return next;
}

export function removeNudgeScheduleTime(
  schedule: NudgeScheduleEntry[],
  time: string
): NudgeScheduleEntry[] {
  const next = schedule.filter((entry) => entry.time !== time);
  if (next.length === schedule.length) {
    return cloneSchedule(schedule);
  }
  return next;
}

export function buildNudgePlannerEvents(
  schedule: NudgeScheduleEntry[],
  anchorDate: Date,
  options?: { durationMinutes?: number; title?: string; idPrefix?: string }
): CalendarEvent[] {
  const enabled = schedule.filter((entry) => entry.enabled);
  if (enabled.length === 0) return [];
  const { start } = getWeekRange(anchorDate);
  const durationMinutes = Math.max(1, options?.durationMinutes ?? DEFAULT_DURATION_MINUTES);
  const title = options?.title ?? "Nudge";
  const idPrefix = options?.idPrefix ?? "nudge";
  const events: CalendarEvent[] = [];

  for (const entry of enabled) {
    const [hours, minutes] = entry.time.split(":").map((segment) => Number.parseInt(segment, 10));
    for (let offset = 0; offset < 7; offset += 1) {
      const eventStart = new Date(start);
      eventStart.setDate(start.getDate() + offset);
      eventStart.setHours(hours, minutes, 0, 0);
      const eventEnd = new Date(eventStart.getTime() + durationMinutes * MINUTE);
      events.push({
        id: `${idPrefix}-${entry.time}-${offset}`,
        title,
        start: eventStart,
        end: eventEnd,
        metadata: { kind: "nudge", time: entry.time },
      });
    }
  }

  return events;
}
