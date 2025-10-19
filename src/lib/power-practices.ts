import type { PowerPractice } from "@/types/models";

export type PracticeLike = Pick<PowerPractice, "date">;

export type PracticePrompt = {
  id: string;
  title: string;
  description: string;
};

export const PRACTICE_PROMPTS: PracticePrompt[] = [
  {
    id: "presence-reset",
    title: "Presence reset",
    description: "Anchor your attention on breath and posture before each key interaction.",
  },
  {
    id: "strategic-intent",
    title: "Strategic intent",
    description: "Identify one leverage action that makes downstream tasks easier or irrelevant.",
  },
  {
    id: "relationship-fuel",
    title: "Relationship fuel",
    description: "Choose one person to encourage with a specific, mission-linked note.",
  },
  {
    id: "energy-check",
    title: "Energy check",
    description: "Schedule two five-minute resets—movement, breath, or sunlight—to protect focus.",
  },
];

export function getPracticeDate(now: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export function determinePracticeAction(practices: PracticeLike[], date: string) {
  return practices.some((practice) => practice.date === date) ? "update" : "create";
}

export function findPracticeForDate<T extends PracticeLike>(practices: T[], date: string): T | null {
  return practices.find((practice) => practice.date === date) ?? null;
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map((segment) => Number.parseInt(segment, 10));
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(value: Date) {
  const year = value.getUTCFullYear();
  const month = `${value.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${value.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: string, delta: number) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + delta);
  return formatDate(date);
}

export function calculateStreaks(practices: PracticeLike[], today: string) {
  const uniqueDates = new Set(practices.map((practice) => practice.date));
  let current = 0;
  let pointer = today;
  while (uniqueDates.has(pointer)) {
    current += 1;
    pointer = addDays(pointer, -1);
  }

  let best = 0;
  const sorted = [...uniqueDates].sort();
  for (const date of sorted) {
    const previous = addDays(date, -1);
    if (uniqueDates.has(previous)) {
      continue;
    }
    let streak = 1;
    let cursor = addDays(date, 1);
    while (uniqueDates.has(cursor)) {
      streak += 1;
      cursor = addDays(cursor, 1);
    }
    if (streak > best) {
      best = streak;
    }
  }

  return { current, best };
}
