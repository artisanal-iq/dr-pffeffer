 export const qk = {
  journals: {
    all: () => ["journals"] as const,
    list: (params?: { from?: string; to?: string }) => ["journals", params] as const,
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
  },
  settings: {
    root: () => ["settings"] as const,
  },
 };
