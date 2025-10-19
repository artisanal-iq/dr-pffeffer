import { NextRequest, NextResponse } from "next/server";

import {
  createSupabaseRouteHandlerClient,
  getSiteUrl,
  isAuthTestMode,
  resolveAppUrl,
} from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const redirectParam = req.nextUrl.searchParams.get("redirect");
  const siteUrl = getSiteUrl(req.headers.get("origin"));
  const redirectUrl = resolveAppUrl(redirectParam, siteUrl);

  let response = NextResponse.redirect(redirectUrl);

  if (!code) {
    return response;
  }

  if (isAuthTestMode()) {
    return response;
  }

  const { supabase, applyCookies } = createSupabaseRouteHandlerClient(req);

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorUrl = new URL("/auth/sign-in", siteUrl);
    errorUrl.searchParams.set("error", error.message);
    response = NextResponse.redirect(errorUrl);
    return applyCookies(response);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (session) {
    const isSecure = redirectUrl.protocol === "https:";
    const accessCookie = {
      name: "sb-access-token",
      value: session.access_token,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax" as const,
      path: "/",
      expires: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
    };

    response.cookies.set(accessCookie);

    if (session.refresh_token) {
      response.cookies.set({
        name: "sb-refresh-token",
        value: session.refresh_token,
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
      });
    }
  }

  return applyCookies(response);
}
