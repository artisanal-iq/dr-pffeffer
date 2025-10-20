import { requireUser } from "@/lib/auth";
import TimelineClient from "./TimelineClient";

export default async function JournalTimelinePage() {
  await requireUser("/journal/timeline");
  return (
    <main className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Journal timeline</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Review past reflections with fast scrolling, filtering by tag, and date boundaries.
        </p>
      </div>
      <TimelineClient />
    </main>
  );
}
