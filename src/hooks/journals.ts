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

type UpdateJournalInput = Partial<
  Pick<Journal, "entry" | "ai_summary" | "summary_metadata" | "date">
>;

type JournalListParams = {
  from?: string;
  to?: string;
  tags?: readonly string[];
  limit?: number;
  offset?: number;
};

export function serializeJournalParams(
  params?: JournalListParams,
): string {
  return buildJournalSearch(normalizeJournalParams(params));
}

export function useJournals(params?: JournalListParams) {
  const normalized = normalizeJournalParams(params);
  const search = buildJournalSearch(normalized);
  return useQuery({
    queryKey: qk.journals.list(normalized),
    queryFn: () =>
      apiFetch<JournalListResponse>(`/api/journals${search ? `?${search}` : ""}`),
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
    mutationFn: (patch: UpdateJournalInput) =>
      apiFetch<Journal>(`/api/journals/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
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
  snapshot.forEach(([key, value]) => qc.setQueryData(key, value));
}

function applyJournalToCaches(qc: QueryClient, journal: Journal) {
  qc.setQueryData(qk.journals.detail(journal.id), journal);
  updateJournalListCaches(qc, (current) => {
    const exists = current.items.some((item) => item.id === journal.id);
    const items = [journal, ...current.items.filter((item) => item.id !== journal.id)];
    return { ...current, items, count: exists ? current.count : current.count + 1 };
  });
}

function removeJournalFromCaches(qc: QueryClient, id: string) {
  qc.setQueryData(qk.journals.detail(id), undefined);
  updateJournalListCaches(qc, (current) => {
    if (!current.items.some((item) => item.id === id)) return undefined;
    const items = current.items.filter((item) => item.id !== id);
    return { ...current, items, count: Math.max(0, current.count - 1) };
  });
}

function updateJournalListCaches(
  qc: QueryClient,
  updater: (current: JournalListResponse) => JournalListResponse | undefined,
) {
  const queries = qc.getQueriesData<JournalListResponse>({ queryKey: qk.journals.all() });
  for (const [key, value] of queries) {
    if (!Array.isArray(key) || key[0] !== "journals" || key[1] === "detail" || !value) continue;
    const next = updater(value);
    if (next && next !== value) {
      qc.setQueryData(key, next);
    }
  }
}

function normalizeJournalParams(params?: JournalListParams): JournalListParams | null {
  if (!params) return null;
  const { from, to, tags, limit, offset } = params;
  const sortedTags = tags?.length ? [...tags].sort() : undefined;
  if (!from && !to && !sortedTags && limit === undefined && offset === undefined) {
    return null;
  }
  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(sortedTags ? { tags: sortedTags } : {}),
    ...(limit !== undefined ? { limit } : {}),
    ...(offset !== undefined ? { offset } : {}),
  } as JournalListParams;
}

function buildJournalSearch(params: JournalListParams | null): string {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.tags) {
    for (const tag of params.tags) {
      search.append("tags", tag);
    }
  }
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  if (params.offset !== undefined) search.set("offset", String(params.offset));
  return search.toString();
}
