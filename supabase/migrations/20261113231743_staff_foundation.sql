-- DRAFT, NOT APPROVED FOR SUPABASE. Isolated PostgreSQL tests use synthetic Auth.
-- Managed auth.sessions policy/grants require owner approval and live validation.
-- Apply once via migration history; conflicts deliberately abort the entire transaction.
begin;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'mc_staff_executor')
     or to_regnamespace('mc_staff_private') is not null
     or exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                where n.nspname='public' and p.proname in ('staff_gate','staff_records_list','staff_record_create'))
     or exists (select 1 from pg_policy where polrelid='auth.sessions'::regclass and polname in ('mc_staff_current_session','mc_staff_session_scope')) then
    raise exception 'staff foundation object conflict; inspect migration history, do not overwrite';
  end if;
  if not exists (select 1 from pg_class where oid='auth.sessions'::regclass and relrowsecurity) then
    raise exception 'auth.sessions must have RLS enabled; managed Auth compatibility review required';
  end if;
end $$;

create role mc_staff_executor nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
-- No memberships are granted to or from this function owner. It owns no tables.
create schema mc_staff_private;
revoke all on schema mc_staff_private from public, anon, authenticated, service_role;
grant usage on schema mc_staff_private, auth to mc_staff_executor;

create table mc_staff_private.roles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  role text not null check (role = 'wallet_admin'),
  active boolean not null default false,
  created_at timestamptz not null default clock_timestamp()
);
create table mc_staff_private.sessions (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  first_seen timestamptz not null default clock_timestamp(),
  last_seen timestamptz not null default clock_timestamp(),
  check (last_seen >= first_seen)
);
create table mc_staff_private.records (
  id uuid primary key default gen_random_uuid(),
  note text not null check (length(note) between 1 and 200 and note ~ '^[ -~]+$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp()
);
create table mc_staff_private.audit (
  id uuid primary key default gen_random_uuid(),
  actor uuid not null references auth.users(id) on delete restrict,
  action text not null check (action = 'record.create'),
  record_id uuid not null references mc_staff_private.records(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp()
);
alter table mc_staff_private.roles enable row level security;
alter table mc_staff_private.roles force row level security;
alter table mc_staff_private.sessions enable row level security;
alter table mc_staff_private.sessions force row level security;
alter table mc_staff_private.records enable row level security;
alter table mc_staff_private.records force row level security;
alter table mc_staff_private.audit enable row level security;
alter table mc_staff_private.audit force row level security;
-- UUID defaults use no sequences. No runtime role receives table ownership or CREATE.
revoke all on mc_staff_private.roles, mc_staff_private.sessions,
  mc_staff_private.records, mc_staff_private.audit from public, anon, authenticated, service_role;
grant select on mc_staff_private.roles to mc_staff_executor;
grant select, insert on mc_staff_private.sessions to mc_staff_executor;
grant update (last_seen) on mc_staff_private.sessions to mc_staff_executor;
grant select, insert on mc_staff_private.records to mc_staff_executor;
grant insert on mc_staff_private.audit to mc_staff_executor;
create policy mc_roles_executor on mc_staff_private.roles for select to mc_staff_executor
  using (user_id = (select auth.uid()));
create policy mc_sessions_executor_read on mc_staff_private.sessions for select to mc_staff_executor
  using (user_id = (select auth.uid()) and session_id::text = (select auth.jwt()->>'session_id'));
create policy mc_sessions_executor_insert on mc_staff_private.sessions for insert to mc_staff_executor
  with check (user_id = (select auth.uid()) and session_id::text = (select auth.jwt()->>'session_id'));
create policy mc_sessions_executor_update on mc_staff_private.sessions for update to mc_staff_executor
  using (user_id = (select auth.uid()) and session_id::text = (select auth.jwt()->>'session_id'))
  with check (user_id = (select auth.uid()) and session_id::text = (select auth.jwt()->>'session_id'));
-- Records are private to their staff author, rather than shared across staff accounts.
create policy mc_records_executor_read on mc_staff_private.records for select to mc_staff_executor
  using (created_by = (select auth.uid()));
create policy mc_records_executor_insert on mc_staff_private.records for insert to mc_staff_executor
  with check (created_by = (select auth.uid()));
create policy mc_audit_executor_insert on mc_staff_private.audit for insert to mc_staff_executor
  with check (actor = (select auth.uid()) and exists (
    select 1 from mc_staff_private.records r where r.id=record_id and r.created_by=(select auth.uid())
  ));

-- High-risk managed-schema dependency: docs describe checking row existence, not
-- a guaranteed support contract for customer policies/grants on this table.
grant select (id, user_id, created_at, not_after) on auth.sessions to mc_staff_executor;
create policy mc_staff_current_session on auth.sessions for select to mc_staff_executor
  using (user_id = (select auth.uid()) and id::text = (select auth.jwt()->>'session_id'));

-- Restrictive scope also constrains any pre-existing permissive PUBLIC policy.
create policy mc_staff_session_scope on auth.sessions as restrictive for select to mc_staff_executor
  using (user_id = (select auth.uid()) and id::text = (select auth.jwt()->>'session_id'));

grant create on schema mc_staff_private, public to mc_staff_executor;
create function mc_staff_private.gate() returns text language plpgsql security definer set search_path = '' as $$
declare
  sid uuid; uid uuid; started timestamptz; ends_at timestamptz;
  activity timestamptz; checked_at timestamptz; claims jsonb;
begin
  -- PostgREST's READ COMMITTED model is required for fresh revocation checks.
  if current_setting('transaction_isolation') <> 'read committed' then return 'unauthenticated'; end if;
  claims := auth.jwt(); uid := auth.uid();
  if uid is null or coalesce(claims->>'role','') <> 'authenticated'
     or coalesce(claims->>'exp','') !~ '^[0-9]{1,12}$'
     or coalesce(claims->>'session_id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return 'unauthenticated';
  end if;
  sid := (claims->>'session_id')::uuid;
  select s.created_at, s.not_after into started, ends_at from auth.sessions s where s.id=sid and s.user_id=uid;
  checked_at := clock_timestamp();
  if started is null or started > checked_at or started <= checked_at - interval '8 hours'
     or (ends_at is not null and ends_at <= checked_at)
     or (claims->>'exp')::numeric <= extract(epoch from checked_at) then return 'unauthenticated'; end if;
  if coalesce(claims->>'aal','') <> 'aal2' or not exists (
    select 1 from mc_staff_private.roles r where r.user_id=uid and r.active and r.role='wallet_admin'
  ) then return 'forbidden'; end if;

  -- First eligible staff use starts the staff idle clock, not Auth session age.
  -- A concurrent first use waits on this PK. Existing rows are never reinitialized.
  insert into mc_staff_private.sessions(session_id,user_id,first_seen,last_seen)
    values(sid,uid,checked_at,checked_at) on conflict (session_id) do nothing;
  select s.last_seen into activity from mc_staff_private.sessions s
    where s.session_id=sid and s.user_id=uid for update;
  -- Fresh READ COMMITTED checks after a lock wait observe committed revocation.
  select s.created_at,s.not_after into started,ends_at from auth.sessions s where s.id=sid and s.user_id=uid;
  if started is null then return 'unauthenticated'; end if;
  if not exists (select 1 from mc_staff_private.roles r where r.user_id=uid and r.active and r.role='wallet_admin') then return 'forbidden'; end if;
  -- Re-read wall time after lock wait; now() would use the transaction start time.
  checked_at := clock_timestamp();
  if activity is null or activity <= checked_at - interval '30 minutes'
     or started <= checked_at - interval '8 hours'
     or (ends_at is not null and ends_at <= checked_at)
     or (claims->>'exp')::numeric <= extract(epoch from checked_at) then return 'unauthenticated'; end if;
  update mc_staff_private.sessions set last_seen=greatest(activity,checked_at)
    where session_id=sid and user_id=uid;
  return 'allowed';
exception when foreign_key_violation then
  -- Concurrent deletion after visibility check: the subtransaction rolls back.
  return 'unauthenticated';
end $$;
create function public.staff_gate() returns text language sql security definer set search_path = '' as $$ select mc_staff_private.gate() $$;
create function public.staff_records_list() returns table(id uuid,note text,created_at timestamptz) language plpgsql security definer set search_path = '' as $$
begin
  if mc_staff_private.gate() <> 'allowed' then raise exception 'access denied' using errcode='42501'; end if;
  return query select r.id,r.note,r.created_at from mc_staff_private.records r order by r.created_at desc,r.id limit 100;
end $$;
create function public.staff_record_create(p_note text) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  -- Validate before activity so rejected input is never counted as staff activity.
  if p_note is null or length(p_note) not between 1 and 200 or p_note !~ '^[ -~]+$' then raise exception 'invalid note' using errcode='22023'; end if;
  if mc_staff_private.gate() <> 'allowed' then raise exception 'access denied' using errcode='42501'; end if;
  insert into mc_staff_private.records(note,created_by) values(p_note,auth.uid()) returning id into result;
  insert into mc_staff_private.audit(actor,action,record_id) values(auth.uid(),'record.create',result);
  return result;
end $$;
alter function mc_staff_private.gate() owner to mc_staff_executor;
alter function public.staff_gate() owner to mc_staff_executor;
alter function public.staff_records_list() owner to mc_staff_executor;
alter function public.staff_record_create(text) owner to mc_staff_executor;
revoke create on schema mc_staff_private, public from mc_staff_executor;
-- PUBLIC EXECUTE defaults are revoked inside the same transaction, before exposure.
revoke all on function mc_staff_private.gate() from public,anon,authenticated,service_role;
revoke all on function public.staff_gate(),public.staff_records_list(),public.staff_record_create(text) from public,anon,authenticated,service_role;
grant execute on function public.staff_gate(),public.staff_records_list(),public.staff_record_create(text) to authenticated;
do $$
begin
  if exists (select 1 from pg_auth_members m where m.roleid='mc_staff_executor'::regrole or m.member='mc_staff_executor'::regrole)
     or exists (select 1 from pg_class c where c.relowner='mc_staff_executor'::regrole)
     or has_schema_privilege('mc_staff_executor','public','CREATE')
     or has_schema_privilege('mc_staff_executor','mc_staff_private','CREATE')
     or has_table_privilege('mc_staff_executor','auth.sessions','SELECT')
     or exists (select 1 from pg_attribute a where a.attrelid='auth.sessions'::regclass
                and a.attnum>0 and not a.attisdropped and a.attname not in ('id','user_id','created_at','not_after')
                and has_column_privilege('mc_staff_executor','auth.sessions',a.attname,'SELECT')) then
    raise exception 'unsafe executor ownership, membership or inherited schema CREATE; migration aborted';
  end if;
end $$;
commit;
