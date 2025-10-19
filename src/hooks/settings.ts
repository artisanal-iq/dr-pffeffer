 "use client";
import { useMutation, useQuery, useQueryClient, type QueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Settings } from "@/types/models";
import { qk } from "./keys";

export function useSettings() {
  return useQuery({
    queryKey: qk.settings.root(),
    queryFn: () => apiFetch<Settings | null>(`/api/settings`),
  });
}

type UpsertInput = Partial<Pick<Settings, "theme" | "notifications" | "ai_persona">>;

type UpsertContext = { previous: Settings | null | undefined };

export function createUpsertSettingsMutationOptions(qc: QueryClient): UseMutationOptions<Settings, unknown, UpsertInput, UpsertContext> {
  return {
    mutationFn: (input) => apiFetch<Settings>(`/api/settings`, { method: "POST", body: JSON.stringify(input) }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.settings.root() });
      const previous = qc.getQueryData<Settings | null>(qk.settings.root());
      qc.setQueryData<Settings | null>(qk.settings.root(), (old) => {
        const base = (old ?? previous ?? null) as Settings | null;
        if (!base) {
          return previous ?? null;
        }
        return { ...base, ...input } as Settings;
      });
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(qk.settings.root(), context.previous ?? null);
      }
    },
    onSuccess: (data) => {
      qc.setQueryData(qk.settings.root(), data);
    },
  };
}

export function useUpsertSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Partial<
        Pick<
          Settings,
          | "theme"
          | "notifications"
          | "ai_persona"
          | "persona"
          | "work_start"
          | "work_end"
          | "theme_contrast"
          | "accent_color"
        >
      >,
    ) => apiFetch<Settings>(`/api/settings`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings.root() });
    },
  });
}
