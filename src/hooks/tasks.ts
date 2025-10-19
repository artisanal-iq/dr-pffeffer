"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Task } from "@/types/models";
import { qk } from "./keys";

type TaskWindowParams = { from: string; to: string };

export function useTasksWindow(range: TaskWindowParams) {
  const search = new URLSearchParams();
  search.set("from", range.from);
  search.set("to", range.to);
  search.set("limit", "500");
  return useQuery({
    queryKey: qk.tasks.window(range),
    queryFn: () => apiFetch<{ items: Task[]; count: number }>(`/api/tasks?${search.toString()}`),
    staleTime: 30_000,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: qk.tasks.detail(id),
    queryFn: () => apiFetch<Task>(`/api/tasks/${id}`),
    enabled: !!id,
  });
}

type UpdateScheduleInput = {
  id: string;
  scheduledTime: string | null;
  durationMinutes: number;
};

export function useUpdateTaskSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateScheduleInput) =>
      apiFetch<Task>(`/api/tasks/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          scheduledTime: input.scheduledTime,
          durationMinutes: input.durationMinutes,
        }),
      }),
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: qk.tasks.detail(task.id) });
      qc.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "tasks",
      });
    },
  });
}
