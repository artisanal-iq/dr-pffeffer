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
import type { PowerPractice } from "@/types/models";
import { qk } from "./keys";

type PowerPracticeListResponse = { items: PowerPractice[] };
type PowerPracticeCacheSnapshot = Array<[QueryKey, unknown]>;

type CreatePowerPracticeInput = {
  date: string;
  focus: string;
  reflection?: string | null;
  rating?: number | null;
};

type PowerPracticeMutationContext = {
  snapshot: PowerPracticeCacheSnapshot;
  optimisticId: string;
};

export function usePowerPractices(date?: string) {
  const search = new URLSearchParams();
  if (date) search.set("date", date);
  return useQuery({
    queryKey: qk.powerPractices.list(date),
    queryFn: () => apiFetch<PowerPracticeListResponse>(`/api/power_practices${search.toString() ? `?${search}` : ""}`),
  });
}

export function usePowerPractice(id: string) {
  return useQuery({
    queryKey: qk.powerPractices.detail(id),
    queryFn: () => apiFetch<PowerPractice>(`/api/power_practices/${id}`),
    enabled: !!id,
  });
}

export function createCreatePowerPracticeMutationOptions(
  qc: QueryClient
): UseMutationOptions<PowerPractice, unknown, CreatePowerPracticeInput, PowerPracticeMutationContext> {
  return {
    mutationFn: (input) =>
      apiFetch<PowerPractice>(`/api/power_practices`, { method: "POST", body: JSON.stringify(input) }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.powerPractices.all() });
      const snapshot = snapshotPowerPractices(qc);
      const optimisticId = `optimistic-power-practice-${Date.now()}`;
      const now = new Date().toISOString();
      const optimistic: PowerPractice = {
        id: optimisticId,
        user_id: "__optimistic__",
        date: input.date,
        focus: input.focus,
        reflection: input.reflection ?? null,
        rating: input.rating ?? null,
        ai_feedback: null,
        created_at: now,
        updated_at: now,
      };
      applyPowerPracticeToCaches(qc, optimistic);
      return { snapshot, optimisticId } satisfies PowerPracticeMutationContext;
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        restoreSnapshot(qc, context.snapshot);
      }
    },
    onSuccess: (practice, _variables, context) => {
      if (context?.optimisticId) {
        removePowerPracticeFromCaches(qc, context.optimisticId);
      }
      applyPowerPracticeToCaches(qc, practice);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.powerPractices.all() });
      qc.invalidateQueries({ queryKey: qk.powerScore.all() });
    },
  };
}

export function useCreatePowerPractice() {
  const qc = useQueryClient();
  return useMutation(createCreatePowerPracticeMutationOptions(qc));
}

export function useUpdatePowerPractice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<PowerPractice, "focus" | "reflection" | "rating">>) =>
      apiFetch<PowerPractice>(`/api/power_practices/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.powerPractices.detail(id) });
      qc.invalidateQueries({ queryKey: qk.powerPractices.all() });
      qc.invalidateQueries({ queryKey: qk.powerScore.all() });
    },
  });
}

export function useDeletePowerPractice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ ok: true }>(`/api/power_practices/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.powerPractices.all() });
      qc.invalidateQueries({ queryKey: qk.powerScore.all() });
    },
  });
}

function snapshotPowerPractices(qc: QueryClient): PowerPracticeCacheSnapshot {
  return qc.getQueriesData({ queryKey: qk.powerPractices.all() });
}

function restoreSnapshot(qc: QueryClient, snapshot: PowerPracticeCacheSnapshot) {
  for (const [key, value] of snapshot) {
    qc.setQueryData(key, value);
  }
}

function applyPowerPracticeToCaches(qc: QueryClient, practice: PowerPractice) {
  qc.setQueryData(qk.powerPractices.detail(practice.id), practice);
  const queries = qc.getQueriesData<PowerPracticeListResponse>({ queryKey: qk.powerPractices.all() });
  for (const [key, value] of queries) {
    if (!Array.isArray(key) || key[0] !== "power_practices" || key[1] === "detail") continue;
    const current = value as PowerPracticeListResponse | undefined;
    if (!current) continue;
    const filtered = current.items.filter((item) => item.id !== practice.id);
    qc.setQueryData(key, { ...current, items: [practice, ...filtered] });
  }
}

function removePowerPracticeFromCaches(qc: QueryClient, id: string) {
  qc.setQueryData(qk.powerPractices.detail(id), undefined);
  const queries = qc.getQueriesData<PowerPracticeListResponse>({ queryKey: qk.powerPractices.all() });
  for (const [key, value] of queries) {
    if (!Array.isArray(key) || key[0] !== "power_practices" || key[1] === "detail") continue;
    const current = value as PowerPracticeListResponse | undefined;
    if (!current) continue;
    const exists = current.items.some((item) => item.id === id);
    if (!exists) continue;
    qc.setQueryData(key, { ...current, items: current.items.filter((item) => item.id !== id) });
  }
}
