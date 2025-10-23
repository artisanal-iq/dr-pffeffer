"use client";

import { useMemo } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useReflectionMetrics } from "@/hooks/reflectionMetrics";

const confidenceFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function formatConfidence(value: number | null) {
  if (value == null) return "—";
  return confidenceFormatter.format(value);
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return dateFormatter.format(date);
}

function formatDayCount(value: number) {
  const count = Math.max(0, value);
  return `${count} day${count === 1 ? "" : "s"}`;
}

function formatEntryCount(value: number) {
  const count = Math.max(0, value);
  return `${count} entr${count === 1 ? "y" : "ies"}`;
}

export function ReflectionMetricsCard() {
  const { data, isLoading, error, isFetching } = useReflectionMetrics();

  const formattedMetrics = useMemo(() => {
    if (!data) return null;
    return {
      avgConfidenceAllTime: formatConfidence(data.avgConfidenceAllTime),
      avgConfidenceLast7Days: formatConfidence(data.avgConfidenceLast7Days),
      reflectionsLast7Days: formatEntryCount(data.reflectionsLast7Days),
      currentReflectionStreak: formatDayCount(data.currentReflectionStreak),
      bestReflectionStreak: formatDayCount(data.bestReflectionStreak),
      latestReflectionDate: formatDate(data.latestReflectionDate),
    };
  }, [data]);

  const showLoadingState = isLoading && !formattedMetrics;
  const showRefreshingState = !showLoadingState && isFetching;

  return (
    <Card className="mt-6" aria-labelledby="reflection-metrics-card-title">
      <CardHeader>
        <CardTitle id="reflection-metrics-card-title">Reflection insights</CardTitle>
        <CardDescription>Track how consistently you capture reflections and how confident you feel.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p role="status" className="text-sm text-destructive">
            Unable to load reflection metrics. {error.message}
          </p>
        ) : null}
        {showLoadingState ? <ReflectionMetricsCardSkeletonContent /> : null}
        {formattedMetrics ? (
          <div className="space-y-6">
            {showRefreshingState ? (
              <p role="status" className="text-xs text-muted-foreground">
                Refreshing metrics…
              </p>
            ) : null}
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Average confidence</dt>
                <dd className="mt-1 text-2xl font-semibold">{formattedMetrics.avgConfidenceLast7Days}</dd>
                <dd className="text-sm text-muted-foreground">
                  Last 7 days · All time {formattedMetrics.avgConfidenceAllTime}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Reflection streak</dt>
                <dd className="mt-1 text-2xl font-semibold">{formattedMetrics.currentReflectionStreak}</dd>
                <dd className="text-sm text-muted-foreground">
                  Best streak {formattedMetrics.bestReflectionStreak}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Latest reflection</dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {formattedMetrics.latestReflectionDate ?? "No reflections yet"}
                </dd>
                <dd className="text-sm text-muted-foreground">
                  {formattedMetrics.reflectionsLast7Days} in the last 7 days
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ReflectionMetricsCardSkeleton() {
  return (
    <Card className="mt-6" aria-hidden>
      <CardHeader>
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <ReflectionMetricsCardSkeletonContent />
      </CardContent>
    </Card>
  );
}

function ReflectionMetricsCardSkeletonContent() {
  return (
    <div className="grid gap-4 sm:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((index) => (
        <div key={index} className="space-y-2">
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          <div className="h-7 w-24 animate-pulse rounded bg-muted" />
          <div className="h-3 w-40 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
