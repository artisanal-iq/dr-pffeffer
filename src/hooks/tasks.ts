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
import type {
  Task,
  TaskContext,
  TaskListParams,
  TaskListParamsNormalized,
  TaskListResponse,
  TaskPriority,
  TaskStatus,
} from "@/types/models";
import { qk } from "./keys";

const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;

type TaskCacheSnapshot = Array<[QueryKey, unknown]>;

type TaskMutationContext = {
  snapshot: TaskCacheSnapshot;
};

type TaskUpdateContext = TaskMutationContext & {
  previousTask?: Task;
};

export type CreateTaskInput = {
  title: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  scheduledTime?: string | null;
  context?: TaskContext;
};

export type TaskPatchInput = {
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  scheduledTime?: string | null;
  durationMinutes?: number;
  context?: TaskContext;
};

export type UpdateTaskVariables = { id: string; patch: TaskPatchInput };
export type DeleteTaskVariables = { id: string };

export function useTasks(params?: TaskListParams) {
  const normalized = normalizeTaskListParams(params);
  const keyParams = hasNonDefaultFilters(normalized) ? normalized : null;
  const search = new URLSearchParams();
  if (normalized.status) search.set("status", normalized.status);
  if (normalized.priority) search.set("priority", normalized.priority);
  if (normalized.from) search.set("from", normalized.from);
  if (normalized.to) search.set("to", normalized.to);
  search.set("limit", normalized.limit.toString());
  search.set("offset", normalized.offset.toString());

  return useQuery({
    queryKey: qk.tasks.list(keyParams),
    queryFn: () =>
      apiFetch<TaskListResponse>(`/api/tasks${search.toString() ? `?${search.toString()}` : ""}`),
  });
}

export type TaskWindowParams = { from: string; to: string; limit?: number };

export function useTasksWindow(range: TaskWindowParams) {
  return useTasks({
    from: range.from,
    to: range.to,
    limit: range.limit,
  });
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: qk.tasks.detail(id ?? "__noop__"),
    queryFn: () => apiFetch<Task>(`/api/tasks/${id}`),
    enabled: !!id,
  });
}

export function createCreateTaskMutationOptions(qc: QueryClient): UseMutationOptions<Task, unknown, CreateTaskInput, TaskMutationContext> {
  return {
    mutationFn: (input) =>
      apiFetch<Task>(`/api/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: input.title,
          status: input.status,
          priority: input.priority,
          scheduledTime: input.scheduledTime ?? null,
          context: input.context,
        }),
      }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: qk.tasks.all() });
      const snapshot = snapshotTasks(qc);
      return { snapshot } satisfies TaskMutationContext;
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        restoreSnapshot(qc, context.snapshot);
      }
    },
    onSuccess: (task) => {
      applyTaskToCaches(qc, task);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.tasks.all() });
    },
  };
}

export function createUpdateTaskMutationOptions(
  qc: QueryClient
): UseMutationOptions<Task, unknown, UpdateTaskVariables, TaskUpdateContext> {
  return {
    mutationFn: ({ id, patch }) =>
      apiFetch<Task>(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.tasks.all() });
      const snapshot = snapshotTasks(qc);
      const previousTask = findTaskInSnapshot(snapshot, id);
      if (previousTask) {
        const optimisticTask: Task = {
          ...previousTask,
          title: patch.title ?? previousTask.title,
          status: patch.status ?? previousTask.status,
          priority: patch.priority ?? previousTask.priority,
          scheduled_time: patch.scheduledTime ?? previousTask.scheduled_time,
          context: patch.context ?? previousTask.context,
        };
        applyTaskToCaches(qc, optimisticTask);
      }
      return { snapshot, previousTask } satisfies TaskUpdateContext;
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        restoreSnapshot(qc, context.snapshot);
      }
    },
    onSuccess: (task) => {
      applyTaskToCaches(qc, task);
    },
    onSettled: (_data, _error, variables) => {
      if (variables?.id) {
        qc.invalidateQueries({ queryKey: qk.tasks.detail(variables.id) });
      }
      qc.invalidateQueries({ queryKey: qk.tasks.all() });
    },
  };
}

export function createDeleteTaskMutationOptions(
  qc: QueryClient
): UseMutationOptions<Task, unknown, DeleteTaskVariables, TaskMutationContext> {
  return {
    mutationFn: ({ id }) =>
      apiFetch<Task>(`/api/tasks/${id}`, {
        method: "DELETE",
      }),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: qk.tasks.all() });
      const snapshot = snapshotTasks(qc);
      removeTaskFromCaches(qc, id);
      return { snapshot } satisfies TaskMutationContext;
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        restoreSnapshot(qc, context.snapshot);
      }
    },
    onSuccess: (task) => {
      removeTaskFromCaches(qc, task.id);
    },
    onSettled: (_data, _error, variables) => {
      if (variables?.id) {
        qc.invalidateQueries({ queryKey: qk.tasks.detail(variables.id) });
      }
      qc.invalidateQueries({ queryKey: qk.tasks.all() });
    },
  };
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation(createCreateTaskMutationOptions(qc));
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation(createUpdateTaskMutationOptions(qc));
}

export type UpdateTaskScheduleInput = {
  id: string;
  scheduledTime: string | null;
  durationMinutes?: number;
};

export function useUpdateTaskSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scheduledTime, durationMinutes }: UpdateTaskScheduleInput) =>
      apiFetch<Task>(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          scheduledTime,
          ...(durationMinutes !== undefined ? { durationMinutes } : {}),
        }),
      }),
    onMutate: async ({ id, scheduledTime, durationMinutes }) => {
      await qc.cancelQueries({ queryKey: qk.tasks.all() });
      const snapshot = snapshotTasks(qc);
      const previousTask = findTaskInSnapshot(snapshot, id);
      if (previousTask) {
        const optimisticTask: Task = {
          ...previousTask,
          scheduled_time: scheduledTime ?? null,
          duration_minutes:
            durationMinutes ?? previousTask.duration_minutes,
        };
        applyTaskToCaches(qc, optimisticTask);
      }
      return { snapshot, previousTask } satisfies TaskUpdateContext;
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        restoreSnapshot(qc, context.snapshot);
      }
    },
    onSuccess: (task) => {
      applyTaskToCaches(qc, task);
    },
    onSettled: (_data, _error, variables) => {
      if (variables?.id) {
        qc.invalidateQueries({ queryKey: qk.tasks.detail(variables.id) });
      }
      qc.invalidateQueries({ queryKey: qk.tasks.all() });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation(createDeleteTaskMutationOptions(qc));
}

function normalizeTaskListParams(params?: TaskListParams): TaskListParamsNormalized {
  return {
    status: params?.status ?? undefined,
    priority: params?.priority ?? undefined,
    from: params?.from ?? undefined,
    to: params?.to ?? undefined,
    limit: params?.limit ?? DEFAULT_LIMIT,
    offset: params?.offset ?? DEFAULT_OFFSET,
  };
}

function hasNonDefaultFilters(params: TaskListParamsNormalized): boolean {
  return (
    params.status !== undefined ||
    params.priority !== undefined ||
    params.from !== undefined ||
    params.to !== undefined ||
    params.limit !== DEFAULT_LIMIT ||
    params.offset !== DEFAULT_OFFSET
  );
}

function snapshotTasks(qc: QueryClient): TaskCacheSnapshot {
  return qc.getQueriesData({ queryKey: qk.tasks.all() });
}

function restoreSnapshot(qc: QueryClient, snapshot: TaskCacheSnapshot) {
  for (const [key, value] of snapshot) {
    qc.setQueryData(key, value);
  }
}

function findTaskInSnapshot(snapshot: TaskCacheSnapshot, taskId: string): Task | undefined {
  for (const [key, value] of snapshot) {
    if (!Array.isArray(key) || key[0] !== "tasks") continue;
    if (key[1] === "detail" && key[2] === taskId && value) {
      return value as Task;
    }
    if (key[1] === "list" && value) {
      const list = value as TaskListResponse;
      const match = list.items.find((task) => task.id === taskId);
      if (match) {
        return match;
      }
    }
  }
  return undefined;
}

function applyTaskToCaches(qc: QueryClient, task: Task) {
  qc.setQueryData(qk.tasks.detail(task.id), task);
  const queries = qc.getQueriesData<TaskListResponse>({ queryKey: qk.tasks.all() });
  for (const [key, value] of queries) {
    if (!Array.isArray(key) || key[0] !== "tasks" || key[1] !== "list") continue;
    const params = extractListParams(key);
    const current = value as TaskListResponse | undefined;
    const next = updateListWithTask(current, task, params);
    if (next !== current) {
      qc.setQueryData(key, next);
    }
  }
}

function removeTaskFromCaches(qc: QueryClient, taskId: string) {
  qc.setQueryData(qk.tasks.detail(taskId), undefined);
  const queries = qc.getQueriesData<TaskListResponse>({ queryKey: qk.tasks.all() });
  for (const [key, value] of queries) {
    if (!Array.isArray(key) || key[0] !== "tasks" || key[1] !== "list") continue;
    const current = value as TaskListResponse | undefined;
    if (!current) continue;
    const nextItems = current.items.filter((task) => task.id !== taskId);
    if (nextItems.length !== current.items.length) {
      const nextCount = Math.max(0, current.count - 1);
      qc.setQueryData(key, { ...current, items: nextItems, count: nextCount });
    }
  }
}

function extractListParams(key: QueryKey): TaskListParamsNormalized {
  if (!Array.isArray(key) || key[0] !== "tasks" || key[1] !== "list") {
    return {
      status: undefined,
      priority: undefined,
      from: undefined,
      to: undefined,
      limit: DEFAULT_LIMIT,
      offset: DEFAULT_OFFSET,
    };
  }
  const params = (key[2] as TaskListParamsNormalized | null | undefined) ?? undefined;
  return {
    status: params?.status ?? undefined,
    priority: params?.priority ?? undefined,
    from: params?.from ?? undefined,
    to: params?.to ?? undefined,
    limit: params?.limit ?? DEFAULT_LIMIT,
    offset: params?.offset ?? DEFAULT_OFFSET,
  };
}

function updateListWithTask(
  list: TaskListResponse | undefined,
  task: Task,
  params: TaskListParamsNormalized
): TaskListResponse | undefined {
  if (!list) return list;
  const index = list.items.findIndex((item) => item.id === task.id);
  const matches = taskMatchesFilters(task, params);
  if (index === -1) {
    if (!matches || params.offset > 0) {
      return list;
    }
    const nextItems = [task, ...list.items];
    if (nextItems.length > params.limit) {
      nextItems.length = params.limit;
    }
    return {
      ...list,
      items: nextItems,
      count: list.count + 1,
    };
  }

  if (!matches) {
    const nextItems = list.items.filter((item) => item.id !== task.id);
    return {
      ...list,
      items: nextItems,
      count: Math.max(0, list.count - 1),
    };
  }

  const nextItems = [...list.items];
  nextItems[index] = task;
  return {
    ...list,
    items: nextItems,
  };
}

function taskMatchesFilters(task: Task, params: TaskListParamsNormalized): boolean {
  if (params.status && task.status !== params.status) return false;
  if (params.priority && task.priority !== params.priority) return false;
  if (params.from && (!task.scheduled_time || task.scheduled_time < params.from)) return false;
  if (params.to && (!task.scheduled_time || task.scheduled_time > params.to)) return false;
  return true;
}

export type { TaskListParams };
