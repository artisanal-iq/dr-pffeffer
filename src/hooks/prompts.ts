"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { Prompt, PromptAuditListResponse, PromptListResponse } from "@/types/models";
import { qk } from "./keys";

export type PromptCreateInput = {
  slug: string;
  title: string;
  body: string;
  category?: string;
};

export type PromptUpdateInput = {
  slug?: string;
  title?: string;
  body?: string;
  category?: string;
  isActive?: boolean;
};

export function usePrompts(options?: { includeArchived?: boolean }) {
  const includeArchived = options?.includeArchived ?? false;
  const search = includeArchived ? "?includeArchived=true" : "";

  return useQuery({
    queryKey: qk.prompts.list(includeArchived),
    queryFn: () => apiFetch<PromptListResponse>(`/api/prompts${search}`),
  });
}

export function usePrompt(id: string | null) {
  return useQuery({
    queryKey: qk.prompts.detail(id ?? "__noop__"),
    queryFn: () => apiFetch<Prompt>(`/api/prompts/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreatePrompt() {
  const qc = useQueryClient();
  const invalidateAll = () => qc.invalidateQueries({ queryKey: qk.prompts.all() });
  return useMutation({
    mutationFn: (input: PromptCreateInput) =>
      apiFetch<Prompt>(`/api/prompts`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (prompt) => {
      qc.setQueryData(qk.prompts.detail(prompt.id), prompt);
      qc.invalidateQueries({ queryKey: qk.prompts.audit(prompt.id) });
    },
    onSettled: () => {
      invalidateAll();
    },
  });
}

export function useUpdatePrompt() {
  const qc = useQueryClient();
  const invalidateAll = () => qc.invalidateQueries({ queryKey: qk.prompts.all() });
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PromptUpdateInput }) =>
      apiFetch<Prompt>(`/api/prompts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: (prompt) => {
      qc.setQueryData(qk.prompts.detail(prompt.id), prompt);
    },
    onSettled: (_, __, variables) => {
      if (variables?.id) {
        qc.invalidateQueries({ queryKey: qk.prompts.detail(variables.id) });
        qc.invalidateQueries({ queryKey: qk.prompts.audit(variables.id) });
      }
      invalidateAll();
    },
  });
}

export function useArchivePrompt() {
  const qc = useQueryClient();
  const invalidateAll = () => qc.invalidateQueries({ queryKey: qk.prompts.all() });
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Prompt>(`/api/prompts/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (prompt) => {
      qc.setQueryData(qk.prompts.detail(prompt.id), prompt);
    },
    onSettled: (_, __, id) => {
      if (id) {
        qc.invalidateQueries({ queryKey: qk.prompts.detail(id) });
        qc.invalidateQueries({ queryKey: qk.prompts.audit(id) });
      }
      invalidateAll();
    },
  });
}

export function useRestorePrompt() {
  const qc = useQueryClient();
  const invalidateAll = () => qc.invalidateQueries({ queryKey: qk.prompts.all() });
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Prompt>(`/api/prompts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: true }),
      }),
    onSuccess: (prompt) => {
      qc.setQueryData(qk.prompts.detail(prompt.id), prompt);
    },
    onSettled: (_, __, id) => {
      if (id) {
        qc.invalidateQueries({ queryKey: qk.prompts.detail(id) });
        qc.invalidateQueries({ queryKey: qk.prompts.audit(id) });
      }
      invalidateAll();
    },
  });
}

export function usePromptAudits(promptId: string | null, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: qk.prompts.audit(promptId ?? "__noop__"),
    queryFn: () => {
      if (!promptId) {
        throw new Error("Prompt id is required to load audits");
      }
      return apiFetch<PromptAuditListResponse>(`/api/prompts/${promptId}/audits`);
    },
    enabled: Boolean(promptId) && enabled,
  });
}
