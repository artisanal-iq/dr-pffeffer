import Link from "next/link";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_DAILY_METRIC_LIMIT,
  DashboardData,
  DailyMetric,
  describeResponsiveColumns,
  loadDashboardData,
  METRIC_GRID_BREAKPOINTS,
} from "@/lib/dashboard";
import PowerScoreCard from "@/components/dashboard/power-score-card";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(isoDate: string | null) {
  if (!isoDate) {
    return "No completions logged yet";
  }
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

type SummaryCard = {
  id: string;
  title: string;
  value: string;
  description: string;
};

function createSummaryCards(data: DashboardData["summary"]): SummaryCard[] {
  return [
    {
      id: "completed-today",
      title: "Completed today",
      value: formatNumber(data.completedToday),
      description: "Tasks logged in the current day",
    },
    {
      id: "completed-week",
      title: "Last 7 days",
      value: formatNumber(data.completedLast7Days),
      description: "Consistency streak over the last week",
    },
    {
      id: "total-completed",
      title: "Lifetime completed",
      value: formatNumber(data.totalCompleted),
      description: "Total tasks completed all time",
    },
    {
      id: "last-completion",
      title: "Most recent win",
      value: formatDateLabel(data.mostRecentCompletionDate),
      description: "Most recent task completion",
    },
  ];
}

function buildHeatmapCells(metrics: DailyMetric[]) {
  const sorted = [...metrics].sort((a, b) =>
    new Date(a.bucketDate).getTime() - new Date(b.bucketDate).getTime()
  );
  const maxValue = sorted.reduce(
    (max, item) => Math.max(max, item.completedCount),
    0
  );
  return sorted.map((item) => {
    const ratio = maxValue > 0 ? item.completedCount / maxValue : 0;
    return {
      ...item,
      intensity: Math.max(0.15, Math.min(ratio || 0, 1)),
    };
  });
}

type DashboardContentProps = {
  userId: string;
};

export default async function DashboardContent({ userId }: DashboardContentProps) {
  const data = await loadDashboardData(userId);
  const cards = createSummaryCards(data.summary);
  const heatmapCells = buildHeatmapCells(data.daily);

  const responsiveDescription = describeResponsiveColumns(METRIC_GRID_BREAKPOINTS);

  return (
    <div className="space-y-10">
      <section aria-labelledby="dashboard-summary-heading">
        <div className="sr-only" id="dashboard-summary-heading">
          Dashboard summary
        </div>
        <p className="sr-only" id="dashboard-summary-layout">
          {responsiveDescription}
        </p>
        <div
          aria-describedby="dashboard-summary-layout"
          role="list"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {cards.map((card) => (
            <Card key={card.id} role="listitem">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight text-foreground">
                  {card.value}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex flex-col gap-1 border-b border-black/5 pb-4 dark:border-white/10">
            <CardTitle className="text-base font-semibold">Consistency heatmap</CardTitle>
            <CardDescription>
              Activity from the last {Math.min(data.daily.length, DEFAULT_DAILY_METRIC_LIMIT)} days
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {heatmapCells.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Complete tasks in the planner to populate your heatmap.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {heatmapCells.map((cell) => (
                    <span
                      key={cell.bucketDate}
                      className={cn(
                        "h-8 rounded-md bg-blue-500/80 transition-all dark:bg-blue-400/80",
                        cell.completedCount === 0 && "bg-muted"
                      )}
                      aria-label={`${cell.completedCount} task${
                        cell.completedCount === 1 ? "" : "s"
                      } completed on ${new Date(
                        cell.bucketDate
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}`}
                      style={{ opacity: cell.completedCount === 0 ? 1 : cell.intensity }}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Darker blocks represent days with more completed tasks.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="border-b border-black/5 pb-4 dark:border-white/10">
            <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
            <CardDescription>Momentum builders for your next session</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-4 pt-6">
            <div className="space-y-4">
              <QuickAction
                title="Log a win"
                description="Capture a highlight from today in your journal."
                href="/journal"
              />
              <QuickAction
                title="Plan tomorrow"
                description="Review your planner and stack tomorrow's priorities."
                href="/planner"
              />
              <QuickAction
                title="Reconnect"
                description="Reach out to someone from your connections list."
                href="/connections"
              />
            </div>
            <Suspense
              fallback={
                <div className="rounded-lg border border-dashed border-black/10 p-4 text-sm dark:border-white/15">
                  <p className="font-medium text-foreground">Power score</p>
                  <p className="mt-1 text-muted-foreground">Preparing live metrics…</p>
                </div>
              }
            >
              <PowerScoreCard />
            </Suspense>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

type QuickActionProps = {
  title: string;
  description: string;
  href: string;
};

function QuickAction({ title, description, href }: QuickActionProps) {
  return (
    <div className="rounded-xl border border-black/5 bg-background p-4 shadow-sm transition-shadow hover:shadow-md dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Link
          className={buttonVariants({ variant: "secondary" })}
          href={href}
        >
          Open
        </Link>
      </div>
    </div>
  );
}
