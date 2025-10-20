import "server-only";

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
  route: string;
  message?: string;
  metrics?: Record<string, unknown>;
  alertTargets?: Partial<typeof OBSERVABILITY_ALERT_CHANNELS>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
};

async function sendToLogflare(event: ObservabilityEvent) {
  if (!LOGFLARE_SOURCE_TOKEN || !LOGFLARE_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[observability]", event);
    }
    return;
  }

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
          ...event,
          timestamp: new Date().toISOString(),
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
