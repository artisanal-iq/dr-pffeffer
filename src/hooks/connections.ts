"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
  type UseMutationOptions,
} from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { Connection } from "@/types/models";
import { qk } from "./keys";

type ConnectionListResponse = { items: Connection[] };
type ConnectionCacheSnapshot = Array<[QueryKey, unknown]>;

type CreateConnectionInput = Partial<
  Pick<Connection, "org" | "category" | "last_contact" | "next_action" | "notes">
> & { name: string };

type ConnectionMutationContext = {
  snapshot: ConnectionCacheSnapshot;
  optimisticId: string;
};

export function useConnections(q?: string | null) {
  const search = new URLSearchParams();
  if (q) search.set("q", q);
  return useQuery({
    queryKey: qk.connections.list(q ?? null),
    queryFn: () => apiFetch<ConnectionListResponse>(`/api/connections${search.toString() ? `?${search}` : ""}`),
  });
}

export function useConnection(id: string) {
  return useQuery({
    queryKey: qk.connections.detail(id),
    queryFn: () => apiFetch<Connection>(`/api/connections/${id}`),
    enabled: !!id,
  });
}

export function createCreateConnectionMutationOptions(
  qc: QueryClient
): UseMutationOptions<Connection, unknown, CreateConnectionInput, ConnectionMutationContext> {
  return {
    mutationFn: (input) =>
      apiFetch<Connection>(`/api/connections`, { method: "POST", body: JSON.stringify(input) }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.connections.all() });
      const snapshot = snapshotConnections(qc);
      const optimisticId = `optimistic-connection-${Date.now()}`;
      const now = new Date().toISOString();
      const sanitized = sanitizeConnectionInput(input);
      const optimisticConnection: Connection = {
        id: optimisticId,
        user_id: "__optimistic__",
        name: sanitized.name,
        org: sanitized.org ?? null,
        category: sanitized.category ?? null,
        last_contact: sanitized.last_contact ?? null,
        next_action: sanitized.next_action ?? null,
        notes: sanitized.notes ?? null,
        created_at: now,
        updated_at: now,
      };
      applyConnectionToCaches(qc, optimisticConnection);
      return { snapshot, optimisticId } satisfies ConnectionMutationContext;
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        restoreSnapshot(qc, context.snapshot);
      }
    },
    onSuccess: (connection, _variables, context) => {
      if (context?.optimisticId) {
        removeConnectionFromCaches(qc, context.optimisticId);
      }
      applyConnectionToCaches(qc, connection);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.connections.all() });
    },
  };
}

export function useCreateConnection() {
  const qc = useQueryClient();
  return useMutation(createCreateConnectionMutationOptions(qc));
}

export function useUpdateConnection(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<Connection, "name" | "org" | "category" | "last_contact" | "next_action" | "notes">>) =>
      apiFetch<Connection>(`/api/connections/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.connections.detail(id) });
      qc.invalidateQueries({ queryKey: qk.connections.all() });
    },
  });
}

export function useDeleteConnection(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ ok: true }>(`/api/connections/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.connections.all() });
    },
  });
}

function snapshotConnections(qc: QueryClient): ConnectionCacheSnapshot {
  return qc.getQueriesData({ queryKey: qk.connections.all() });
}

function restoreSnapshot(qc: QueryClient, snapshot: ConnectionCacheSnapshot) {
  for (const [key, value] of snapshot) {
    qc.setQueryData(key, value);
  }
}

function applyConnectionToCaches(qc: QueryClient, connection: Connection) {
  qc.setQueryData(qk.connections.detail(connection.id), connection);
  const queries = qc.getQueriesData<ConnectionListResponse>({ queryKey: qk.connections.all() });
  for (const [key, value] of queries) {
    if (!Array.isArray(key) || key[0] !== "connections" || key[1] === "detail") continue;
    const current = value as ConnectionListResponse | undefined;
    if (!current) continue;
    const filtered = current.items.filter((item) => item.id !== connection.id);
    qc.setQueryData(key, { ...current, items: [connection, ...filtered] });
  }
}

function removeConnectionFromCaches(qc: QueryClient, id: string) {
  qc.setQueryData(qk.connections.detail(id), undefined);
  const queries = qc.getQueriesData<ConnectionListResponse>({ queryKey: qk.connections.all() });
  for (const [key, value] of queries) {
    if (!Array.isArray(key) || key[0] !== "connections" || key[1] === "detail") continue;
    const current = value as ConnectionListResponse | undefined;
    if (!current) continue;
    const exists = current.items.some((item) => item.id === id);
    if (!exists) continue;
    qc.setQueryData(key, { ...current, items: current.items.filter((item) => item.id !== id) });
  }
}

function sanitizeConnectionInput(input: CreateConnectionInput): CreateConnectionInput {
  return {
    ...input,
    name: input.name.trim(),
    org: input.org?.trim() || undefined,
    category: input.category ?? undefined,
    last_contact: input.last_contact ?? undefined,
    next_action: input.next_action ?? undefined,
    notes: input.notes ?? undefined,
  };
}
