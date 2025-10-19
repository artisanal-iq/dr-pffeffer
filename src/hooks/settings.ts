 "use client";
 import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
 import { apiFetch } from "@/lib/api";
 import type { Settings } from "@/types/models";
 import { qk } from "./keys";

export function useSettings() {
  return useQuery({
    queryKey: qk.settings.root(),
    queryFn: () => apiFetch<Settings | null>(`/api/settings`),
  });
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
