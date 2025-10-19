"use client";
 import { useEffect, useState } from "react";
 import { useSettings, useUpsertSettings } from "@/hooks/settings";
 import {
   accentColorOptions,
   personaOptions,
   themeContrastOptions,
   themeModeOptions,
 } from "@/lib/profile-schema";

export default function SettingsClient() {
  const { data } = useSettings();
  const upsert = useUpsertSettings();
  const [theme, setTheme] = useState<string>("");
  const [notifications, setNotifications] = useState<boolean>(true);
  const [ai, setAi] = useState<string>("");
  const [persona, setPersona] = useState<string>("");
  const [workStart, setWorkStart] = useState<string>("");
  const [workEnd, setWorkEnd] = useState<string>("");
  const [themeContrast, setThemeContrast] = useState<string>("");
  const [accentColor, setAccentColor] = useState<string>("");

  useEffect(() => {
    if (data) {
      setTheme(data.theme ?? "");
      setNotifications(data.notifications ?? true);
      setAi(data.ai_persona ?? "");
      setPersona(data.persona ?? "");
      setWorkStart(data.work_start ?? "");
      setWorkEnd(data.work_end ?? "");
      setThemeContrast(data.theme_contrast ?? "");
      setAccentColor(data.accent_color ?? "");
    }
  }, [data]);

  return (
    <form
      className="mt-6 space-y-4 max-w-xl"
      onSubmit={async (e) => {
        e.preventDefault();
        await upsert.mutateAsync({
          theme: theme || null,
          notifications,
          ai_persona: ai || null,
          persona: persona || null,
          work_start: workStart || null,
          work_end: workEnd || null,
          theme_contrast: themeContrast || null,
          accent_color: accentColor || null,
        });
      }}
    >
      <div>
        <label className="block text-sm mb-1">Theme</label>
        <select
          className="w-full border rounded px-3 py-2 bg-transparent"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        >
          <option value="">Select theme</option>
          {themeModeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1">Theme contrast</label>
        <select
          className="w-full border rounded px-3 py-2 bg-transparent"
          value={themeContrast}
          onChange={(e) => setThemeContrast(e.target.value)}
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
        <label className="block text-sm mb-1">Accent color</label>
        <select
          className="w-full border rounded px-3 py-2 bg-transparent"
          value={accentColor}
          onChange={(e) => setAccentColor(e.target.value)}
        >
          <option value="">Select color</option>
          {accentColorOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input id="notif" type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
        <label htmlFor="notif" className="text-sm">Enable notifications</label>
      </div>
      <div>
        <label className="block text-sm mb-1">AI persona</label>
        <textarea className="w-full border rounded px-3 py-2 bg-transparent" rows={4} value={ai} onChange={(e) => setAi(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm mb-1">Preferred persona</label>
        <select
          className="w-full border rounded px-3 py-2 bg-transparent"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
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
          <label className="block text-sm mb-1">Workday start</label>
          <input
            type="time"
            className="w-full border rounded px-3 py-2 bg-transparent"
            value={workStart}
            onChange={(e) => setWorkStart(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Workday end</label>
          <input
            type="time"
            className="w-full border rounded px-3 py-2 bg-transparent"
            value={workEnd}
            onChange={(e) => setWorkEnd(e.target.value)}
          />
        </div>
      </div>
      <button type="submit" className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black" disabled={upsert.isPending}>
        {upsert.isPending ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
