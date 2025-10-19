import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const cookieNames = cookieStore
    .getAll()
    .map((c) => c.name)
    .filter((n) => n.startsWith("sb-"));

  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient(req);
  const [{ data: sessionData }, { data: userData }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);

  const safe = {
    cookieNames,
    session: sessionData?.session
      ? {
          expires_at: sessionData.session.expires_at,
          token_type: sessionData.session.token_type,
        }
      : null,
    user: userData?.user
      ? {
          id: userData.user.id,
          email: userData.user.email,
        }
      : null,
  };

  return applyCookies(NextResponse.json(safe));
}
