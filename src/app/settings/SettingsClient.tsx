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

function toNullable(value: string) {
  return value.trim() ? value.trim() : null;
}

export default function SettingsClient() {
  const { data, isLoading } = useSettings();
  const profileMutation = useUpsertSettings();
  const notificationsMutation = useUpsertSettings();
  const aiMutation = useUpsertSettings();
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

  useEffect(() => {
    if (!data) {
      return;
    }
    setNotificationsEnabled(data.notifications ?? true);
    setAiPersona(data.ai_persona ?? "");
    setPersona(data.persona ?? "");
    setWorkStart(data.work_start ?? "");
    setWorkEnd(data.work_end ?? "");
    setThemeContrast(data.theme_contrast ?? "");
    setAccentColor(data.accent_color ?? "");
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
      aiMutation.isPending,
    [
      aiMutation.isPending,
      isLoading,
      notificationsMutation.isPending,
      profileMutation.isPending,
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
