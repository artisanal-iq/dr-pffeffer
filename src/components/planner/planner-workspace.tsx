"use client";

import TaskList from "@/components/tasks/task-list";
import { Card, CardContent } from "@/components/ui/card";
import { TaskOperationsProvider } from "@/context/tasks-context";

import { PlannerClient } from "@/app/planner/planner-client";
import { GtdProjectLists } from "./project-lists";

export function PlannerWorkspace() {
  return (
    <TaskOperationsProvider>
      <div className="grid gap-8 xl:grid-cols-[minmax(280px,340px)_minmax(420px,1fr)_minmax(280px,340px)]">
        <div className="space-y-4">
          <TaskList />
        </div>
        <Card className="h-full">
          <CardContent className="p-6">
            <PlannerClient />
          </CardContent>
        </Card>
        <GtdProjectLists />
      </div>
    </TaskOperationsProvider>
  );
}
