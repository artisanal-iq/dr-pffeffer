"use client";

import type { RelationshipHealthSummary } from "@/lib/connections/intelligence";

function formatAverage(value: number | null) {
  if (value == null) return "—";
  return `${value} days`;
}

type RelationshipHealthProps = {
  summary: RelationshipHealthSummary;
};

export default function RelationshipHealth({ summary }: RelationshipHealthProps) {
  const { total, categories, averageDaysSinceContact, dormantConnections } = summary;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-border/70 bg-background/60 p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Network size</div>
        <div className="mt-2 text-3xl font-semibold text-foreground">{total}</div>
        <p className="mt-1 text-xs text-muted-foreground">Relationships currently tracked</p>
      </div>
      <div className="rounded-lg border border-border/70 bg-background/60 p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Avg. days since contact</div>
        <div className="mt-2 text-3xl font-semibold text-foreground">{formatAverage(averageDaysSinceContact)}</div>
        <p className="mt-1 text-xs text-muted-foreground">Lower numbers indicate healthy cadences</p>
      </div>
      <div className="rounded-lg border border-border/70 bg-background/60 p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dormant connections</div>
        <div className="mt-2 text-3xl font-semibold text-foreground">{dormantConnections}</div>
        <p className="mt-1 text-xs text-muted-foreground">Over 90 days or never contacted</p>
      </div>
      <div className="rounded-lg border border-border/70 bg-background/60 p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top cohorts</div>
        {categories.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Add tags to see cohort breakdowns.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center justify-between">
                <span className="capitalize">{category.id}</span>
                <span className="text-foreground">{category.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
