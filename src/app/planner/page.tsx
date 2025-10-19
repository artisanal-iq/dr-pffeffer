import { PlannerClient } from "./planner-client";
import { requireUser } from "@/lib/auth";

export default async function PlannerPage() {
  await requireUser("/planner");
  return (
    <main className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Planner</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Manage your focus blocks, resolve conflicts, and keep Supabase in sync.
        </p>
      </div>
      <PlannerClient />
    </main>
  );
}
