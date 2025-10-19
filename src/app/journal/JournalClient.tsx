 "use client";
import { useState } from "react";
import { useCreateJournal, useDeleteJournal, useJournals, useSummarizeJournal } from "@/hooks/journals";
import { parseTagInput } from "@/lib/journal-timeline";

export default function JournalClient() {
  const [entry, setEntry] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tags, setTags] = useState("");
  const list = useJournals({ limit: 20, offset: 0 });
  const create = useCreateJournal();

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!entry.trim()) return;
          await create.mutateAsync({ entry, date, tags: parseTagInput(tags) });
          setEntry("");
          setTags("");
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
        <div>
          <label className="block text-sm mb-1">Tags (comma separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-transparent"
            placeholder="gratitude, wins"
          />
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
              <JournalItem key={j.id} id={j.id} date={j.date} entry={j.entry} ai={j.ai_summary} tags={j.tags} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function JournalItem({ id, date, entry, ai, tags }: { id: string; date: string; entry: string; ai: string | null; tags: string[] }) {
  const summarize = useSummarizeJournal(id);
  const del = useDeleteJournal(id);
  return (
    <li className="border rounded p-3">
      <div className="flex items-center gap-2 text-xs opacity-70 mb-2">
        <span>{date}</span>
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span key={tag} className="rounded bg-black/10 dark:bg-white/10 px-2 py-0.5 normal-case">
              #{tag}
            </span>
          ))}
        </div>
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
        </div>
      )}
    </li>
  );
}
