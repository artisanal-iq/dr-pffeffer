 "use client";
 import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
 import { apiFetch } from "@/lib/api";
 import type { Connection } from "@/types/models";
 import { qk } from "./keys";

export function useConnections(q?: string | null) {
  const search = new URLSearchParams();
  if (q) search.set("q", q);
  return useQuery({
    queryKey: qk.connections.list(q ?? null),
    queryFn: () => apiFetch<{ items: Connection[] }>(`/api/connections${search.toString() ? `?${search}` : ""}`),
  });
}

export function useConnection(id: string) {
  return useQuery({
    queryKey: qk.connections.detail(id),
    queryFn: () => apiFetch<Connection>(`/api/connections/${id}`),
    enabled: !!id,
  });
}

export function useCreateConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Pick<Connection, "name" | "org" | "category" | "last_contact" | "next_action" | "notes">> & { name: string }) =>
      apiFetch<Connection>(`/api/connections`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.connections.all() });
    },
  });
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
