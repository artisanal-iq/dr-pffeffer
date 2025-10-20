import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createEntityModalController } from "@/components/modals/create-entity-modal-controller";
import { addAnalyticsListener, resetAnalyticsListeners, type AnalyticsEvent } from "@/lib/analytics";

describe("createEntityModalController", () => {
  it("tracks open and submit events on successful creation", async () => {
    resetAnalyticsListeners();
    const events: AnalyticsEvent[] = [];
    const unsubscribe = addAnalyticsListener((event) => events.push(event));
    const createCalls: Array<{ name: string }> = [];
    let resetCount = 0;
    const controller = createEntityModalController({
      schema: z.object({ name: z.string().min(1) }),
      entityName: "test",
      onCreate: async (values) => {
        createCalls.push(values);
      },
      onReset: () => {
        resetCount += 1;
      },
    });

    controller.open();
    expect(events.at(-1)?.name).toBe("modal.open");

    const result = await controller.submit({ name: "Example" });
    expect(result).toEqual({ status: "success" });
    expect(createCalls).toEqual([{ name: "Example" }]);
    expect(events.filter((event) => event.name === "modal.submit")).toHaveLength(1);
    expect(resetCount).toBeGreaterThanOrEqual(1);

    unsubscribe();
  });

  it("returns validation errors without emitting submit events", async () => {
    resetAnalyticsListeners();
    const events: AnalyticsEvent[] = [];
    const unsubscribe = addAnalyticsListener((event) => events.push(event));
    const createCalls: Array<{ name: string }> = [];
    let resetCount = 0;
    const controller = createEntityModalController({
      schema: z.object({ name: z.string().min(1, "Name is required") }),
      entityName: "test",
      onCreate: async (values) => {
        createCalls.push(values);
      },
      onReset: () => {
        resetCount += 1;
      },
    });

    const result = await controller.submit({ name: "" });
    expect(result.status).toBe("validation_error");
    if (result.status === "validation_error") {
      expect(result.fieldErrors.name?.[0]).toBe("Name is required");
    }
    expect(createCalls).toHaveLength(0);
    expect(events.filter((event) => event.name === "modal.submit")).toHaveLength(0);
    expect(resetCount).toBe(0);

    unsubscribe();
  });

  it("tracks cancellation events", () => {
    resetAnalyticsListeners();
    const events: AnalyticsEvent[] = [];
    const unsubscribe = addAnalyticsListener((event) => events.push(event));
    let resetCount = 0;
    const controller = createEntityModalController({
      schema: z.object({ name: z.string() }),
      entityName: "test",
      onCreate: async () => {
        /* no-op */
      },
      onReset: () => {
        resetCount += 1;
      },
    });

    controller.cancel();
    expect(events.at(-1)?.name).toBe("modal.cancel");
    expect(resetCount).toBeGreaterThanOrEqual(1);

    unsubscribe();
  });
});
