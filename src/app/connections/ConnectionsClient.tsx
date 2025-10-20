"use client";

import { useState } from "react";
import { z } from "zod";

import { CreateEntityModal } from "@/components/modals/create-entity-modal";
import { Label } from "@/components/ui/label";
import { useConnections, useCreateConnection, useDeleteConnection } from "@/hooks/connections";

const createConnectionSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  org: z.string().trim().optional(),
});

type CreateConnectionValues = z.infer<typeof createConnectionSchema>;

export default function ConnectionsClient() {
  const [q, setQ] = useState<string | null>(null);
  const list = useConnections(q);
  const create = useCreateConnection();

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Track the people you want to stay in touch with. Add a connection to keep notes and next actions handy.
        </p>
        <CreateEntityModal<CreateConnectionValues>
          entityName="connection"
          title="Add connection"
          triggerLabel="New connection"
          submitLabel="Add"
          description="Capture a new relationship with optional organization details."
          schema={createConnectionSchema}
          defaultValues={() => ({ name: "", org: "" })}
          onCreate={async (values) =>
            create.mutateAsync({
              name: values.name.trim(),
              org: values.org?.trim() ? values.org.trim() : null,
            })
          }
          renderFields={(form) => (
            <>
              <div className="space-y-2">
                <Label htmlFor="connection-name">Name</Label>
                <input
                  id="connection-name"
                  {...form.register("name")}
                  className="w-full border rounded px-3 py-2 bg-transparent"
                  placeholder="Full name"
                />
                {form.formState.errors.name ? (
                  <p className="text-sm text-destructive" role="alert">
                    {form.formState.errors.name.message as string}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="connection-org">Organization</Label>
                <input
                  id="connection-org"
                  {...form.register("org")}
                  className="w-full border rounded px-3 py-2 bg-transparent"
                  placeholder="Company or affiliation (optional)"
                />
                {form.formState.errors.org ? (
                  <p className="text-sm text-destructive" role="alert">
                    {form.formState.errors.org.message as string}
                  </p>
                ) : null}
              </div>
            </>
          )}
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <input
            value={q ?? ""}
            onChange={(e) => setQ(e.target.value || null)}
            placeholder="Search..."
            className="border rounded px-3 py-2 bg-transparent w-full"
          />
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
      <button onClick={() => del.mutate()} className="ml-auto underline text-red-600">
        Delete
      </button>
    </li>
  );
}
