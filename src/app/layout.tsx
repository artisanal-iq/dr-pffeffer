import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          </nav>
        </header>
        <div className="mx-auto max-w-5xl px-6">
          {children}
        </div>
      </body>
    </html>
  );
}
