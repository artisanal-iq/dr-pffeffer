import { defaultPowerScoreConfig, type PowerScoreConfig } from "./config";

export type DailyPowerScoreInputs = {
  date: string;
  completedTasks: number;
  journalWordCount: number;
  powerPracticeRating: number | null;
  consistencyStreak: number;
};

export type DailyPowerScoreComponents = {
  tasks: number;
  journaling: number;
  powerPractice: number;
  consistency: number;
};

export type DailyPowerScoreResult = {
  date: string;
  score: number;
  components: DailyPowerScoreComponents;
  inputs: DailyPowerScoreInputs;
};

export type CompletionMetricRecord = {
  bucket_date: string;
  completed_count: number;
};

export type JournalRecord = {
  date: string;
  entry: string | null;
};

export type PowerPracticeRecord = {
  date: string;
  rating: number | null;
  reflection: string | null;
};

export type DailyScoreRange = {
  from: string;
  to: string;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function computeDailyPowerScore(
  inputs: DailyPowerScoreInputs,
  config: PowerScoreConfig = defaultPowerScoreConfig
): DailyPowerScoreResult {
  const { weights, maximums } = config;

  const tasksComponent = normalise(inputs.completedTasks, maximums.tasksCompleted) * weights.tasks;
  const journalingComponent = normalise(inputs.journalWordCount, maximums.journalWordCount) * weights.journaling;
  const rating = typeof inputs.powerPracticeRating === "number" ? Math.max(inputs.powerPracticeRating, 0) : 0;
  const powerPracticeComponent = normalise(rating, maximums.powerPracticeRating) * weights.powerPractice;
  const consistencyComponent = normalise(inputs.consistencyStreak, maximums.consistencyStreak) * weights.consistency;

  const components: DailyPowerScoreComponents = {
    tasks: round(tasksComponent, config.output.decimals),
    journaling: round(journalingComponent, config.output.decimals),
    powerPractice: round(powerPracticeComponent, config.output.decimals),
    consistency: round(consistencyComponent, config.output.decimals),
  };

  const rawTotal = components.tasks + components.journaling + components.powerPractice + components.consistency;
  const total = Math.min(rawTotal, 100);

  return {
    date: inputs.date,
    score: round(total, config.output.decimals),
    components,
    inputs,
  };
}

export function computeDailyPowerScores(
  inputs: DailyPowerScoreInputs[],
  config: PowerScoreConfig = defaultPowerScoreConfig
): DailyPowerScoreResult[] {
  return inputs.map((input) => computeDailyPowerScore(input, config));
}

export function buildDailyPowerScoreInputs(
  range: DailyScoreRange,
  completions: CompletionMetricRecord[],
  journals: JournalRecord[],
  practices: PowerPracticeRecord[]
): DailyPowerScoreInputs[] {
  if (!ISO_DATE_PATTERN.test(range.from) || !ISO_DATE_PATTERN.test(range.to)) {
    throw new Error("Range must use YYYY-MM-DD format");
  }

  const start = toUtcDate(range.from);
  const end = toUtcDate(range.to);
  if (start.getTime() > end.getTime()) {
    throw new Error("Range start must be on or before end");
  }

  const completionMap = new Map<string, number>();
  for (const metric of completions) {
    if (!ISO_DATE_PATTERN.test(metric.bucket_date)) continue;
    completionMap.set(metric.bucket_date, Math.max(0, metric.completed_count));
  }

  const journalMap = new Map<string, number>();
  for (const journal of journals) {
    if (!ISO_DATE_PATTERN.test(journal.date)) continue;
    journalMap.set(journal.date, countWords(journal.entry));
  }

  const practiceMap = new Map<string, number | null>();
  for (const practice of practices) {
    if (!ISO_DATE_PATTERN.test(practice.date)) continue;
    const rating = typeof practice.rating === "number" && Number.isFinite(practice.rating) ? practice.rating : null;
    practiceMap.set(practice.date, rating);
  }

  const inputs: DailyPowerScoreInputs[] = [];
  let streak = 0;

  for (const date of iterateDateRange(start, end)) {
    const key = toDateKey(date);
    const completed = completionMap.get(key) ?? 0;
    streak = completed > 0 ? streak + 1 : 0;

    inputs.push({
      date: key,
      completedTasks: completed,
      journalWordCount: journalMap.get(key) ?? 0,
      powerPracticeRating: practiceMap.get(key) ?? null,
      consistencyStreak: streak,
    });
  }

  return inputs;
}

function normalise(value: number, maximum: number): number {
  if (!Number.isFinite(value) || maximum <= 0) return 0;
  if (value <= 0) return 0;
  if (value >= maximum) return 1;
  return value / maximum;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function countWords(input: string | null | undefined): number {
  if (!input) return 0;
  const trimmed = input.trim();
  if (!trimmed) return 0;
  const matches = trimmed.match(/\S+/g);
  return matches ? matches.length : 0;
}

function toUtcDate(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function* iterateDateRange(start: Date, end: Date): Generator<Date> {
  const current = new Date(start);
  while (current.getTime() <= end.getTime()) {
    yield new Date(current);
    current.setUTCDate(current.getUTCDate() + 1);
  }
}
