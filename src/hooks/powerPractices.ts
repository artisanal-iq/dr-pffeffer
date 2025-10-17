 "use client";
 import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
 import { apiFetch } from "@/lib/api";
 import type { PowerPractice } from "@/types/models";
 import { qk } from "./keys";

export function usePowerPractices(date?: string) {
  const search = new URLSearchParams();
  if (date) search.set("date", date);
  return useQuery({
    queryKey: qk.powerPractices.list(date),
    queryFn: () => apiFetch<{ items: PowerPractice[] }>(`/api/power_practices${search.toString() ? `?${search}` : ""}`),
  });
}

export function usePowerPractice(id: string) {
  return useQuery({
    queryKey: qk.powerPractices.detail(id),
    queryFn: () => apiFetch<PowerPractice>(`/api/power_practices/${id}`),
    enabled: !!id,
  });
}

export function useCreatePowerPractice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { date: string; focus: string; reflection?: string | null; rating?: number | null }) =>
      apiFetch<PowerPractice>(`/api/power_practices`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.powerPractices.all() });
    },
  });
}

export function useUpdatePowerPractice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<PowerPractice, "focus" | "reflection" | "rating">>) =>
      apiFetch<PowerPractice>(`/api/power_practices/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.powerPractices.detail(id) });
      qc.invalidateQueries({ queryKey: qk.powerPractices.all() });
    },
  });
}

export function useDeletePowerPractice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ ok: true }>(`/api/power_practices/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.powerPractices.all() });
    },
  });
}
