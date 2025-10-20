import { test } from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";

import { createUpsertSettingsMutationOptions } from "../src/hooks/settings";
import { qk } from "../src/hooks/keys";
import type { Settings } from "../src/types/models";

const baseSettings: Settings = {
  id: "settings-id",
  user_id: "user-id",
  theme: "light",
  notifications: true,
  ai_persona: null,
  persona: null,
  work_start: null,
  work_end: null,
  theme_contrast: null,
  accent_color: null,
  nudge_schedule: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function createResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

test("optimistic notifications update persists on success", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(qk.settings.root(), baseSettings);

  const nextSettings = { ...baseSettings, notifications: false };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => createResponse(nextSettings, { status: 201 });
  try {
    const options = createUpsertSettingsMutationOptions(client);
    const context = (await options.onMutate?.({ notifications: false }, undefined as never)) ?? { previous: baseSettings };
    assert.equal(client.getQueryData<Settings>(qk.settings.root())?.notifications, false);

    const result = await options.mutationFn?.({ notifications: false }, undefined as never);
    assert.ok(result);
    options.onSuccess?.(nextSettings, { notifications: false }, context, undefined as never);
    assert.equal(client.getQueryData<Settings>(qk.settings.root())?.notifications, false);
  } finally {
    globalThis.fetch = originalFetch;
    client.clear();
  }
});

test("optimistic notifications update rolls back on failure", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(qk.settings.root(), baseSettings);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    createResponse(
      { error: { code: "server_error", message: "boom" } },
      { status: 500 }
    );

  try {
    const options = createUpsertSettingsMutationOptions(client);
    const context = (await options.onMutate?.({ notifications: false }, undefined as never)) ?? { previous: baseSettings };
    assert.equal(client.getQueryData<Settings>(qk.settings.root())?.notifications, false);

    await assert.rejects(() => options.mutationFn?.({ notifications: false }, undefined as never) as Promise<unknown>);
    options.onError?.(new Error("boom"), { notifications: false }, context, undefined as never);
    assert.equal(client.getQueryData<Settings>(qk.settings.root())?.notifications, true);
  } finally {
    globalThis.fetch = originalFetch;
    client.clear();
  }
});
