import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import type { Task, TaskContext } from "@/types/models";
import {
  GtdProjectLists,
  SINGLE_ACTIONS_LABEL,
  getTaskProject,
  groupTasksByProject,
  splitTasksIntoBuckets,
} from "@/components/planner/project-lists";

const createTaskSpy = vi.fn();
const updateTaskSpy = vi.fn();

vi.mock("@/hooks/tasks", () => ({
  useTasks: vi.fn(),
}));

vi.mock("@/context/tasks-context", () => ({
  useTaskOperations: () => ({
    createTask: createTaskSpy,
    updateTask: updateTaskSpy,
    deleteTask: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  }),
}));

const { useTasks } = await import("@/hooks/tasks");
const mockedUseTasks = useTasks as unknown as vi.Mock;

let idCounter = 0;

function makeTask(overrides: Partial<Task> & { context?: TaskContext } = {}): Task {
  idCounter += 1;
  return {
    id: overrides.id ?? `task-${idCounter}`,
    user_id: overrides.user_id ?? "user-1",
    title: overrides.title ?? `Task ${idCounter}`,
    status: overrides.status ?? "todo",
    priority: overrides.priority ?? "medium",
    scheduled_time: overrides.scheduled_time ?? null,
    duration_minutes: overrides.duration_minutes ?? 30,
    context: overrides.context ?? {},
    created_at: overrides.created_at ?? "2024-01-01T00:00:00.000Z",
    updated_at: overrides.updated_at ?? "2024-01-01T00:00:00.000Z",
  } satisfies Task;
}

describe("project list helpers", () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it("splits tasks into GTD buckets with sorting", () => {
    const nextEarly = makeTask({ title: "Early", scheduled_time: "2024-04-01T08:00:00.000Z" });
    const nextLateHigh = makeTask({
      title: "Later",
      scheduled_time: "2024-04-01T10:00:00.000Z",
      priority: "high",
    });
    const nextLateLow = makeTask({
      title: "Later Low",
      scheduled_time: "2024-04-01T10:00:00.000Z",
      priority: "low",
    });
    const waiting = makeTask({ title: "Waiting", context: { waitingOn: "Alex" } });
    const someday = makeTask({ title: "Someday", context: { gtdList: "someday" } });
    const done = makeTask({ title: "Done", status: "done" });

    const buckets = splitTasksIntoBuckets([nextLateLow, nextEarly, waiting, someday, nextLateHigh, done]);

    expect(buckets.nextActions.map((task) => task.title)).toEqual(["Early", "Later", "Later Low"]);
    expect(buckets.waitingFor.map((task) => task.title)).toEqual(["Waiting"]);
    expect(buckets.someday.map((task) => task.title)).toEqual(["Someday"]);
  });

  it("groups tasks by project name and handles missing context", () => {
    const solo = makeTask({ title: "Solo" });
    const projectTask = makeTask({ title: "Launch", context: { project: "Launch Plan" } });
    const waiting = makeTask({ title: "Follow up", context: { project: "Launch Plan", waitingOn: true } });
    const someday = makeTask({ title: "Idea", context: { project: "Growth", gtdList: "someday" } });

    const groups = groupTasksByProject([projectTask, solo, waiting, someday]);

    expect(groups).toHaveLength(3);
    expect(groups[0].project).toBe(SINGLE_ACTIONS_LABEL);
    expect(groups[0].nextActions.map((task) => task.title)).toEqual(["Solo"]);
    expect(groups[1].project).toBe("Growth");
    expect(groups[1].someday).toHaveLength(1);
    expect(groups[2].project).toBe("Launch Plan");
    expect(groups[2].waitingFor).toHaveLength(1);
  });

  it("treats blank or whitespace project names as single actions", () => {
    const blank = makeTask({ context: { project: "   " } });
    expect(getTaskProject(blank)).toBe(SINGLE_ACTIONS_LABEL);
  });
});

describe("GtdProjectLists component", () => {
  beforeEach(() => {
    idCounter = 0;
    createTaskSpy.mockReset();
    updateTaskSpy.mockReset();
    mockedUseTasks.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders project headers and bucket counts", () => {
    const launchNext = makeTask({
      title: "Draft kickoff",
      context: { project: "Launch" },
      scheduled_time: "2024-04-02T09:00:00.000Z",
    });
    const launchWaiting = makeTask({
      title: "Vendor reply",
      context: { project: "Launch", waitingOn: "Vendor" },
    });
    const launchSomeday = makeTask({
      title: "Stretch idea",
      context: { project: "Launch", gtdList: "someday" },
    });
    const solo = makeTask({ title: "Inbox zero" });

    mockedUseTasks.mockReturnValue({
      data: { items: [launchNext, launchWaiting, launchSomeday, solo] },
      isLoading: false,
    });

    render(<GtdProjectLists />);

    expect(screen.getByRole("heading", { name: "Projects" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Launch" })).toBeTruthy();
    expect(screen.getAllByText(/Someday/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Next Actions/i)).toBeTruthy();
    expect(screen.getByText(/Waiting For/i)).toBeTruthy();
    expect(screen.getByText(/Someday \/ Maybe/i)).toBeTruthy();
  });
});
