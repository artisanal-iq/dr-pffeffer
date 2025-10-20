"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
};

type GlobalNavLinksProps = {
  links: NavLink[];
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function GlobalNavLinks({ links }: GlobalNavLinksProps) {
  const pathname = usePathname();
  const router = useRouter();

  const activeValue = useMemo(() => {
    const active = links.find((link) => isActivePath(pathname, link.href));
    return active?.href ?? "";
  }, [links, pathname]);

  return (
    <>
      <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
        {links.map((link) => {
          const active = isActivePath(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-3 py-2 transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-1 justify-end md:hidden">
        <label className="sr-only" htmlFor="mobile-global-nav">
          Select a destination
        </label>
        <select
          id="mobile-global-nav"
          className="min-w-[160px] rounded-lg border border-black/10 bg-background px-3 py-2 text-sm text-foreground shadow-sm dark:border-white/10"
          value={activeValue}
          onChange={(event) => {
            const next = event.target.value;
            if (next && next !== pathname) {
              router.push(next);
            }
          }}
        >
          {links.map((link) => (
            <option key={link.href} value={link.href}>
              {link.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
