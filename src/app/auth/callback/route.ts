import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const redirectTo = url.searchParams.get("redirect") || "/dashboard";
  const redirectUrl = new URL(
    redirectTo,
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  );
  const isSecure = redirectUrl.protocol === "https:";

  // Prepare response early so we can attach cookies to it
  const res = NextResponse.redirect(redirectUrl);

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({
            name,
            value,
            ...options,
            secure: options?.secure ?? isSecure,
          });
        },
        remove(name, options) {
          res.cookies.set({
            name,
            value: "",
            ...options,
            maxAge: 0,
            secure: options?.secure ?? isSecure,
          });
        },
      },
    });

    await supabase.auth.exchangeCodeForSession(code);
    // Fallback: explicitly set cookies if session exists (belt & suspenders)
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session) {
      const s = sessionData.session;
      // Access token
      res.cookies.set({
        name: "sb-access-token",
        value: s.access_token,
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        expires: s.expires_at ? new Date(s.expires_at * 1000) : undefined,
      });
      // Refresh token
      if (s.refresh_token) {
        res.cookies.set({
          name: "sb-refresh-token",
          value: s.refresh_token,
          httpOnly: true,
          secure: isSecure,
          sameSite: "lax",
          path: "/",
        });
      }
    }
  }

  return res;
}
