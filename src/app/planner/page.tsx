import { requireUser } from "@/lib/auth";
import TaskList from "@/components/tasks/task-list";
import { Card, CardContent } from "@/components/ui/card";
import { PlannerClient } from "./planner-client";

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
      <div className="grid gap-8 xl:grid-cols-[minmax(320px,380px)_1fr]">
        <TaskList />
        <Card className="h-full">
          <CardContent className="p-6">
            <PlannerClient />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
