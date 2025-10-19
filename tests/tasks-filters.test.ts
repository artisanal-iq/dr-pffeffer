import { describe, expect, it } from "vitest";

import { normalizeTaskFilters, serializeTaskFilters } from "@/hooks/tasks";

describe("task query filters", () => {
  it("normalizes missing values and applies defaults", () => {
    expect(normalizeTaskFilters()).toEqual({
      status: null,
      from: null,
      to: null,
      limit: 200,
      offset: 0,
    });
  });

  it("serializes filter combinations into query params", () => {
    const query = serializeTaskFilters({
      status: "todo",
      from: "2024-04-01T00:00:00.000Z",
      to: null,
      limit: 50,
      offset: 25,
    });
    const params = new URLSearchParams(query);
    expect(params.get("status")).toBe("todo");
    expect(params.get("from")).toBe("2024-04-01T00:00:00.000Z");
    expect(params.get("to")).toBeNull();
    expect(params.get("limit")).toBe("50");
    expect(params.get("offset")).toBe("25");
  });

  it("omits empty filters while keeping pagination defaults", () => {
    const normalized = normalizeTaskFilters({ status: null, from: null, to: null });
    const query = serializeTaskFilters(normalized);
    const params = new URLSearchParams(query);
    expect(Array.from(params.keys()).sort()).toEqual(["limit", "offset"]);
    expect(params.get("limit")).toBe("200");
    expect(params.get("offset")).toBe("0");
  });
});
