// @vitest-environment jsdom

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";

import TaskList from "@/components/tasks/task-list";
import type { TaskListResponse, useTasks as useTasksType } from "@/hooks/tasks";

type UseTasksParams = Parameters<typeof useTasksType>[0];

const createMockResult = () =>
  ({
    data: { items: [], count: 0 } as TaskListResponse,
    isLoading: false,
    isError: false,
    error: null,
  });

const mockUseTasks = vi.fn(() => createMockResult());

vi.mock("@/hooks/tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/tasks")>();
  return {
    ...actual,
    useTasks: mockUseTasks as unknown as typeof actual.useTasks,
  };
});

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    disconnect() {}
  }
  // @ts-expect-error shim for test environment
  global.ResizeObserver = ResizeObserverStub;
});

afterEach(() => {
  mockUseTasks.mockClear();
});

describe("TaskList", () => {
  it("renders empty state when there are no tasks", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<TaskList />);
    });
    expect(container.textContent).toContain("No tasks match the selected filters.");
    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
