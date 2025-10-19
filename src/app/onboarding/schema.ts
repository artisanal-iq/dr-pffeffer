import { z } from "zod";
import {
  accentColorOptions,
  personaOptions,
  themeContrastOptions,
  themeModeOptions,
  timeStringSchema,
  timeStringToMinutes,
} from "@/lib/profile-schema";

export const onboardingSchema = z
  .object({
    persona: z.enum(personaOptions),
    work_start: timeStringSchema,
    work_end: timeStringSchema,
    theme: z.enum(themeModeOptions),
    theme_contrast: z.enum(themeContrastOptions),
    accent_color: z.enum(accentColorOptions),
  })
  .refine(
    (value) => timeStringToMinutes(value.work_start) < timeStringToMinutes(value.work_end),
    {
      path: ["work_end"],
      message: "End time must come after your start time.",
    },
  );

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export const defaultOnboardingValues: OnboardingFormValues = {
  persona: "presence_maven",
  work_start: "09:00",
  work_end: "17:00",
  theme: "system",
  theme_contrast: "balanced",
  accent_color: "violet",
};
