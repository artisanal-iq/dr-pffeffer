import React from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { collectText, createStubUser } from "./helpers";

const requireUserMock = vi.fn();
const dashboardContentMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireUser: (...args: Parameters<typeof requireUserMock>) => requireUserMock(...args),
}));

vi.mock("@/lib/observability", () => ({
  observeDashboardRoute: (handler: () => Promise<unknown>) => handler(),
}));

vi.mock("@/app/dashboard/dashboard-content", () => ({
  __esModule: true,
  default: (...args: Parameters<typeof dashboardContentMock>) => dashboardContentMock(...args),
}));

describe("/dashboard smoke test", () => {
  beforeAll(() => {
    // React 18 server components expect a global React reference when compiled for tests.
    (globalThis as unknown as { React: typeof React }).React = React;
  });

  beforeEach(() => {
    vi.resetModules();
    requireUserMock.mockReset();
    dashboardContentMock.mockReset();
    requireUserMock.mockResolvedValue(createStubUser());
    dashboardContentMock.mockImplementation(async () =>
      React.createElement("section", undefined, "Stub dashboard content"),
    );
  });

  it("renders the dashboard shell for authenticated users", async () => {
    const { default: DashboardPage } = await import("@/app/dashboard/page");
    const element = await DashboardPage();

    expect(requireUserMock).toHaveBeenCalledWith("/dashboard");
    const textContent = collectText(element);
    expect(textContent).toContain("Dashboard");
    expect(textContent).toContain(
      "Track completions, spot consistency trends, and jump into your next action.",
    );
  });
});
