import type { User } from "@supabase/supabase-js";

type AppMetadata = User["app_metadata"];

function hasAdminRole(value: unknown): boolean {
  if (typeof value === "string") {
    return value.toLowerCase() === "admin";
  }

  if (Array.isArray(value)) {
    return value.some((entry) => typeof entry === "string" && entry.toLowerCase() === "admin");
  }

  return false;
}

export function isAdminUser(user: Pick<User, "app_metadata"> | null | undefined): user is Pick<User, "app_metadata"> {
  if (!user) {
    return false;
  }

  const metadata: AppMetadata | undefined = user.app_metadata;

  if (!metadata) {
    return false;
  }

  if (hasAdminRole(metadata.role)) {
    return true;
  }

  if (hasAdminRole(metadata.roles)) {
    return true;
  }

  return false;
}
