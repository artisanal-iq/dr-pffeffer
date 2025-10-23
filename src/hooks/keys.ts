import type { TaskListParamsNormalized } from "@/types/models";

export const qk = {
  tasks: {
    all: () => ["tasks"] as const,
    list: (params?: TaskListParamsNormalized | null) => ["tasks", "list", params ?? null] as const,
    detail: (id: string) => ["tasks", "detail", id] as const,
    window: (range: { from: string; to: string }) => ["tasks", "window", range] as const,
  },
  journals: {
    all: () => ["journals"] as const,
    list: (
      params?: {
        from?: string;
        to?: string;
        tags?: readonly string[];
        limit?: number;
        offset?: number;
      } | null,
    ) => ["journals", "list", params ?? null] as const,
    infinite: (
      params?: { from?: string; to?: string; tags?: readonly string[]; limit?: number } | null,
    ) => ["journals", "infinite", params ?? null] as const,
    detail: (id: string) => ["journals", "detail", id] as const,
  },
  powerPractices: {
    all: () => ["power_practices"] as const,
    list: (date?: string) => ["power_practices", date] as const,
    detail: (id: string) => ["power_practices", "detail", id] as const,
  },
  connections: {
    all: () => ["connections"] as const,
    list: (q?: string | null) => ["connections", q] as const,
    detail: (id: string) => ["connections", "detail", id] as const,
    intelligence: () => ["connections", "intelligence"] as const,
  },
  prompts: {
    all: () => ["prompts"] as const,
    list: (includeArchived: boolean) => ["prompts", "list", includeArchived] as const,
    detail: (id: string) => ["prompts", "detail", id] as const,
    audit: (promptId: string) => ["prompts", "audit", promptId] as const,
  },
  settings: {
    root: () => ["settings"] as const,
  },
  metrics: {
    reflections: () => ["metrics", "reflections"] as const,
  },
} as const;
