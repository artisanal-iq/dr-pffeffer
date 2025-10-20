import type { ZodSchema } from "zod";

import { trackEvent } from "@/lib/analytics";

type FieldErrors<T> = Partial<Record<keyof T & string, string[]>>;

type ModalControllerOptions<T> = {
  schema: ZodSchema<T>;
  entityName: string;
  onCreate: (values: T) => Promise<unknown>;
  onReset: () => void;
};

export type ModalSubmitResult<T> =
  | { status: "success" }
  | { status: "validation_error"; fieldErrors: FieldErrors<T> }
  | { status: "error"; message: string };

export function createEntityModalController<T>({ schema, entityName, onCreate, onReset }: ModalControllerOptions<T>) {
  return {
    open() {
      onReset();
      trackEvent("modal.open", { entity: entityName });
    },
    cancel() {
      onReset();
      trackEvent("modal.cancel", { entity: entityName });
    },
    async submit(values: T): Promise<ModalSubmitResult<T>> {
      const parsed = schema.safeParse(values);
      if (!parsed.success) {
        const flattened = parsed.error.flatten().fieldErrors;
        const fieldErrors = Object.fromEntries(
          Object.entries(flattened).map(([key, messages]) => [key, messages ?? []])
        ) as FieldErrors<T>;
        return { status: "validation_error", fieldErrors };
      }
      try {
        await onCreate(parsed.data);
        trackEvent("modal.submit", { entity: entityName, status: "success" });
        onReset();
        return { status: "success" };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return { status: "error", message };
      }
    },
  };
}
