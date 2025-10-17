 "use client";
 import { useEffect, useState } from "react";
 import { useSettings, useUpsertSettings } from "@/hooks/settings";

export default function SettingsClient() {
  const { data } = useSettings();
  const upsert = useUpsertSettings();
  const [theme, setTheme] = useState<string>("");
  const [notifications, setNotifications] = useState<boolean>(true);
  const [ai, setAi] = useState<string>("");

  useEffect(() => {
    if (data) {
      setTheme(data.theme ?? "");
      setNotifications(data.notifications ?? true);
      setAi(data.ai_persona ?? "");
    }
  }, [data]);

  return (
    <form
      className="mt-6 space-y-4 max-w-xl"
      onSubmit={async (e) => {
        e.preventDefault();
        await upsert.mutateAsync({ theme: theme || null, notifications, ai_persona: ai || null });
      }}
    >
      <div>
        <label className="block text-sm mb-1">Theme</label>
        <input className="w-full border rounded px-3 py-2 bg-transparent" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="system | light | dark" />
      </div>
      <div className="flex items-center gap-2">
        <input id="notif" type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
        <label htmlFor="notif" className="text-sm">Enable notifications</label>
      </div>
      <div>
        <label className="block text-sm mb-1">AI persona</label>
        <textarea className="w-full border rounded px-3 py-2 bg-transparent" rows={4} value={ai} onChange={(e) => setAi(e.target.value)} />
      </div>
      <button type="submit" className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black" disabled={upsert.isPending}>
        {upsert.isPending ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
