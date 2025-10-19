const DEFAULT_LOCALE = "en-US";
const DEFAULT_TIME_ZONE = "UTC";

function pad(value: number, size = 2) {
  return value.toString().padStart(size, "0");
}

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  offsetMinutes: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(
      timeZone,
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour12: false,
        timeZoneName: "shortOffset",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
      })
    );
  }
  return formatterCache.get(timeZone)!;
}

function parseOffset(value: string) {
  const match = value.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) {
    return 0;
  }
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] ?? "0");
  const minutes = Number(match[3] ?? "0");
  return sign * (hours * 60 + minutes);
}

function formatOffset(minutes: number) {
  const sign = minutes < 0 ? "-" : "+";
  const absolute = Math.abs(minutes);
  const hours = Math.trunc(absolute / 60);
  const mins = absolute % 60;
  return `${sign}${pad(hours)}:${pad(mins)}`;
}

function getLocalParts(date: Date, timeZone: string): DateParts {
  const formatter = getFormatter(timeZone);
  const parts = formatter.formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) {
    values[part.type] = part.value;
  }
  const millis = values.fractionalSecond ? Number(values.fractionalSecond.padEnd(3, "0")) : 0;
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    millisecond: millis,
    offsetMinutes: parseOffset(values.timeZoneName ?? "GMT+0"),
  };
}

function compareLocal(a: DateParts, b: DateParts) {
  return (
    Date.UTC(a.year, a.month - 1, a.day, a.hour, a.minute, a.second, a.millisecond) -
    Date.UTC(b.year, b.month - 1, b.day, b.hour, b.minute, b.second, b.millisecond)
  );
}

function localToUtc(parts: DateParts, timeZone: string) {
  let guess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond
  );
  let guessDate = new Date(guess);
  for (let i = 0; i < 8; i++) {
    const actual = getLocalParts(guessDate, timeZone);
    const diff = compareLocal(actual, parts);
    if (diff === 0) {
      return guessDate;
    }
    guess -= diff;
    guessDate = new Date(guess);
  }
  return guessDate;
}

export class TemporalInstant {
  constructor(private readonly epochMs: number) {}

  static fromEpochMilliseconds(ms: number) {
    return new TemporalInstant(ms);
  }

  static from(iso: string) {
    return new TemporalInstant(Date.parse(iso));
  }

  get epochMilliseconds() {
    return this.epochMs;
  }

  toZonedDateTimeISO(timeZone: string) {
    return new TemporalZonedDateTime(this.epochMs, timeZone);
  }

  toDate() {
    return new Date(this.epochMs);
  }

  toString() {
    return this.toDate().toISOString();
  }
}

export class TemporalPlainDateTime {
  constructor(private readonly parts: DateParts) {}

  static from(iso: string) {
    const [datePart, timePart = "00:00:00"] = iso.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour = "0", minute = "0", secondFraction = "0"] = timePart.split(":");
    const [secondStr, fraction = "0"] = secondFraction.split(".");
    return new TemporalPlainDateTime({
      year,
      month,
      day,
      hour: Number(hour),
      minute: Number(minute),
      second: Number(secondStr),
      millisecond: Number(fraction.padEnd(3, "0")),
      offsetMinutes: 0,
    });
  }

  toZonedDateTime(timeZone: string) {
    const date = localToUtc(this.parts, timeZone);
    return new TemporalZonedDateTime(date.getTime(), timeZone);
  }

  toString() {
    const { year, month, day, hour, minute, second, millisecond } = this.parts;
    return `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}.${pad(millisecond, 3)}`;
  }
}

export class TemporalZonedDateTime {
  constructor(private readonly epochMs: number, readonly timeZoneId: string) {}

  static from(iso: string) {
    const zoneMatch = iso.match(/\[(.+)\]$/);
    const timeZone = zoneMatch ? zoneMatch[1] : DEFAULT_TIME_ZONE;
    const withoutZone = zoneMatch ? iso.slice(0, -zoneMatch[0].length) : iso;
    const parsed = Date.parse(withoutZone);
    if (!Number.isNaN(parsed)) {
      return new TemporalZonedDateTime(parsed, timeZone);
    }
    const plain = TemporalPlainDateTime.from(withoutZone);
    return plain.toZonedDateTime(timeZone);
  }

  static fromDate(date: Date, timeZone: string) {
    return new TemporalZonedDateTime(date.getTime(), timeZone);
  }

  toInstant() {
    return TemporalInstant.fromEpochMilliseconds(this.epochMs);
  }

  toPlainDateTime() {
    const parts = getLocalParts(new Date(this.epochMs), this.timeZoneId);
    return new TemporalPlainDateTime(parts);
  }

  toJSDate() {
    return new Date(this.epochMs);
  }

  equals(other: TemporalZonedDateTime) {
    return this.epochMs === other.epochMs && this.timeZoneId === other.timeZoneId;
  }

  private get offsetMinutes() {
    return getLocalParts(new Date(this.epochMs), this.timeZoneId).offsetMinutes;
  }

  toString() {
    const parts = getLocalParts(new Date(this.epochMs), this.timeZoneId);
    const { year, month, day, hour, minute, second, millisecond } = parts;
    return `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}.${pad(millisecond, 3)}${formatOffset(this.offsetMinutes)}[${this.timeZoneId}]`;
  }

  toLocaleString(locale: string, options: Intl.DateTimeFormatOptions = {}) {
    return formatForLocale(this, { locale, options, timeZone: this.timeZoneId });
  }
}

export const Temporal = {
  Instant: TemporalInstant,
  PlainDateTime: TemporalPlainDateTime,
  ZonedDateTime: TemporalZonedDateTime,
  Now: {
    zonedDateTimeISO(timeZone: string) {
      return new TemporalZonedDateTime(Date.now(), timeZone);
    },
  },
};

export class LuxonDateTime {
  constructor(
    private readonly epochMs: number,
    readonly zoneName: string,
    readonly locale: string = DEFAULT_LOCALE
  ) {}

  static fromISO(iso: string, options: { zone?: string; locale?: string } = {}) {
    const zone = options.zone ?? DEFAULT_TIME_ZONE;
    const temporal = parseISOToTemporal(iso, { timeZone: zone });
    return new LuxonDateTime(temporal.toInstant().epochMilliseconds, zone, options.locale ?? DEFAULT_LOCALE);
  }

  static fromTemporal(value: TemporalZonedDateTime, locale = DEFAULT_LOCALE) {
    return new LuxonDateTime(value.toInstant().epochMilliseconds, value.timeZoneId, locale);
  }

  static fromDate(date: Date, zone: string, locale = DEFAULT_LOCALE) {
    return new LuxonDateTime(date.getTime(), zone, locale);
  }

  private parts() {
    return getLocalParts(new Date(this.epochMs), this.zoneName);
  }

  toISO() {
    const { year, month, day, hour, minute, second, millisecond, offsetMinutes } = this.parts();
    return `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}.${pad(millisecond, 3)}${formatOffset(offsetMinutes)}`;
  }

  setZone(zone: string, options: { keepLocalTime?: boolean } = {}) {
    if (zone === this.zoneName) {
      return new LuxonDateTime(this.epochMs, zone, this.locale);
    }
    if (options.keepLocalTime) {
      const { year, month, day, hour, minute, second, millisecond } = this.parts();
      const date = localToUtc({
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        offsetMinutes: 0,
      }, zone);
      return new LuxonDateTime(date.getTime(), zone, this.locale);
    }
    return new LuxonDateTime(this.epochMs, zone, this.locale);
  }

  setLocale(locale: string) {
    return new LuxonDateTime(this.epochMs, this.zoneName, locale);
  }

  toLocaleString(options: Intl.DateTimeFormatOptions = {}) {
    return formatForLocale(this, { locale: this.locale, options, timeZone: this.zoneName });
  }

  hasSame(other: LuxonDateTime, unit: "day" | "month" | "year") {
    const a = this.parts();
    const b = other.parts();
    if (unit === "day") {
      return a.year === b.year && a.month === b.month && a.day === b.day;
    }
    if (unit === "month") {
      return a.year === b.year && a.month === b.month;
    }
    return a.year === b.year;
  }

  get day() {
    return this.parts().day;
  }

  toJSDate() {
    return new Date(this.epochMs);
  }
}

type TimeLike =
  | TemporalZonedDateTime
  | TemporalPlainDateTime
  | TemporalInstant
  | LuxonDateTime
  | string;

type TemporalOptions = {
  timeZone?: string;
};

type FormatOptions = {
  locale?: string;
  timeZone?: string;
  options?: Intl.DateTimeFormatOptions;
};

function ensureTemporalZonedDateTime(value: TimeLike, options: TemporalOptions = {}) {
  if (value instanceof TemporalZonedDateTime) {
    return value;
  }
  if (value instanceof TemporalPlainDateTime) {
    return value.toZonedDateTime(options.timeZone ?? DEFAULT_TIME_ZONE);
  }
  if (value instanceof TemporalInstant) {
    return value.toZonedDateTimeISO(options.timeZone ?? DEFAULT_TIME_ZONE);
  }
  if (value instanceof LuxonDateTime) {
    return luxonToTemporal(value, options);
  }
  if (typeof value === "string") {
    return parseISOToTemporal(value, options);
  }
  throw new TypeError("Unsupported temporal value");
}

export function temporalToLuxon(
  value: TemporalZonedDateTime | TemporalPlainDateTime | TemporalInstant,
  options: TemporalOptions = {}
) {
  const zoned = ensureTemporalZonedDateTime(value, options);
  return LuxonDateTime.fromTemporal(zoned);
}

export function luxonToTemporal(value: LuxonDateTime, options: TemporalOptions = {}) {
  const zone = options.timeZone ?? value.zoneName ?? DEFAULT_TIME_ZONE;
  const { year, month, day, hour, minute, second, millisecond } = getLocalParts(value.toJSDate(), value.zoneName);
  const instant = localToUtc(
    { year, month, day, hour, minute, second, millisecond, offsetMinutes: 0 },
    zone
  );
  return new TemporalZonedDateTime(instant.getTime(), zone);
}

export function parseISOToTemporal(iso: string, options: TemporalOptions = {}) {
  const zone = options.timeZone ?? DEFAULT_TIME_ZONE;
  const hasZone = /\[.*\]$/.test(iso);
  if (hasZone) {
    return TemporalZonedDateTime.from(iso);
  }
  if (/Z$/.test(iso) || /[+-]\d{2}:\d{2}$/.test(iso)) {
    return TemporalZonedDateTime.from(`${iso}[${zone}]`);
  }
  const plain = TemporalPlainDateTime.from(iso);
  return plain.toZonedDateTime(zone);
}

export function formatForLocale(value: TimeLike, options: FormatOptions = {}) {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const zoned = ensureTemporalZonedDateTime(value, { timeZone: options.timeZone });
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    ...options.options,
    timeZone: options.timeZone ?? zoned.timeZoneId,
  });
  return formatter.format(zoned.toInstant().toDate());
}

