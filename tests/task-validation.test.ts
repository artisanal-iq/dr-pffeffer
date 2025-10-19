import { test } from "node:test";
import assert from "node:assert/strict";

import { taskCreateSchema, taskListQuerySchema, taskUpdateSchema } from "../src/lib/validation/tasks";

test("task create schema applies defaults", () => {
  const result = taskCreateSchema.parse({ title: "Write report" });
  assert.equal(result.status, "todo");
  assert.equal(result.priority, "medium");
  assert.deepEqual(result.context, {});
});

test("task create schema rejects invalid status", () => {
  const result = taskCreateSchema.safeParse({ title: "Invalid", status: "blocked" });
  assert.equal(result.success, false);
});

test("task update schema requires at least one field", () => {
  const result = taskUpdateSchema.safeParse({});
  assert.equal(result.success, false);
});

test("task list query schema coerces pagination", () => {
  const parsed = taskListQuerySchema.parse({ limit: "75", offset: "5" });
  assert.equal(parsed.limit, 75);
  assert.equal(parsed.offset, 5);
});
