"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeProvider as NextThemeProvider, useTheme as useNextTheme } from "next-themes";

import { useSettings, useUpsertSettings } from "@/hooks/settings";

type ThemeName = "light" | "dark" | "system";

const VALID_THEMES = new Set<ThemeName>(["light", "dark", "system"]);

function normalizeTheme(value: string | null | undefined): ThemeName | null {
  return value && VALID_THEMES.has(value as ThemeName) ? (value as ThemeName) : null;
}

export function resolveTheme(persisted: string | null | undefined, nextTheme?: string | null, resolvedTheme?: string | null): ThemeName {
  const persistedTheme = normalizeTheme(persisted);
  if (persistedTheme) {
    return persistedTheme;
  }
  const fallback = normalizeTheme(nextTheme) ?? normalizeTheme(resolvedTheme);
  return fallback ?? "system";
}

type PersistThemeDeps = {
  currentTheme: ThemeName;
  setNextTheme: (value: ThemeName) => void;
  persist: (input: { theme: ThemeName }) => Promise<unknown>;
};

export function createPersistedThemeSetter({ currentTheme, setNextTheme, persist }: PersistThemeDeps) {
  return async (value: ThemeName) => {
    const previous = currentTheme;
    setNextTheme(value);
    try {
      await persist({ theme: value });
    } catch (error) {
      setNextTheme(previous);
      throw error;
    }
  };
}

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (value: ThemeName) => Promise<void>;
  isLoading: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function ThemeContextInner({ children }: { children: ReactNode }) {
  const { data, isLoading: settingsLoading } = useSettings();
  const upsert = useUpsertSettings();
  const { theme: nextTheme, resolvedTheme, setTheme: setNextTheme } = useNextTheme();
  const [synced, setSynced] = useState(false);

  const currentTheme: ThemeName = useMemo(
    () => resolveTheme(data?.theme ?? null, nextTheme, resolvedTheme),
    [data?.theme, nextTheme, resolvedTheme]
  );

  useEffect(() => {
    if (!synced && data !== undefined) {
      if (data?.theme) {
        setNextTheme(data.theme as ThemeName);
      }
      setSynced(true);
    }
  }, [data, setNextTheme, synced]);

  const setTheme = useMemo(
    () =>
      createPersistedThemeSetter({
        currentTheme,
        setNextTheme,
        persist: (input) => upsert.mutateAsync(input),
      }),
    [currentTheme, setNextTheme, upsert]
  );

  const value = useMemo<ThemeContextValue>(() => ({
    theme: currentTheme,
    setTheme,
    isLoading: settingsLoading || upsert.isPending || !synced,
  }), [currentTheme, setTheme, settingsLoading, upsert.isPending, synced]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeContextInner>{children}</ThemeContextInner>
    </NextThemeProvider>
  );
}

export function useThemeSettings() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeSettings must be used within ThemeProvider");
  }
  return context;
}

export type { ThemeName };
