-- UNAPPLIED DRAFT: Prompt 3 owner-only redesign. No owner UUID or credentials.
-- Application-owned objects only. Never apply without separate owner approval.
-- PostgreSQL 17 tested; membership syntax requires PostgreSQL 16+.
begin;
do $$ begin
  if exists(select 1 from pg_roles where rolname in ('mc_owner_executor','mc_owner_gateway','mc_owner_operator','mc_staff_executor'))
    or to_regnamespace('mc_owner_private') is not null or to_regnamespace('mc_staff_private') is not null
    or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'owner_%' or p.proname like 'staff_%')) then
    raise exception 'owner foundation conflict: inspect history; do not overwrite';
  end if;
end $$;
create role mc_owner_executor nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
-- Disabled by default. A separately approved operator enables only this narrowly
-- scoped role for the BFF, with a unique secret provisioned outside SQL/source.
create role mc_owner_gateway nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
create role mc_owner_operator nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
grant mc_owner_executor,mc_owner_operator to current_user with inherit true,set true;
create schema mc_owner_private;
revoke all on schema mc_owner_private from public,anon,authenticated,service_role;
grant usage on schema mc_owner_private to mc_owner_executor,mc_owner_gateway,mc_owner_operator;

create table mc_owner_private.binding (
  singleton smallint primary key default 1 check(singleton=1),
  user_id uuid not null unique,
  enabled boolean not null,
  generation bigint not null default 1 check(generation>0),
  changed_at timestamptz not null default clock_timestamp()
);
create table mc_owner_private.sessions (
  id uuid primary key,
  user_id uuid not null,
  provider_session_id uuid not null unique,
  binding_generation bigint not null,
  cap_hash text not null unique check(cap_hash ~ '^[a-f0-9]{64}$'),
  token_box text not null check(length(token_box) between 1 and 32768),
  auth_time timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  pending_until timestamptz not null,
  absolute_until timestamptz not null,
  activated_at timestamptz,
  last_seen timestamptz,
  revoked_at timestamptz,
  check(absolute_until<=auth_time+interval '8 hours'),
  check(pending_until<=created_at+interval '5 minutes'),
  check((activated_at is null)=(last_seen is null))
);
create table mc_owner_private.permits (
  permit_hash text primary key check(permit_hash ~ '^[a-f0-9]{64}$'),
  session_id uuid not null references mc_owner_private.sessions(id),
  cap_hash text not null,
  action text not null check(action in ('enter','status','records.read','record.create','stepup')),
  body_hash text not null check(body_hash ~ '^[a-f0-9]{64}$'),
  claims jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  used_at timestamptz,
  check(expires_at<=created_at+interval '10 seconds')
);
create table mc_owner_private.records (
  id uuid primary key default gen_random_uuid(),
  note text not null check(length(note) between 1 and 200 and note ~ '^[ -~]+$'),
  created_by uuid not null,
  created_at timestamptz not null default clock_timestamp()
);
create table mc_owner_private.audit (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  actor_kind text not null check(actor_kind in ('owner','operator')),
  operator_identity text,
  action text not null check(action in ('owner.provision','owner.disable','owner.recover','session.pending','session.enter','session.stepup','session.close','record.create')),
  session_id uuid references mc_owner_private.sessions(id),
  record_id uuid references mc_owner_private.records(id),
  approval text,
  reason text,
  previous_owner uuid,
  created_at timestamptz not null default clock_timestamp(),
  check((actor_kind='operator' and operator_identity is not null and approval is not null and reason is not null and length(approval) between 1 and 128 and length(reason) between 1 and 200 and session_id is null and record_id is null)
     or (actor_kind='owner' and operator_identity is null and approval is null and reason is null and previous_owner is null and session_id is not null))
);
-- No runtime role owns tables; FORCE is defense in depth, not a DBA boundary.
alter table mc_owner_private.binding enable row level security;
alter table mc_owner_private.binding force row level security;
alter table mc_owner_private.sessions enable row level security;
alter table mc_owner_private.sessions force row level security;
alter table mc_owner_private.permits enable row level security;
alter table mc_owner_private.permits force row level security;
alter table mc_owner_private.records enable row level security;
alter table mc_owner_private.records force row level security;
alter table mc_owner_private.audit enable row level security;
alter table mc_owner_private.audit force row level security;
revoke all on all tables in schema mc_owner_private from public,anon,authenticated,service_role,mc_owner_gateway;
grant select on mc_owner_private.binding to mc_owner_executor;
-- SELECT FOR SHARE requires some UPDATE privilege; this column cannot change
-- singleton identity because of its CHECK, and no exposed function updates it.
grant update(singleton) on mc_owner_private.binding to mc_owner_executor;
grant select,insert on mc_owner_private.sessions,mc_owner_private.permits,mc_owner_private.records to mc_owner_executor;
grant update(token_box,activated_at,last_seen,revoked_at) on mc_owner_private.sessions to mc_owner_executor;
grant update(used_at) on mc_owner_private.permits to mc_owner_executor;
grant insert on mc_owner_private.audit to mc_owner_executor;
grant select,insert,update on mc_owner_private.binding to mc_owner_operator;
grant select on mc_owner_private.sessions to mc_owner_operator;
grant update(revoked_at,token_box) on mc_owner_private.sessions to mc_owner_operator;
grant insert on mc_owner_private.audit to mc_owner_operator;
create policy owner_binding_read on mc_owner_private.binding for select to mc_owner_executor using(singleton=1);
-- Row-locking SELECT also needs an UPDATE policy. Only the constant singleton
-- column has UPDATE privilege; user_id/enabled/generation remain operator-only.
create policy owner_binding_lock on mc_owner_private.binding for update to mc_owner_executor using(singleton=1) with check(singleton=1);
create policy owner_binding_operator on mc_owner_private.binding for all to mc_owner_operator using(singleton=1) with check(singleton=1);
create policy owner_sessions_read on mc_owner_private.sessions for select to mc_owner_executor using(cap_hash=current_setting('mc_owner.cap_hash',true));
create policy owner_sessions_insert on mc_owner_private.sessions for insert to mc_owner_executor with check(cap_hash=current_setting('mc_owner.cap_hash',true) and user_id::text=current_setting('mc_owner.user_id',true));
create policy owner_sessions_update on mc_owner_private.sessions for update to mc_owner_executor using(cap_hash=current_setting('mc_owner.cap_hash',true)) with check(cap_hash=current_setting('mc_owner.cap_hash',true));
create policy owner_sessions_operator on mc_owner_private.sessions for all to mc_owner_operator using(user_id=(select user_id from mc_owner_private.binding where singleton=1)) with check(user_id=(select user_id from mc_owner_private.binding where singleton=1));
create policy owner_permits_read on mc_owner_private.permits for select to mc_owner_executor using(permit_hash=current_setting('mc_owner.permit_hash',true));
create policy owner_permits_insert on mc_owner_private.permits for insert to mc_owner_executor with check(permit_hash=current_setting('mc_owner.permit_hash',true) and cap_hash=current_setting('mc_owner.cap_hash',true));
create policy owner_permits_update on mc_owner_private.permits for update to mc_owner_executor using(permit_hash=current_setting('mc_owner.permit_hash',true)) with check(permit_hash=current_setting('mc_owner.permit_hash',true));
create policy owner_records_read on mc_owner_private.records for select to mc_owner_executor using(created_by::text=current_setting('mc_owner.user_id',true));
create policy owner_records_insert on mc_owner_private.records for insert to mc_owner_executor with check(created_by::text=current_setting('mc_owner.user_id',true));
create policy owner_audit_insert on mc_owner_private.audit for insert to mc_owner_executor with check(
  actor_kind='owner' and owner_id::text=current_setting('mc_owner.user_id',true)
  and action in ('session.pending','session.enter','session.stepup','session.close','record.create')
  and exists(select 1 from mc_owner_private.sessions s where s.id=session_id and s.user_id=owner_id)
  and ((action='record.create' and exists(select 1 from mc_owner_private.records r where r.id=record_id and r.created_by=owner_id)) or (action<>'record.create' and record_id is null)));
create policy owner_audit_operator on mc_owner_private.audit for insert to mc_owner_operator with check(
  actor_kind='operator' and operator_identity=session_user::text
  and action in ('owner.provision','owner.disable','owner.recover')
  and owner_id=(select user_id from mc_owner_private.binding where singleton=1));

create function mc_owner_private.hash(v text) returns text language sql immutable set search_path='' as $$ select encode(sha256(convert_to(v,'UTF8')),'hex') $$;
-- Only identity fields that are authorization authority. No email/user metadata.
create function mc_owner_private.shape(c jsonb) returns jsonb language plpgsql set search_path='' as $$
declare pwd numeric; totp numeric; t numeric:=extract(epoch from clock_timestamp());
begin
  if current_setting('transaction_isolation')<>'read committed' or c->>'role' is distinct from 'authenticated'
    or not coalesce(c->>'aud'='authenticated' or (jsonb_typeof(c->'aud')='array' and (c->'aud') ? 'authenticated'),false)
    or coalesce(c->>'sub','') !~ '^[0-9a-f-]{36}$' or coalesce(c->>'session_id','') !~ '^[0-9a-f-]{36}$'
    or coalesce(c->>'exp','') !~ '^[0-9]{1,12}$' or coalesce(c->>'iat','') !~ '^[0-9]{1,12}$'
    or (c->>'exp')::numeric<=t or (c->>'iat')::numeric>t
    or (c->>'exp')::numeric-(c->>'iat')::numeric not between 1 and 300
    or jsonb_typeof(c->'amr') is distinct from 'array' then return null; end if;
  perform (c->>'sub')::uuid,(c->>'session_id')::uuid;
  select min((a->>'timestamp')::numeric) into pwd from jsonb_array_elements(c->'amr') a where a->>'method'='password' and coalesce(a->>'timestamp','') ~ '^[0-9]{1,12}$';
  select max((a->>'timestamp')::numeric) into totp from jsonb_array_elements(c->'amr') a where a->>'method'='totp' and coalesce(a->>'timestamp','') ~ '^[0-9]{1,12}$';
  if pwd is null or pwd>t or totp>t then return null; end if;
  return jsonb_build_object('sub',c->>'sub','sid',c->>'session_id','aal',c->>'aal','iat',c->>'iat','exp',c->>'exp','iss',c->>'iss','aud',c->'aud','pwd',pwd,'totp',totp);
exception when invalid_text_representation then return null;
end $$;
create function mc_owner_private.bind_lock(require_enabled boolean) returns mc_owner_private.binding language plpgsql security definer set search_path='' as $$
declare b mc_owner_private.binding;
begin
  if current_setting('transaction_isolation')<>'read committed' then raise exception 'invalid transaction' using errcode='28000'; end if;
  select * into b from mc_owner_private.binding where singleton=1 for share;
  if b.user_id is null or (require_enabled and not b.enabled) then raise exception 'access denied' using errcode='42501'; end if;
  return b;
end $$;
create function mc_owner_private.session_lock(cap text,require_live boolean) returns mc_owner_private.sessions language plpgsql security definer set search_path='' as $$
declare s mc_owner_private.sessions; t timestamptz;
begin
  if cap is null or cap !~ '^[a-f0-9]{64}$' then raise exception 'sign in required' using errcode='28000'; end if;
  perform set_config('mc_owner.cap_hash',mc_owner_private.hash(cap),true);
  select * into s from mc_owner_private.sessions where cap_hash=mc_owner_private.hash(cap) for update;
  if s.id is null then raise exception 'sign in required' using errcode='28000'; end if;
  perform set_config('mc_owner.user_id',s.user_id::text,true);
  t:=clock_timestamp();
  if require_live and (s.revoked_at is not null or t>=s.absolute_until
    or (s.activated_at is null and t>=s.pending_until) or (s.last_seen is not null and t>=s.last_seen+interval '30 minutes')) then
    raise exception 'session expired or revoked' using errcode='28000';
  end if;
  return s;
end $$;
-- The BFF database role has only these five gateway functions, no data RPC or
-- operator authority. Calls are parameterized and use explicit transactions.
create function mc_owner_private.gateway_begin(p_id uuid,p_cap text,p_claims jsonb,p_box text) returns void language plpgsql security definer set search_path='' as $$
declare b mc_owner_private.binding; c jsonb; t timestamptz:=clock_timestamp();
begin
  c:=mc_owner_private.shape(p_claims); if c is null then raise exception 'sign in required' using errcode='28000'; end if;
  b:=mc_owner_private.bind_lock(true);
  if (c->>'sub')::uuid<>b.user_id then raise exception 'access denied' using errcode='42501'; end if;
  if p_cap is null or p_cap !~ '^[a-f0-9]{64}$' or (c->>'pwd')::numeric+300<=extract(epoch from t) then raise exception 'fresh password required' using errcode='28000'; end if;
  perform set_config('mc_owner.cap_hash',mc_owner_private.hash(p_cap),true);
  perform set_config('mc_owner.user_id',b.user_id::text,true);
  insert into mc_owner_private.sessions(id,user_id,provider_session_id,binding_generation,cap_hash,token_box,auth_time,pending_until,absolute_until)
    values(p_id,b.user_id,(c->>'sid')::uuid,b.generation,mc_owner_private.hash(p_cap),p_box,to_timestamp((c->>'pwd')::double precision),t+interval '5 minutes',least(t+interval '8 hours',to_timestamp((c->>'pwd')::double precision)+interval '8 hours'));
  insert into mc_owner_private.audit(owner_id,actor_kind,action,session_id) values(b.user_id,'owner','session.pending',p_id);
end $$;
create function mc_owner_private.gateway_lock(p_cap text) returns jsonb language plpgsql security definer set search_path='' as $$
declare b mc_owner_private.binding; s mc_owner_private.sessions;
begin
  b:=mc_owner_private.bind_lock(true); s:=mc_owner_private.session_lock(p_cap,true);
  if s.user_id<>b.user_id or s.binding_generation<>b.generation then raise exception 'access denied' using errcode='42501'; end if;
  return to_jsonb(s);
end $$;
create function mc_owner_private.gateway_save(p_cap text,p_claims jsonb,p_box text) returns void language plpgsql security definer set search_path='' as $$
declare b mc_owner_private.binding; s mc_owner_private.sessions; c jsonb;
begin
  b:=mc_owner_private.bind_lock(true); s:=mc_owner_private.session_lock(p_cap,true); c:=mc_owner_private.shape(p_claims);
  if s.user_id<>b.user_id or s.binding_generation<>b.generation then raise exception 'access denied' using errcode='42501'; end if;
  if c is null or (c->>'sub')::uuid<>s.user_id or (c->>'sid')::uuid<>s.provider_session_id or to_timestamp((c->>'pwd')::double precision)<>s.auth_time then raise exception 'identity changed' using errcode='28000'; end if;
  update mc_owner_private.sessions set token_box=p_box where id=s.id;
end $$;
create function mc_owner_private.gateway_permit(p_cap text,p_claims jsonb,p_action text,p_body_hash text,p_nonce text) returns uuid language plpgsql security definer set search_path='' as $$
declare s mc_owner_private.sessions; b mc_owner_private.binding; c jsonb; t timestamptz;
begin
  b:=mc_owner_private.bind_lock(true); s:=mc_owner_private.session_lock(p_cap,true); c:=mc_owner_private.shape(p_claims);
  if s.user_id<>b.user_id or s.binding_generation<>b.generation then raise exception 'access denied' using errcode='42501'; end if;
  if c is null or (c->>'sub')::uuid<>s.user_id or (c->>'sid')::uuid<>s.provider_session_id or to_timestamp((c->>'pwd')::double precision)<>s.auth_time then raise exception 'identity changed' using errcode='28000'; end if;
  if c->>'aal' is distinct from 'aal2' or c->>'totp' is null then raise exception 'MFA required' using errcode='42501'; end if;
  if (s.activated_at is null and p_action<>'enter') or (s.activated_at is not null and p_action='enter') then raise exception 'invalid session state' using errcode='28000'; end if;
  if p_nonce is null or p_nonce !~ '^[a-f0-9]{64}$' then raise exception 'invalid permit' using errcode='28000'; end if;
  perform set_config('mc_owner.permit_hash',mc_owner_private.hash(p_nonce),true);
  t:=clock_timestamp();
  insert into mc_owner_private.permits(permit_hash,session_id,cap_hash,action,body_hash,claims,created_at,expires_at)
    values(mc_owner_private.hash(p_nonce),s.id,s.cap_hash,p_action,p_body_hash,c,t,t+interval '10 seconds');
  return s.id;
end $$;
create function mc_owner_private.gateway_close(p_cap text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s mc_owner_private.sessions;
begin
  -- Allowed after expiry/disablement/Auth outage; possession of the opaque cookie
  -- and gateway credential can revoke only that app session. No renewal occurs.
  perform mc_owner_private.bind_lock(false); s:=mc_owner_private.session_lock(p_cap,false);
  if s.revoked_at is null then
    update mc_owner_private.sessions set revoked_at=clock_timestamp(),token_box='revoked' where id=s.id;
    insert into mc_owner_private.audit(owner_id,actor_kind,action,session_id) values(s.user_id,'owner','session.close',s.id);
  end if;
  return jsonb_build_object('id',s.id,'token_box',s.token_box);
end $$;

-- This user-scoped PostgREST RPC is useless without a BFF-issued, single-use
-- permit. A publishable key, owner JWT, arbitrary headers or capability alone
-- cannot mint a permit. Independent JWT/owner/AAL/session checks remain here.
create function public.owner_action(p_session uuid,p_permit text,p_action text,p_note text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare b mc_owner_private.binding; s mc_owner_private.sessions; p mc_owner_private.permits; c jsonb; t timestamptz; rid uuid; result jsonb;
begin
  c:=mc_owner_private.shape(coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb);
  if c is null then raise exception 'sign in required' using errcode='28000'; end if;
  b:=mc_owner_private.bind_lock(true);
  if (c->>'sub')::uuid<>b.user_id then raise exception 'access denied' using errcode='42501'; end if;
  if c->>'aal' is distinct from 'aal2' or c->>'totp' is null then raise exception 'MFA required' using errcode='42501'; end if;
  if p_permit is null or p_permit !~ '^[a-f0-9]{64}$' then raise exception 'BFF verification required' using errcode='42501'; end if;
  perform set_config('mc_owner.permit_hash',mc_owner_private.hash(p_permit),true);
  select * into p from mc_owner_private.permits where permit_hash=mc_owner_private.hash(p_permit);
  if p.session_id is null or p.session_id<>p_session then raise exception 'BFF verification required' using errcode='42501'; end if;
  perform set_config('mc_owner.cap_hash',p.cap_hash,true);
  perform set_config('mc_owner.user_id',b.user_id::text,true);
  select * into s from mc_owner_private.sessions where id=p_session for update;
  select * into p from mc_owner_private.permits where permit_hash=mc_owner_private.hash(p_permit) for update;
  t:=clock_timestamp();
  if s.id is null or s.user_id<>b.user_id or s.binding_generation<>b.generation or s.provider_session_id<>(c->>'sid')::uuid
    or to_timestamp((c->>'pwd')::double precision)<>s.auth_time or s.revoked_at is not null or t>=s.absolute_until
    or (s.activated_at is null and t>=s.pending_until) or (s.last_seen is not null and t>=s.last_seen+interval '30 minutes')
    or (c->>'exp')::numeric<=extract(epoch from t) then raise exception 'session expired or revoked' using errcode='28000'; end if;
  if p.used_at is not null or t>=p.expires_at or p.claims<>c or p.action<>p_action or p.body_hash<>mc_owner_private.hash(coalesce(p_note,'')) then raise exception 'invalid or used permit' using errcode='42501'; end if;
  if (s.activated_at is null and p_action<>'enter') or (s.activated_at is not null and p_action='enter') then raise exception 'invalid session state' using errcode='28000'; end if;
  if p_action in ('enter','stepup','record.create') and ((c->>'totp')::numeric+300<=extract(epoch from t) or (c->>'totp')::numeric<(c->>'pwd')::numeric) then raise exception 'fresh MFA required' using errcode='P0004'; end if;
  if p_action='enter' and (c->>'pwd')::numeric+300<=extract(epoch from t) then raise exception 'fresh password required' using errcode='28000'; end if;
  if p_action='record.create' then
    if p_note is null or length(p_note) not between 1 and 200 or p_note !~ '^[ -~]+$' then raise exception 'invalid note' using errcode='22023'; end if;
    insert into mc_owner_private.records(note,created_by) values(p_note,b.user_id) returning id into rid;
    insert into mc_owner_private.audit(owner_id,actor_kind,action,session_id,record_id) values(b.user_id,'owner','record.create',s.id,rid);
    result:=jsonb_build_object('record',rid);
  elsif p_action='records.read' then
    select jsonb_build_object('records',coalesce(jsonb_agg(x),'[]'::jsonb)) into result from (select id,note,created_at from mc_owner_private.records order by created_at desc,id limit 100) x;
  elsif p_action in ('enter','stepup') then
    insert into mc_owner_private.audit(owner_id,actor_kind,action,session_id) values(b.user_id,'owner',case when p_action='enter' then 'session.enter' else 'session.stepup' end,s.id);
    result:='{}'::jsonb;
  elsif p_action='status' then result:='{}'::jsonb;
  else raise exception 'invalid action' using errcode='22023'; end if;
  update mc_owner_private.permits set used_at=t where permit_hash=p.permit_hash;
  update mc_owner_private.sessions set activated_at=coalesce(activated_at,t),last_seen=greatest(last_seen,t) where id=s.id;
  return result||jsonb_build_object('idleExpiresAt',least(t+interval '30 minutes',s.absolute_until),'absoluteExpiresAt',s.absolute_until);
end $$;

-- Trusted-operator process only, never an authenticated/public/BFF RPC.
create function mc_owner_private.provision_owner(p_user uuid,p_approval text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
  insert into mc_owner_private.binding(singleton,user_id,enabled) values(1,p_user,true);
  insert into mc_owner_private.audit(owner_id,actor_kind,operator_identity,action,approval,reason) values(p_user,'operator',session_user,'owner.provision',p_approval,p_reason);
end $$;
create function mc_owner_private.disable_owner(p_expected uuid,p_approval text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare b mc_owner_private.binding;
begin
  select * into b from mc_owner_private.binding where singleton=1 for update;
  if b.user_id is distinct from p_expected then raise exception 'binding mismatch'; end if;
  update mc_owner_private.sessions set revoked_at=coalesce(revoked_at,clock_timestamp()),token_box='revoked' where user_id=b.user_id;
  update mc_owner_private.binding set enabled=false,generation=generation+1,changed_at=clock_timestamp() where singleton=1;
  insert into mc_owner_private.audit(owner_id,actor_kind,operator_identity,action,approval,reason) values(b.user_id,'operator',session_user,'owner.disable',p_approval,p_reason);
end $$;
create function mc_owner_private.recover_owner(p_expected uuid,p_new uuid,p_approval text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare b mc_owner_private.binding;
begin
  select * into b from mc_owner_private.binding where singleton=1 for update;
  if b.user_id is distinct from p_expected or b.enabled then raise exception 'disable and verify binding before recovery'; end if;
  update mc_owner_private.sessions set revoked_at=coalesce(revoked_at,clock_timestamp()),token_box='revoked' where user_id=b.user_id;
  update mc_owner_private.binding set user_id=p_new,enabled=true,generation=generation+1,changed_at=clock_timestamp() where singleton=1;
  insert into mc_owner_private.audit(owner_id,actor_kind,operator_identity,action,approval,reason,previous_owner) values(p_new,'operator',session_user,'owner.recover',p_approval,p_reason,b.user_id);
end $$;

-- Transfer ownership, remove PostgreSQL's default PUBLIC EXECUTE before commit.
grant create on schema mc_owner_private,public to mc_owner_executor,mc_owner_operator;
do $$ declare f record; new_owner text; begin
  for f in select p.oid::regprocedure as sig,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='mc_owner_private' or (n.nspname='public' and p.proname='owner_action') loop
    new_owner:=case when f.proname in ('provision_owner','disable_owner','recover_owner') then 'mc_owner_operator' else 'mc_owner_executor' end;
    execute format('alter function %s owner to %I',f.sig,new_owner);
    execute format('revoke all on function %s from public,anon,authenticated,service_role,mc_owner_gateway',f.sig);
  end loop;
end $$;
revoke create on schema mc_owner_private,public from mc_owner_executor,mc_owner_operator;
grant execute on function mc_owner_private.gateway_begin(uuid,text,jsonb,text),mc_owner_private.gateway_lock(text),mc_owner_private.gateway_save(text,jsonb,text),mc_owner_private.gateway_permit(text,jsonb,text,text,text),mc_owner_private.gateway_close(text) to mc_owner_gateway;
grant execute on function public.owner_action(uuid,text,text,text) to authenticated;
-- Helpers are reachable only through explicit grants and the non-login owners.
revoke mc_owner_executor,mc_owner_operator from current_user;
do $$ begin
  if exists(select 1 from pg_auth_members where member in ('mc_owner_executor'::regrole,'mc_owner_operator'::regrole,'mc_owner_gateway'::regrole)
     or (roleid in ('mc_owner_executor'::regrole,'mc_owner_operator'::regrole,'mc_owner_gateway'::regrole) and not(member=current_user::regrole and admin_option and not inherit_option and not set_option)))
     or exists(select 1 from pg_class where relowner in ('mc_owner_executor'::regrole,'mc_owner_operator'::regrole,'mc_owner_gateway'::regrole))
     or has_schema_privilege('mc_owner_executor','public','CREATE') or has_schema_privilege('mc_owner_operator','public','CREATE')
     or has_schema_privilege('mc_owner_gateway','public','CREATE') then raise exception 'unsafe owner role privileges'; end if;
end $$;
commit;
