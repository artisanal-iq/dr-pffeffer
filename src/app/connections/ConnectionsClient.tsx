 "use client";
 import { useState } from "react";
import { useConnections, useCreateConnection, useDeleteConnection } from "@/hooks/connections";

export default function ConnectionsClient() {
  const [name, setName] = useState("");
  const [q, setQ] = useState<string | null>(null);
  const list = useConnections(q);
  const create = useCreateConnection();
  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          await create.mutateAsync({ name });
          setName("");
        }}
        className="space-y-3"
      >
        <div>
          <label className="block text-sm mb-1">Add connection</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2 bg-transparent" placeholder="Name" />
        </div>
        <button type="submit" className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black" disabled={create.isPending}>
          {create.isPending ? "Saving..." : "Add"}
        </button>
      </form>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <input value={q ?? ""} onChange={(e) => setQ(e.target.value || null)} placeholder="Search..." className="border rounded px-3 py-2 bg-transparent w-full" />
        </div>
        {list.isLoading ? (
          <p className="text-sm opacity-70">Loading...</p>
        ) : (
          <ul className="space-y-2">
            {(list.data?.items ?? []).map((c) => (
              <ConnectionItem key={c.id} id={c.id} name={c.name} org={c.org} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ConnectionItem({ id, name, org }: { id: string; name: string; org: string | null }) {
  const del = useDeleteConnection(id);
  return (
    <li className="border rounded p-3 flex items-center gap-2">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs opacity-70">{org || "—"}</div>
      </div>
      <button onClick={() => del.mutate()} className="ml-auto underline text-red-600">Delete</button>
    </li>
  );
}
