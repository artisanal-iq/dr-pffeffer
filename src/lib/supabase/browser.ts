"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./env";

let client: SupabaseClient | null = null;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    const { url, anonKey } = getSupabaseConfig();
    client = createBrowserClient(url, anonKey);
  }

  return client;
}
