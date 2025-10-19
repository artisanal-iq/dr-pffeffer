import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./env";

type CookieAccessor = {
  get(name: string): string | undefined;
  set(name: string, value: string, options?: CookieOptions): void;
  remove(name: string, options?: CookieOptions): void;
};

function createSupabaseClientWithCookies(cookieAccessor: CookieAccessor): SupabaseClient {
  const { url, anonKey } = getSupabaseConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name) {
        return cookieAccessor.get(name);
      },
      set(name, value, options) {
        cookieAccessor.set(name, value, options);
      },
      remove(name, options) {
        cookieAccessor.remove(name, options);
      },
    },
  });
}

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createSupabaseClientWithCookies({
    get(name) {
      return cookieStore.get(name)?.value;
    },
    set(name, value, options) {
      try {
        cookieStore.set({ name, value, ...options });
      } catch {
        // In server components the cookie store may be read-only.
      }
    },
    remove(name, options) {
      try {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      } catch {
        // In server components the cookie store may be read-only.
      }
    },
  });
}

export type { SupabaseClient };
