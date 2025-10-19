"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useSettings, useUpsertSettings } from "@/hooks/settings";
import {
  accentColorOptions,
  personaOptions,
  themeContrastOptions,
  themeModeOptions,
} from "@/lib/profile-schema";
import type { OnboardingFormValues } from "./schema";
import { defaultOnboardingValues, onboardingSchema } from "./schema";

const steps: { id: string; label: string; description: string; fields: (keyof OnboardingFormValues)[] }[] = [
  {
    id: "persona",
    label: "Choose persona",
    description: "Who should guide your productivity practice?",
    fields: ["persona"],
  },
  {
    id: "hours",
    label: "Working hours",
    description: "Tell us when you want deep support.",
    fields: ["work_start", "work_end"],
  },
  {
    id: "theme",
    label: "Theme",
    description: "Make the workspace feel like yours.",
    fields: ["theme", "theme_contrast", "accent_color"],
  },
];

const personaMetadata: Record<OnboardingFormValues["persona"], { title: string; summary: string }> = {
  presence_maven: {
    title: "Presence Maven",
    summary: "Mindful prompts to deepen focus and awareness.",
  },
  purpose_architect: {
    title: "Purpose Architect",
    summary: "Strategic nudges that align actions with your long-term vision.",
  },
  momentum_maker: {
    title: "Momentum Maker",
    summary: "Energizing check-ins to keep your progress compounding.",
  },
};

const contrastCopy: Record<OnboardingFormValues["theme_contrast"], string> = {
  balanced: "Balanced",
  soft: "Soft",
  bold: "Bold",
};

const accentCopy: Record<OnboardingFormValues["accent_color"], string> = {
  violet: "Violet",
  blue: "Blue",
  emerald: "Emerald",
  amber: "Amber",
};

const themeCopy: Record<OnboardingFormValues["theme"], string> = {
  system: "Match system",
  light: "Light",
  dark: "Dark",
};

export default function OnboardingClient() {
  const router = useRouter();
  const { data, isLoading, error } = useSettings();
  const upsert = useUpsertSettings();
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: defaultOnboardingValues,
  });
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (data) {
      form.reset({
        persona: (data.persona as OnboardingFormValues["persona"]) ?? defaultOnboardingValues.persona,
        work_start: data.work_start ?? defaultOnboardingValues.work_start,
        work_end: data.work_end ?? defaultOnboardingValues.work_end,
        theme: (data.theme as OnboardingFormValues["theme"]) ?? defaultOnboardingValues.theme,
        theme_contrast:
          (data.theme_contrast as OnboardingFormValues["theme_contrast"]) ?? defaultOnboardingValues.theme_contrast,
        accent_color:
          (data.accent_color as OnboardingFormValues["accent_color"]) ?? defaultOnboardingValues.accent_color,
      });
    }
  }, [data, form]);

  const currentStep = steps[stepIndex];
  const watchedPersona = form.watch("persona");
  const watchedTheme = form.watch("theme");
  const watchedContrast = form.watch("theme_contrast");
  const watchedAccent = form.watch("accent_color");

  const isLastStep = stepIndex === steps.length - 1;

  async function handleNext() {
    const stepFields = currentStep.fields;
    const valid = await form.trigger(stepFields);
    if (!valid) return;

    if (isLastStep) {
      const values = form.getValues();
      try {
        await upsert.mutateAsync({
          persona: values.persona,
          work_start: values.work_start,
          work_end: values.work_end,
          theme: values.theme,
          theme_contrast: values.theme_contrast,
          accent_color: values.accent_color,
        });
        router.push("/dashboard");
      } catch (err) {
        console.error(err);
      }
      return;
    }

    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }

  function handleBack() {
    setStepIndex((index) => Math.max(index - 1, 0));
  }

  const disableNext = upsert.isPending;

  const errorMessage = useMemo(() => {
    return currentStep.fields
      .map((field) => form.formState.errors[field]?.message)
      .find((message) => Boolean(message));
  }, [currentStep.fields, form.formState.errors]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your preferences…</p>;
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Unable to load preferences.";
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {message}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-background/50 p-6 shadow-sm">
      <ol className="flex items-center gap-4 text-sm font-medium">
        {steps.map((step, index) => {
          const active = index === stepIndex;
          const complete = index < stepIndex;
          return (
            <li key={step.id} className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : complete
                      ? "border-emerald-500/80 bg-emerald-500/10 text-emerald-600"
                      : "border-border text-muted-foreground"
                }`}
              >
                {index + 1}
              </span>
              <div className="hidden sm:block">
                <p className={`font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <form className="mt-8 space-y-8" onSubmit={(event) => event.preventDefault()}>
        {currentStep.id === "persona" && (
          <div className="grid gap-4 sm:grid-cols-3">
            {personaOptions.map((option) => {
              const persona = option as OnboardingFormValues["persona"];
              const selected = watchedPersona === persona;
              return (
                <label
                  key={persona}
                  className={`cursor-pointer rounded-lg border p-4 transition hover:border-primary ${
                    selected ? "border-primary ring-2 ring-primary/40" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    value={persona}
                    className="sr-only"
                    {...form.register("persona")}
                  />
                  <p className="font-semibold">{personaMetadata[persona].title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{personaMetadata[persona].summary}</p>
                </label>
              );
            })}
          </div>
        )}

        {currentStep.id === "hours" && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground" htmlFor="work_start">
                Start time
              </label>
              <input
                type="time"
                id="work_start"
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-base"
                {...form.register("work_start")}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground" htmlFor="work_end">
                End time
              </label>
              <input
                type="time"
                id="work_end"
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-base"
                {...form.register("work_end")}
              />
            </div>
          </div>
        )}

        {currentStep.id === "theme" && (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Mode</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {themeModeOptions.map((mode) => {
                  const value = mode as OnboardingFormValues["theme"];
                  const selected = watchedTheme === value;
                  return (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
                        selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      <input type="radio" className="sr-only" value={value} {...form.register("theme")} />
                      {themeCopy[value]}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Contrast</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {themeContrastOptions.map((contrast) => {
                  const value = contrast as OnboardingFormValues["theme_contrast"];
                  const selected = watchedContrast === value;
                  return (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
                        selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      <input type="radio" className="sr-only" value={value} {...form.register("theme_contrast")} />
                      {contrastCopy[value]}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Accent color</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {accentColorOptions.map((accent) => {
                  const value = accent as OnboardingFormValues["accent_color"];
                  const selected = watchedAccent === value;
                  return (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
                        selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      <input type="radio" className="sr-only" value={value} {...form.register("accent_color")} />
                      {accentCopy[value]}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-muted"
            onClick={handleBack}
            disabled={stepIndex === 0 || upsert.isPending}
          >
            Back
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleNext}
            disabled={disableNext}
          >
            {isLastStep ? (upsert.isPending ? "Saving…" : "Finish setup") : "Next"}
          </button>
        </div>
      </form>
    </div>
  );
}
