"use client";

import { useMemo } from "react";

import { CardDescription, CardTitle } from "@/components/ui/card";
import { usePowerScore } from "@/hooks/powerScore";

const COMPONENT_LABELS: Record<string, string> = {
  tasks: "Tasks",
  journaling: "Journaling",
  powerPractice: "Power practice",
  consistency: "Consistency",
};

const rangeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

function formatScore(value: number, decimals: number) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function buildSparklinePoints(values: number[], width: number, height: number) {
  if (values.length === 0) return "";
  if (values.length === 1) {
    const y = height - (values[0] / 100) * height;
    return `0,${y} ${width},${y}`;
  }
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function PowerScoreCard() {
  const { data, isLoading, error } = usePowerScore();

  const errorMessage = error instanceof Error ? error.message : error ? String(error) : "";
  const decimals = data?.config.output.decimals ?? 1;
  const scores = useMemo(() => {
    if (!data?.scores?.length) return null;
    return [...data.scores].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [data?.scores]);

  const latestScore = scores?.at(-1);
  const sparkline = useMemo(() => {
    if (!scores?.length) return null;
    const values = scores.map((item) => item.score);
    const width = 160;
    const height = 56;
    return {
      width,
      height,
      points: buildSparklinePoints(values, width, height),
      labels: scores.map((score) => ({
        date: score.date,
        value: score.score,
      })),
    };
  }, [scores]);

  return (
    <section
      className="rounded-lg border border-dashed border-black/10 p-4 text-sm dark:border-white/15"
      aria-labelledby="power-score-card-title"
    >
      <CardTitle id="power-score-card-title" className="text-base">
        Power score
      </CardTitle>
      <CardDescription className="mt-1">
        {data
          ? `Window: ${rangeFormatter.format(new Date(data.range.from))} – ${rangeFormatter.format(
              new Date(data.range.to)
            )}`
          : "Personalized momentum indicator"}
      </CardDescription>
      {error ? (
        <p role="status" className="mt-4 text-sm text-destructive">
          Unable to load power score. {errorMessage}
        </p>
      ) : null}
      {isLoading ? (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Loading power score…
        </p>
      ) : null}
      {!isLoading && !error && !latestScore ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Track tasks, journaling, and power practice to generate your first score.
        </p>
      ) : null}
      {latestScore ? (
        <div className="mt-6 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Most recent score</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {formatScore(latestScore.score, decimals)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Calculated from completions on {rangeFormatter.format(new Date(latestScore.date))}.
            </p>
          </div>
          {sparkline ? (
            <figure>
              <figcaption className="sr-only">Daily power score trend</figcaption>
              <svg
                role="img"
                aria-label="Daily power score trend"
                viewBox={`0 0 ${sparkline.width} ${sparkline.height}`}
                className="h-20 w-full text-primary"
                preserveAspectRatio="none"
              >
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={sparkline.points}
                />
              </svg>
              <dl className="sr-only">
                {sparkline.labels.map((item) => (
                  <div key={item.date}>
                    <dt>{rangeFormatter.format(new Date(item.date))}</dt>
                    <dd>{formatScore(item.value, decimals)}</dd>
                  </div>
                ))}
              </dl>
            </figure>
          ) : null}
          <div>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Component breakdown</h3>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {Object.entries(latestScore.components).map(([component, value]) => {
                const label = COMPONENT_LABELS[component] ?? component;
                return (
                  <div key={component}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium text-foreground">{formatScore(value, decimals)}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default PowerScoreCard;
