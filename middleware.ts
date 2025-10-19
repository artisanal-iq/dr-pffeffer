import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "./src/lib/supabase-middleware";
import { logUnauthorizedAccess } from "./src/lib/audit";

function getClientIp(req: NextRequest) {
  const header = req.headers.get("x-forwarded-for");
  if (header) {
    return header.split(",")[0]?.trim() || null;
  }
  const requestWithIp = req as NextRequest & { ip?: string | null };
  return requestWithIp.ip ?? null;
}

type SupabaseAuthClient = {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null } }>;
  };
};

type MiddlewareClient = {
  supabase: SupabaseAuthClient;
  applyCookies: (res: NextResponse) => NextResponse;
};

type MiddlewareDeps = {
  createClient: (req: NextRequest) => MiddlewareClient;
  logUnauthorized: (
    supabase: SupabaseAuthClient,
    params: { requestPath: string; ipAddress?: string | null; metadata?: Record<string, unknown> }
  ) => Promise<unknown> | unknown;
};

export function createAuthMiddleware({ createClient, logUnauthorized }: MiddlewareDeps) {
  return async function authMiddleware(req: NextRequest) {
    const { supabase, applyCookies } = createClient(req);
    const res = NextResponse.next();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirect", `${req.nextUrl.pathname}${req.nextUrl.search}`);

      await logUnauthorized(supabase, {
        requestPath: req.nextUrl.pathname,
        ipAddress: getClientIp(req),
        metadata: {
          method: req.method,
        },
      });

      return applyCookies(NextResponse.redirect(redirectUrl));
    }

    return applyCookies(res);
  };
}

export const middleware = createAuthMiddleware({
  createClient: (req) => createSupabaseMiddlewareClient(req),
  logUnauthorized: (supabase, params) => logUnauthorizedAccess(supabase as unknown as Parameters<typeof logUnauthorizedAccess>[0], params),
});

export const config = {
  matcher: ["/dashboard/:path*", "/planner/:path*", "/journal/:path*", "/connections/:path*", "/settings/:path*"],
};
