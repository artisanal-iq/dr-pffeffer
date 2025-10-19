import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

type CookieOptions = Partial<{
  domain: string;
  encode: (value: string) => string;
  expires: Date;
  httpOnly: boolean;
  maxAge: number;
  path: string;
  sameSite: true | false | "lax" | "strict" | "none";
  secure: boolean;
  priority: "low" | "medium" | "high";
  partitioned: boolean;
}>;

type PendingCookie = { name: string; value: string; options?: CookieOptions };

export function createSupabaseMiddlewareClient(req: NextRequest) {
  const pendingCookies: PendingCookie[] = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
      res.cookies.set({
        name: cookie.name,
        value: cookie.value,
        ...cookie.options,
      });
    }
    return res;
  }

  return { supabase, applyCookies };
}
