export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase environment configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    );
  }

  return { url, anonKey };
}

export function getSiteUrl(requestOrigin?: string | null): string {
  return process.env.NEXT_PUBLIC_SITE_URL || requestOrigin || "http://localhost:3000";
}

export function isAuthTestMode(): boolean {
  return process.env.AUTH_TEST_MODE === "1";
}

export function resolveAppUrl(
  target: string | null | undefined,
  siteUrl: string,
  defaultPath: string = "/dashboard"
): URL {
  const base = new URL(siteUrl);

  if (!target) {
    return new URL(defaultPath, base);
  }

  try {
    const resolved = new URL(target, base);
    if (resolved.origin !== base.origin) {
      return new URL(defaultPath, base);
    }
    return resolved;
  } catch {
    return new URL(defaultPath, base);
  }
}
