import { requireUser } from "@/lib/auth";
import { PlannerWorkspace } from "@/components/planner/planner-workspace";

// Ensure this page always renders dynamically in production to avoid any
// caching or RSC streaming edge cases that could hide client content.
export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  await requireUser("/planner");
  return (
    <main className="space-y-8 p-6 sm:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Planner</h1>
        <p className="text-sm text-muted-foreground">
          Tasks, manual scheduling, and (later) auto-plan controls.
        </p>
      </header>
      <PlannerWorkspace />
    </main>
  );
}