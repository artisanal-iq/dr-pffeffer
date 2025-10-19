import { requireUser } from "@/lib/auth";
import { DailyRoutineClient } from "./routine-client";

export default async function DailyRoutinePage() {
  await requireUser("/routine");
  return (
    <main className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Daily routine</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Choose a focus for today, confirm your nudge plan, and close with a short reflection.
        </p>
      </header>
      <DailyRoutineClient />
    </main>
  );
}
