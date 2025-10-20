import type { ReadonlyURLSearchParams } from "next/navigation";
import type { Journal } from "@/types/models";

export type TimelineFilters = {
  from?: string;
  to?: string;
  tags: string[];
};

export function parseTagInput(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item, index, all) => item.length > 0 && all.indexOf(item) === index);
}

export function parseTimelineFilters(search: URLSearchParams | ReadonlyURLSearchParams): TimelineFilters {
  const from = search.get("from") || undefined;
  const to = search.get("to") || undefined;
  const tags = parseTagInput(search.getAll("tags").join(","));
  return { from, to, tags };
}

export function serializeTimelineFilters(filters: TimelineFilters): string {
  const search = new URLSearchParams();
  if (filters.from) search.set("from", filters.from);
  if (filters.to) search.set("to", filters.to);
  for (const tag of filters.tags) {
    search.append("tags", tag);
  }
  return search.toString();
}

export function computeNextOffset(pages: Array<{ items: Journal[]; count: number }>): number | undefined {
  if (pages.length === 0) return 0;
  const totalFetched = pages.reduce((sum, page) => sum + page.items.length, 0);
  const lastPageCount = pages[pages.length - 1]?.count ?? 0;
  if (lastPageCount === 0) return undefined;
  return totalFetched >= lastPageCount ? undefined : totalFetched;
}

export function hasActiveFilters(filters: TimelineFilters): boolean {
  return Boolean(filters.from || filters.to || filters.tags.length > 0);
}

export function getTimelineEmptyState(
  totalItems: number,
  isLoading: boolean,
  filters: TimelineFilters,
): { title: string; description: string } | null {
  if (isLoading) return null;
  if (totalItems > 0) return null;
  if (hasActiveFilters(filters)) {
    return {
      title: "No entries match your filters",
      description: "Try adjusting the date range or removing a tag to see more reflections.",
    };
  }
  return {
    title: "Your timeline is empty",
    description: "Write your first journal entry to start building longitudinal insights.",
  };
}
