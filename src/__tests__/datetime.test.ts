import { describe, expect, it } from "vitest";

import {
  Temporal,
  formatForLocale,
  luxonToTemporal,
  parseISOToTemporal,
  temporalToLuxon,
} from "@/lib/datetime";

describe("datetime helpers", () => {
  it("maintains DST-aware offsets when converting between Temporal and Luxon", () => {
    const zone = "America/New_York";
    const input = parseISOToTemporal("2024-03-10T01:30:00-05:00", { timeZone: zone });
    const luxon = temporalToLuxon(input);

    expect(luxon.toISO()).toContain("-05:00");

    const roundTrip = luxonToTemporal(luxon, { timeZone: zone });
    expect(roundTrip.toString()).toBe(input.toString());
  });

  it("correctly handles leap-year dates", () => {
    const temporal = parseISOToTemporal("2024-02-29T12:00:00", { timeZone: "UTC" });
    const luxon = temporalToLuxon(temporal);

    expect(luxon.day).toBe(29);

    const again = luxonToTemporal(luxon, { timeZone: "UTC" });
    expect(again.toPlainDateTime().toString()).toContain("2024-02-29");
  });

  it("formats locale-aware strings", () => {
    const temporal = parseISOToTemporal("2024-12-11T09:15:00", { timeZone: "Europe/Paris" });
    const formatted = formatForLocale(temporal, {
      locale: "fr-FR",
      timeZone: "Europe/Paris",
      options: { dateStyle: "long", timeStyle: "short" },
    });

    expect(formatted).toMatch(/11/);
    expect(formatted).toMatch(/09:15/);
  });

  it("provides a stable today reference for the calendar", () => {
    const now = Temporal.Now.zonedDateTimeISO("UTC");
    const luxonNow = temporalToLuxon(now);
    expect(luxonNow.hasSame(temporalToLuxon(now), "day")).toBe(true);
  });
});
