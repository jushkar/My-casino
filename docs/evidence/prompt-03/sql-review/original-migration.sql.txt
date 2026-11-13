-- DRAFT: review and approve before applying. Not tested on a Supabase database.
-- No wallet, payment, blockchain or user registration data.
create role mc_staff_executor nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
create schema mc_staff_private;
revoke all on schema mc_staff_private from public, anon, authenticated;
grant usage on schema mc_staff_private, auth to mc_staff_executor;

create table mc_staff_private.roles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  role text not null check (role = 'wallet_admin'),
  active boolean not null default false,
  created_at timestamptz not null default now()
);
create table mc_staff_private.sessions (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  last_seen timestamptz not null default now()
);
create table mc_staff_private.records (
  id uuid primary key default gen_random_uuid(),
  note text not null check (length(note) between 1 and 200 and note ~ '^[ -~]+$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table mc_staff_private.audit (
  id uuid primary key default gen_random_uuid(),
  actor uuid not null references auth.users(id) on delete restrict,
  action text not null check (action = 'record.create'),
  record_id uuid not null references mc_staff_private.records(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table mc_staff_private.roles enable row level security;
alter table mc_staff_private.sessions enable row level security;
alter table mc_staff_private.records enable row level security;
alter table mc_staff_private.audit enable row level security;
revoke all on all tables in schema mc_staff_private from public, anon, authenticated;
grant select on mc_staff_private.roles to mc_staff_executor;
grant select, insert, update on mc_staff_private.sessions to mc_staff_executor;
grant select, insert on mc_staff_private.records to mc_staff_executor;
grant insert on mc_staff_private.audit to mc_staff_executor;
create policy mc_roles_executor on mc_staff_private.roles for select to mc_staff_executor using (true);
create policy mc_sessions_executor on mc_staff_private.sessions for all to mc_staff_executor using (true) with check (true);
create policy mc_records_executor_read on mc_staff_private.records for select to mc_staff_executor using (true);
create policy mc_records_executor_insert on mc_staff_private.records for insert to mc_staff_executor with check (true);
create policy mc_audit_executor_insert on mc_staff_private.audit for insert to mc_staff_executor with check (true);

-- Narrowly expose only the current session to the NOLOGIN function owner.
grant select (id, user_id, created_at) on auth.sessions to mc_staff_executor;
create policy mc_staff_current_session on auth.sessions for select to mc_staff_executor
  using (user_id = (select auth.uid()) and id::text = (select auth.jwt()->>'session_id'));

grant create on schema mc_staff_private, public to mc_staff_executor;
create function mc_staff_private.gate() returns text language plpgsql security definer set search_path = '' as $$
declare sid uuid; uid uuid; started timestamptz; touched timestamptz;
begin
  uid := auth.uid();
  if uid is null or coalesce(auth.jwt()->>'session_id', '') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return 'unauthenticated'; end if;
  sid := (auth.jwt()->>'session_id')::uuid;
  select s.created_at into started from auth.sessions s where s.id = sid and s.user_id = uid;
  if started is null or started <= now() - interval '8 hours' then return 'unauthenticated'; end if;
  if coalesce(auth.jwt()->>'aal', '') <> 'aal2' or not exists (select 1 from mc_staff_private.roles r where r.user_id = uid and r.active and r.role = 'wallet_admin') then return 'forbidden'; end if;
  insert into mc_staff_private.sessions(session_id, user_id, last_seen) values (sid, uid, started) on conflict (session_id) do nothing;
  update mc_staff_private.sessions set last_seen = now() where session_id = sid and user_id = uid and last_seen > now() - interval '30 minutes' returning last_seen into touched;
  if touched is null then return 'unauthenticated'; end if;
  return 'allowed';
end $$;
create function public.staff_gate() returns text language sql security definer set search_path = '' as $$ select mc_staff_private.gate() $$;
create function public.staff_records_list() returns table(id uuid, note text, created_at timestamptz) language plpgsql security definer set search_path = '' as $$
begin
  if mc_staff_private.gate() <> 'allowed' then raise exception 'access denied' using errcode = '42501'; end if;
  return query select r.id, r.note, r.created_at from mc_staff_private.records r order by r.created_at desc limit 100;
end $$;
create function public.staff_record_create(p_note text) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if mc_staff_private.gate() <> 'allowed' then raise exception 'access denied' using errcode = '42501'; end if;
  if p_note is null or length(p_note) not between 1 and 200 or p_note !~ '^[ -~]+$' then raise exception 'invalid note' using errcode = '22023'; end if;
  insert into mc_staff_private.records(note, created_by) values(p_note, auth.uid()) returning id into result;
  insert into mc_staff_private.audit(actor, action, record_id) values(auth.uid(), 'record.create', result);
  return result;
end $$;
alter function mc_staff_private.gate() owner to mc_staff_executor;
alter function public.staff_gate() owner to mc_staff_executor;
alter function public.staff_records_list() owner to mc_staff_executor;
alter function public.staff_record_create(text) owner to mc_staff_executor;
revoke create on schema mc_staff_private, public from mc_staff_executor;
revoke all on function mc_staff_private.gate() from public, anon, authenticated;
revoke all on function public.staff_gate(), public.staff_records_list(), public.staff_record_create(text) from public, anon, authenticated;
grant execute on function public.staff_gate(), public.staff_records_list(), public.staff_record_create(text) to authenticated;
