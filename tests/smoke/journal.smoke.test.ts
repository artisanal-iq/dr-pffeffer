import React from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { collectText, createStubUser } from "./helpers";

const requireUserMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireUser: (...args: Parameters<typeof requireUserMock>) => requireUserMock(...args),
}));

vi.mock("@/components/journal/ReflectionMetricsCard", () => ({
  ReflectionMetricsCard: () =>
    React.createElement("section", undefined, "Stub reflection metrics"),
  ReflectionMetricsCardSkeleton: () =>
    React.createElement("div", undefined, "Stub reflection metrics skeleton"),
}));

vi.mock("@/app/journal/JournalClient", () => ({
  __esModule: true,
  default: () => React.createElement("div", undefined, "Stub journal client"),
}));

describe("/journal smoke test", () => {
  beforeAll(() => {
    (globalThis as unknown as { React: typeof React }).React = React;
  });

  beforeEach(() => {
    vi.resetModules();
    requireUserMock.mockReset();
    requireUserMock.mockResolvedValue(createStubUser());
  });

  it("renders the journal workspace for authenticated users", async () => {
    const { default: JournalPage } = await import("@/app/journal/page");
    const element = await JournalPage();

    expect(requireUserMock).toHaveBeenCalledWith("/journal");

    const textContent = collectText(element);
    expect(textContent).toContain("Journal");
    expect(textContent).toContain("Write reflections; AI summaries will appear here.");
    expect(textContent).toContain("Explore the timeline view");
  });
});
