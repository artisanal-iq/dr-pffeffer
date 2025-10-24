import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const LOGFLARE_API_URL = process.env.LOGFLARE_API_URL ?? "https://api.logflare.app/logs";
const LOGFLARE_SOURCE_TOKEN = process.env.LOGFLARE_SOURCE_TOKEN;
const LOGFLARE_API_KEY = process.env.LOGFLARE_API_KEY;

export const OBSERVABILITY_THRESHOLDS = {
  dashboard: {
    renderDurationMs: 750,
    errorRatePercentage: 0.02,
    consecutiveFailureLimit: 3,
  },
} as const;

export const OBSERVABILITY_ALERT_CHANNELS = {
  slack: "#ops-observability",
  pagerDutyService: "dr-pffeffer-web",
  email: "oncall@powerpractice.dev",
} as const;

export type ObservabilityEvent = {
  event: string;
  severity: "info" | "warning" | "error";
  route?: string;
  message?: string;
  metrics?: Record<string, unknown>;
  userId?: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
  alertTargets?: Partial<typeof OBSERVABILITY_ALERT_CHANNELS>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
};

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

type WorkflowEventRecord = {
  user_id: string;
  event_type: WorkflowEventType;
  occurred_at: string;
  metadata: Record<string, unknown>;
};

let supabaseServiceClient: SupabaseClient | null = null;

function getSupabaseServiceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  if (!supabaseServiceClient) {
    supabaseServiceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }

  return supabaseServiceClient;
}

export type WorkflowEventType =
  | "workflow.task.created"
  | "workflow.daily_routine.completed"
  | "workflow.journal_entry.saved"
  | "workflow.connection.touchpoint";

export type WorkflowEventPayload = {
  type: WorkflowEventType;
  userId: string;
  severity?: ObservabilityEvent["severity"];
  message?: string;
  metrics?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
};

async function persistWorkflowEvent(record: WorkflowEventRecord) {
  const client = getSupabaseServiceClient();
  if (!client) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[observability] missing Supabase service role key, skipping persistence");
    }
    return;
  }

  try {
    const { error } = await client.from("workflow_events").insert(record);
    if (error && process.env.NODE_ENV !== "production") {
      console.error("[observability] failed to persist workflow event", error);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[observability] unexpected error persisting workflow event", error);
    }
  }
}

async function sendToLogflare(event: ObservabilityEvent) {
  if (!LOGFLARE_SOURCE_TOKEN || !LOGFLARE_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[observability]", event);
    }
    return;
  }

  const timestamp = event.occurredAt ?? new Date().toISOString();

  try {
    const response = await fetch(LOGFLARE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": LOGFLARE_API_KEY,
      },
      body: JSON.stringify({
        source: LOGFLARE_SOURCE_TOKEN,
        log_entry: event.message ?? event.event,
        metadata: {
          event: event.event,
          severity: event.severity,
          route: event.route,
          message: event.message,
          metrics: event.metrics,
          alertTargets: event.alertTargets,
          error: event.error,
          user_id: event.userId,
          occurred_at: timestamp,
          timestamp,
          ...event.metadata,
        },
      }),
    });

    if (!response.ok && process.env.NODE_ENV !== "production") {
      console.error("Failed to post observability event", await response.text());
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to deliver observability event", error);
    }
  }
}

export async function emitWorkflowEvent({
  type,
  userId,
  severity = "info",
  message,
  metrics,
  metadata,
  occurredAt,
}: WorkflowEventPayload) {
  const eventTimestamp = occurredAt ?? new Date();
  const metadataPayload = {
    ...metadata,
    ...(metrics ? { metrics } : {}),
  };
  const record: WorkflowEventRecord = {
    user_id: userId,
    event_type: type,
    occurred_at: eventTimestamp.toISOString(),
    metadata: metadataPayload,
  };

  await persistWorkflowEvent(record);

  await sendToLogflare({
    event: type,
    severity,
    route: "workflow",
    message,
    metrics,
    userId,
    occurredAt: record.occurred_at,
    metadata: metadataPayload,
  });
}

export async function recordTaskCreatedEvent(params: {
  userId: string;
  taskId?: string;
  autoPlanned?: boolean;
  occurredAt?: Date;
}) {
  const { userId, taskId, autoPlanned, occurredAt } = params;
  await emitWorkflowEvent({
    type: "workflow.task.created",
    userId,
    occurredAt,
    metadata: {
      task_id: taskId,
      auto_planned: autoPlanned ?? false,
    },
    message: "Task created",
  });
}

export async function recordDailyRoutineCompletedEvent(params: {
  userId: string;
  routineId?: string;
  occurredAt?: Date;
}) {
  const { userId, routineId, occurredAt } = params;
  await emitWorkflowEvent({
    type: "workflow.daily_routine.completed",
    userId,
    occurredAt,
    metadata: {
      routine_id: routineId,
    },
    message: "Daily routine completed",
  });
}

export async function recordJournalEntrySavedEvent(params: {
  userId: string;
  entryId?: string;
  occurredAt?: Date;
}) {
  const { userId, entryId, occurredAt } = params;
  await emitWorkflowEvent({
    type: "workflow.journal_entry.saved",
    userId,
    occurredAt,
    metadata: {
      entry_id: entryId,
    },
    message: "Journal entry saved",
  });
}

export async function recordConnectionTouchpointEvent(params: {
  userId: string;
  connectionId?: string;
  occurredAt?: Date;
}) {
  const { userId, connectionId, occurredAt } = params;
  await emitWorkflowEvent({
    type: "workflow.connection.touchpoint",
    userId,
    occurredAt,
    metadata: {
      connection_id: connectionId,
    },
    message: "Connection touchpoint recorded",
  });
}

export async function observeDashboardRoute<T>(operation: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();

  try {
    const result = await operation();
    const durationMs = Date.now() - startedAt;

    await sendToLogflare({
      event: "dashboard.render",
      severity: "info",
      route: "/dashboard",
      message: "Dashboard route rendered",
      metrics: { durationMs },
    });

    if (durationMs > OBSERVABILITY_THRESHOLDS.dashboard.renderDurationMs) {
      await sendToLogflare({
        event: "dashboard.render.threshold_exceeded",
        severity: "warning",
        route: "/dashboard",
        message: "Dashboard render duration exceeded threshold",
        metrics: {
          durationMs,
          thresholdMs: OBSERVABILITY_THRESHOLDS.dashboard.renderDurationMs,
        },
        alertTargets: {
          slack: OBSERVABILITY_ALERT_CHANNELS.slack,
        },
      });
    }

    return result;
  } catch (error) {
    const normalizedError =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { message: "Unknown error" };

    await sendToLogflare({
      event: "dashboard.render.error",
      severity: "error",
      route: "/dashboard",
      message: normalizedError.message ?? "Dashboard render threw",
      metrics: {
        consecutiveFailureLimit: OBSERVABILITY_THRESHOLDS.dashboard.consecutiveFailureLimit,
        errorRateThreshold: OBSERVABILITY_THRESHOLDS.dashboard.errorRatePercentage,
      },
      alertTargets: {
        pagerDutyService: OBSERVABILITY_ALERT_CHANNELS.pagerDutyService,
        email: OBSERVABILITY_ALERT_CHANNELS.email,
      },
      error: normalizedError,
    });

    throw error;
  }
}
