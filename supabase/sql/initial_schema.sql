-- Extensions
create extension if not exists pgcrypto;

-- Enum types
create type if not exists public.task_status as enum ('todo', 'in_progress', 'done');
create type if not exists public.task_priority as enum ('low', 'medium', 'high');

-- Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  scheduled_time timestamptz null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_scheduled_time_idx on public.tasks (scheduled_time);

alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks drop constraint if exists tasks_priority_check;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'status'
      and udt_name = 'text'
  ) then
    alter table public.tasks
      alter column status type public.task_status
      using status::public.task_status;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'priority'
      and udt_name = 'text'
  ) then
    alter table public.tasks
      alter column priority type public.task_priority
      using priority::public.task_priority;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'context'
      and data_type <> 'json'
  ) then
    alter table public.tasks alter column context drop default;
    alter table public.tasks
      alter column context type jsonb
      using case
        when context is null then '{}'::jsonb
        when pg_typeof(context)::text = 'jsonb' then context::jsonb
        else to_jsonb(context)
      end;
  end if;

  alter table public.tasks alter column status set default 'todo';
  alter table public.tasks alter column priority set default 'medium';
  update public.tasks set context = '{}'::jsonb where context is null;
  alter table public.tasks alter column context set default '{}'::jsonb;
  alter table public.tasks alter column context set not null;
end;
$$;

 -- Task completion metrics
 create table if not exists public.task_completion_metrics (
   user_id uuid not null,
   bucket_date date not null,
   completed_count int not null default 0 check (completed_count >= 0),
   updated_at timestamptz not null default now(),
   primary key (user_id, bucket_date)
 );
 create index if not exists task_completion_metrics_bucket_date_idx on public.task_completion_metrics (bucket_date);

create or replace view public.task_dashboard_metrics as
select
  m.user_id,
  coalesce(sum(m.completed_count), 0) as total_completed,
  coalesce(sum(m.completed_count) filter (where m.bucket_date >= current_date - interval '6 day'), 0) as completed_last_7_days,
  coalesce(sum(m.completed_count) filter (where m.bucket_date = current_date), 0) as completed_today,
  max(m.bucket_date) as most_recent_completion_date
from public.task_completion_metrics m
group by m.user_id;

-- Reflection metrics
create or replace view public.reflection_dashboard_metrics as
with reflections as (
  select
    user_id,
    date::date as reflection_date,
    case
      when coalesce(nullif(btrim(reflection), ''), null) is not null then true
      when rating between 1 and 5 then true
      else false
    end as has_reflection,
    case
      when rating between 1 and 5 then rating
      else null
    end as valid_rating
  from public.power_practices
),
latest_reflection as (
  select user_id, max(reflection_date) as latest_reflection_date
  from reflections
  where has_reflection
  group by user_id
),
confidence_all_time as (
  select user_id, avg(valid_rating)::numeric(10, 4) as avg_confidence_all_time
  from reflections
  where valid_rating is not null
  group by user_id
),
confidence_last_7_days as (
  select user_id, avg(valid_rating)::numeric(10, 4) as avg_confidence_last_7_days
  from reflections
  where valid_rating is not null
    and reflection_date >= current_date - interval '6 day'
  group by user_id
),
reflections_last_7_days as (
  select user_id, count(*) as reflections_last_7_days
  from reflections
  where has_reflection
    and reflection_date >= current_date - interval '6 day'
  group by user_id
),
streak_source as (
  select user_id, reflection_date
  from reflections
  where has_reflection
),
streak_groups as (
  select
    user_id,
    reflection_date,
    reflection_date - (row_number() over (partition by user_id order by reflection_date))::int as streak_group
  from streak_source
),
streak_lengths as (
  select
    user_id,
    streak_group,
    count(*) as streak_length,
    max(reflection_date) as streak_end_date
  from streak_groups
  group by user_id, streak_group
),
current_streak as (
  select
    s.user_id,
    s.streak_length as current_reflection_streak
  from streak_lengths s
  join (
    select user_id, max(reflection_date) as latest_reflection_date
    from streak_source
    group by user_id
  ) latest on latest.user_id = s.user_id and s.streak_end_date = latest.latest_reflection_date
),
best_streak as (
  select user_id, max(streak_length) as best_reflection_streak
  from streak_lengths
  group by user_id
)
select
  base.user_id,
  cat.avg_confidence_all_time,
  cl7.avg_confidence_last_7_days,
  coalesce(r7.reflections_last_7_days, 0) as reflections_last_7_days,
  coalesce(cs.current_reflection_streak, 0) as current_reflection_streak,
  coalesce(bs.best_reflection_streak, 0) as best_reflection_streak,
  latest.latest_reflection_date
from (
  select distinct user_id
  from reflections
) base
left join confidence_all_time cat on cat.user_id = base.user_id
left join confidence_last_7_days cl7 on cl7.user_id = base.user_id
left join reflections_last_7_days r7 on r7.user_id = base.user_id
left join current_streak cs on cs.user_id = base.user_id
left join best_streak bs on bs.user_id = base.user_id
left join latest_reflection latest on latest.user_id = base.user_id;

 -- Power practices
 create table if not exists public.power_practices (
   id uuid primary key default gen_random_uuid(),
   user_id uuid not null,
   date text not null,
   focus text not null,
   reflection text null,
   rating int null,
 ai_feedback text null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.power_practices drop constraint if exists power_practices_user_date_key;
alter table public.power_practices
  add constraint power_practices_user_date_key unique (user_id, date);
create index if not exists power_practices_user_id_idx on public.power_practices (user_id);
create index if not exists power_practices_date_idx on public.power_practices (date);

 -- Journals
 create table if not exists public.journals (
   id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  entry text not null,
  ai_summary text null,
  summary_metadata jsonb null,
  date text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
 create index if not exists journals_user_id_idx on public.journals (user_id);
 create index if not exists journals_date_idx on public.journals (date);

-- Connections
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  org text null,
  category text null,
  last_contact timestamptz null,
  next_action text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists connections_user_id_idx on public.connections (user_id);
create index if not exists connections_last_contact_idx on public.connections (last_contact);

-- Settings
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  theme text null,
  notifications boolean not null default true,
  ai_persona text null,
  persona text null,
  work_start time null,
  work_end time null,
  theme_contrast text null,
  accent_color text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists settings_user_id_idx on public.settings (user_id);

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body text not null,
  category text not null default 'general',
  is_active boolean not null default true,
  created_by uuid not null,
  updated_by uuid not null,
  archived_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  constraint prompts_slug_length check (char_length(slug) between 1 and 120),
  constraint prompts_title_length check (char_length(title) between 1 and 160)
);
create index if not exists prompts_is_active_idx on public.prompts (is_active);
create index if not exists prompts_category_idx on public.prompts (category);

create type if not exists public.prompt_audit_action as enum ('created', 'updated', 'archived', 'restored');

create table if not exists public.prompt_audits (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts (id) on delete cascade,
  action public.prompt_audit_action not null,
  actor_id uuid not null,
  actor_email text null,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists prompt_audits_prompt_id_idx on public.prompt_audits (prompt_id);
create index if not exists prompt_audits_created_at_idx on public.prompt_audits (created_at desc);

create or replace function public.list_prompts(p_include_archived boolean default false)
returns setof public.prompts
language sql
as $$
  select *
  from public.prompts
  where p_include_archived or archived_at is null
  order by (archived_at is not null), updated_at desc;
$$;

create or replace function public.get_prompt(p_id uuid)
returns public.prompts
language sql
as $$
  select *
  from public.prompts
  where id = p_id;
$$;

create or replace function public.create_prompt(
  p_slug text,
  p_title text,
  p_body text,
  p_category text,
  p_user_id uuid,
  p_user_email text default null
)
returns public.prompts
language plpgsql
as $$
declare
  inserted public.prompts;
begin
  insert into public.prompts (slug, title, body, category, created_by, updated_by)
  values (
    trim(p_slug),
    trim(p_title),
    p_body,
    coalesce(nullif(trim(p_category), ''), 'general'),
    p_user_id,
    p_user_id
  )
  returning * into inserted;

  insert into public.prompt_audits (prompt_id, action, actor_id, actor_email, changes)
  values (
    inserted.id,
    'created',
    p_user_id,
    p_user_email,
    jsonb_build_object('after', to_jsonb(inserted))
  );

  return inserted;
end;
$$;

create or replace function public.update_prompt(
  p_id uuid,
  p_slug text default null,
  p_title text default null,
  p_body text default null,
  p_category text default null,
  p_is_active boolean default null,
  p_user_id uuid,
  p_user_email text default null
)
returns public.prompts
language plpgsql
as $$
declare
  existing public.prompts;
  updated public.prompts;
  new_is_active boolean;
  effective_action public.prompt_audit_action;
begin
  select * into existing
  from public.prompts
  where id = p_id
  for update;

  if not found then
    return null;
  end if;

  new_is_active := coalesce(p_is_active, existing.is_active);

  update public.prompts
  set
    slug = coalesce(nullif(trim(p_slug), ''), slug),
    title = coalesce(nullif(trim(p_title), ''), title),
    body = coalesce(p_body, body),
    category = coalesce(nullif(trim(p_category), ''), category),
    is_active = new_is_active,
    updated_at = now(),
    updated_by = p_user_id,
    archived_at = case
      when new_is_active = false then coalesce(archived_at, now())
      else null
    end,
    archived_by = case
      when new_is_active = false then coalesce(archived_by, p_user_id)
      else null
    end
  where id = p_id
  returning * into updated;

  if not found then
    return null;
  end if;

  if existing.is_active = true and updated.is_active = false then
    effective_action := 'archived';
  elsif existing.is_active = false and updated.is_active = true then
    effective_action := 'restored';
  else
    effective_action := 'updated';
  end if;

  insert into public.prompt_audits (prompt_id, action, actor_id, actor_email, changes)
  values (
    updated.id,
    effective_action,
    p_user_id,
    p_user_email,
    jsonb_build_object(
      'before', to_jsonb(existing),
      'after', to_jsonb(updated)
    )
  );

  return updated;
end;
$$;

create or replace function public.list_prompt_audits(
  p_prompt_id uuid,
  p_limit integer default 20
)
returns setof public.prompt_audits
language sql
as $$
  select *
  from public.prompt_audits
  where prompt_id = p_prompt_id
  order by created_at desc, id desc
  limit greatest(1, coalesce(p_limit, 20));
$$;

-- Audit events
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  event_type text not null,
  description text null,
  request_path text null,
  ip_address text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_user_id_idx on public.audit_events (user_id);
create index if not exists audit_events_event_type_idx on public.audit_events (event_type);

 -- RLS
alter table public.tasks enable row level security;
alter table public.power_practices enable row level security;
alter table public.journals enable row level security;
alter table public.connections enable row level security;
alter table public.settings enable row level security;
alter table public.task_completion_metrics enable row level security;
alter table public.audit_events enable row level security;

 -- Policies template per table
do $$
declare t text;
begin
  for t in select unnest(array['tasks','power_practices','journals','connections','settings']) loop
    -- Drop existing policies if present (CREATE POLICY doesn't support IF NOT EXISTS)
    execute format('drop policy if exists %I on public.%I;', 'owner_select', t);
    execute format('drop policy if exists %I on public.%I;', 'owner_insert', t);
    execute format('drop policy if exists %I on public.%I;', 'owner_update', t);
    execute format('drop policy if exists %I on public.%I;', 'owner_delete', t);

    -- Recreate policies
    execute format('create policy %I on public.%I for select using (auth.uid() = user_id);', 'owner_select', t);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id);', 'owner_insert', t);
    execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', 'owner_update', t);
    execute format('create policy %I on public.%I for delete using (auth.uid() = user_id);', 'owner_delete', t);
 end loop;
end $$;

drop policy if exists task_completion_metrics_select on public.task_completion_metrics;
create policy task_completion_metrics_select on public.task_completion_metrics for select using (auth.uid() = user_id);

create or replace function public.apply_task_completion_metrics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid;
  target_date date;
  delta int;
begin
  if (TG_OP = 'INSERT') then
    if new.status = 'done' then
      target_user := new.user_id;
      target_date := coalesce(new.updated_at, now())::date;
      delta := 1;
    end if;
  elsif (TG_OP = 'UPDATE') then
    if old.status <> 'done' and new.status = 'done' then
      target_user := new.user_id;
      target_date := coalesce(new.updated_at, now())::date;
      delta := 1;
    elsif old.status = 'done' and new.status <> 'done' then
      target_user := old.user_id;
      target_date := coalesce(old.updated_at, now())::date;
      delta := -1;
    else
      return new;
    end if;
  elsif (TG_OP = 'DELETE') then
    if old.status = 'done' then
      target_user := old.user_id;
      target_date := coalesce(old.updated_at, now())::date;
      delta := -1;
    end if;
  end if;

  if delta is null then
    if TG_OP = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  insert into public.task_completion_metrics as m (user_id, bucket_date, completed_count, updated_at)
  values (target_user, target_date, case when delta > 0 then delta else 0 end, now())
  on conflict (user_id, bucket_date)
  do update set
    completed_count = greatest(m.completed_count + delta, 0),
    updated_at = now();

  if delta < 0 then
    delete from public.task_completion_metrics
    where user_id = target_user
      and bucket_date = target_date
      and completed_count <= 0;
  end if;

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists task_metrics_after_change on public.tasks;
create trigger task_metrics_after_change
after insert or update or delete on public.tasks
for each row execute function public.apply_task_completion_metrics();

-- Audit helpers
create or replace function public.log_audit_event(
  event_type text,
  user_id uuid default null,
  description text default null,
  request_path text default null,
  ip_address text default null,
  metadata jsonb default '{}'::jsonb
)
returns public.audit_events
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted public.audit_events;
begin
  insert into public.audit_events (
    user_id,
    event_type,
    description,
    request_path,
    ip_address,
    metadata
  )
  values (
    user_id,
    event_type,
    description,
    request_path,
    ip_address,
    coalesce(metadata, '{}'::jsonb)
  )
  returning * into inserted;

  return inserted;
end;
$$;

create or replace function public.log_unauthorized_access(
  request_path text,
  ip_address text default null,
  metadata jsonb default '{}'::jsonb
)
returns public.audit_events
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.log_audit_event(
    event_type => 'auth.unauthorized',
    user_id => null,
    description => 'Unauthorized access attempt',
    request_path => request_path,
    ip_address => ip_address,
    metadata => metadata
  );
end;
$$;

create or replace function public.log_settings_change(
  user_id uuid,
  metadata jsonb default '{}'::jsonb
)
returns public.audit_events
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.log_audit_event(
    event_type => 'settings.updated',
    user_id => user_id,
    description => 'User settings updated',
    request_path => '/settings',
    metadata => metadata
  );
end;
$$;

grant execute on function public.log_audit_event(text, uuid, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.log_unauthorized_access(text, text, jsonb) to anon, authenticated;
grant execute on function public.log_settings_change(uuid, jsonb) to anon, authenticated;

 -- updated_at triggers
 create or replace function public.set_updated_at()
 returns trigger as $$
 begin
   new.updated_at = now();
   return new;
 end;
 $$ language plpgsql;

 do $$
 declare t text;
 begin
 for t in select unnest(array['tasks','power_practices','journals','connections','settings']) loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at();', t || '_set_updated_at', t);
  end loop;
 end $$;

-- Task RPC helpers
create or replace function public.list_tasks(
  p_status public.task_status default null,
  p_priority public.task_priority default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := greatest(0, least(coalesce(p_limit, 50), 200));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'list_tasks requires authentication' using errcode = '42501';
  end if;

  with filtered as (
    select *
    from public.tasks
    where user_id = v_user_id
      and (p_status is null or status = p_status)
      and (p_priority is null or priority = p_priority)
      and (p_from is null or (scheduled_time is not null and scheduled_time >= p_from))
      and (p_to is null or (scheduled_time is not null and scheduled_time <= p_to))
  ),
  counted as (
    select *, count(*) over() as total_count
    from filtered
    order by created_at desc, id desc
    offset v_offset
    limit v_limit
  )
  select jsonb_build_object(
      'items', coalesce(jsonb_agg(to_jsonb(counted) - 'total_count'), '[]'::jsonb),
      'count', coalesce(max(total_count), 0)
    )
    into v_result
  from counted;

  if v_result is null then
    v_result := jsonb_build_object('items', '[]'::jsonb, 'count', 0);
  end if;

  perform public.log_audit_event(
    event_type => 'task.listed',
    user_id => v_user_id,
    description => 'Tasks retrieved',
    request_path => '/rpc/list_tasks',
    metadata => jsonb_build_object(
      'status', p_status,
      'priority', p_priority,
      'from', p_from,
      'to', p_to,
      'limit', v_limit,
      'offset', v_offset
    )
  );

  return v_result;
end;
$$;

create or replace function public.get_task(p_task_id uuid)
returns public.tasks
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_task public.tasks;
begin
  if v_user_id is null then
    raise exception 'get_task requires authentication' using errcode = '42501';
  end if;

  select *
  into v_task
  from public.tasks
  where id = p_task_id
    and user_id = v_user_id;

  if not found then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;

  perform public.log_audit_event(
    event_type => 'task.read',
    user_id => v_user_id,
    description => 'Task retrieved',
    request_path => '/rpc/get_task',
    metadata => jsonb_build_object('task_id', p_task_id)
  );

  return v_task;
end;
$$;

create or replace function public.create_task(
  p_title text,
  p_status public.task_status default 'todo',
  p_priority public.task_priority default 'medium',
  p_scheduled_time timestamptz default null,
  p_context jsonb default '{}'::jsonb
)
returns public.tasks
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_task public.tasks;
begin
  if v_user_id is null then
    raise exception 'create_task requires authentication' using errcode = '42501';
  end if;

  insert into public.tasks (
    user_id,
    title,
    status,
    priority,
    scheduled_time,
    context
  )
  values (
    v_user_id,
    trim(both from p_title),
    coalesce(p_status, 'todo'),
    coalesce(p_priority, 'medium'),
    p_scheduled_time,
    coalesce(p_context, '{}'::jsonb)
  )
  returning * into v_task;

  perform public.log_audit_event(
    event_type => 'task.created',
    user_id => v_user_id,
    description => 'Task created',
    request_path => '/rpc/create_task',
    metadata => jsonb_build_object('task_id', v_task.id)
  );

  return v_task;
end;
$$;

create or replace function public.update_task(
  p_task_id uuid,
  p_patch jsonb
)
returns public.tasks
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_task public.tasks;
  v_status public.task_status;
  v_priority public.task_priority;
begin
  if v_user_id is null then
    raise exception 'update_task requires authentication' using errcode = '42501';
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'update_task patch must be a JSON object' using errcode = '22P02';
  end if;

  v_status := case when p_patch ? 'status' then (p_patch->>'status')::public.task_status else null end;
  v_priority := case when p_patch ? 'priority' then (p_patch->>'priority')::public.task_priority else null end;

  update public.tasks
  set
    title = coalesce(p_patch->>'title', title),
    status = coalesce(v_status, status),
    priority = coalesce(v_priority, priority),
    scheduled_time = case
      when p_patch ? 'scheduled_time' then
        case
          when p_patch->>'scheduled_time' is null then null
          else (p_patch->>'scheduled_time')::timestamptz
        end
      else scheduled_time
    end,
    context = case
      when p_patch ? 'context' then coalesce(p_patch->'context', '{}'::jsonb)
      else context
    end
  where id = p_task_id
    and user_id = v_user_id
  returning * into v_task;

  if not found then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;

  perform public.log_audit_event(
    event_type => 'task.updated',
    user_id => v_user_id,
    description => 'Task updated',
    request_path => '/rpc/update_task',
    metadata => jsonb_build_object('task_id', v_task.id, 'changes', p_patch)
  );

  return v_task;
end;
$$;

create or replace function public.delete_task(p_task_id uuid)
returns public.tasks
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_task public.tasks;
begin
  if v_user_id is null then
    raise exception 'delete_task requires authentication' using errcode = '42501';
  end if;

  delete from public.tasks
  where id = p_task_id
    and user_id = v_user_id
  returning * into v_task;

  if not found then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;

  perform public.log_audit_event(
    event_type => 'task.deleted',
    user_id => v_user_id,
    description => 'Task deleted',
    request_path => '/rpc/delete_task',
    metadata => jsonb_build_object('task_id', v_task.id)
  );

  return v_task;
end;
$$;

grant execute on function public.list_tasks(public.task_status, public.task_priority, timestamptz, timestamptz, integer, integer) to authenticated;
grant execute on function public.get_task(uuid) to authenticated;
grant execute on function public.create_task(text, public.task_status, public.task_priority, timestamptz, jsonb) to authenticated;
grant execute on function public.update_task(uuid, jsonb) to authenticated;
grant execute on function public.delete_task(uuid) to authenticated;
