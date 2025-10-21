"use client";

import type { FollowUpRecommendation } from "@/lib/connections/intelligence";

function formatDays(value: number | null) {
  if (value == null) return "—";
  if (value === 0) return "Today";
  if (value === 1) return "Yesterday";
  return `${value} days ago`;
}

type FollowUpRecommendationsProps = {
  items: FollowUpRecommendation[];
};

export default function FollowUpRecommendations({ items }: FollowUpRecommendationsProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted p-6 text-center text-sm text-muted-foreground">
        Add connections to receive relationship nudges.
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
          <th className="pb-2">Connection</th>
          <th className="pb-2">Last contact</th>
          <th className="pb-2">Insight</th>
          <th className="pb-2">Next action</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const urgencyBadge =
            item.urgency === "overdue"
              ? "text-red-600"
              : item.urgency === "upcoming"
                ? "text-amber-600"
                : "text-emerald-600";
          return (
            <tr key={item.id} className="border-t border-border/50">
              <td className="py-2 font-medium text-foreground">{item.name}</td>
              <td className="py-2 text-muted-foreground">{formatDays(item.daysSinceContact)}</td>
              <td className={`py-2 ${urgencyBadge}`}>{item.reason}</td>
              <td className="py-2 text-muted-foreground">
                {item.nextAction ? <span>{item.nextAction}</span> : <span className="italic">No action logged</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
