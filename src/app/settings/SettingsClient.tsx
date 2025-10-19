"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useThemeSettings, type ThemeName } from "@/context/theme-context";
import { useSettings, useUpsertSettings } from "@/hooks/settings";
import {
  accentColorOptions,
  personaOptions,
  themeContrastOptions,
  themeModeOptions,
} from "@/lib/profile-schema";
import {
  addNudgeScheduleTime,
  removeNudgeScheduleTime,
  toggleNudgeScheduleTime,
  NudgeScheduleError,
} from "@/lib/nudges/schedule";
import type { NudgeScheduleEntry } from "@/types/models";

function toNullable(value: string) {
  return value.trim() ? value.trim() : null;
}

export default function SettingsClient() {
  const { data, isLoading } = useSettings();
  const profileMutation = useUpsertSettings();
  const notificationsMutation = useUpsertSettings();
  const aiMutation = useUpsertSettings();
  const scheduleMutation = useUpsertSettings();
  const { theme, setTheme, isLoading: themeLoading } = useThemeSettings();

  const [selectedTheme, setSelectedTheme] = useState<ThemeName>("system");
  const [themeSyncing, setThemeSyncing] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  const [aiPersona, setAiPersona] = useState("");
  const [aiStatus, setAiStatus] = useState<"idle" | "success" | "error">("idle");

  const [persona, setPersona] = useState("");
  const [workStart, setWorkStart] = useState("");
  const [workEnd, setWorkEnd] = useState("");
  const [themeContrast, setThemeContrast] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [nudgeSchedule, setNudgeSchedule] = useState<NudgeScheduleEntry[]>([]);
  const [newNudgeTime, setNewNudgeTime] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      setNudgeSchedule([]);
      return;
    }
    setNotificationsEnabled(data.notifications ?? true);
    setAiPersona(data.ai_persona ?? "");
    setPersona(data.persona ?? "");
    setWorkStart(data.work_start ?? "");
    setWorkEnd(data.work_end ?? "");
    setThemeContrast(data.theme_contrast ?? "");
    setAccentColor(data.accent_color ?? "");
    const schedule = Array.isArray(data.nudge_schedule) ? data.nudge_schedule : [];
    setNudgeSchedule([...schedule].sort((a, b) => a.time.localeCompare(b.time)));
  }, [data]);

  useEffect(() => {
    setSelectedTheme(theme);
  }, [theme]);

  const isBusy = useMemo(
    () =>
      isLoading ||
      themeLoading ||
      themeSyncing ||
      profileMutation.isPending ||
      notificationsMutation.isPending ||
      aiMutation.isPending ||
      scheduleMutation.isPending,
    [
      aiMutation.isPending,
      isLoading,
      notificationsMutation.isPending,
      profileMutation.isPending,
      scheduleMutation.isPending,
      themeLoading,
      themeSyncing,
    ]
  );

  const handleThemeChange = async (nextValue: ThemeName) => {
    setSelectedTheme(nextValue);
    setThemeError(null);
    setThemeSyncing(true);
    try {
      await setTheme(nextValue);
    } catch (error) {
      console.error("Failed to persist theme", error);
      setSelectedTheme(theme);
      setThemeError("Unable to update theme. Try again.");
    } finally {
      setThemeSyncing(false);
    }
  };

  const handleNotificationsChange = async (nextValue: boolean) => {
    setNotificationError(null);
    const previous = notificationsEnabled;
    setNotificationsEnabled(nextValue);
    try {
      await notificationsMutation.mutateAsync({ notifications: nextValue });
    } catch (error) {
      console.error("Failed to update notifications", error);
      setNotificationsEnabled(previous);
      setNotificationError("Unable to update notifications. Try again.");
    }
  };

  const handleAiSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAiStatus("idle");
    try {
      await aiMutation.mutateAsync({ ai_persona: toNullable(aiPersona) });
      setAiStatus("success");
    } catch (error) {
      console.error("Failed to save AI persona", error);
      setAiStatus("error");
    }
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await profileMutation.mutateAsync({
      persona: toNullable(persona),
      work_start: toNullable(workStart),
      work_end: toNullable(workEnd),
      theme_contrast: toNullable(themeContrast),
      accent_color: toNullable(accentColor),
    });
  };

  const updateNudgeSchedule = async (
    updater: (current: NudgeScheduleEntry[]) => NudgeScheduleEntry[]
  ) => {
    setScheduleError(null);
    const previous = nudgeSchedule.map((entry) => ({ ...entry }));
    let next: NudgeScheduleEntry[];
    try {
      next = updater(previous);
    } catch (error) {
      if (error instanceof NudgeScheduleError) {
        setScheduleError(error.message);
      } else if (error instanceof Error) {
        setScheduleError(error.message);
      } else {
        setScheduleError("Unable to update nudge schedule.");
      }
      return false;
    }

    setNudgeSchedule(next);
    try {
      await scheduleMutation.mutateAsync({ nudge_schedule: next });
      return true;
    } catch (error) {
      console.error("Failed to save nudge schedule", error);
      setScheduleError("Unable to save nudge schedule. Try again.");
      setNudgeSchedule(previous);
      return false;
    }
  };

  const handleAddNudgeTime = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newNudgeTime) {
      setScheduleError("Choose a time to add.");
      return;
    }
    const success = await updateNudgeSchedule((current) =>
      addNudgeScheduleTime(current, newNudgeTime)
    );
    if (success) {
      setNewNudgeTime("");
    }
  };

  const handleToggleNudgeTime = async (time: string) => {
    await updateNudgeSchedule((current) => toggleNudgeScheduleTime(current, time));
  };

  const handleRemoveNudgeTime = async (time: string) => {
    await updateNudgeSchedule((current) => removeNudgeScheduleTime(current, time));
  };

  return (
    <div className="mt-6 space-y-8 max-w-xl">
      <section className="space-y-2">
        <label className="block text-sm mb-1">Theme</label>
        <select
          className="w-full border rounded px-3 py-2 bg-transparent"
          value={selectedTheme}
          onChange={(event) => handleThemeChange(event.target.value as ThemeName)}
          disabled={themeLoading || themeSyncing}
        >
          {themeModeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {themeError ? <p className="text-sm text-red-500">{themeError}</p> : null}
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            id="notifications"
            type="checkbox"
            checked={notificationsEnabled}
            onChange={(event) => handleNotificationsChange(event.target.checked)}
            disabled={notificationsMutation.isPending}
          />
          <label htmlFor="notifications" className="text-sm">
            Enable notifications
          </label>
        </div>
        {notificationsMutation.isPending ? (
          <p className="text-xs text-muted-foreground">Saving notification preference…</p>
        ) : null}
        {notificationError ? <p className="text-sm text-red-500">{notificationError}</p> : null}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">Nudge schedule</h2>
          <p className="text-xs text-muted-foreground">
            Add the times you want to receive midday reminders.
          </p>
        </div>
        <form className="flex flex-wrap gap-2" onSubmit={handleAddNudgeTime}>
          <input
            type="time"
            value={newNudgeTime}
            onChange={(event) => {
              setScheduleError(null);
              setNewNudgeTime(event.target.value);
            }}
            className="border rounded px-3 py-2 bg-transparent"
            disabled={scheduleMutation.isPending}
          />
          <button
            type="submit"
            className="px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black disabled:opacity-50"
            disabled={scheduleMutation.isPending}
          >
            {scheduleMutation.isPending ? "Saving…" : "Add time"}
          </button>
        </form>
        {scheduleError ? <p className="text-sm text-red-500">{scheduleError}</p> : null}
        <ul className="space-y-2">
          {nudgeSchedule.length === 0 ? (
            <li className="text-xs text-muted-foreground">No nudges scheduled yet.</li>
          ) : (
            nudgeSchedule.map((entry) => (
              <li
                key={entry.time}
                className="flex items-center justify-between gap-3 border rounded px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={entry.enabled}
                    onChange={() => handleToggleNudgeTime(entry.time)}
                    disabled={scheduleMutation.isPending}
                  />
                  <span className="font-mono text-sm">{entry.time}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveNudgeTime(entry.time)}
                  className="text-xs text-muted-foreground hover:text-red-500 disabled:opacity-50"
                  disabled={scheduleMutation.isPending}
                >
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>
        {scheduleMutation.isPending ? (
          <p className="text-xs text-muted-foreground">Saving schedule…</p>
        ) : null}
      </section>

      <form className="space-y-2" onSubmit={handleAiSubmit}>
        <label className="block text-sm mb-1" htmlFor="ai-persona">
          AI persona
        </label>
        <textarea
          id="ai-persona"
          className="w-full border rounded px-3 py-2 bg-transparent"
          rows={4}
          value={aiPersona}
          onChange={(event) => {
            setAiPersona(event.target.value);
            setAiStatus("idle");
          }}
        />
        <div className="flex items-center gap-3 text-sm">
          <button
            type="submit"
            className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black disabled:opacity-50"
            disabled={aiMutation.isPending}
          >
            {aiMutation.isPending ? "Saving…" : "Save AI persona"}
          </button>
          {aiStatus === "success" ? (
            <span className="text-green-600">Saved!</span>
          ) : aiStatus === "error" ? (
            <span className="text-red-500">Unable to save. Try again.</span>
          ) : null}
        </div>
      </form>

      <form className="space-y-4" onSubmit={handleProfileSubmit}>
        <div>
          <label className="block text-sm mb-1" htmlFor="persona">
            Preferred persona
          </label>
          <select
            id="persona"
            className="w-full border rounded px-3 py-2 bg-transparent"
            value={persona}
            onChange={(event) => setPersona(event.target.value)}
          >
            <option value="">Select persona</option>
            {personaOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm mb-1" htmlFor="work-start">
              Workday start
            </label>
            <input
              id="work-start"
              type="time"
              className="w-full border rounded px-3 py-2 bg-transparent"
              value={workStart}
              onChange={(event) => setWorkStart(event.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="work-end">
              Workday end
            </label>
            <input
              id="work-end"
              type="time"
              className="w-full border rounded px-3 py-2 bg-transparent"
              value={workEnd}
              onChange={(event) => setWorkEnd(event.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1" htmlFor="theme-contrast">
            Theme contrast
          </label>
          <select
            id="theme-contrast"
            className="w-full border rounded px-3 py-2 bg-transparent"
            value={themeContrast}
            onChange={(event) => setThemeContrast(event.target.value)}
          >
            <option value="">Select contrast</option>
            {themeContrastOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1" htmlFor="accent-color">
            Accent color
          </label>
          <select
            id="accent-color"
            className="w-full border rounded px-3 py-2 bg-transparent"
            value={accentColor}
            onChange={(event) => setAccentColor(event.target.value)}
          >
            <option value="">Select color</option>
            {accentColorOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black disabled:opacity-50"
            disabled={profileMutation.isPending}
          >
            {profileMutation.isPending ? "Saving…" : "Save preferences"}
          </button>
          {profileMutation.isSuccess ? (
            <span className="text-green-600 text-sm">Preferences updated</span>
          ) : null}
        </div>
      </form>

      {isBusy ? <p className="text-xs text-muted-foreground">Syncing your preferences…</p> : null}
    </div>
  );
}
