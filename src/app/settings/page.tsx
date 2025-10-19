import { requireUser } from "@/lib/auth";
import ClientBlock from "./SettingsClient";

export default async function SettingsPage() {
  await requireUser("/settings");
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-sm text-muted-foreground mt-2">Preferences for theme, notifications, and AI persona.</p>
      <ClientBlock />
    </main>
  );
}
