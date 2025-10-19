"use client";
import { useState } from "react";
import { useCreateJournal, useDeleteJournal, useJournals, useSummarizeJournal } from "@/hooks/journals";
import type { JournalSummaryMetadata } from "@/types/models";

export default function JournalClient() {
  const [entry, setEntry] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const list = useJournals({ limit: 20, offset: 0 });
  const create = useCreateJournal();

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!entry.trim()) return;
          await create.mutateAsync({ entry, date });
          setEntry("");
        }}
        className="space-y-3"
      >
        <div>
          <label className="block text-sm mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-3 py-2 bg-transparent" />
        </div>
        <div>
          <label className="block text-sm mb-1">New entry</label>
          <textarea value={entry} onChange={(e) => setEntry(e.target.value)} rows={6} className="w-full border rounded px-3 py-2 bg-transparent" />
        </div>
        <button type="submit" className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black" disabled={create.isPending}>
          {create.isPending ? "Saving..." : "Add entry"}
        </button>
      </form>

      <div>
        <h2 className="font-medium mb-3">Recent entries</h2>
        {list.isLoading ? (
          <p className="text-sm opacity-70">Loading...</p>
        ) : (
          <ul className="space-y-4">
            {(list.data?.items ?? []).map((j) => (
              <JournalItem
                key={j.id}
                id={j.id}
                date={j.date}
                entry={j.entry}
                ai={j.ai_summary}
                metadata={j.summary_metadata ?? undefined}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function JournalItem({
  id,
  date,
  entry,
  ai,
  metadata,
}: {
  id: string;
  date: string;
  entry: string;
  ai: string | null;
  metadata?: Pick<JournalSummaryMetadata, "tone" | "confidence" | "influence" | "key_themes" | "behavior_cue">;
}) {
  const summarize = useSummarizeJournal(id);
  const del = useDeleteJournal(id);
  return (
    <li className="border rounded p-3">
      <div className="flex items-center gap-2 text-xs opacity-70 mb-2">
        <span>{date}</span>
        <button
          onClick={() => summarize.mutateAsync()}
          className="ml-auto underline"
          disabled={summarize.isPending}
        >
          {summarize.isPending ? "Summarizing..." : "Summarize"}
        </button>
        <button onClick={() => del.mutateAsync()} className="underline text-red-600">Delete</button>
      </div>
      <p className="whitespace-pre-wrap text-sm">{entry}</p>
      {ai && (
        <div className="mt-2 p-2 bg-black/5 dark:bg-white/5 rounded text-sm">
          <div className="text-xs uppercase opacity-70 mb-1">AI summary</div>
          <p className="whitespace-pre-wrap">{ai}</p>
          {metadata && (
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="uppercase opacity-70">Tone</dt>
                <dd className="capitalize">{metadata.tone}</dd>
              </div>
              <div>
                <dt className="uppercase opacity-70">Confidence</dt>
                <dd className="capitalize">{metadata.confidence}</dd>
              </div>
              <div>
                <dt className="uppercase opacity-70">Influence</dt>
                <dd className="capitalize">{metadata.influence}</dd>
              </div>
              <div className="col-span-2">
                <dt className="uppercase opacity-70">Key themes</dt>
                <dd>{metadata.key_themes.join(", ")}</dd>
              </div>
              <div className="col-span-2">
                <dt className="uppercase opacity-70">Next cue</dt>
                <dd>{metadata.behavior_cue}</dd>
              </div>
            </dl>
          )}
        </div>
      )}
    </li>
  );
}
