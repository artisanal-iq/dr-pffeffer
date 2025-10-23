import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { PromptLibraryAdminContainer } from "@/components/prompts/prompt-library-admin-container";
import { requireUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Prompt library · Admin",
};

export default async function AdminPromptsPage() {
  const user = await requireUser("/admin/prompts");

  if (!isAdminUser(user)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link className="transition-colors hover:text-foreground" href="/dashboard">
              Dashboard
            </Link>
          </li>
          <li aria-hidden="true" className="text-muted-foreground/70">
            /
          </li>
          <li>
            <span className="text-foreground">Admin · Prompts</span>
          </li>
        </ol>
      </nav>

      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Prompt library</h1>
        <p className="text-sm text-muted-foreground">
          Manage the curated prompts that power the experience. Create new entries, update copy, or archive
          prompts when they are no longer relevant.
        </p>
      </header>

      <PromptLibraryAdminContainer />
    </div>
  );
}
