import { requireUser } from "@/lib/auth";
import { observeDashboardRoute } from "@/lib/observability";

export default async function DashboardPage() {
  return observeDashboardRoute(async () => {
    await requireUser("/dashboard");

    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Daily power score, consistency heatmap, and quick actions will appear here.
        </p>
      </main>
    );
  });
}
