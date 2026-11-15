-- Prepared metadata-only hosted preflight. NOT RUN on Supabase in this delivery.
-- Confirm project identity first. Never add Auth rows, secrets, full settings,
-- function bodies, policy expressions, role password fields or connection URIs.
-- Transaction guard is defense in depth; this file contains no mutation.
begin read only;
select version(),current_setting('server_version_num') as server_version_num,
       current_user,session_user,current_database(),current_setting('ssl') as ssl_enabled;
select r.rolname,r.rolsuper,r.rolinherit,r.rolcreaterole,r.rolcreatedb,
       r.rolcanlogin,r.rolreplication,r.rolbypassrls
from pg_roles r
where r.rolname in ('postgres','anon','authenticated','service_role','authenticator','supabase_auth_admin',
 'mc_owner_gateway','mc_owner_executor','mc_owner_operator','mc_staff_executor') order by r.rolname;
select parent.rolname as granted_role,child.rolname as member,g.admin_option,g.inherit_option,g.set_option
from pg_auth_members g join pg_roles parent on parent.oid=g.roleid join pg_roles child on child.oid=g.member
where parent.rolname in ('postgres','anon','authenticated','service_role','authenticator','supabase_auth_admin',
 'mc_owner_gateway','mc_owner_executor','mc_owner_operator','mc_staff_executor')
 or child.rolname in ('postgres','anon','authenticated','service_role','authenticator','supabase_auth_admin',
 'mc_owner_gateway','mc_owner_executor','mc_owner_operator','mc_staff_executor') order by 1,2;
select n.nspname,pg_get_userbyid(n.nspowner) as owner,n.nspacl,
       has_schema_privilege(current_user,n.oid,'CREATE') as inspector_can_create
from pg_namespace n where n.nspname not like 'pg_%' and n.nspname<>'information_schema' order by 1;
select has_database_privilege(current_user,current_database(),'CREATE') as inspector_database_create,
       r.rolcreaterole as inspector_createrole
from pg_roles r where r.rolname=current_user;
select n.nspname,c.relname,c.relkind,pg_get_userbyid(c.relowner) as owner,
       c.relrowsecurity,c.relforcerowsecurity,c.relacl
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','mc_owner_private','mc_staff_private','supabase_migrations')
 and c.relkind in ('r','p','v','m','S','f') order by 1,2;
select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_userbyid(p.proowner) as owner,p.prosecdef,p.proacl,
       (select setting from unnest(coalesce(p.proconfig,'{}'::text[])) setting
        where split_part(setting,'=',1)='search_path' limit 1) as function_search_path
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('mc_owner_private','mc_staff_private')
 or (n.nspname='public' and (p.proname like 'owner_%' or p.proname like 'staff_%')) order by 1,2,3;
select pg_get_userbyid(d.defaclrole) as grantor,
       coalesce(n.nspname,'GLOBAL') as schema_name,d.defaclobjtype,
       case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee,
       a.privilege_type,a.is_grantable
from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace
cross join lateral aclexplode(d.defaclacl) a order by 1,2,3,4,5;
-- Predicate existence only: do not export expressions containing hardcoded IDs.
select n.nspname,c.relname,p.polname,p.polcmd,p.polpermissive,
       array(select case when r=0 then 'PUBLIC' else pg_get_userbyid(r) end from unnest(p.polroles) r) as roles,
       p.polqual is not null as has_using,p.polwithcheck is not null as has_check
from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','mc_owner_private','mc_staff_private') order by 1,2,3;
-- Whitelist only nonsecret Data API settings. NULL does not prove API exclusion.
select current_setting('pgrst.db_schemas',true) as inspector_pgrst_db_schemas;
select coalesce(r.rolname,'ALL') as role_name,coalesce(d.datname,'ALL') as database_name,
       setting as nonsecret_setting
from pg_db_role_setting s left join pg_roles r on r.oid=s.setrole left join pg_database d on d.oid=s.setdatabase
cross join lateral unnest(s.setconfig) setting
where split_part(setting,'=',1) in ('pgrst.db_schemas','pgrst.db_extra_search_path','pgrst.db_pre_request')
order by 1,2,3;
select evtname,evtevent,evtenabled,pg_get_userbyid(evtowner) as owner,evtfoid::regprocedure as handler
from pg_event_trigger order by evtname;
-- Presence only. Follow with connector list_migrations metadata after this
-- read-only phase is permitted; never dump migration SQL/configuration bodies.
select to_regclass('supabase_migrations.schema_migrations') is not null as migration_history_exists;
commit;
