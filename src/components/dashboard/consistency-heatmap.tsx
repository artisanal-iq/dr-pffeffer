"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTaskMetrics } from "@/hooks/taskMetrics";
import {
  calculateWeeksForWidth,
  createHeatmapColorScale,
  buildHeatmapMatrix,
  HEATMAP_COLOR_STOPS,
  type HeatmapCell,
} from "@/lib/heatmap";
import { cn } from "@/lib/utils";

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatTooltip(count: number) {
  if (count <= 0) return "No completions";
  return `${count} completion${count === 1 ? "" : "s"}`;
}

type ActiveCellState = {
  cell: HeatmapCell;
  index: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ConsistencyHeatmapCard() {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [width, setWidth] = useState<number>(0);
  const [activeCell, setActiveCell] = useState<ActiveCellState | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const next = container.clientWidth;
      setWidth((prev) => (prev === next ? prev : next));
    };
    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateWidth());
      observer.observe(container);
      return () => observer.disconnect();
    }

    const listener = () => updateWidth();
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, []);

  const weeksToDisplay = useMemo(() => calculateWeeksForWidth(width), [width]);

  const { data, isLoading, error } = useTaskMetrics();

  const matrix = useMemo(() => {
    if (!data) return null;
    return buildHeatmapMatrix(data.daily, { weeks: weeksToDisplay });
  }, [data, weeksToDisplay]);

  const colorScale = useMemo(() => createHeatmapColorScale(matrix?.maxValue ?? 0), [matrix?.maxValue]);

  const summary = data?.summary;

  if (matrix) {
    cellRefs.current.length = matrix.cells.length;
  } else {
    cellRefs.current.length = 0;
  }

  const handleKeyNavigation = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!matrix) return;
    const total = matrix.cells.length;
    const moveFocus = (delta: number) => {
      let next = index + delta;
      while (next >= 0 && next < total) {
        const candidate = matrix.cells[next];
        if (!candidate.isPlaceholder) {
          const target = cellRefs.current[next];
          if (target) {
            event.preventDefault();
            target.focus();
            break;
          }
        }
        next += delta > 0 ? 1 : -1;
      }
    };

    switch (event.key) {
      case "ArrowUp":
        moveFocus(-1);
        break;
      case "ArrowDown":
        moveFocus(1);
        break;
      case "ArrowLeft":
        moveFocus(-7);
        break;
      case "ArrowRight":
        moveFocus(7);
        break;
      default:
        break;
    }
  };

  const setCellRef = (index: number) => (element: HTMLButtonElement | null) => {
    cellRefs.current[index] = element;
  };

  const updateActiveCell = (index: number, cell: HeatmapCell, target: HTMLButtonElement | null) => {
    if (!chartRef.current || !target) {
      setActiveCell(null);
      return;
    }
    const chartRect = chartRef.current.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    setActiveCell({
      cell,
      index,
      left: rect.left - chartRect.left,
      top: rect.top - chartRect.top,
      width: rect.width,
      height: rect.height,
    });
  };

  const clearActiveCell = () => setActiveCell(null);

  return (
    <Card ref={containerRef} aria-labelledby="consistency-heatmap-title">
      <CardHeader>
        <CardTitle id="consistency-heatmap-title">Consistency heatmap</CardTitle>
        <CardDescription>
          Daily task completions mapped to a high-contrast scale for the past {weeksToDisplay} weeks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p role="status" className="text-sm text-destructive">
            Unable to load metrics. {error.message}
          </p>
        ) : null}
        {isLoading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading metrics…
          </p>
        ) : null}
        {summary ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Completed today</dt>
              <dd className="mt-1 text-2xl font-semibold">{summary.completedToday}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Last 7 days</dt>
              <dd className="mt-1 text-2xl font-semibold">{summary.completedLast7Days}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Total completions</dt>
              <dd className="mt-1 text-2xl font-semibold">{summary.totalCompleted}</dd>
            </div>
          </dl>
        ) : null}
        {matrix ? (
          <div ref={chartRef} className="mt-8">
            <div className="flex items-start gap-3">
              <div aria-hidden className="grid select-none grid-rows-7 gap-1 text-xs text-muted-foreground">
                {DAY_LABELS.map((label) => (
                  <span key={label} className="h-6 leading-6">
                    {label}
                  </span>
                ))}
              </div>
              <div className="relative">
                <div className="flex gap-1" role="grid" aria-label="Task completion heatmap">
                  {matrix.weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-rows-7 gap-1" role="rowgroup">
                      {week.map((cell, dayIndex) => {
                        const cellIndex = weekIndex * 7 + dayIndex;
                        const color = colorScale(cell.count);
                        const isInteractive = !cell.isPlaceholder;
                        return (
                          <button
                            key={cell.date}
                            ref={setCellRef(cellIndex)}
                            type="button"
                            role="gridcell"
                            tabIndex={isInteractive ? 0 : -1}
                            aria-label={`${dayFormatter.format(new Date(`${cell.date}T00:00:00Z`))}: ${formatTooltip(cell.count)}`}
                            aria-disabled={!isInteractive}
                            className={cn(
                              "h-6 w-6 rounded-sm transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              isInteractive ? "hover:scale-105" : "opacity-40",
                            )}
                            style={{ backgroundColor: color, border: "1px solid rgba(15, 23, 42, 0.1)" }}
                            onMouseEnter={(event) => {
                              if (isInteractive) {
                                updateActiveCell(cellIndex, cell, event.currentTarget);
                              }
                            }}
                            onFocus={(event) => {
                              if (isInteractive) {
                                updateActiveCell(cellIndex, cell, event.currentTarget);
                              }
                            }}
                            onMouseLeave={clearActiveCell}
                            onBlur={clearActiveCell}
                            onKeyDown={(event) => handleKeyNavigation(event, cellIndex)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                {activeCell ? (
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute z-10 min-w-[160px] rounded-md border bg-popover p-3 text-sm shadow-lg"
                    style={{
                      left: Math.min(
                        Math.max(0, activeCell.left + activeCell.width / 2 - 80),
                        (chartRef.current?.clientWidth ?? 0) - 160,
                      ),
                      top: Math.max(0, activeCell.top - 48),
                    }}
                  >
                    <p className="font-medium">{dayFormatter.format(new Date(`${activeCell.cell.date}T00:00:00Z`))}</p>
                    <p className="text-muted-foreground">{formatTooltip(activeCell.cell.count)}</p>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex items-center gap-1">
                {HEATMAP_COLOR_STOPS.map((color, index) => (
                  <span
                    key={color}
                    className="h-3 w-6 rounded-sm border"
                    style={{ backgroundColor: color, borderColor: index === 0 ? "rgba(15,23,42,0.15)" : "transparent" }}
                    aria-hidden
                  />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
