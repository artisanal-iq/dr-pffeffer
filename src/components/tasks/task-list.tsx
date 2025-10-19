"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/tasks";
import type { Task } from "@/types/models";

const ROW_HEIGHT = 68;
const OVERSCAN = 4;

const columnConfig = [
  { key: "title", label: "Title" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "scheduled_time", label: "Scheduled" },
  { key: "created_at", label: "Created" },
] as const;

type ColumnKey = (typeof columnConfig)[number]["key"];
type SortDirection = "asc" | "desc";

type PriorityFilter = "all" | Task["priority"];
type StatusFilter = "all" | Task["status"];

type TaskListState = {
  status: StatusFilter;
  priority: PriorityFilter;
  from: string;
  to: string;
  sortKey: ColumnKey;
  sortDirection: SortDirection;
};

const initialState: TaskListState = {
  status: "all",
  priority: "all",
  from: "",
  to: "",
  sortKey: "scheduled_time",
  sortDirection: "asc",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function compareTasks(a: Task, b: Task, key: ColumnKey, direction: SortDirection) {
  const order = direction === "asc" ? 1 : -1;
  const av = a[key];
  const bv = b[key];
  if (av === bv) return 0;
  if (av == null) return -1 * order;
  if (bv == null) return 1 * order;
  if (key === "title") {
    return av.localeCompare(bv) * order;
  }
  if (key === "priority") {
    const rank: Record<Task["priority"], number> = { low: 0, medium: 1, high: 2 };
    return (rank[av as Task["priority"]] - rank[bv as Task["priority"]]) * order;
  }
  if (key === "status") {
    const rank: Record<Task["status"], number> = { todo: 0, in_progress: 1, done: 2 };
    return (rank[av as Task["status"]] - rank[bv as Task["status"]]) * order;
  }
  return (new Date(String(av)).getTime() - new Date(String(bv)).getTime()) * order;
}

function applyClientFilters(tasks: Task[], state: TaskListState) {
  return tasks
    .filter((task) => (state.status === "all" ? true : task.status === state.status))
    .filter((task) => (state.priority === "all" ? true : task.priority === state.priority))
    .sort((a, b) => compareTasks(a, b, state.sortKey, state.sortDirection));
}

type VirtualizedListProps = {
  tasks: Task[];
};

function VirtualizedTaskRows({ tasks }: VirtualizedListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(400);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => {
      const next = element.clientHeight;
      if (next > 0) {
        setViewportHeight(next);
      }
    };
    update();
    let cleanup: (() => void) | undefined;
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => update());
      observer.observe(element);
      cleanup = () => observer.disconnect();
    } else {
      window.addEventListener("resize", update);
      cleanup = () => window.removeEventListener("resize", update);
    }
    return cleanup;
  }, []);

  const totalHeight = tasks.length * ROW_HEIGHT;
  const viewport = Math.max(viewportHeight, 1);
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(tasks.length, Math.ceil((scrollTop + viewport) / ROW_HEIGHT) + OVERSCAN);
  const items = tasks.slice(startIndex, endIndex);
  const offsetY = startIndex * ROW_HEIGHT;

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      className="max-h-[480px] overflow-auto border-t"
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {items.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  return (
    <div
      className="grid grid-cols-[minmax(220px,2fr)_repeat(4,minmax(140px,1fr))] items-center gap-2 border-b px-4 py-3 last:border-b-0"
      style={{ height: ROW_HEIGHT }}
    >
      <div className="truncate font-medium">{task.title}</div>
      <div className="capitalize text-sm text-muted-foreground">{task.status.replace(/_/g, " ")}</div>
      <div className="capitalize text-sm text-muted-foreground">{task.priority}</div>
      <div className="text-sm text-muted-foreground">{formatDate(task.scheduled_time)}</div>
      <div className="text-sm text-muted-foreground">{formatDate(task.created_at)}</div>
    </div>
  );
}

function SortButton({
  column,
  label,
  active,
  direction,
  onToggle,
}: {
  column: ColumnKey;
  label: string;
  active: boolean;
  direction: SortDirection;
  onToggle: (column: ColumnKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(column)}
      className={cn(
        "flex items-center gap-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        active && "text-foreground"
      )}
    >
      <span>{label}</span>
      <span aria-hidden className="text-[10px]">
        {active ? (direction === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </button>
  );
}

export default function TaskList() {
  const [state, setState] = useState<TaskListState>(initialState);
  const { data, isLoading, isError, error } = useTasks({
    status: state.status === "all" ? null : state.status,
    from: state.from ? new Date(`${state.from}T00:00:00`).toISOString() : null,
    to: state.to ? new Date(`${state.to}T23:59:59.999`).toISOString() : null,
  });

  const tasks = data?.items ?? [];
  const filteredTasks = useMemo(() => applyClientFilters(tasks, state), [tasks, state]);

  const toggleSort = useCallback((column: ColumnKey) => {
    setState((prev) => {
      if (prev.sortKey === column) {
        return { ...prev, sortDirection: prev.sortDirection === "asc" ? "desc" : "asc" };
      }
      return { ...prev, sortKey: column, sortDirection: "asc" };
    });
  }, []);

  const handleStatusChange = useCallback((value: StatusFilter) => {
    setState((prev) => ({ ...prev, status: value }));
  }, []);

  const handlePriorityChange = useCallback((value: PriorityFilter) => {
    setState((prev) => ({ ...prev, priority: value }));
  }, []);

  const handleDateChange = useCallback((key: "from" | "to", value: string) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const showEmpty = !isLoading && !isError && filteredTasks.length === 0;

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
        <CardDescription>Review and filter your upcoming work.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-4 pb-4">
          <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status
            <select
              className="mt-1 rounded-md border bg-background px-3 py-2 text-sm"
              value={state.status}
              onChange={(event) => handleStatusChange(event.target.value as StatusFilter)}
            >
              <option value="all">All</option>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </label>
          <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Priority
            <select
              className="mt-1 rounded-md border bg-background px-3 py-2 text-sm"
              value={state.priority}
              onChange={(event) => handlePriorityChange(event.target.value as PriorityFilter)}
            >
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-muted-foreground">
            From
            <input
              type="date"
              className="mt-1 rounded-md border bg-background px-3 py-2 text-sm"
              value={state.from}
              onChange={(event) => handleDateChange("from", event.target.value)}
            />
          </label>
          <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-muted-foreground">
            To
            <input
              type="date"
              className="mt-1 rounded-md border bg-background px-3 py-2 text-sm"
              value={state.to}
              onChange={(event) => handleDateChange("to", event.target.value)}
            />
          </label>
          <div className="ml-auto text-sm text-muted-foreground">
            {isLoading && <span>Loading tasks…</span>}
            {isError && <span role="alert">{error?.message ?? "Failed to load tasks"}</span>}
            {!isLoading && !isError && data?.count != null && (
              <span>{data.count} total</span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-[minmax(220px,2fr)_repeat(4,minmax(140px,1fr))] items-center gap-2 px-4 pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {columnConfig.map((column) => (
            <SortButton
              key={column.key}
              column={column.key}
              label={column.label}
              active={state.sortKey === column.key}
              direction={state.sortDirection}
              onToggle={toggleSort}
            />
          ))}
        </div>
        {showEmpty ? (
          <div className="py-12 text-center text-sm text-muted-foreground" role="status">
            No tasks match the selected filters.
          </div>
        ) : (
          <VirtualizedTaskRows tasks={filteredTasks} />
        )}
      </CardContent>
    </Card>
  );
}

export { applyClientFilters };
