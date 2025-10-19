import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  createSupabaseRouteHandlerClient,
  getSiteUrl,
  isAuthTestMode,
  resolveAppUrl,
} from "@/lib/supabase";

const signInSchema = z.object({
  email: z.string().email(),
  redirectTo: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = signInSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const { email, redirectTo } = parsed.data;
  const siteUrl = getSiteUrl(req.headers.get("origin"));
  const redirectUrl = resolveAppUrl(redirectTo, siteUrl);
  const callbackUrl = new URL("/auth/callback", siteUrl);
  callbackUrl.searchParams.set(
    "redirect",
    `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
  );

  if (isAuthTestMode()) {
    if (email.toLowerCase().includes("fail")) {
      return NextResponse.json({ error: "Unable to sign in with that email. Try again." }, { status: 400 });
    }

    return NextResponse.json({
      message: "Check your email for a magic link.",
      redirect: redirectUrl.toString(),
    });
  }

  const { supabase, applyCookies } = createSupabaseRouteHandlerClient(req);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const response = NextResponse.json({
    message: "Check your email for a magic link.",
    redirect: redirectUrl.toString(),
  });

  return applyCookies(response);
}
