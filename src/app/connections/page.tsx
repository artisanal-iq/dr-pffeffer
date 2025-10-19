import { requireUser } from "@/lib/auth";
import ClientBlock from "./ConnectionsClient";

export default async function ConnectionsPage() {
  await requireUser("/connections");
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Connections</h1>
      <p className="text-sm text-muted-foreground mt-2">Track allies, mentors, and peers with follow-up reminders.</p>
      <ClientBlock />
    </main>
  );
}
