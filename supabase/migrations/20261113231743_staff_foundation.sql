-- DRAFT, NOT APPROVED FOR SUPABASE. Isolated PostgreSQL tests use synthetic Auth.
-- Unapplied redesign proposal: bounded external revocation requires OWNER APPROVAL.
-- Application objects only; no managed Auth table references, policies or grants.
-- Apply once via migration history; conflicts deliberately abort the entire transaction.
begin;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'mc_staff_executor')
     or to_regnamespace('mc_staff_private') is not null
     or exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                where n.nspname='public' and p.proname in ('staff_gate','staff_records_list','staff_record_create','staff_session_open','staff_session_close')) then
    raise exception 'staff foundation object conflict; inspect migration history, do not overwrite';
  end if;
end $$;

create role mc_staff_executor nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
-- Temporary migration-only INHERIT/SET membership enables ownership/ACL transfer; revoked
-- before commit. Runtime roles never receive membership. Executor owns no tables.
-- PostgreSQL may retain a bootstrap-granted ADMIN-only membership for the trusted
-- migrator (no SET, no INHERIT); it already owns the application tables.
grant mc_staff_executor to current_user with inherit true, set true;
create schema mc_staff_private;
revoke all on schema mc_staff_private from public, anon, authenticated, service_role;
grant usage on schema mc_staff_private to mc_staff_executor;

create table mc_staff_private.roles (
  user_id uuid primary key,
  role text not null check (role = 'wallet_admin'),
  active boolean not null default false,
  created_at timestamptz not null default clock_timestamp()
);
create table mc_staff_private.sessions (
  session_id uuid primary key,
  user_id uuid not null,
  capability_hash text not null check (capability_hash ~ '^[a-f0-9]{64}$'),
  auth_time timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  check (expires_at <= auth_time + interval '5 minutes')
);
create table mc_staff_private.records (
  id uuid primary key default gen_random_uuid(),
  note text not null check (length(note) between 1 and 200 and note ~ '^[ -~]+$'),
  created_by uuid not null,
  created_at timestamptz not null default clock_timestamp()
);
create table mc_staff_private.audit (
  id uuid primary key default gen_random_uuid(),
  actor uuid not null,
  action text not null check (action in ('record.create','session.open','session.close')),
  session_id uuid not null references mc_staff_private.sessions(session_id),
  record_id uuid references mc_staff_private.records(id) on delete restrict,
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
grant update (revoked_at) on mc_staff_private.sessions to mc_staff_executor;
grant select, insert on mc_staff_private.records to mc_staff_executor;
grant insert on mc_staff_private.audit to mc_staff_executor;
create function mc_staff_private.claims() returns jsonb language sql stable security invoker set search_path='' as $$
  select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb
$$;
grant execute on function mc_staff_private.claims() to mc_staff_executor;
revoke all on function mc_staff_private.claims() from public,anon,authenticated,service_role;
create policy mc_roles_executor on mc_staff_private.roles for select to mc_staff_executor
  using (user_id = ((select mc_staff_private.claims())->>'sub')::uuid);
create policy mc_sessions_executor_read on mc_staff_private.sessions for select to mc_staff_executor
  using (user_id = ((select mc_staff_private.claims())->>'sub')::uuid and session_id::text = ((select mc_staff_private.claims())->>'session_id'));
create policy mc_sessions_executor_insert on mc_staff_private.sessions for insert to mc_staff_executor
  with check (user_id = ((select mc_staff_private.claims())->>'sub')::uuid and session_id::text = ((select mc_staff_private.claims())->>'session_id'));
create policy mc_sessions_executor_update on mc_staff_private.sessions for update to mc_staff_executor
  using (user_id = ((select mc_staff_private.claims())->>'sub')::uuid and session_id::text = ((select mc_staff_private.claims())->>'session_id'))
  with check (user_id = ((select mc_staff_private.claims())->>'sub')::uuid and session_id::text = ((select mc_staff_private.claims())->>'session_id'));
-- Records are private to their staff author, rather than shared across staff accounts.
create policy mc_records_executor_read on mc_staff_private.records for select to mc_staff_executor
  using (created_by = ((select mc_staff_private.claims())->>'sub')::uuid);
create policy mc_records_executor_insert on mc_staff_private.records for insert to mc_staff_executor
  with check (created_by = ((select mc_staff_private.claims())->>'sub')::uuid);
create policy mc_audit_executor_insert on mc_staff_private.audit for insert to mc_staff_executor
  with check (actor = ((select mc_staff_private.claims())->>'sub')::uuid
    and session_id::text=((select mc_staff_private.claims())->>'session_id')
    and ((action='record.create' and exists (select 1 from mc_staff_private.records r where r.id=record_id and r.created_by=((select mc_staff_private.claims())->>'sub')::uuid))
      or (action in ('session.open','session.close') and record_id is null)));

-- No runtime role owns tables. Request claims are populated by PostgREST after
-- JWT verification; direct SQL clients must never receive authenticated credentials.
grant create on schema mc_staff_private,public to mc_staff_executor;
create function mc_staff_private.identity(require_staff boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c jsonb; t numeric; now_epoch numeric;
begin
  if current_setting('transaction_isolation') <> 'read committed' then return null; end if;
  c:=mc_staff_private.claims(); now_epoch:=extract(epoch from clock_timestamp());
  if coalesce(c->>'sub','') !~ '^[0-9a-f-]{36}$' or coalesce(c->>'session_id','') !~ '^[0-9a-f-]{36}$'
     or coalesce(c->>'role','') <> 'authenticated' or coalesce(c->>'exp','') !~ '^[0-9]{1,12}$'
     or (c->>'exp')::numeric <= now_epoch then return null; end if;
  -- Casting also rejects malformed UUIDs, without mutating application state.
  perform (c->>'sub')::uuid, (c->>'session_id')::uuid;
  if not require_staff then return c; end if;
  if c->>'aal' is distinct from 'aal2' or not exists (
    select 1 from mc_staff_private.roles r where r.user_id=(c->>'sub')::uuid and r.active and r.role='wallet_admin'
  ) then return null; end if;
  if jsonb_typeof(c->'amr') is distinct from 'array' then return null; end if;
  select min((a->>'timestamp')::numeric) into t from jsonb_array_elements(c->'amr') a
    where a->>'method'='password' and coalesce(a->>'timestamp','') ~ '^[0-9]{1,12}$';
  -- Password-only pilot. Neither refresh nor repeated TOTP can move this anchor.
  if t is null or t>now_epoch or t+300<=now_epoch then return null; end if;
  return c || jsonb_build_object('staff_auth_time',t);
exception when invalid_text_representation then return null;
end $$;
create function mc_staff_private.gate(p_cap text) returns text language plpgsql security definer set search_path='' as $$
declare c jsonb; s mc_staff_private.sessions; now_time timestamptz;
begin
  c:=mc_staff_private.identity(false);
  if c is null then return 'unauthenticated'; end if;
  if c->>'aal' is distinct from 'aal2' or not exists (
    select 1 from mc_staff_private.roles r where r.user_id=(c->>'sub')::uuid and r.active
  ) then return 'forbidden'; end if;
  if mc_staff_private.identity(true) is null then return 'unauthenticated'; end if;
  if p_cap is null or p_cap !~ '^[a-f0-9]{64}$' then return 'unauthenticated'; end if;
  -- Serialize mutations and close. Reads retain this lock until their transaction ends.
  select * into s from mc_staff_private.sessions where session_id=(c->>'session_id')::uuid and user_id=(c->>'sub')::uuid for update;
  now_time:=clock_timestamp();
  if s.session_id is null or s.revoked_at is not null or s.expires_at<=now_time
    or s.capability_hash<>encode(sha256(convert_to(p_cap,'UTF8')),'hex')
    or mc_staff_private.identity(true) is null then return 'unauthenticated'; end if;
  return 'allowed';
end $$;
create function public.staff_session_open(p_cap text) returns text language plpgsql security definer set search_path='' as $$
declare c jsonb; sid uuid; uid uuid; inserted uuid; at_time timestamptz;
begin
  c:=mc_staff_private.identity(true);
  if c is null then return 'forbidden'; end if;
  if p_cap is null or p_cap !~ '^[a-f0-9]{64}$' then return 'unauthenticated'; end if;
  sid:=(c->>'session_id')::uuid; uid:=(c->>'sub')::uuid; at_time:=to_timestamp((c->>'staff_auth_time')::double precision);
  insert into mc_staff_private.sessions(session_id,user_id,capability_hash,auth_time,expires_at)
    values(sid,uid,encode(sha256(convert_to(p_cap,'UTF8')),'hex'),at_time,least(at_time+interval '5 minutes',to_timestamp((c->>'exp')::double precision)))
    on conflict(session_id) do nothing returning session_id into inserted;
  if inserted is not null then
    insert into mc_staff_private.audit(actor,action,session_id) values(uid,'session.open',sid);
  end if;
  return mc_staff_private.gate(p_cap);
end $$;
create function public.staff_session_close() returns text language plpgsql security definer set search_path='' as $$
declare c jsonb; sid uuid; uid uuid; t timestamptz; changed uuid;
begin
  -- No current staff role/AAL is required to close one's own provider session.
  c:=mc_staff_private.identity(false); if c is null then return 'unauthenticated'; end if;
  sid:=(c->>'session_id')::uuid; uid:=(c->>'sub')::uuid; t:=clock_timestamp();
  -- Tombstone even if logout beats MFA/open. Never delete or reactivate this row.
  insert into mc_staff_private.sessions(session_id,user_id,capability_hash,auth_time,expires_at,revoked_at)
    values(sid,uid,repeat('0',64),t,t,t)
    on conflict(session_id) do update set revoked_at=excluded.revoked_at
      where mc_staff_private.sessions.user_id=uid and mc_staff_private.sessions.revoked_at is null
    returning session_id into changed;
  if changed is not null then insert into mc_staff_private.audit(actor,action,session_id) values(uid,'session.close',sid); end if;
  return 'revoked';
end $$;
create function public.staff_gate(p_cap text) returns text language sql security definer set search_path='' as $$ select mc_staff_private.gate(p_cap) $$;
create function public.staff_records_list(p_cap text) returns table(id uuid,note text,created_at timestamptz) language plpgsql security definer set search_path='' as $$
begin
  if mc_staff_private.gate(p_cap)<>'allowed' then raise exception 'access denied' using errcode='42501'; end if;
  return query select r.id,r.note,r.created_at from mc_staff_private.records r order by r.created_at desc,r.id limit 100;
end $$;
create function public.staff_record_create(p_cap text,p_note text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; c jsonb;
begin
  if p_note is null or length(p_note) not between 1 and 200 or p_note !~ '^[ -~]+$' then raise exception 'invalid note' using errcode='22023'; end if;
  if mc_staff_private.gate(p_cap)<>'allowed' then raise exception 'access denied' using errcode='42501'; end if;
  c:=mc_staff_private.claims();
  insert into mc_staff_private.records(note,created_by) values(p_note,(c->>'sub')::uuid) returning id into result;
  insert into mc_staff_private.audit(actor,action,session_id,record_id) values((c->>'sub')::uuid,'record.create',(c->>'session_id')::uuid,result);
  return result;
end $$;
alter function mc_staff_private.claims() owner to mc_staff_executor;
alter function mc_staff_private.identity(boolean) owner to mc_staff_executor;
alter function mc_staff_private.gate(text) owner to mc_staff_executor;
alter function public.staff_session_open(text) owner to mc_staff_executor;
alter function public.staff_session_close() owner to mc_staff_executor;
alter function public.staff_gate(text) owner to mc_staff_executor;
alter function public.staff_records_list(text) owner to mc_staff_executor;
alter function public.staff_record_create(text,text) owner to mc_staff_executor;
revoke create on schema mc_staff_private,public from mc_staff_executor;
revoke all on function mc_staff_private.claims(),mc_staff_private.identity(boolean),mc_staff_private.gate(text) from public,anon,authenticated,service_role;
revoke all on function public.staff_session_open(text),public.staff_session_close(),public.staff_gate(text),public.staff_records_list(text),public.staff_record_create(text,text) from public,anon,authenticated,service_role;
grant execute on function public.staff_session_open(text),public.staff_session_close(),public.staff_gate(text),public.staff_records_list(text),public.staff_record_create(text,text) to authenticated;
-- A non-superuser CREATEROLE migrator may receive temporary ADMIN membership.
-- The role did not exist before this transaction; remove only that new membership.
do $$ begin
  if exists(select 1 from pg_auth_members where roleid='mc_staff_executor'::regrole and member=current_user::regrole) then
    execute format('revoke mc_staff_executor from %I',current_user);
  end if;
  if exists(select 1 from pg_auth_members where member='mc_staff_executor'::regrole
      or (roleid='mc_staff_executor'::regrole and not (member=current_user::regrole and admin_option and not inherit_option and not set_option)))
    or exists(select 1 from pg_class where relowner='mc_staff_executor'::regrole)
    or has_schema_privilege('mc_staff_executor','public','CREATE')
    or has_schema_privilege('mc_staff_executor','mc_staff_private','CREATE') then
    raise exception 'unsafe executor privilege boundary';
  end if;
end $$;
commit;
