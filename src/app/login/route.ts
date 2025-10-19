import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const target = new URL("/auth/sign-in", req.url);
  const redirectParam = req.nextUrl.searchParams.get("redirect");
  if (redirectParam) {
    target.searchParams.set("redirect", redirectParam);
  }
  return NextResponse.redirect(target);
}
