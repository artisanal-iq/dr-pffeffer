import { requireUser } from "@/lib/auth";
import { PlannerWorkspace } from "@/components/planner/planner-workspace";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// Ensure this page always renders dynamically in production to avoid any
// caching or RSC streaming edge cases that could hide client content.
export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  const user = await requireUser("/planner");
  const supaEnabled = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  let taskCount: number | null = null;
  let supaError: string | null = null;
  if (supaEnabled) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.rpc("list_tasks", {
        p_status: null,
        p_priority: null,
        p_from: null,
        p_to: null,
        p_limit: 5,
        p_offset: 0,
      });
      const items = (data as Record<string, unknown> | null)?.["items"];
      taskCount = Array.isArray(items) ? items.length : 0;
      if (error) supaError = error.message;
    } catch (e: unknown) {
      supaError =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : "unknown";
    }
  }
  return (
    <main className="space-y-8 p-6 sm:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Planner</h1>
        <p className="text-sm text-muted-foreground">
          Tasks, manual scheduling, and (later) auto-plan controls.
        </p>
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          SSR check · user: {user.email ?? user.id}{supaEnabled ? (<> · tasks: {taskCount ?? 0}{supaError ? <> · error: {supaError}</> : null}</>) : (<> · supabase: disabled</>)}</div>
      </header>
      <PlannerWorkspace />
    </main>
  );
}