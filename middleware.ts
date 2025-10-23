import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { logUnauthorizedAccess } from "@/lib/audit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type SupabaseFactoryResult = {
  supabase: {
    auth: {
      getUser: () => Promise<{ data: { user: { id: string } | null } }>;
    };
    from?: SupabaseClient["from"];
  };
  applyCookies: (response: NextResponse) => NextResponse;
};

type SupabaseFactory = (
  req: NextRequest,
  res: NextResponse
) => Promise<SupabaseFactoryResult> | SupabaseFactoryResult;

type UnauthorizedLogger = (
  supabase: SupabaseFactoryResult["supabase"],
  payload: {
    requestPath: string;
    ipAddress?: string | null;
    metadata?: Record<string, unknown>;
  }
) => Promise<void> | void;

function defaultCreateClient(req: NextRequest, res: NextResponse): SupabaseFactoryResult {
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return req.cookies.get(name)?.value;
      },
      set(name, value, options) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        res.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  return {
    supabase,
    applyCookies: (response) => {
      res.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie);
      });
      return response;
    },
  };
}

async function defaultLogUnauthorized(
  supabase: SupabaseFactoryResult["supabase"],
  payload: Parameters<UnauthorizedLogger>[1]
) {
  await logUnauthorizedAccess(supabase as SupabaseClient, payload);
}

type MiddlewareOptions = {
  createClient?: SupabaseFactory;
  logUnauthorized?: UnauthorizedLogger;
};

function resolveIp(request: NextRequest) {
  const header = request.headers.get("x-forwarded-for");
  return header?.split(",")[0]?.trim() ?? null;
}

export function createAuthMiddleware({
  createClient = defaultCreateClient,
  logUnauthorized = defaultLogUnauthorized,
}: MiddlewareOptions = {}) {
  return async function authMiddleware(req: NextRequest) {
    const baseResponse = NextResponse.next();

    if (
      createClient === defaultCreateClient &&
      (!supabaseUrl || !supabaseAnonKey)
    ) {
      return baseResponse;
    }

    const { supabase, applyCookies } = await createClient(req, baseResponse);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      await logUnauthorized(supabase, {
        requestPath: req.nextUrl.pathname,
        ipAddress: resolveIp(req),
        metadata: { method: req.method },
      });

      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", req.nextUrl.pathname);

      return applyCookies(NextResponse.redirect(loginUrl));
    }

    if (req.nextUrl.pathname.startsWith("/api")) {
      return applyCookies(baseResponse);
    }

    if (!supabase.from) {
      return applyCookies(baseResponse);
    }

    const { data: settings, error } = await supabase
      .from("settings")
      .select("persona, work_start, work_end, theme, theme_contrast, accent_color")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      return applyCookies(baseResponse);
    }

    const profileComplete = Boolean(
      settings?.persona &&
        settings?.work_start &&
        settings?.work_end &&
        settings?.theme &&
        settings?.theme_contrast &&
        settings?.accent_color,
    );

    const isOnboarding = req.nextUrl.pathname.startsWith("/onboarding");

    if (!profileComplete && !isOnboarding && req.nextUrl.pathname !== "/auth/signout") {
      const onboardingUrl = req.nextUrl.clone();
      onboardingUrl.pathname = "/onboarding";
      return applyCookies(NextResponse.redirect(onboardingUrl));
    }

    if (profileComplete && isOnboarding) {
      const dashboardUrl = req.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return applyCookies(NextResponse.redirect(dashboardUrl));
    }

    return applyCookies(baseResponse);
  };
}

export const middleware = createAuthMiddleware();

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
