# Observability Playbook

This playbook documents how the Power Practice Planner surfaces runtime issues for the dashboard experience and how on-call
engineers should respond.

## Monitoring Stack Overview

- **Logflare** receives structured log events for the `/dashboard` route. Events are emitted from `src/lib/observability.ts` using
  the `observeDashboardRoute` helper that wraps the server component render.
- **Supabase** continues to capture audit events for authentication and settings changes; these events complement the dashboard
  performance feed but are not part of the threshold alerts described here.

### Required Environment Variables

Configure the following values in every environment (local, preview, production):

| Variable | Purpose |
| --- | --- |
| `LOGFLARE_SOURCE_TOKEN` | Logflare source that aggregates dashboard events. |
| `LOGFLARE_API_KEY` | API key with write access to the source. |
| `LOGFLARE_API_URL` | Optional override (defaults to `https://api.logflare.app/logs`). |

A missing token or API key causes events to be printed to the server log during development so local traces stay visible.

## Alert Thresholds

Thresholds are defined in `OBSERVABILITY_THRESHOLDS` within `src/lib/observability.ts`:

- **Render duration budget:** 750 ms (`renderDurationMs`).
- **Error rate:** 2% of dashboard requests (`errorRatePercentage`).
- **Consecutive failure limit:** 3 back-to-back render errors before paging (`consecutiveFailureLimit`).

The helper automatically emits a `dashboard.render.threshold_exceeded` warning when the render time crosses the budget and
includes the configured Slack channel for triage.

## Alert Channels

Alert routing is defined in `OBSERVABILITY_ALERT_CHANNELS` inside `src/lib/observability.ts`:

- **Slack:** `#ops-observability` receives threshold warnings.
- **PagerDuty:** `dr-pffeffer-web` service is paged for error events.
- **Email:** `oncall@powerpractice.dev` receives a summary for dashboard failures.

Update these constants if the on-call roster or alert tooling changes. Because they ship inside the log payload, downstream
automation can target the proper channel without additional configuration.

## On-Call Runbook

1. **Confirm the alert details**
   - For performance warnings, open the Logflare dashboard for the configured source and filter by `event: dashboard.render.threshold_exceeded` to inspect slow requests.
   - For error alerts, filter by `event: dashboard.render.error` to view stack traces and request metadata.
2. **Triage severity**
   - If render times exceed 750 ms but recover quickly, acknowledge the alert in Slack and continue monitoring.
   - If three or more failures occur in a row, PagerDuty should have paged. Create/append to the incident ticket and gather relevant context.
3. **Mitigate**
   - Roll back the most recent deployment if the regression is traced to a release.
   - Disable experimental feature flags scoped to `/dashboard` if they appear in the log metadata.
   - Coordinate with Supabase if downstream data latency is suspected (check `log_unauthorized_access` trends for related auth failures).
4. **Verify recovery**
   - Ensure new `dashboard.render` events return to sub-750 ms durations.
   - Confirm no additional `dashboard.render.error` events appear for at least 30 minutes.
5. **Post-incident follow up**
   - Document remediation in the weekly operations note.
   - File product/engineering tasks for structural fixes discovered during triage.

## Local Testing

Developers can exercise the observability stack without Logflare credentials:

1. Start the dev server with `pnpm dev`.
2. Load `/dashboard` and watch the server console. Events are echoed locally because the Logflare keys are intentionally missing.
3. To simulate slow renders, temporarily add `await new Promise((resolve) => setTimeout(resolve, 1000));` inside the dashboard page and refresh.
4. To simulate errors, throw an error inside the `observeDashboardRoute` callback; the helper will rethrow after logging.

Following these steps keeps the dashboard instrumentation healthy and ensures alerts route to the correct responders.
