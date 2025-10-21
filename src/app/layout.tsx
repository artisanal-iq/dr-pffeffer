import type { Metadata } from "next";
import type { ReactNode } from "react";
export const dynamic = "force-dynamic";
import { AppHeader } from "@/components/layout/app-header";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import "./globals.css";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Power Practice Planner",
  description: "Master presence, purpose, and productivity.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col bg-background">
            <AppHeader user={user ?? null} />
            <main className="flex-1">
              <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
