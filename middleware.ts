import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function forwardCookies(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    destination.cookies.set({
      name: cookie.name,
      value: cookie.value,
      path: cookie.path,
      expires: cookie.expires,
      maxAge: cookie.maxAge,
      sameSite: cookie.sameSite,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
    });
  });
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  if (!supabaseUrl || !supabaseAnonKey) {
    return res;
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;
  const isOnboarding = pathname.startsWith("/onboarding");

  if (!user) {
    if (isOnboarding) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      const redirect = NextResponse.redirect(loginUrl);
      forwardCookies(res, redirect);
      return redirect;
    }
    return res;
  }

  if (pathname.startsWith("/api")) {
    return res;
  }

  const { data: settings, error } = await supabase
    .from("settings")
    .select("persona, work_start, work_end, theme, theme_contrast, accent_color")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    return res;
  }

  const profileComplete = Boolean(
    settings?.persona &&
      settings?.work_start &&
      settings?.work_end &&
      settings?.theme &&
      settings?.theme_contrast &&
      settings?.accent_color,
  );

  if (!profileComplete && !isOnboarding && pathname !== "/auth/signout") {
    const onboardingUrl = req.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    const redirect = NextResponse.redirect(onboardingUrl);
    forwardCookies(res, redirect);
    return redirect;
  }

  if (profileComplete && isOnboarding) {
    const dashboardUrl = req.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    const redirect = NextResponse.redirect(dashboardUrl);
    forwardCookies(res, redirect);
    return redirect;
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
