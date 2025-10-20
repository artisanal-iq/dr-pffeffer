import Link from "next/link";
import { requireUser } from "@/lib/auth";
import JournalClient from "./JournalClient";

export default async function JournalPage() {
  await requireUser("/journal");
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Journal</h1>
      <p className="text-sm text-muted-foreground mt-2">Write reflections; AI summaries will appear here.</p>
      <Link href="/journal/timeline" className="mt-3 inline-flex items-center text-sm font-medium underline">
        Explore the timeline view
      </Link>
      <JournalClient />
    </main>
  );
}
