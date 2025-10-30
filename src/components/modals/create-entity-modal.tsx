"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  useForm,
  type FieldValues,
  type Path,
  type UseFormReturn,
  type DefaultValues as RHFDefaultValues,
} from "react-hook-form";
import type { ZodSchema } from "zod";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

import {
  createEntityModalController,
  type ModalSubmitResult,
} from "./create-entity-modal-controller";

type InitialValueSource<T> = T | (() => T);

type CreateEntityModalProps<TFormValues extends FieldValues> = {
  title: string;
  entityName: string;
  triggerLabel: string;
  submitLabel?: string;
  description?: string;
  defaultValues: InitialValueSource<TFormValues>;
  schema: ZodSchema<TFormValues>;
  onCreate: (values: TFormValues) => Promise<unknown>;
  renderFields: (form: UseFormReturn<TFormValues, unknown, TFormValues>) => ReactNode;
};

function resolveDefaultValues<TFormValues>(source: InitialValueSource<TFormValues>): TFormValues {
  return typeof source === "function" ? (source as () => TFormValues)() : source;
}

export function CreateEntityModal<TFormValues extends FieldValues>({
  title,
  entityName,
  triggerLabel,
  submitLabel = "Create",
  description,
  defaultValues,
  schema,
  onCreate,
  renderFields,
}: CreateEntityModalProps<TFormValues>) {
  const computeDefaultValues = useCallback(() => resolveDefaultValues(defaultValues), [defaultValues]);
  const initialDefaults = useMemo(() => computeDefaultValues(), [computeDefaultValues]);
  const form = useForm<TFormValues>({
    defaultValues: initialDefaults as RHFDefaultValues<TFormValues>,
  });
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setServerError(null);
    form.reset(computeDefaultValues());
  }, [computeDefaultValues, form]);

  const controller = useMemo(
    () => createEntityModalController<TFormValues>({ schema, entityName, onCreate, onReset: resetForm }),
    [schema, entityName, onCreate, resetForm]
  );

  const handleOpen = useCallback(() => {
    controller.open();
    setOpen(true);
  }, [controller]);

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    setServerError(null);
    const result = await controller.submit(values);
    applySubmitResult(result, form, setOpen, setServerError);
  });

  const handleCancel = useCallback(() => {
    controller.cancel();
    setOpen(false);
  }, [controller]);

  return (
    <>
      <Button type="button" onClick={handleOpen} data-testid="open-create-entity-modal">
        {triggerLabel}
      </Button>
      <Modal
        open={open}
        onClose={handleCancel}
        title={title}
        description={description}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={handleCancel} disabled={form.formState.isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="create-entity-modal-form" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : submitLabel}
            </Button>
          </>
        }
      >
        <form id="create-entity-modal-form" onSubmit={handleSubmit} className="space-y-4">
          {renderFields(form)}
          {serverError ? <p className="text-sm text-destructive" role="alert">{serverError}</p> : null}
        </form>
      </Modal>
    </>
  );
}

function applySubmitResult<TFormValues extends FieldValues>(
  result: ModalSubmitResult<TFormValues>,
  form: UseFormReturn<TFormValues, unknown, TFormValues>,
  setOpen: (open: boolean) => void,
  setServerError: (message: string | null) => void
) {
  if (result.status === "success") {
    setOpen(false);
    setServerError(null);
    return;
  }

  if (result.status === "validation_error") {
    for (const [key, messages] of Object.entries(result.fieldErrors)) {
      if (!messages || messages.length === 0) continue;
      form.setError(key as Path<TFormValues>, {
        type: "manual",
        message: messages[0] ?? "Invalid value",
      });
    }
    return;
  }

  setServerError(result.message);
}
