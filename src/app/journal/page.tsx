import JournalClient from "./JournalClient";

export default function JournalPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Journal</h1>
      <p className="text-sm text-muted-foreground mt-2">Write reflections; AI summaries will appear here.</p>
      <JournalClient />
    </main>
  );
}
