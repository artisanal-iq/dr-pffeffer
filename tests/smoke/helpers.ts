import { isValidElement, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

export function createStubUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-smoke-test",
    email: "smoke@example.com",
    ...overrides,
  } as User;
}

export function collectText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(collectText).join(" ");
  }
  if (isValidElement(node)) {
    return collectText(node.props.children);
  }
  return "";
}
