"use client";

import { formatForLocale, parseISOToTemporal, temporalToLuxon } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/models";

type TaskScheduleProps = {
  tasks: Array<Pick<Task, "id" | "title" | "scheduled_time">>;
  locale?: string;
  timeZone?: string;
};

type GroupedTask = {
  label: string;
  items: Array<{ id: string; title: string }>;
};

function groupTasks(tasks: TaskScheduleProps["tasks"], locale: string, timeZone: string): GroupedTask[] {
  const withTimes = tasks
    .filter((task) => Boolean(task.scheduled_time))
    .map((task) => {
      const temporal = parseISOToTemporal(task.scheduled_time as string, { timeZone });
      const luxon = temporalToLuxon(temporal);
      const dayLabel = formatForLocale(luxon, {
        locale,
        timeZone,
        options: { dateStyle: "full" },
      });
      return { ...task, dayLabel };
    })
    .sort((a, b) => (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? ""));

  const map = new Map<string, GroupedTask>();
  for (const task of withTimes) {
    if (!map.has(task.dayLabel)) {
      map.set(task.dayLabel, { label: task.dayLabel, items: [] });
    }
    map.get(task.dayLabel)!.items.push({ id: task.id, title: task.title });
  }

  const groups = Array.from(map.values());
  const unscheduled = tasks.filter((task) => !task.scheduled_time);
  if (unscheduled.length) {
    groups.push({ label: "Unscheduled", items: unscheduled.map((task) => ({ id: task.id, title: task.title })) });
  }
  return groups;
}

export function TaskSchedule({ tasks, locale = "en-US", timeZone = "UTC" }: TaskScheduleProps) {
  const grouped = groupTasks(tasks, locale, timeZone);

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <section key={group.label} className="border rounded-md p-3">
          <header className="text-sm font-medium text-muted-foreground">{group.label}</header>
          <ul className="mt-2 space-y-1">
            {group.items.map((item) => (
              <li key={item.id} className={cn("text-sm")}>{item.title}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
