import { ConsistencyHeatmapCard } from "@/components/dashboard/consistency-heatmap";
import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  await requireUser("/dashboard");
  return (
    <main className="space-y-8 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Daily power score, consistency heatmap, and quick actions will appear here.
        </p>
      </header>
      <ConsistencyHeatmapCard />
    </main>
  );
}
