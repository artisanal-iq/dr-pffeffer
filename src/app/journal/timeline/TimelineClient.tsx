"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useInfiniteJournals } from "@/hooks/journals";
import type { Journal } from "@/types/models";
import {
  getTimelineEmptyState,
  hasActiveFilters,
  parseTagInput,
  parseTimelineFilters,
  serializeTimelineFilters,
  type TimelineFilters,
} from "@/lib/journal-timeline";

const ITEM_HEIGHT = 192;
const OVERSCAN = 4;

export default function TimelineClient() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const filters = useMemo(() => parseTimelineFilters(search), [search]);
  const [tagDraft, setTagDraft] = useState(() => filters.tags.join(", "));

  useEffect(() => {
    setTagDraft(filters.tags.join(", "));
  }, [filters.tags]);

  const updateFilters = useCallback(
    (next: TimelineFilters) => {
      const normalized: TimelineFilters = {
        from: next.from || undefined,
        to: next.to || undefined,
        tags: next.tags,
      };
      const query = serializeTimelineFilters(normalized);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const handleDateChange = useCallback(
    (key: "from" | "to") =>
      (value: string) => {
        updateFilters({ ...filters, [key]: value || undefined });
      },
    [filters, updateFilters],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const tags = parseTagInput(tagDraft);
      updateFilters({ ...filters, tags });
    },
    [filters, tagDraft, updateFilters],
  );

  const clearFilters = useCallback(() => {
    updateFilters({ from: undefined, to: undefined, tags: [] });
  }, [updateFilters]);

  const timeline = useInfiniteJournals({ from: filters.from, to: filters.to, tags: filters.tags, limit: 50 });
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = timeline;
  const pages = data?.pages ?? [];
  const items = useMemo(() => pages.flatMap((page) => page.items), [pages]);
  const totalCount = pages[0]?.count ?? 0;
  const isInitialLoading = status === "pending" && pages.length === 0;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [range, setRange] = useState({ start: 0, end: 1 });

  const totalCountWithLoader = items.length + (hasNextPage ? 1 : 0);

  const updateRange = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const height = el.clientHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
    const visible = Math.ceil(height / ITEM_HEIGHT) + OVERSCAN * 2;
    const endIndex = Math.min(totalCountWithLoader, startIndex + visible);
    setRange((prev) => (prev.start === startIndex && prev.end === endIndex ? prev : { start: startIndex, end: endIndex }));
  }, [totalCountWithLoader]);

  useEffect(() => {
    updateRange();
  }, [totalCountWithLoader, updateRange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    updateRange();
    el.addEventListener("scroll", updateRange, { passive: true });
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => updateRange());
      resizeObserver.observe(el);
    }
    return () => {
      el.removeEventListener("scroll", updateRange);
      resizeObserver?.disconnect();
    };
  }, [updateRange]);

  useEffect(() => {
    if (!hasNextPage) return;
    if (isFetchingNextPage) return;
    if (items.length === 0) return;
    if (range.end < items.length) return;
    fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, items.length, range.end]);

  const paddingTop = range.start * ITEM_HEIGHT;
  const visibleCount = Math.max(range.end - range.start, 0);
  const paddingBottom = Math.max(totalCountWithLoader - range.end, 0) * ITEM_HEIGHT;

  const emptyState = getTimelineEmptyState(totalCount, isInitialLoading, filters);

  return (
    <section className="space-y-6">
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">From date</label>
          <input
            type="date"
            value={filters.from ?? ""}
            onChange={(event) => handleDateChange("from")(event.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">To date</label>
          <input
            type="date"
            value={filters.to ?? ""}
            onChange={(event) => handleDateChange("to")(event.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</label>
          <input
            type="text"
            placeholder="e.g. focus, gratitude"
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">Separate multiple tags with commas.</p>
        </div>
        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Apply filters
          </button>
          {hasActiveFilters(filters) && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-md border px-4 py-2 text-sm font-medium"
            >
              Reset filters
            </button>
          )}
        </div>
      </form>

      <div className="rounded-md border bg-card/40">
        {isInitialLoading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading timeline…</div>
        ) : emptyState ? (
          <div className="p-12 text-center">
            <h2 className="text-lg font-medium">{emptyState.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{emptyState.description}</p>
          </div>
        ) : (
          <div ref={containerRef} className="h-[70vh] overflow-auto">
            <div style={{ paddingTop, paddingBottom }} className="space-y-4 px-4 py-4">
              {Array.from({ length: visibleCount }, (_, i) => {
                const index = range.start + i;
                if (index >= items.length) {
                  return (
                    <div
                      key={`loader-${index}`}
                      className="flex min-h-[8rem] items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground"
                    >
                      {isFetchingNextPage ? "Loading more entries…" : "Scroll to load more"}
                    </div>
                  );
                }
                const journal = items[index];
                return <TimelineEntryCard key={journal.id} journal={journal} />;
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TimelineEntryCard({ journal }: { journal: Journal }) {
  return (
    <article className="flex min-h-[10rem] max-h-[16rem] flex-col justify-between rounded-md border bg-background/70 p-4 shadow-sm">
      <header className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>{journal.date}</span>
        {journal.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] normal-case">
            #{tag}
          </span>
        ))}
      </header>
      <p
        className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90"
        style={{ display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {journal.entry}
      </p>
      {journal.ai_summary && (
        <footer className="mt-3 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
          <div className="font-semibold uppercase tracking-wide">AI summary</div>
          <p
            className="mt-1 whitespace-pre-wrap text-xs text-foreground/80"
            style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {journal.ai_summary}
          </p>
      </footer>
      )}
    </article>
  );
}
