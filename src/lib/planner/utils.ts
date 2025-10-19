import type { CalendarEvent } from "@/lib/calendar";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export function getWeekRange(anchor: Date) {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = (day + 6) % 7; // Monday as start of week
  start.setDate(start.getDate() - diff);
  const end = new Date(start.getTime() + 7 * DAY);
  return { start, end };
}

export function detectConflicts(
  events: CalendarEvent[],
  candidate: { id: string; start: Date; end: Date }
) {
  return events.filter(
    (event) =>
      event.id !== candidate.id &&
      event.start < candidate.end &&
      candidate.start < event.end
  );
}

export function minutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / MINUTE));
}

export function formatLocalRange(start: Date, end: Date, locale?: string, timeZone?: string) {
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function toIsoString(date: Date) {
  return new Date(date).toISOString();
}
