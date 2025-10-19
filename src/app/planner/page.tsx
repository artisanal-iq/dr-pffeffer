import { PlannerClient } from "./planner-client";
import { requireUser } from "@/lib/auth";
import TaskList from "@/components/tasks/task-list";

export default async function PlannerPage() {
  await requireUser("/planner");
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Planner</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Tasks, manual scheduling, and (later) auto-plan controls.
      </p>
      <TaskList />
    </main>
  );
}
