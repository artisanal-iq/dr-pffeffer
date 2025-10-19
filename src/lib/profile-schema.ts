import { z } from "zod";

export const personaOptions = [
  "presence_maven",
  "purpose_architect",
  "momentum_maker",
] as const;

export const themeModeOptions = ["system", "light", "dark"] as const;

export const themeContrastOptions = ["balanced", "soft", "bold"] as const;

export const accentColorOptions = ["violet", "blue", "emerald", "amber"] as const;

export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/u, "Enter time as HH:MM");

export const profilePreferencesSchema = z.object({
  persona: z.enum(personaOptions).nullable().optional(),
  work_start: timeStringSchema.nullable().optional(),
  work_end: timeStringSchema.nullable().optional(),
  theme: z.enum(themeModeOptions).nullable().optional(),
  theme_contrast: z.enum(themeContrastOptions).nullable().optional(),
  accent_color: z.enum(accentColorOptions).nullable().optional(),
});

export type ProfilePreferences = z.infer<typeof profilePreferencesSchema>;

export function timeStringToMinutes(value: string) {
  const [h, m] = value.split(":").map((segment) => Number.parseInt(segment, 10));
  return h * 60 + m;
}
