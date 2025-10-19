 "use client";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { computeNextOffset } from "@/lib/journal-timeline";
import type { Journal } from "@/types/models";
import { qk } from "./keys";

type JournalQueryParams = {
  from?: string;
  to?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
};

export function serializeJournalParams(params?: JournalQueryParams) {
  const search = new URLSearchParams();
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  if (params?.tags && params.tags.length > 0) {
    for (const tag of params.tags) {
      search.append("tags", tag);
    }
  }
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.offset) search.set("offset", String(params.offset));
  return search;
}

export function useJournals(params?: JournalQueryParams) {
  const serialized = serializeJournalParams(params);
  return useQuery({
    queryKey: qk.journals.list({ from: params?.from, to: params?.to, tags: params?.tags }),
    queryFn: () =>
      apiFetch<{ items: Journal[]; count: number }>(
        `/api/journals${serialized.toString() ? `?${serialized}` : ""}`,
      ),
  });
}

export function useInfiniteJournals(params?: Omit<JournalQueryParams, "offset">) {
  return useInfiniteQuery({
    queryKey: qk.journals.infinite({ from: params?.from, to: params?.to, tags: params?.tags }),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const search = serializeJournalParams({ ...params, offset: pageParam, limit: params?.limit ?? 40 });
      return apiFetch<{ items: Journal[]; count: number }>(`/api/journals${search.toString() ? `?${search}` : ""}`);
    },
    getNextPageParam: (_lastPage, pages) => computeNextOffset(pages),
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
    mutationFn: (input: { entry: string; date: string; tags?: string[] }) =>
      apiFetch<Journal>(`/api/journals`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.journals.all() });
      qc.invalidateQueries({ queryKey: ["journals", "infinite"] });
    },
  });
}

export function useUpdateJournal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<Journal, "entry" | "ai_summary" | "date" | "tags">>) =>
      apiFetch<Journal>(`/api/journals/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.journals.detail(id) });
      qc.invalidateQueries({ queryKey: qk.journals.all() });
      qc.invalidateQueries({ queryKey: ["journals", "infinite"] });
    },
  });
}

export function useDeleteJournal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ ok: true }>(`/api/journals/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.journals.all() });
      qc.invalidateQueries({ queryKey: ["journals", "infinite"] });
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
