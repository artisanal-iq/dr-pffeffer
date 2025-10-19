type ReflectionInput = {
  date: string;
  reflection: string | null;
  rating: number | null;
};

function normaliseDateKey(input: string): string {
  if (!/\d{4}-\d{2}-\d{2}/.test(input)) {
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid reflection date: ${input}`);
    }
    return parsed.toISOString().slice(0, 10);
  }
  return input.slice(0, 10);
}

function toUtcDate(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

function startOfUtcDay(date: Date): Date {
  const clone = new Date(date);
  clone.setUTCHours(0, 0, 0, 0);
  return clone;
}

function isValidRating(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 5;
}

function hasReflection(entry: ReflectionInput): boolean {
  if (typeof entry.reflection === "string" && entry.reflection.trim().length > 0) {
    return true;
  }
  return isValidRating(entry.rating);
}

export type ReflectionMetricsSummary = {
  averageConfidenceAllTime: number | null;
  averageConfidenceLast7Days: number | null;
  reflectionsLast7Days: number;
  currentStreak: number;
  bestStreak: number;
  latestReflectionDate: string | null;
};

export function summarizeReflections(
  inputs: ReflectionInput[],
  now: Date = new Date()
): ReflectionMetricsSummary {
  const today = startOfUtcDay(now);
  const windowStart = new Date(today);
  windowStart.setUTCDate(windowStart.getUTCDate() - 6);

  const ratingValues: number[] = [];
  const ratingValuesLast7: number[] = [];
  const reflectionDays = new Set<string>();

  for (const input of inputs) {
    const key = normaliseDateKey(input.date);
    const asDate = toUtcDate(key);

    if (hasReflection(input)) {
      reflectionDays.add(key);
    }

    if (isValidRating(input.rating)) {
      ratingValues.push(input.rating);
      if (asDate >= windowStart) {
        ratingValuesLast7.push(input.rating);
      }
    }
  }

  let latestReflectionDate: string | null = null;
  let currentStreak = 0;
  let bestStreak = 0;

  if (reflectionDays.size > 0) {
    const ordered = Array.from(reflectionDays).sort();
    let streakCounter = 0;
    let previous: Date | null = null;

    for (let index = 0; index < ordered.length; index += 1) {
      const key = ordered[index];
      const asDate = toUtcDate(key);

      if (previous && asDate.getTime() - previous.getTime() === 86_400_000) {
        streakCounter += 1;
      } else {
        streakCounter = 1;
      }

      if (streakCounter > bestStreak) {
        bestStreak = streakCounter;
      }

      previous = asDate;

      if (index === ordered.length - 1) {
        currentStreak = streakCounter;
        latestReflectionDate = key;
      }
    }
  }

  const average = (values: number[]): number | null => {
    if (values.length === 0) {
      return null;
    }
    const total = values.reduce((acc, value) => acc + value, 0);
    return total / values.length;
  };

  const reflectionsLast7Days = Array.from(reflectionDays).reduce((count, key) => {
    const asDate = toUtcDate(key);
    return asDate >= windowStart ? count + 1 : count;
  }, 0);

  return {
    averageConfidenceAllTime: average(ratingValues),
    averageConfidenceLast7Days: average(ratingValuesLast7),
    reflectionsLast7Days,
    currentStreak,
    bestStreak,
    latestReflectionDate,
  };
}

export type { ReflectionInput };
