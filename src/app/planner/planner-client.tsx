"use client";

import { useMemo, useState } from "react";
import { WeekCalendar, type CalendarEvent } from "@/lib/calendar";
import { ConflictModal } from "@/components/planner/conflict-modal";
import { useTasksWindow, useUpdateTaskSchedule } from "@/hooks/tasks";
import { detectConflicts, formatLocalRange, getWeekRange, minutesBetween, toIsoString } from "@/lib/planner/utils";
import type { Task } from "@/types/models";
import { Button } from "@/components/ui/button";

const MIN_UPDATE_DURATION = 15;

function taskToEvent(task: Task): CalendarEvent | null {
  if (!task.scheduled_time) return null;
  const start = new Date(task.scheduled_time);
  const end = new Date(start.getTime() + task.duration_minutes * 60_000);
  return {
    id: task.id,
    title: task.title,
    start,
    end,
    metadata: { task },
  };
}

type PendingUpdate = { id: string; start: Date; end: Date };

export function PlannerClient() {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const { start: weekStart, end: weekEnd } = useMemo(() => getWeekRange(anchorDate), [anchorDate]);
  const [pendingUpdate, setPendingUpdate] = useState<PendingUpdate | null>(null);
  const [conflicts, setConflicts] = useState<CalendarEvent[]>([]);
  const mutation = useUpdateTaskSchedule();

  const range = useMemo(
    () => ({ from: weekStart.toISOString(), to: weekEnd.toISOString() }),
    [weekEnd, weekStart]
  );
  const tasksQuery = useTasksWindow(range);
  const tasks = tasksQuery.data?.items ?? [];

  const events = useMemo(
    () => tasks.map(taskToEvent).filter((evt): evt is CalendarEvent => Boolean(evt)),
    [tasks]
  );

  const onEventChange = (id: string, next: { start: Date; end: Date }) => {
    const candidate = { id, start: next.start, end: next.end };
    const overlapping = detectConflicts(events, candidate);
    if (overlapping.length > 0) {
      setPendingUpdate(candidate);
      setConflicts(overlapping);
      return;
    }
    commitUpdate(candidate);
  };

  const commitUpdate = (update: PendingUpdate) => {
    const durationMinutes = Math.max(MIN_UPDATE_DURATION, minutesBetween(update.start, update.end));
    mutation.mutate({
      id: update.id,
      scheduledTime: toIsoString(update.start),
      durationMinutes,
    });
  };

  const dismissConflict = () => {
    setPendingUpdate(null);
    setConflicts([]);
  };

  const confirmConflict = () => {
    if (!pendingUpdate) return;
    commitUpdate(pendingUpdate);
    dismissConflict();
  };

  const timezone =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;

  const pendingTarget = useMemo(() => {
    if (!pendingUpdate) return null;
    const base = events.find((evt) => evt.id === pendingUpdate.id);
    if (!base) return null;
    return { ...base, start: pendingUpdate.start, end: pendingUpdate.end };
  }, [events, pendingUpdate]);

  const locale = typeof navigator !== "undefined" ? navigator.language : undefined;

  const weekLabel = useMemo(() => {
    const startFormatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
    const endFormatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
    return `${startFormatter.format(weekStart)} – ${endFormatter.format(new Date(weekEnd.getTime() - 1))}`;
  }, [locale, weekEnd, weekStart]);

  const goToPreviousWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setAnchorDate(prev);
  };

  const goToNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setAnchorDate(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Week of {weekLabel}</h2>
          <p className="text-sm text-muted-foreground">
            Drag tasks to reschedule or use the handles to adjust duration.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={goToPreviousWeek}>
            Previous
          </Button>
          <Button variant="secondary" onClick={() => setAnchorDate(new Date())}>
            Today
          </Button>
          <Button variant="secondary" onClick={goToNextWeek}>
            Next
          </Button>
        </div>
      </div>
      <WeekCalendar
        events={events}
        startOfWeek={weekStart}
        onEventChange={onEventChange}
        renderEventFooter={(event) => formatLocalRange(event.start, event.end, locale, timezone)}
        isLoading={tasksQuery.isLoading || mutation.isPending}
      />
      <ConflictModal
        open={Boolean(pendingUpdate)}
        target={pendingTarget}
        conflicts={conflicts}
        onCancel={dismissConflict}
        onConfirm={confirmConflict}
        timeZone={timezone}
      />
    </div>
  );
}
