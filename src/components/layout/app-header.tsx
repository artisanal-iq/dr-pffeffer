import Link from "next/link";
import type { User } from "@supabase/supabase-js";

import { GlobalNavLinks } from "./global-nav-links";
import ThemeToggle from "@/components/ui/theme-toggle";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/planner", label: "Planner" },
  { href: "/journal", label: "Journal" },
  { href: "/connections", label: "Connections" },
  { href: "/settings", label: "Settings" },
];

type AppHeaderProps = {
  user: User | null;
};

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75 dark:border-white/10">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link className="text-base font-semibold text-foreground" href="/">
          Power Practice
        </Link>
        <GlobalNavLinks links={NAV_LINKS} />
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user ? (
            <form action="/auth/signout" method="post">
              <button
                className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                type="submit"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
