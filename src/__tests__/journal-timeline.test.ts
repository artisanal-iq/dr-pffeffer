import { describe, expect, it } from "vitest";
import {
  computeNextOffset,
  getTimelineEmptyState,
  hasActiveFilters,
  parseTagInput,
  parseTimelineFilters,
  serializeTimelineFilters,
  type TimelineFilters,
} from "@/lib/journal-timeline";
import type { Journal } from "@/types/models";

function buildJournal(overrides: Partial<Journal> = {}): Journal {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    user_id: overrides.user_id ?? crypto.randomUUID(),
    entry: overrides.entry ?? "Sample entry",
    ai_summary: overrides.ai_summary ?? null,
    tags: overrides.tags ?? ["focus"],
    date: overrides.date ?? "2024-01-01",
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
  };
}

describe("journal timeline filters", () => {
  it("parses search params into normalized filters", () => {
    const params = new URLSearchParams("from=2024-01-01&to=2024-02-01&tags=focus&tags= focus &tags=energy");
    const filters = parseTimelineFilters(params);
    expect(filters).toEqual({ from: "2024-01-01", to: "2024-02-01", tags: ["focus", "energy"] });
  });

  it("serializes filters back to query params", () => {
    const filters: TimelineFilters = { from: "2024-01-01", to: "2024-02-01", tags: ["focus", "energy"] };
    const query = serializeTimelineFilters(filters);
    expect(query).toBe("from=2024-01-01&to=2024-02-01&tags=focus&tags=energy");
  });

  it("deduplicates tags from free-form input", () => {
    expect(parseTagInput("focus, focus, energy , ")).toEqual(["focus", "energy"]);
  });

  it("detects active filters", () => {
    expect(hasActiveFilters({ from: undefined, to: undefined, tags: [] })).toBe(false);
    expect(hasActiveFilters({ from: "2024-01-01", to: undefined, tags: [] })).toBe(true);
  });
});

describe("journal timeline pagination", () => {
  it("calculates next offset when more pages exist", () => {
    const pages = [
      { items: Array.from({ length: 40 }, () => buildJournal()), count: 120 },
      { items: Array.from({ length: 40 }, () => buildJournal()), count: 120 },
    ];
    expect(computeNextOffset(pages)).toBe(80);
  });

  it("stops pagination when all items are fetched", () => {
    const pages = [{ items: Array.from({ length: 60 }, () => buildJournal()), count: 60 }];
    expect(computeNextOffset(pages)).toBeUndefined();
  });
});

describe("journal timeline empty states", () => {
  it("returns null while loading", () => {
    const filters: TimelineFilters = { from: undefined, to: undefined, tags: [] };
    expect(getTimelineEmptyState(0, true, filters)).toBeNull();
  });

  it("returns default empty message when no entries", () => {
    const filters: TimelineFilters = { from: undefined, to: undefined, tags: [] };
    const message = getTimelineEmptyState(0, false, filters);
    expect(message).toEqual({
      title: "Your timeline is empty",
      description: "Write your first journal entry to start building longitudinal insights.",
    });
  });

  it("returns filtered empty message when filters active", () => {
    const filters: TimelineFilters = { from: "2024-01-01", to: undefined, tags: ["focus"] };
    const message = getTimelineEmptyState(0, false, filters);
    expect(message).toEqual({
      title: "No entries match your filters",
      description: "Try adjusting the date range or removing a tag to see more reflections.",
    });
  });

  it("returns null when entries exist", () => {
    const filters: TimelineFilters = { from: undefined, to: undefined, tags: [] };
    expect(getTimelineEmptyState(5, false, filters)).toBeNull();
  });
});
