"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { Task } from "@/types/models";
import { qk } from "./keys";

export type TaskQueryFilters = {
  status?: Task["status"] | null;
  from?: string | null;
  to?: string | null;
  limit?: number | null;
  offset?: number | null;
};

export type TaskQueryKey = {
  status: Task["status"] | null;
  from: string | null;
  to: string | null;
  limit: number | null;
  offset: number | null;
};

const DEFAULT_LIMIT = 200;

function normalizeTaskFilters(filters?: TaskQueryFilters | null): TaskQueryKey {
  return {
    status: filters?.status ?? null,
    from: filters?.from ?? null,
    to: filters?.to ?? null,
    limit: filters?.limit ?? DEFAULT_LIMIT,
    offset: filters?.offset ?? 0,
  };
}

export function serializeTaskFilters(filters: TaskQueryFilters): string {
  const search = new URLSearchParams();
  if (filters.status) search.set("status", filters.status);
  if (filters.from) search.set("from", filters.from);
  if (filters.to) search.set("to", filters.to);
  if (typeof filters.limit === "number" && Number.isFinite(filters.limit)) {
    search.set("limit", String(filters.limit));
  }
  if (typeof filters.offset === "number" && Number.isFinite(filters.offset)) {
    search.set("offset", String(filters.offset));
  }
  return search.toString();
}

export type TaskListResponse = { items: Task[]; count: number | null };

export function useTasks(filters?: TaskQueryFilters | null) {
  const normalized = normalizeTaskFilters(filters);
  return useQuery({
    queryKey: qk.tasks.list(normalized),
    queryFn: async () => {
      const query = serializeTaskFilters(normalized);
      const path = query ? `/api/tasks?${query}` : "/api/tasks";
      return apiFetch<TaskListResponse>(path);
    },
  });
}

export { normalizeTaskFilters };
