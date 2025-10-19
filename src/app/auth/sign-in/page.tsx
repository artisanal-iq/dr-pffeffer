"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

const DEFAULT_REDIRECT = "/dashboard";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirect = searchParams.get("redirect") || DEFAULT_REDIRECT;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/auth/sign-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, redirectTo: redirect }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = typeof payload.error === "string" ? payload.error : "Unable to sign in.";
        throw new Error(message);
      }

      const message = typeof payload.message === "string" ? payload.message : "Check your email for a magic link.";
      setStatus({ type: "success", message });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in.";
      setStatus({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-3xl font-semibold mb-4">Sign in</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Enter your email address and we&apos;ll send you a one-time magic link to access your workspace.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="w-full border rounded px-3 py-2 bg-transparent"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending..." : "Send magic link"}
        </button>
      </form>
      {status && (
        <p
          data-testid="auth-status"
          role="status"
          className={`mt-4 text-sm ${status.type === "error" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
