"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useArchivePrompt,
  useCreatePrompt,
  usePromptAudits,
  usePrompts,
  useRestorePrompt,
  useUpdatePrompt,
  type PromptCreateInput,
} from "@/hooks/prompts";
import type { Prompt, PromptAuditEvent } from "@/types/models";

const inputClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

type CreateFormValues = PromptCreateInput & { body: string; category: string };
type EditFormValues = {
  slug: string;
  title: string;
  body: string;
  category: string;
  isActive: boolean;
};

export default function PromptLibraryAdmin() {
  const [showArchived, setShowArchived] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = usePrompts({ includeArchived: showArchived });
  const createPrompt = useCreatePrompt();
  const updatePrompt = useUpdatePrompt();
  const archivePrompt = useArchivePrompt();
  const restorePrompt = useRestorePrompt();
  const auditsQuery = usePromptAudits(editingPrompt?.id ?? null, {
    enabled: Boolean(editingPrompt),
  });

  const prompts = useMemo(() => data?.items ?? [], [data]);

  const createForm = useForm<CreateFormValues>({
    defaultValues: {
      slug: "",
      title: "",
      body: "",
      category: "general",
    },
  });

  const editForm = useForm<EditFormValues>({
    defaultValues: {
      slug: "",
      title: "",
      body: "",
      category: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (editingPrompt) {
      editForm.reset({
        slug: editingPrompt.slug,
        title: editingPrompt.title,
        body: editingPrompt.body,
        category: editingPrompt.category,
        isActive: editingPrompt.is_active,
      });
    } else {
      editForm.reset({ slug: "", title: "", body: "", category: "", isActive: true });
    }
  }, [editingPrompt, editForm]);

  const handleCreate = createForm.handleSubmit(async (values) => {
    setCreateError(null);
    try {
      await createPrompt.mutateAsync({
        slug: values.slug.trim(),
        title: values.title.trim(),
        body: values.body,
        category: values.category.trim(),
      });
      createForm.reset({ slug: "", title: "", body: "", category: "general" });
      void refetch();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create prompt");
    }
  });

  const handleEdit = editForm.handleSubmit(async (values) => {
    if (!editingPrompt) return;
    setEditError(null);
    try {
      await updatePrompt.mutateAsync({
        id: editingPrompt.id,
        patch: {
          slug: values.slug.trim(),
          title: values.title.trim(),
          body: values.body,
          category: values.category.trim(),
          isActive: values.isActive,
        },
      });
      setEditingPrompt(null);
      void refetch();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update prompt");
    }
  });

  const handleArchive = async (prompt: Prompt) => {
    setEditError(null);
    try {
      await archivePrompt.mutateAsync(prompt.id);
      if (editingPrompt?.id === prompt.id) {
        setEditingPrompt(null);
      }
      void refetch();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to archive prompt");
    }
  };

  const handleRestore = async (prompt: Prompt) => {
    setEditError(null);
    try {
      await restorePrompt.mutateAsync(prompt.id);
      void refetch();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to restore prompt");
    }
  };

  const isBusy =
    createPrompt.isPending ||
    updatePrompt.isPending ||
    archivePrompt.isPending ||
    restorePrompt.isPending ||
    isFetching;

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Create prompt</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a new curated prompt to the library. Slugs must be unique and lowercase.
        </p>
        <form className="mt-4 space-y-4" onSubmit={handleCreate}>
          <div className="grid gap-2">
            <Label htmlFor="create-slug">Slug</Label>
            <input
              id="create-slug"
              className={inputClassName}
              placeholder="morning-focus"
              disabled={createPrompt.isPending}
              {...createForm.register("slug")}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-title">Title</Label>
            <input
              id="create-title"
              className={inputClassName}
              placeholder="Morning focus prompt"
              disabled={createPrompt.isPending}
              {...createForm.register("title")}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-category">Category</Label>
            <input
              id="create-category"
              className={inputClassName}
              placeholder="ritual"
              disabled={createPrompt.isPending}
              {...createForm.register("category")}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-body">Prompt copy</Label>
            <Textarea
              id="create-body"
              rows={6}
              placeholder="Describe the intention for today's power focus..."
              disabled={createPrompt.isPending}
              {...createForm.register("body")}
              required
            />
          </div>
          {createError && <p className="text-sm text-destructive">{createError}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={createPrompt.isPending}>
              {createPrompt.isPending ? "Saving..." : "Save prompt"}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Library</h2>
          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>Show archived</span>
            <Switch checked={showArchived} onCheckedChange={setShowArchived} disabled={isFetching} />
          </label>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading prompts…</p>
        ) : isError ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Failed to load prompts"}</p>
            <Button onClick={() => refetch()} variant="secondary">
              Retry
            </Button>
          </div>
        ) : prompts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No prompts yet.</p>
        ) : (
          <div className="space-y-4">
            {prompts.map((prompt) => {
              const isEditing = editingPrompt?.id === prompt.id;
              return (
                <article
                  key={prompt.id}
                  className="rounded-lg border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">{prompt.title}</h3>
                      <p className="text-sm text-muted-foreground">/{prompt.slug} · {prompt.category}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Updated {new Date(prompt.updated_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          prompt.is_active
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
                        }`}
                      >
                        {prompt.is_active ? "Active" : "Archived"}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          isEditing ? setEditingPrompt(null) : setEditingPrompt(prompt)
                        }
                        disabled={isBusy}
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </Button>
                      {prompt.is_active ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchive(prompt)}
                          disabled={isBusy}
                        >
                          Archive
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestore(prompt)}
                          disabled={isBusy}
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                  {isEditing ? (
                    <form className="mt-4 space-y-4" onSubmit={handleEdit}>
                      <div className="grid gap-2">
                        <Label htmlFor={`edit-slug-${prompt.id}`}>Slug</Label>
                        <input
                          id={`edit-slug-${prompt.id}`}
                          className={inputClassName}
                          {...editForm.register("slug")}
                          disabled={isBusy}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`edit-title-${prompt.id}`}>Title</Label>
                        <input
                          id={`edit-title-${prompt.id}`}
                          className={inputClassName}
                          {...editForm.register("title")}
                          disabled={isBusy}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`edit-category-${prompt.id}`}>Category</Label>
                        <input
                          id={`edit-category-${prompt.id}`}
                          className={inputClassName}
                          {...editForm.register("category")}
                          disabled={isBusy}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`edit-body-${prompt.id}`}>Prompt copy</Label>
                        <Textarea
                          id={`edit-body-${prompt.id}`}
                          rows={6}
                          {...editForm.register("body")}
                          disabled={isBusy}
                          required
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={editForm.watch("isActive")}
                          onCheckedChange={(checked) => editForm.setValue("isActive", checked)}
                          disabled={isBusy}
                        />
                        <span className="text-sm text-muted-foreground">
                          {editForm.watch("isActive") ? "Visible to users" : "Hidden from users"}
                        </span>
                      </div>
                      {editError && <p className="text-sm text-destructive">{editError}</p>}
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setEditingPrompt(null)} disabled={isBusy}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isBusy}>
                          {updatePrompt.isPending ? "Updating..." : "Update"}
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <PromptAuditTrail
                          audits={auditsQuery.data?.items ?? []}
                          isLoading={auditsQuery.isLoading}
                          isError={auditsQuery.isError}
                          error={auditsQuery.error}
                          onRetry={() => {
                            void auditsQuery.refetch();
                          }}
                        />
                      </div>
                    </form>
                  ) : (
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {prompt.body}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
        {editError && !editingPrompt && (
          <p className="text-sm text-destructive">{editError}</p>
        )}
      </section>
    </div>
  );
}

type PromptAuditTrailProps = {
  audits: PromptAuditEvent[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
};

const AUDIT_ACTION_LABELS: Record<PromptAuditEvent["action"], string> = {
  created: "Created",
  updated: "Updated",
  archived: "Archived",
  restored: "Restored",
};

const AUDIT_FIELD_EXCLUSIONS = new Set([
  "id",
  "created_at",
  "updated_at",
  "archived_at",
  "created_by",
  "updated_by",
  "archived_by",
]);

function PromptAuditTrail({ audits, isLoading, isError, error, onRetry }: PromptAuditTrailProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Loading history…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-2 rounded-md border border-destructive bg-destructive/10 p-4 text-sm">
        <p className="font-medium text-destructive">Failed to load audit trail.</p>
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : "An unexpected error occurred while retrieving change history."}
        </p>
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  if (!audits.length) {
    return (
      <div className="rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        No edits recorded yet. Changes you make will appear here.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-muted/20 p-4 text-sm">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Audit trail</h4>
        <Button size="sm" variant="ghost" onClick={onRetry}>
          Refresh
        </Button>
      </div>
      <ul className="mt-3 space-y-3">
        {audits.map((event) => {
          const actorLabel = event.actor_email ?? event.actor_id;
          const changedFields = summarizeChangedFields(event);
          return (
            <li
              key={event.id}
              className="rounded-md border border-border/70 bg-background/80 p-3 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{AUDIT_ACTION_LABELS[event.action]}</p>
                  <p className="text-xs text-muted-foreground">{changedFields}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(event.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">By {actorLabel}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function summarizeChangedFields(event: PromptAuditEvent) {
  const changes = (event.changes ?? {}) as Record<string, unknown>;
  const before = (changes.before as Record<string, unknown> | undefined) ?? undefined;
  const after = (changes.after as Record<string, unknown> | undefined) ?? undefined;

  if (event.action === "archived") {
    return "Prompt archived";
  }

  if (event.action === "restored") {
    return "Prompt restored";
  }

  const keys = Object.keys(after ?? {}).filter((key) => !AUDIT_FIELD_EXCLUSIONS.has(key));
  if (!before) {
    return keys.length ? `Initial fields: ${formatFieldList(keys)}` : "Initial values recorded";
  }

  const changed = keys.filter((key) => !deepEqual(before[key], after?.[key]));
  if (!changed.length) {
    return "Metadata updated";
  }

  return `Fields changed: ${formatFieldList(changed)}`;
}

function formatFieldList(fields: string[]) {
  return fields.map(formatFieldName).join(", ");
}

function formatFieldName(field: string) {
  return field
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function deepEqual(a: unknown, b: unknown) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object" && a && b) {
    const aEntries = Object.entries(a as Record<string, unknown>);
    const bEntries = Object.entries(b as Record<string, unknown>);
    if (aEntries.length !== bEntries.length) return false;
    return aEntries.every(([key, value]) => deepEqual(value, (b as Record<string, unknown>)[key]));
  }
  return false;
}
