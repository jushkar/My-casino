-- Read-only catalog evidence on the disposable test DB only.
select version();
select 'managed_auth_schema_absent', to_regnamespace('auth') is null;
select rolname,rolcanlogin,rolinherit,rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls from pg_roles where rolname='mc_staff_executor';
select r.rolname as granted_role,m.rolname as member,g.rolname as grantor,a.admin_option,a.inherit_option,a.set_option from pg_auth_members a join pg_roles r on r.oid=a.roleid join pg_roles m on m.oid=a.member join pg_roles g on g.oid=a.grantor where r.rolname='mc_staff_executor' or m.rolname='mc_staff_executor';
select n.nspname,c.relname,pg_get_userbyid(c.relowner) as owner,c.relrowsecurity,c.relforcerowsecurity,c.relacl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='mc_staff_private' and c.relkind='r' order by c.relname;
select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='mc_staff_private' order by tablename,policyname;
select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as arguments,pg_get_userbyid(p.proowner) as owner,p.prosecdef,p.proconfig,p.proacl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='mc_staff_private' or (n.nspname='public' and p.proname like 'staff_%') order by n.nspname,p.proname;
select grantee,table_name,column_name,privilege_type from information_schema.column_privileges where table_schema='mc_staff_private' and grantee='mc_staff_executor' and privilege_type='UPDATE';
select 'executor_can_create_private',has_schema_privilege('mc_staff_executor','mc_staff_private','CREATE');
select 'executor_can_create_public',has_schema_privilege('mc_staff_executor','public','CREATE');
