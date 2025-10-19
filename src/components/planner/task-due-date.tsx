"use client";

import { formatForLocale, parseISOToTemporal } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/models";

type TaskDueDateProps = {
  task: Pick<Task, "title" | "scheduled_time">;
  locale?: string;
  timeZone?: string;
  className?: string;
  fallback?: string;
};

export function TaskDueDate({
  task,
  locale = "en-US",
  timeZone = "UTC",
  className,
  fallback = "Unscheduled",
}: TaskDueDateProps) {
  if (!task.scheduled_time) {
    return <span className={cn("text-muted-foreground", className)}>{fallback}</span>;
  }

  const temporal = parseISOToTemporal(task.scheduled_time, { timeZone });
  const formatted = formatForLocale(temporal, {
    locale,
    timeZone,
    options: { dateStyle: "medium", timeStyle: "short" },
  });

  return <span className={className}>{formatted}</span>;
}
