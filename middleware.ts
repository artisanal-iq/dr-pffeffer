import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  createSupabaseMiddlewareClient,
  isAuthTestMode,
} from "@/lib/supabase";

const PROTECTED_PATHS = [
  "/dashboard",
  "/planner",
  "/journal",
  "/connections",
  "/settings",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(req: NextRequest) {
  if (!isProtectedPath(req.nextUrl.pathname) || isAuthTestMode()) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(req, res);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    return res;
  }

  const redirectUrl = req.nextUrl.clone();
  redirectUrl.pathname = "/auth/sign-in";
  redirectUrl.searchParams.set("redirect", `${req.nextUrl.pathname}${req.nextUrl.search}`);

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: PROTECTED_PATHS.map((path) => `${path}/:path*`),
};
