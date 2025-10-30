"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTransition, type JSX } from "react";

import { useThemeSettings, type ThemeName } from "@/context/theme-context";
import { cn } from "@/lib/utils";

const ORDER: ThemeName[] = ["light", "dark", "system"];

const ICONS: Record<ThemeName, JSX.Element> = {
  light: <Sun aria-hidden className="h-4 w-4" />,
  dark: <Moon aria-hidden className="h-4 w-4" />,
  system: <Monitor aria-hidden className="h-4 w-4" />,
};

function nextTheme(current: ThemeName) {
  const index = ORDER.indexOf(current);
  if (index === -1) {
    return ORDER[0];
  }
  return ORDER[(index + 1) % ORDER.length];
}

export default function ThemeToggle() {
  const { theme, setTheme, isLoading } = useThemeSettings();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={`Toggle theme (current: ${theme})`}
      disabled={isLoading || isPending}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-background text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/15",
        (isLoading || isPending) && "opacity-70"
      )}
      onClick={() => {
        const target = nextTheme(theme);
        startTransition(() => {
          void setTheme(target);
        });
      }}
    >
      <span className="sr-only">Toggle theme</span>
      {ICONS[theme]}
    </button>
  );
}
