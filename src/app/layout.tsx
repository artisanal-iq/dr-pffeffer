import type { Metadata } from "next";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Power Practice Planner",
  description: "Master presence, purpose, and productivity.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="border-b border-black/10 dark:border-white/10">
          <nav className="mx-auto max-w-5xl px-6 h-14 flex items-center gap-6 text-sm">
            <Link className="font-semibold" href="/">Power Practice</Link>
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            <Link href="/routine" className="hover:underline">Daily routine</Link>
            <Link href="/planner" className="hover:underline">Planner</Link>
            <Link href="/journal" className="hover:underline">Journal</Link>
            <Link href="/connections" className="hover:underline">Connections</Link>
            <Link href="/settings" className="hover:underline ml-auto">Settings</Link>
            {user ? (
              <form action="/auth/signout" method="post">
                <button className="hover:underline" type="submit">Sign out</button>
              </form>
            ) : (
              <Link href="/login" className="hover:underline">Sign in</Link>
            )}
          </nav>
        </header>
        <Providers>
          <div className="mx-auto max-w-5xl px-6">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
