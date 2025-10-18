 "use client";
 import { useState } from "react";
 import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const supabase = createSupabaseBrowserClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const redirectTo = `${siteUrl}/auth/callback?redirect=/dashboard`;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (error) setStatus(error.message);
    else setStatus("Check your email for a magic link.");
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          className="w-full border rounded px-3 py-2 bg-transparent"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black">Send magic link</button>
      </form>
      {status && <p className="mt-3 text-sm opacity-80">{status}</p>}
    </div>
  );
}
