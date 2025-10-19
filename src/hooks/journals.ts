 "use client";
 import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
 import { apiFetch } from "@/lib/api";
 import type { Journal } from "@/types/models";
 import { qk } from "./keys";

export function useJournals(params?: { from?: string; to?: string; limit?: number; offset?: number }) {
  const search = new URLSearchParams();
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.offset) search.set("offset", String(params.offset));
  return useQuery({
    queryKey: qk.journals.list({ from: params?.from, to: params?.to }),
    queryFn: () => apiFetch<{ items: Journal[]; count: number }>(`/api/journals${search.toString() ? `?${search}` : ""}`),
  });
}

export function useJournal(id: string) {
  return useQuery({
    queryKey: qk.journals.detail(id),
    queryFn: () => apiFetch<Journal>(`/api/journals/${id}`),
    enabled: !!id,
  });
}

export function useCreateJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { entry: string; date: string }) => apiFetch<Journal>(`/api/journals`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.journals.all() });
      qc.invalidateQueries({ queryKey: qk.powerScore.all() });
    },
  });
}

export function useUpdateJournal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<Journal, "entry" | "ai_summary" | "date">>) => apiFetch<Journal>(`/api/journals/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.journals.detail(id) });
      qc.invalidateQueries({ queryKey: qk.journals.all() });
      qc.invalidateQueries({ queryKey: qk.powerScore.all() });
    },
  });
}

export function useDeleteJournal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ ok: true }>(`/api/journals/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.journals.all() });
      qc.invalidateQueries({ queryKey: qk.powerScore.all() });
    },
  });
}

export function useSummarizeJournal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<Journal>(`/api/journals/${id}/ai-summary`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.journals.detail(id) });
    },
  });
}
