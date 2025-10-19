import ClientBlock from "./SettingsClient";

export default function SettingsPage() {
  return (
    <main className="py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-base text-muted-foreground">
          Configure the experience that keeps your Power Practice in rhythm.
        </p>
      </div>
      <ClientBlock />
    </main>
  );
}
