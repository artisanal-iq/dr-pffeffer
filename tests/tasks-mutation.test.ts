import { test } from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";

import { createUpdateTaskMutationOptions } from "../src/hooks/tasks";
import { qk } from "../src/hooks/keys";
import type { Task, TaskListResponse } from "../src/types/models";

const baseTask: Task = {
  id: "task-id",
  user_id: "user-id",
  title: "Draft proposal",
  status: "todo",
  priority: "medium",
  scheduled_time: new Date().toISOString(),
  duration_minutes: 45,
  context: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const baseList: TaskListResponse = {
  items: [baseTask],
  count: 1,
};

test("task update mutation applies optimistic changes and persists on success", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(qk.tasks.detail(baseTask.id), baseTask);
  client.setQueryData(qk.tasks.list(null), baseList);

  const options = createUpdateTaskMutationOptions(client);
  const context = await options.onMutate?.({ id: baseTask.id, patch: { status: "done" } }, undefined as never);
  assert.ok(context);

  assert.equal(client.getQueryData<Task>(qk.tasks.detail(baseTask.id))?.status, "done");
  assert.equal(client.getQueryData<TaskListResponse>(qk.tasks.list(null))?.items[0].status, "done");

  const updatedTask: Task = { ...baseTask, status: "done", updated_at: new Date().toISOString() };
  options.onSuccess?.(updatedTask, { id: baseTask.id, patch: { status: "done" } }, context, undefined as never);
  assert.equal(client.getQueryData<Task>(qk.tasks.detail(baseTask.id))?.status, "done");
  assert.equal(client.getQueryData<TaskListResponse>(qk.tasks.list(null))?.items[0].status, "done");

  client.clear();
});

test("task update mutation rolls back on error", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(qk.tasks.detail(baseTask.id), baseTask);
  client.setQueryData(qk.tasks.list(null), baseList);

  const options = createUpdateTaskMutationOptions(client);
  const context = await options.onMutate?.({ id: baseTask.id, patch: { status: "done" } }, undefined as never);
  assert.ok(context);
  assert.equal(client.getQueryData<Task>(qk.tasks.detail(baseTask.id))?.status, "done");

  options.onError?.(new Error("boom"), { id: baseTask.id, patch: { status: "done" } }, context, undefined as never);
  assert.equal(client.getQueryData<Task>(qk.tasks.detail(baseTask.id))?.status, "todo");
  assert.equal(client.getQueryData<TaskListResponse>(qk.tasks.list(null))?.items[0].status, "todo");

  client.clear();
});
