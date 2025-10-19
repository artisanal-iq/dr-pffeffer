import { describe, expect, it } from "vitest";
import { onboardingSchema } from "./schema";

const base = {
  persona: "presence_maven",
  work_start: "09:00",
  work_end: "17:00",
  theme: "system",
  theme_contrast: "balanced",
  accent_color: "violet",
} as const;

describe("onboardingSchema", () => {
  it("accepts a complete configuration", () => {
    expect(() => onboardingSchema.parse(base)).not.toThrow();
  });

  it("rejects when persona is missing", () => {
    expect(() => onboardingSchema.parse({ ...base, persona: undefined as never })).toThrow(/persona/i);
  });

  it("rejects when end time is before the start", () => {
    expect(() => onboardingSchema.parse({ ...base, work_start: "18:00", work_end: "16:00" })).toThrow(/end time/i);
  });
});
