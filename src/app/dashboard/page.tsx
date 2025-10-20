import { Suspense } from "react";

import { requireUser } from "@/lib/auth";
import { observeDashboardRoute } from "@/lib/observability";

import DashboardContent from "./dashboard-content";
import { DashboardSkeleton } from "./dashboard-skeleton";

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");

  return (
    <main className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Track completions, spot consistency trends, and jump into your next action.
        </p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent userId={user.id} />
      </Suspense>
    </main>
  );
}
