# Audit Log Access

The `audit_events` table captures security-relevant events such as unauthorized route access and settings changes. Each record includes:

- `user_id` (nullable) – the authenticated user or `NULL` for anonymous requests
- `event_type` – machine-friendly identifier (e.g. `auth.unauthorized`, `settings.updated`)
- `description`, `request_path`, `ip_address`
- `metadata` – JSON payload with contextual details
- `created_at` – timestamp of the event

## Quick SQL reference

To inspect audit events via Supabase SQL editor or psql:

```sql
select
  created_at,
  event_type,
  user_id,
  request_path,
  ip_address,
  metadata
from public.audit_events
order by created_at desc
limit 100;
```

Filter by user or event type:

```sql
select *
from public.audit_events
where (user_id = '00000000-0000-0000-0000-000000000000' or user_id is null)
  and event_type = 'auth.unauthorized'
order by created_at desc;
```

Use the `log_audit_event`, `log_unauthorized_access`, and `log_settings_change` functions for controlled inserts. They are exposed to authenticated/anon clients but run with elevated privileges to bypass row-level security on the `audit_events` table.
