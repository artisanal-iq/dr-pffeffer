# Dashboard Metrics API

## Overview

The dashboard aggregates task completion activity from the `task_completion_metrics` table. Data is
kept in sync by the `task_metrics_after_change` trigger, which runs the
`public.apply_task_completion_metrics` function after every insert, update, or delete on `public.tasks`.
The trigger increments or decrements the bucketed counts whenever a task transitions into or out of the
`done` status, guaranteeing that metrics stay accurate even under rapid status changes.

A read-only view, `task_dashboard_metrics`, provides pre-computed totals that power the dashboard cards
and summaries. The REST endpoint below exposes both the aggregated view and (optionally) the raw daily
buckets for clients that need to render charts.

## Schema additions

### `public.task_completion_metrics`

| Column         | Type      | Description                                                |
| -------------- | --------- | ---------------------------------------------------------- |
| `user_id`      | `uuid`    | Owner of the metrics bucket.                               |
| `bucket_date`  | `date`    | UTC date representing the completion bucket.               |
| `completed_count` | `int` | Number of tasks marked `done` for the bucketed day.        |
| `updated_at`   | `timestamptz` | Timestamp of the latest aggregation update.           |

* Primary key: (`user_id`, `bucket_date`)
* Row Level Security: users may `SELECT` their own rows (`auth.uid() = user_id`).

### `public.task_dashboard_metrics`

| Column                        | Type        | Description                                              |
| ----------------------------- | ----------- | -------------------------------------------------------- |
| `user_id`                     | `uuid`      | Aggregated user identifier.                              |
| `total_completed`             | `bigint`    | Lifetime completed task count.                           |
| `completed_last_7_days`       | `bigint`    | Completed task count during the trailing 7-day window.   |
| `completed_today`             | `bigint`    | Tasks completed on the current UTC day.                  |
| `most_recent_completion_date` | `date`      | UTC date of the most recent completion, if any.          |

## Endpoint: `GET /api/metrics`

Returns the aggregated metrics for the authenticated user.

### Query parameters

| Name     | Type   | Description                                                                 |
| -------- | ------ | --------------------------------------------------------------------------- |
| `detail` | string | When set to `daily`, the response includes `daily_breakdown` entries.        |
| `from`   | date   | Optional lower bound when `detail=daily`. Filters buckets `>= from` (UTC).   |
| `to`     | date   | Optional upper bound when `detail=daily`. Filters buckets `<= to` (UTC).     |

### Response

```jsonc
// 200 OK
{
  "user_id": "…",
  "total_completed": 42,
  "completed_last_7_days": 18,
  "completed_today": 3,
  "most_recent_completion_date": "2024-05-08",
  "daily_breakdown": [
    {
      "bucket_date": "2024-05-08",
      "completed_count": 3,
      "updated_at": "2024-05-08T12:34:56.789Z"
    }
  ]
}
```

* `daily_breakdown` is present only when `detail=daily`.
* `daily_breakdown` entries are ordered descending by `bucket_date` and respect optional `from` / `to`
  filters.

### Error responses

* `401 Unauthorized` when the request lacks an authenticated Supabase session.
* `500 Internal Server Error` if Supabase returns an error when reading either the dashboard view or
  the daily metrics table.

## Sync mechanics

* Inserts with `status = 'done'` add one to the corresponding UTC bucket.
* Status transitions from a non-`done` value to `done` increment the bucket.
* Status transitions from `done` to another status, or deletions of `done` tasks, decrement the bucket
  (rows are removed when counts reach zero).
* The trigger runs as `SECURITY DEFINER`, ensuring it can maintain metrics without being blocked by RLS.
