import { NextRequest, NextResponse } from "next/server";

import {
  createSupabaseRouteHandlerClient,
  getSiteUrl,
  isAuthTestMode,
} from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const siteUrl = getSiteUrl(req.headers.get("origin"));
  const response = NextResponse.redirect(new URL("/", siteUrl));

  if (isAuthTestMode()) {
    response.cookies.set({ name: "sb-access-token", value: "", path: "/", maxAge: 0 });
    response.cookies.set({ name: "sb-refresh-token", value: "", path: "/", maxAge: 0 });
    return response;
  }

  const { supabase, applyCookies } = createSupabaseRouteHandlerClient(req);
  await supabase.auth.signOut();

  response.cookies.set({ name: "sb-access-token", value: "", path: "/", maxAge: 0 });
  response.cookies.set({ name: "sb-refresh-token", value: "", path: "/", maxAge: 0 });

  return applyCookies(response);
}
