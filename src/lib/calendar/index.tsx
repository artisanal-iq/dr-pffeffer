"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const HOURS_IN_DAY = 24;
const DAYS_IN_WEEK = 7;
const HOUR_HEIGHT = 56; // px
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const MINUTE_INCREMENT = 15;
const MINUTE_INCREMENT_MS = MINUTE_INCREMENT * MINUTE;
const MIN_DURATION_MS = MINUTE_INCREMENT_MS;

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  metadata?: Record<string, unknown>;
};

type DragKind = "move" | "resize-start" | "resize-end";

export type WeekCalendarDragState = {
  id: string;
  kind: DragKind;
  originX: number;
  originY: number;
  start: Date;
  end: Date;
};

export type WeekCalendarProps = {
  events: CalendarEvent[];
  startOfWeek: Date;
  onEventChange: (id: string, next: { start: Date; end: Date }) => void;
  renderEventFooter?: (event: CalendarEvent) => React.ReactNode;
  isLoading?: boolean;
};

function normalizeStart(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function getWeekEnd(startOfWeek: Date) {
  const end = new Date(startOfWeek);
  end.setDate(end.getDate() + DAYS_IN_WEEK);
  end.setHours(0, 0, 0, 0);
  return end;
}

function toLocaleDayLabel(date: Date, index: number) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  }).format(new Date(date.getTime() + index * DAY));
}

type PointerInput = {
  clientX: number;
  clientY: number;
};

function computeEventPosition(
  pointer: PointerInput,
  drag: WeekCalendarDragState,
  bounds: DOMRect,
  weekStart: Date
) {
  const weekStartMs = weekStart.getTime();
  const weekEndMs = getWeekEnd(weekStart).getTime();
  const durationMs = drag.end.getTime() - drag.start.getTime();
  const pxPerMinute = HOUR_HEIGHT / 60;
  const rawMinutes = (pointer.clientY - drag.originY) / pxPerMinute;
  const minutesDelta = Math.round(rawMinutes / MINUTE_INCREMENT) * MINUTE_INCREMENT;
  const minuteMsDelta = minutesDelta * MINUTE;

  if (drag.kind === "move") {
    const columnWidth = bounds.width / DAYS_IN_WEEK;
    const rawDayOffset = Math.round((pointer.clientX - drag.originX) / columnWidth);
    let startMs = drag.start.getTime() + minuteMsDelta + rawDayOffset * DAY;
    if (startMs < weekStartMs) {
      startMs = weekStartMs;
    }
    if (startMs + durationMs > weekEndMs) {
      startMs = weekEndMs - durationMs;
    }
    const endMs = Math.min(startMs + durationMs, weekEndMs);
    return {
      start: new Date(startMs),
      end: new Date(endMs),
    };
  }

  if (drag.kind === "resize-start") {
    let startMs = drag.start.getTime() + minuteMsDelta;
    if (startMs < weekStartMs) startMs = weekStartMs;
    if (startMs > drag.end.getTime() - MIN_DURATION_MS) {
      startMs = drag.end.getTime() - MIN_DURATION_MS;
    }
    return {
      start: new Date(startMs),
      end: new Date(drag.end),
    };
  }

  // resize-end
  let endMs = drag.end.getTime() + minuteMsDelta;
  if (endMs > weekEndMs) endMs = weekEndMs;
  if (endMs < drag.start.getTime() + MIN_DURATION_MS) {
    endMs = drag.start.getTime() + MIN_DURATION_MS;
  }
  return {
    start: new Date(drag.start),
    end: new Date(endMs),
  };
}

export function WeekCalendar({ events, startOfWeek, onEventChange, renderEventFooter, isLoading }: WeekCalendarProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<WeekCalendarDragState | null>(null);
  const [preview, setPreview] = useState<{ id: string; start: Date; end: Date } | null>(null);
  const weekStart = useMemo(() => normalizeStart(startOfWeek), [startOfWeek]);

  useEffect(() => {
    if (!drag) return;
    const handleMove = (event: PointerEvent) => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const next = computeEventPosition(
        { clientX: event.clientX, clientY: event.clientY },
        drag,
        bounds,
        weekStart
      );
      if (next) {
        setPreview({ id: drag.id, ...next });
      }
    };
    const handleUp = (event: PointerEvent) => {
      const bounds = containerRef.current?.getBoundingClientRect();
      setDrag(null);
      if (!bounds) {
        setPreview(null);
        return;
      }
      const result = computeEventPosition(
        { clientX: event.clientX, clientY: event.clientY },
        drag,
        bounds,
        weekStart
      );
      setPreview(null);
      if (result) {
        onEventChange(drag.id, result);
      }
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [drag, onEventChange, weekStart]);

  useEffect(() => {
    if (!drag) {
      setPreview(null);
    }
  }, [drag]);

  const displayEvents = useMemo(() => {
    return events.map((event) => {
      if (preview && preview.id === event.id) {
        return { ...event, start: preview.start, end: preview.end };
      }
      return event;
    });
  }, [events, preview]);

  const handlePointerDown = (kind: DragKind, eventData: CalendarEvent) =>
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDrag({
        id: eventData.id,
        kind,
        originX: event.clientX,
        originY: event.clientY,
        start: eventData.start,
        end: eventData.end,
      });
    };

  const hours = useMemo(() => Array.from({ length: HOURS_IN_DAY }, (_, i) => i), []);
  const days = useMemo(() => Array.from({ length: DAYS_IN_WEEK }, (_, i) => i), []);

  return (
    <div className="planner-calendar">
      <div className="planner-calendar__header">
        <div className="planner-calendar__spacer" />
        {days.map((dayIdx) => (
          <div key={dayIdx} className="planner-calendar__column-label">
            {toLocaleDayLabel(weekStart, dayIdx)}
          </div>
        ))}
      </div>
      <div className="planner-calendar__body" ref={containerRef}>
        <div className="planner-calendar__times">
          {hours.map((hour) => (
            <div key={hour} className="planner-calendar__time">
              {hour === 0 ? "12a" : hour < 12 ? `${hour}a` : hour === 12 ? "12p" : `${hour - 12}p`}
            </div>
          ))}
        </div>
        <div className="planner-calendar__grid">
          {days.map((dayIndex) => {
            const dayStart = new Date(weekStart.getTime() + dayIndex * DAY);
            const dayEnd = new Date(dayStart.getTime() + DAY);
            return (
              <div key={dayIndex} className="planner-calendar__day">
                {hours.map((hour) => (
                  <div key={hour} className="planner-calendar__slot" />
                ))}
                {displayEvents
                  .filter((evt) => evt.start >= dayStart && evt.start < dayEnd)
                  .map((evt) => {
                    const topMinutes = (evt.start.getTime() - dayStart.getTime()) / MINUTE;
                    const durationMinutes = Math.max(
                      (evt.end.getTime() - evt.start.getTime()) / MINUTE,
                      MINUTE_INCREMENT
                    );
                    return (
                      <div
                        key={evt.id}
                        className="planner-calendar__event"
                        style={{
                          top: `${(topMinutes / 60) * HOUR_HEIGHT}px`,
                          height: `${(durationMinutes / 60) * HOUR_HEIGHT}px`,
                        }}
                        onPointerDown={handlePointerDown("move", evt)}
                      >
                        <div className="planner-calendar__event-content">
                          <div className="planner-calendar__event-title">{evt.title}</div>
                          {renderEventFooter ? (
                            <div className="planner-calendar__event-footer">{renderEventFooter(evt)}</div>
                          ) : null}
                        </div>
                        <div
                          className="planner-calendar__handle planner-calendar__handle--start"
                          onPointerDown={handlePointerDown("resize-start", evt)}
                        />
                        <div
                          className="planner-calendar__handle planner-calendar__handle--end"
                          onPointerDown={handlePointerDown("resize-end", evt)}
                        />
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
      {isLoading ? <div className="planner-calendar__loading">Loading tasks…</div> : null}
    </div>
  );
}

export function __testComputeEventPosition(
  pointer: PointerInput,
  drag: WeekCalendarDragState,
  bounds: DOMRect,
  weekStart: Date
) {
  return computeEventPosition(pointer, drag, bounds, weekStart);
}
