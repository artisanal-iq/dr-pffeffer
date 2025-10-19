import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./supabase-server";

export async function requireUser(redirectPath: string): Promise<User> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : "";
    redirect(`/login${next}`);
  }
  return user;
}
