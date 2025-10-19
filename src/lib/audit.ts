/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

type JsonRecord = Record<string, unknown>;

type AnySupabaseClient = SupabaseClient<any, any, any>;

function toSafeJson(metadata?: JsonRecord | null) {
  return metadata ? JSON.parse(JSON.stringify(metadata)) : {};
}

export async function logUnauthorizedAccess(
  supabase: AnySupabaseClient,
  params: {
    requestPath: string;
    ipAddress?: string | null;
    metadata?: JsonRecord;
  }
) {
  const { error } = await supabase.rpc("log_unauthorized_access", {
    request_path: params.requestPath,
    ip_address: params.ipAddress ?? null,
    metadata: toSafeJson(params.metadata),
  });

  if (error && process.env.NODE_ENV !== "production") {
    console.error("Failed to record unauthorized access audit event", error);
  }
}

export async function logSettingsChange(
  supabase: AnySupabaseClient,
  params: {
    userId: string;
    metadata?: JsonRecord;
  }
) {
  const { error } = await supabase.rpc("log_settings_change", {
    user_id: params.userId,
    metadata: toSafeJson(params.metadata),
  });

  if (error && process.env.NODE_ENV !== "production") {
    console.error("Failed to record settings change audit event", error);
  }
}
