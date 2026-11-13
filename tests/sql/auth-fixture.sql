-- ISOLATED TEST ONLY. Minimal synthetic Auth catalog/claims, not Supabase Auth.
do $$ begin
 if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
 if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
 if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
 if not exists (select 1 from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin nologin; end if;
end $$;
create schema auth authorization supabase_auth_admin;
create table auth.users (id uuid primary key);
create table auth.sessions (
 id uuid primary key, user_id uuid not null references auth.users(id),
 created_at timestamptz not null default clock_timestamp(), not_after timestamptz, factor_id uuid
);
alter table auth.users owner to supabase_auth_admin;
alter table auth.sessions owner to supabase_auth_admin;
alter table auth.users enable row level security;
alter table auth.sessions enable row level security;
create function auth.jwt() returns jsonb language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
grant usage on schema auth to anon,authenticated,service_role;
