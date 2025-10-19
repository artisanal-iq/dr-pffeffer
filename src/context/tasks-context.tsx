"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useCreateTask, useDeleteTask, useUpdateTask, type CreateTaskInput, type TaskPatchInput } from "@/hooks/tasks";
import type { Task } from "@/types/models";

export type TaskOperationsContextValue = {
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, patch: TaskPatchInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<Task>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
};

const TaskOperationsContext = createContext<TaskOperationsContextValue | undefined>(undefined);

export function TaskOperationsProvider({ children }: { children: ReactNode }) {
  const { mutateAsync: createAsync, isPending: isCreating } = useCreateTask();
  const { mutateAsync: updateAsync, isPending: isUpdating } = useUpdateTask();
  const { mutateAsync: deleteAsync, isPending: isDeleting } = useDeleteTask();

  const value = useMemo<TaskOperationsContextValue>(
    () => ({
      createTask: (input) => createAsync(input),
      updateTask: (id, patch) => updateAsync({ id, patch }),
      deleteTask: (id) => deleteAsync({ id }),
      isCreating,
      isUpdating,
      isDeleting,
    }),
    [createAsync, deleteAsync, isCreating, isDeleting, isUpdating, updateAsync]
  );

  return <TaskOperationsContext.Provider value={value}>{children}</TaskOperationsContext.Provider>;
}

export function useTaskOperations() {
  const context = useContext(TaskOperationsContext);
  if (!context) {
    throw new Error("useTaskOperations must be used within TaskOperationsProvider");
  }
  return context;
}
