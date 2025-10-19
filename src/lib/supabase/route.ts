import type { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./env";

type PendingCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export function createSupabaseRouteHandlerClient(req: NextRequest) {
  const pendingCookies: PendingCookie[] = [];
  const { url, anonKey } = getSupabaseConfig();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name) {
        return req.cookies.get(name)?.value;
      },
      set(name, value, options) {
        pendingCookies.push({ name, value, options });
      },
      remove(name, options) {
        pendingCookies.push({ name, value: "", options: { ...options, maxAge: 0 } });
      },
    },
  });

  function applyCookies<T extends NextResponse>(res: T): T {
    for (const cookie of pendingCookies) {
      res.cookies.set({ name: cookie.name, value: cookie.value, ...cookie.options });
    }
    return res;
  }

  return { supabase, applyCookies };
}

export type RouteHandlerSupabaseClient = SupabaseClient;
