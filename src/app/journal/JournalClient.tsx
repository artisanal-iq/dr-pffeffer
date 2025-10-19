"use client";

import { z } from "zod";

import { CreateEntityModal } from "@/components/modals/create-entity-modal";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateJournal, useDeleteJournal, useJournals, useSummarizeJournal } from "@/hooks/journals";

const createJournalSchema = z.object({
  date: z.string().min(1, "Date is required"),
  entry: z.string().trim().min(1, "Entry cannot be empty"),
});

type CreateJournalValues = z.infer<typeof createJournalSchema>;

export default function JournalClient() {
  const list = useJournals({ limit: 20, offset: 0 });
  const create = useCreateJournal();

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Capture reflections and gratitude. Journals are summarized with AI on demand.
        </p>
        <CreateEntityModal<CreateJournalValues>
          entityName="journal"
          title="New journal entry"
          triggerLabel="Write entry"
          submitLabel="Add entry"
          description="Write a quick reflection and choose the day it should be associated with."
          schema={createJournalSchema}
          defaultValues={() => ({
            date: new Date().toISOString().slice(0, 10),
            entry: "",
          })}
          onCreate={async (values) =>
            create.mutateAsync({
              date: values.date,
              entry: values.entry.trim(),
            })
          }
          renderFields={(form) => (
            <>
              <div className="space-y-2">
                <Label htmlFor="journal-date">Date</Label>
                <input
                  id="journal-date"
                  type="date"
                  {...form.register("date")}
                  className="border rounded px-3 py-2 bg-transparent"
                />
                {form.formState.errors.date ? (
                  <p className="text-sm text-destructive" role="alert">
                    {form.formState.errors.date.message as string}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="journal-entry">Entry</Label>
                <Textarea
                  id="journal-entry"
                  rows={6}
                  {...form.register("entry")}
                  placeholder="What happened today?"
                />
                {form.formState.errors.entry ? (
                  <p className="text-sm text-destructive" role="alert">
                    {form.formState.errors.entry.message as string}
                  </p>
                ) : null}
              </div>
            </>
          )}
        />
      </div>

      <div>
        <h2 className="font-medium mb-3">Recent entries</h2>
        {list.isLoading ? (
          <p className="text-sm opacity-70">Loading...</p>
        ) : (
          <ul className="space-y-4">
            {(list.data?.items ?? []).map((j) => (
              <JournalItem key={j.id} id={j.id} date={j.date} entry={j.entry} ai={j.ai_summary} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function JournalItem({ id, date, entry, ai }: { id: string; date: string; entry: string; ai: string | null }) {
  const summarize = useSummarizeJournal(id);
  const del = useDeleteJournal(id);
  return (
    <li className="border rounded p-3">
      <div className="flex items-center gap-2 text-xs opacity-70 mb-2">
        <span>{date}</span>
        <button onClick={() => summarize.mutateAsync()} className="ml-auto underline" disabled={summarize.isPending}>
          {summarize.isPending ? "Summarizing..." : "Summarize"}
        </button>
        <button onClick={() => del.mutateAsync()} className="underline text-red-600">
          Delete
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm">{entry}</p>
      {ai && (
        <div className="mt-2 p-2 bg-black/5 dark:bg-white/5 rounded text-sm">
          <div className="text-xs uppercase opacity-70 mb-1">AI summary</div>
          <p className="whitespace-pre-wrap">{ai}</p>
        </div>
      )}
    </li>
  );
}
