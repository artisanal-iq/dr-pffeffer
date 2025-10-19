"use client";

import { Temporal, formatForLocale, parseISOToTemporal, temporalToLuxon } from "@/lib/datetime";
import { cn } from "@/lib/utils";

type WeekCalendarProps = {
  startDate: string;
  locale?: string;
  timeZone?: string;
};

function addDays(date: Date, days: number) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function WeekCalendar({ startDate, locale = "en-US", timeZone = "UTC" }: WeekCalendarProps) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const today = temporalToLuxon(Temporal.Now.zonedDateTimeISO(timeZone));

  const days = Array.from({ length: 7 }, (_, index) => {
    const dayDate = addDays(start, index);
    const dayIso = `${dayDate.toISOString().slice(0, 10)}T00:00:00`;
    const temporal = parseISOToTemporal(dayIso, { timeZone });
    const label = formatForLocale(temporal, {
      locale,
      timeZone,
      options: { weekday: "short", month: "short", day: "numeric" },
    });
    const luxonDay = temporalToLuxon(temporal);
    const isToday = luxonDay.hasSame(today, "day");
    return { label, key: temporal.toString(), isToday };
  });

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => (
        <div
          key={day.key}
          className={cn(
            "rounded-md border p-3 text-center text-xs font-semibold uppercase",
            day.isToday && "border-primary bg-primary/10 text-primary"
          )}
        >
          {day.label}
        </div>
      ))}
    </div>
  );
}
