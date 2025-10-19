import type { Metadata } from "next";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { createSupabaseServerClient, isAuthTestMode } from "@/lib/supabase";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Power Practice Planner",
  description: "Master presence, purpose, and productivity.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
  type SupabaseUser = Awaited<ReturnType<ServerClient["auth"]["getUser"]>>["data"]["user"];

  let user: SupabaseUser | null = null;

  if (!isAuthTestMode()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch (error) {
      console.warn("Failed to retrieve Supabase user", error);
      user = null;
    }
  }
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="border-b border-black/10 dark:border-white/10">
          <nav className="mx-auto max-w-5xl px-6 h-14 flex items-center gap-6 text-sm">
            <Link className="font-semibold" href="/">Power Practice</Link>
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            <Link href="/planner" className="hover:underline">Planner</Link>
            <Link href="/journal" className="hover:underline">Journal</Link>
            <Link href="/connections" className="hover:underline">Connections</Link>
            <Link href="/settings" className="hover:underline ml-auto">Settings</Link>
            {user ? (
              <form action="/auth/sign-out" method="post">
                <button className="hover:underline" type="submit">Sign out</button>
              </form>
            ) : (
              <Link href="/auth/sign-in" className="hover:underline">Sign in</Link>
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
