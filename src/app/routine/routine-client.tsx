"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/hooks/settings";
import { useCreatePowerPractice, usePowerPractices, useUpdatePowerPractice } from "@/hooks/powerPractices";
import {
  PRACTICE_PROMPTS,
  calculateStreaks,
  findPracticeForDate,
  getPracticeDate,
} from "@/lib/power-practices";
import { timeStringToMinutes } from "@/lib/profile-schema";
import type { PowerPractice } from "@/types/models";

function resolveTimeZone() {
  if (typeof Intl === "undefined") {
    return "UTC";
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function formatMinutesToLabel(minutes: number, timeZone: string) {
  const clamped = Math.max(0, Math.min(minutes, 23 * 60 + 59));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  const reference = new Date(Date.UTC(2024, 0, 1, hours, mins));
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(reference);
}

function deriveNudgeTime(
  settings: {
    work_start: string | null;
    work_end: string | null;
  } | null,
  timeZone: string
) {
  if (!settings?.work_start || !settings?.work_end) {
    return {
      label: formatMinutesToLabel(13 * 60, timeZone),
      basis: "Defaulting to 1:00 PM until work hours are set.",
    };
  }
  const start = timeStringToMinutes(settings.work_start);
  const end = timeStringToMinutes(settings.work_end);
  const midpoint = Math.round((start + end) / 2);
  const label = formatMinutesToLabel(midpoint, timeZone);
  return {
    label,
    basis: `Midpoint of your workday (${settings.work_start}–${settings.work_end}).`,
  };
}

function normalizeReflection(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function DailyRoutineClient() {
  const timeZone = useMemo(() => resolveTimeZone(), []);
  const todayKey = useMemo(() => getPracticeDate(new Date(), timeZone), [timeZone]);
  const nowLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "full",
        timeZone,
      }).format(new Date()),
    [timeZone]
  );

  const practicesQuery = usePowerPractices();
  const practices = practicesQuery.data?.items ?? [];
  const todaysPractice = useMemo<PowerPractice | null>(
    () => findPracticeForDate(practices, todayKey),
    [practices, todayKey]
  );

  const [practiceId, setPracticeId] = useState<string | null>(todaysPractice?.id ?? null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(todaysPractice?.focus ?? null);
  const [reflection, setReflection] = useState(todaysPractice?.reflection ?? "");
  const [rating, setRating] = useState<number | null>(todaysPractice?.rating ?? null);
  const [focusStatus, setFocusStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [reflectionStatus, setReflectionStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setPracticeId(todaysPractice?.id ?? null);
    setSelectedPrompt(todaysPractice?.focus ?? null);
    setReflection(todaysPractice?.reflection ?? "");
    setRating(todaysPractice?.rating ?? null);
  }, [todaysPractice?.id, todaysPractice?.focus, todaysPractice?.reflection, todaysPractice?.rating]);

  const createMutation = useCreatePowerPractice();
  const updateMutation = useUpdatePowerPractice(practiceId ?? "");
  const isBusy = createMutation.isPending || updateMutation.isPending;

  const streaks = useMemo(() => calculateStreaks(practices, todayKey), [practices, todayKey]);

  const settingsQuery = useSettings();
  const settings = settingsQuery.data ?? null;
  const nudge = useMemo(() => deriveNudgeTime(settings, timeZone), [settings, timeZone]);
  const notificationsEnabled = settings?.notifications ?? true;

  const handlePromptSelect = async (prompt: { title: string }) => {
    setFocusStatus("saving");
    setErrorMessage(null);
    const nextFocus = prompt.title;
    setSelectedPrompt(nextFocus);
    try {
      if (practiceId) {
        await updateMutation.mutateAsync({ focus: nextFocus });
      } else {
        const created = await createMutation.mutateAsync({
          date: todayKey,
          focus: nextFocus,
          reflection: null,
          rating: null,
        });
        setPracticeId(created.id);
      }
      setFocusStatus("saved");
    } catch (error) {
      console.error("Failed to save focus prompt", error);
      setFocusStatus("error");
      setSelectedPrompt(todaysPractice?.focus ?? null);
      setErrorMessage("Unable to save focus prompt. Try again.");
    }
  };

  const handleReflectionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!practiceId) {
      setErrorMessage("Select a focus prompt before saving your reflection.");
      return;
    }
    setReflectionStatus("saving");
    setErrorMessage(null);
    try {
      await updateMutation.mutateAsync({
        reflection: normalizeReflection(reflection),
        rating,
      });
      setReflectionStatus("saved");
    } catch (error) {
      console.error("Failed to save reflection", error);
      setReflectionStatus("error");
      setErrorMessage("Unable to save reflection. Try again.");
    }
  };

  const resetReflectionState = () => {
    setReflectionStatus("idle");
  };

  useEffect(() => {
    if (focusStatus === "saved") {
      const timeout = setTimeout(() => setFocusStatus("idle"), 2000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [focusStatus]);

  useEffect(() => {
    if (reflectionStatus === "saved") {
      const timeout = setTimeout(() => setReflectionStatus("idle"), 2000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [reflectionStatus]);

  return (
    <div className="space-y-6">
      <section>
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Today</CardTitle>
              <CardDescription>{nowLabel}</CardDescription>
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-muted-foreground">Current streak</p>
                <p className="text-lg font-semibold">{streaks.current} day{streaks.current === 1 ? "" : "s"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Best streak</p>
                <p className="text-lg font-semibold">{streaks.best} day{streaks.best === 1 ? "" : "s"}</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Morning focus prompt</CardTitle>
            <CardDescription>Select one prompt to orient your practice for the day.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {PRACTICE_PROMPTS.map((prompt) => {
                const selected = selectedPrompt === prompt.title;
                return (
                  <button
                    key={prompt.id}
                    type="button"
                    onClick={() => handlePromptSelect(prompt)}
                    disabled={isBusy}
                    className={`rounded-lg border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      selected
                        ? "border-foreground bg-foreground/5 dark:border-white"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <p className="font-medium">{prompt.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{prompt.description}</p>
                    {selected ? (
                      <p className="mt-2 text-xs font-medium text-foreground">Selected for today</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="text-sm text-muted-foreground">
              {focusStatus === "saving" && <span>Saving focus…</span>}
              {focusStatus === "saved" && <span>Focus saved.</span>}
              {focusStatus === "error" && <span className="text-red-500">Unable to save focus.</span>}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Midday nudge</CardTitle>
            <CardDescription>Manual reminder timing based on your working hours.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              {notificationsEnabled
                ? `Your scheduled nudge is set for ${nudge.label}.`
                : "Notifications are disabled. Enable them in Settings to receive midday reminders."}
            </p>
            <p className="text-xs text-muted-foreground">{nudge.basis}</p>
            {settingsQuery.isLoading && <p className="text-xs text-muted-foreground">Loading settings…</p>}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Evening reflection</CardTitle>
            <CardDescription>Capture what worked, what shifted, and your confidence level.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleReflectionSubmit}>
              <div className="space-y-2">
                <label htmlFor="reflection" className="text-sm font-medium">
                  Reflection
                </label>
                <Textarea
                  id="reflection"
                  value={reflection}
                  onChange={(event) => {
                    setReflection(event.target.value);
                    resetReflectionState();
                  }}
                  rows={5}
                  placeholder="What shifted in your presence, purpose, or productivity today?"
                  disabled={isBusy}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confidence" className="text-sm font-medium">
                  Confidence rating
                </label>
                <select
                  id="confidence"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={rating ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setRating(value ? Number(value) : null);
                    resetReflectionState();
                  }}
                  disabled={isBusy}
                >
                  <option value="">Select a rating (1–5)</option>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value} – {value === 1 ? "Unsteady" : value === 5 ? "Locked in" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Button type="submit" disabled={isBusy || !selectedPrompt}>
                  {reflectionStatus === "saving" ? "Saving…" : "Save reflection"}
                </Button>
                {reflectionStatus === "saved" && <span className="text-green-600">Reflection saved.</span>}
                {reflectionStatus === "error" && <span className="text-red-500">Unable to save reflection.</span>}
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
      {practicesQuery.isLoading && (
        <p className="text-sm text-muted-foreground">{"Loading today\u2019s practice…"}</p>
      )}
    </div>
  );
}
