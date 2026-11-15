-- Read-only isolated fixture catalog, no provider target.
select version();
select to_regnamespace('auth') is null as managed_auth_absent;
select rolname,rolcanlogin,rolinherit,rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls from pg_roles where rolname like 'mc_owner_%' order by rolname;
select r.rolname as granted_role,m.rolname as member,g.rolname as grantor,a.admin_option,a.inherit_option,a.set_option from pg_auth_members a join pg_roles r on r.oid=a.roleid join pg_roles m on m.oid=a.member join pg_roles g on g.oid=a.grantor where r.rolname like 'mc_owner_%' or m.rolname like 'mc_owner_%' order by r.rolname;
select n.nspname,c.relname,pg_get_userbyid(c.relowner) as owner,c.relrowsecurity,c.relforcerowsecurity,c.relacl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='mc_owner_private' and c.relkind='r' order by c.relname;
select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='mc_owner_private' order by tablename,policyname;
select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as arguments,pg_get_userbyid(p.proowner) as owner,p.prosecdef,p.proconfig,p.proacl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='mc_owner_private' or (n.nspname='public' and p.proname='owner_action') order by n.nspname,p.proname;
select grantee,table_name,column_name,privilege_type from information_schema.column_privileges where table_schema='mc_owner_private' and grantee in ('mc_owner_executor','mc_owner_operator','mc_owner_gateway') and privilege_type='UPDATE' order by grantee,table_name,column_name;
select conname,pg_get_constraintdef(oid) from pg_constraint where conrelid='mc_owner_private.binding'::regclass;
