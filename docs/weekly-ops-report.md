# Weekly Operations Report

The weekly operations report gives the product and engineering teams a fast read on
whether new deployments are improving the Power Practice Planner's habit loops.
It pulls directly from the workflow instrumentation added to the dashboard layer
and should be reviewed before sprint kickoff.

## Data Sources

| Metric | Source | Notes |
| --- | --- | --- |
| Daily check-ins (7-day total) | `public.workflow_event_kpi_metrics.daily_check_ins_last_7_days` | Derived from `workflow.daily_routine.completed` events emitted via `recordDailyRoutineCompletedEvent`. |
| Auto-plan rate (7-day %) | `public.workflow_event_kpi_metrics.auto_plan_percentage_last_7_days` | Computed from `workflow.task.created` events with `auto_planned=true`. |
| Task completion velocity | `public.task_dashboard_metrics.completed_last_7_days` | Existing completion rollup retained for context. |

All workflow events are persisted in `public.workflow_events`. The insert helpers in
`src/lib/observability.ts` handle Logflare delivery and Supabase persistence while
annotating each record with the acting `user_id` and an ISO 8601 timestamp.

## Generating the report

1. Refresh the KPI view if you suspect stale data (e.g., after a backfill):
   ```sql
   refresh materialized view concurrently public.workflow_event_kpi_metrics;
   ```
   - Teams using `pg_cron` in Supabase can automate the refresh (e.g., nightly) with a scheduled job calling the same statement.
2. Run the weekly snapshot query and export it to your preferred notes tool:
   ```sql
   select
     user_id,
     daily_check_ins_last_7_days,
     auto_plan_percentage_last_7_days,
     completed_last_7_days
   from public.task_dashboard_metrics
   order by daily_check_ins_last_7_days desc;
   ```
3. Capture qualitative notes from customer sessions or bug triage alongside the metrics.
4. Review the trend before planning the next sprint—if the KPIs slipped, prioritize
   experiments that improve the affected workflow before adding unrelated scope.

> Tip: Keep a running changelog of major releases in `docs/sprint-operations.md` and
link back to the corresponding weekly report entries so regression analysis is easy.
