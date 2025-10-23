import { Suspense } from "react";
import Link from "next/link";

import { ConsistencyHeatmapCard } from "@/components/dashboard/consistency-heatmap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  DashboardData,
  describeResponsiveColumns,
  loadDashboardData,
  METRIC_GRID_BREAKPOINTS,
} from "@/lib/dashboard";

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

type DashboardContentProps = {
  userId: string;
};

export default async function DashboardContent({ userId }: DashboardContentProps) {
  const data = await loadDashboardData(userId);
  const cards = createSummaryCards(data.summary);

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
        <Suspense fallback={<ConsistencyHeatmapCardSkeleton />}>
          <ConsistencyHeatmapCard />
        </Suspense>

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
            <div className="rounded-lg border border-dashed border-black/10 p-4 text-sm dark:border-white/15">
              <p className="font-medium text-foreground">Power score preview</p>
              <p className="mt-1 text-muted-foreground">
                Daily completions and streaks will shape your personalized power score once tracking begins.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ConsistencyHeatmapCardSkeleton() {
  return (
    <Card aria-labelledby="consistency-heatmap-title" aria-busy="true">
      <CardHeader className="flex flex-col gap-1 border-b border-black/5 pb-4 dark:border-white/10">
        <CardTitle id="consistency-heatmap-title" className="text-base font-semibold">
          Consistency heatmap
        </CardTitle>
        <CardDescription>Loading recent activity…</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-6 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="flex items-start gap-3">
          <div className="grid select-none grid-rows-7 gap-1 text-xs text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
              <span key={label} className="h-6 leading-6">
                {label}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-1 sm:gap-1.5" aria-hidden>
            {Array.from({ length: 42 }).map((_, index) => (
              <span key={index} className="h-6 w-6 animate-pulse rounded-sm bg-muted" />
            ))}
          </div>
        </div>
        <div className="h-3 w-40 animate-pulse rounded bg-muted" aria-hidden />
      </CardContent>
    </Card>
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
