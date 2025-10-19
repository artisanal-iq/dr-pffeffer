import { test } from "node:test";
import assert from "node:assert/strict";

import { createPersistedThemeSetter, resolveTheme } from "../src/context/theme-context";

test("resolveTheme favors persisted theme when available", () => {
  assert.equal(resolveTheme("dark", "light", "system"), "dark");
  assert.equal(resolveTheme(null, "dark", "light"), "dark");
  assert.equal(resolveTheme(undefined, undefined, "dark"), "dark");
  assert.equal(resolveTheme(undefined, undefined, undefined), "system");
});

test("createPersistedThemeSetter persists changes and reverts on failure", async () => {
  let latestTheme = "light";
  let persisted: string | null = null;
  const setter = createPersistedThemeSetter({
    currentTheme: "light",
    setNextTheme: (value) => {
      latestTheme = value;
    },
    persist: async ({ theme }) => {
      persisted = theme;
    },
  });

  await setter("dark");
  assert.equal(latestTheme, "dark");
  assert.equal(persisted, "dark");

  const failingSetter = createPersistedThemeSetter({
    currentTheme: "dark",
    setNextTheme: (value) => {
      latestTheme = value;
    },
    persist: async () => {
      throw new Error("network");
    },
  });

  await assert.rejects(() => failingSetter("light"));
  assert.equal(latestTheme, "dark");
});
