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
import type { Journal } from "@/types/models";
import { qk } from "./keys";

type JournalListResponse = { items: Journal[]; count: number };
type JournalCacheSnapshot = Array<[QueryKey, unknown]>;

type JournalMutationContext = {
  snapshot: JournalCacheSnapshot;
  optimisticId: string;
};

type CreateJournalInput = { entry: string; date: string };

type UpdateJournalInput = Partial<Pick<Journal, "entry" | "ai_summary" | "date">>;

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
    queryKey: qk.journals.list({ from: params?.from, to: params?.to }),
    queryFn: () => apiFetch<JournalListResponse>(`/api/journals${search.toString() ? `?${search}` : ""}`),
  });
}

export function useJournal(id: string) {
  return useQuery({
    queryKey: qk.journals.detail(id),
    queryFn: () => apiFetch<Journal>(`/api/journals/${id}`),
    enabled: !!id,
  });
}

export function createCreateJournalMutationOptions(
  qc: QueryClient
): UseMutationOptions<Journal, unknown, CreateJournalInput, JournalMutationContext> {
  return {
    mutationFn: (input) =>
      apiFetch<Journal>(`/api/journals`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.journals.all() });
      const snapshot = snapshotJournals(qc);
      const optimisticId = `optimistic-journal-${Date.now()}`;
      const now = new Date().toISOString();
      const optimisticJournal: Journal = {
        id: optimisticId,
        user_id: "__optimistic__",
        entry: input.entry,
        ai_summary: null,
        date: input.date,
        created_at: now,
        updated_at: now,
      };
      applyJournalToCaches(qc, optimisticJournal);
      return { snapshot, optimisticId } satisfies JournalMutationContext;
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        restoreSnapshot(qc, context.snapshot);
      }
    },
    onSuccess: (journal, _variables, context) => {
      if (context?.optimisticId) {
        removeJournalFromCaches(qc, context.optimisticId);
      }
      applyJournalToCaches(qc, journal);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.journals.all() });
      qc.invalidateQueries({ queryKey: qk.powerScore.all() });
    },
  };
}

export function useCreateJournal() {
  const qc = useQueryClient();
  return useMutation(createCreateJournalMutationOptions(qc));
}

export function useUpdateJournal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<Journal, "entry" | "ai_summary" | "summary_metadata" | "date">>) =>
      apiFetch<Journal>(`/api/journals/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
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

function snapshotJournals(qc: QueryClient): JournalCacheSnapshot {
  return qc.getQueriesData({ queryKey: qk.journals.all() });
}

function restoreSnapshot(qc: QueryClient, snapshot: JournalCacheSnapshot) {
  for (const [key, value] of snapshot) {
    qc.setQueryData(key, value);
  }
}

function applyJournalToCaches(qc: QueryClient, journal: Journal) {
  qc.setQueryData(qk.journals.detail(journal.id), journal);
  const queries = qc.getQueriesData<JournalListResponse>({ queryKey: qk.journals.all() });
  for (const [key, value] of queries) {
    if (!Array.isArray(key) || key[0] !== "journals" || key[1] === "detail") continue;
    const current = value as JournalListResponse | undefined;
    if (!current) continue;
    const exists = current.items.some((item) => item.id === journal.id);
    const filtered = current.items.filter((item) => item.id !== journal.id);
    const items = [journal, ...filtered];
    const count = exists ? current.count : current.count + 1;
    qc.setQueryData(key, { ...current, items, count });
  }
}

function removeJournalFromCaches(qc: QueryClient, id: string) {
  qc.setQueryData(qk.journals.detail(id), undefined);
  const queries = qc.getQueriesData<JournalListResponse>({ queryKey: qk.journals.all() });
  for (const [key, value] of queries) {
    if (!Array.isArray(key) || key[0] !== "journals" || key[1] === "detail") continue;
    const current = value as JournalListResponse | undefined;
    if (!current) continue;
    const exists = current.items.some((item) => item.id === id);
    if (!exists) continue;
    const items = current.items.filter((item) => item.id !== id);
    qc.setQueryData(key, { ...current, items, count: Math.max(0, current.count - 1) });
  }
}
