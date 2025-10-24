import React from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { collectText, createStubUser } from "./helpers";

const requireUserMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireUser: (...args: Parameters<typeof requireUserMock>) => requireUserMock(...args),
}));

vi.mock("@/components/tasks/task-list", () => ({
  __esModule: true,
  default: () => React.createElement("div", undefined, "Stub task list"),
}));

describe("/planner smoke test", () => {
  beforeAll(() => {
    (globalThis as unknown as { React: typeof React }).React = React;
  });

  beforeEach(() => {
    vi.resetModules();
    requireUserMock.mockReset();
    requireUserMock.mockResolvedValue(createStubUser());
  });

  it("renders the planner overview for authenticated users", async () => {
    const { default: PlannerPage } = await import("@/app/planner/page");
    const element = await PlannerPage();

    expect(requireUserMock).toHaveBeenCalledWith("/planner");

    const textContent = collectText(element);
    expect(textContent).toContain("Planner");
    expect(textContent).toContain("Tasks, manual scheduling, and (later) auto-plan controls.");
  });
});
