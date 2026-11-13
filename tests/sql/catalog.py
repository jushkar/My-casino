#!/usr/bin/env python3
"""Read catalogs only inside our disposable PostgreSQL test container."""
import runpy
helpers=runpy.run_path('tests/sql/review.py',run_name='review_helpers')
sql=helpers['sql']; db=helpers['new_db']()
sql(helpers['MIGRATION'],db=db)
print('ISOLATED POSTGRESQL CATALOG, SYNTHETIC AUTH. Database:',db)
queries=[
 "select rolname,rolcanlogin,rolinherit,rolsuper,rolbypassrls,rolcreaterole from pg_roles where rolname='mc_staff_executor'",
 "select count(*) as executor_memberships from pg_auth_members where roleid='mc_staff_executor'::regrole or member='mc_staff_executor'::regrole",
 "select n.nspname,c.relname,pg_get_userbyid(c.relowner),c.relrowsecurity,c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where (n.nspname='mc_staff_private' and c.relkind='r') or (n.nspname='auth' and c.relname='sessions') order by 1,2",
 "select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname in ('auth','mc_staff_private') order by 1,2,3",
 "select n.nspname,p.proname,pg_get_userbyid(p.proowner),p.prosecdef,p.proconfig,p.proacl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='mc_staff_private' or (n.nspname='public' and p.proname like 'staff_%') order by 1,2",
 "select a.attname,has_column_privilege('mc_staff_executor','auth.sessions',a.attname,'SELECT') from pg_attribute a where a.attrelid='auth.sessions'::regclass and a.attnum>0 and not a.attisdropped order by 1",
 "select grantee,table_name,privilege_type from information_schema.role_table_grants where table_schema='mc_staff_private' order by 1,2,3",
 "select count(*) as private_sequences from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='mc_staff_private' and c.relkind='S'"
]
for q in queries: print('\nSQL:',q,'\n'+sql(q,db=db))
sql((helpers['ROOT']/'tests/sql/rollback.sql').read_text(),db=db)
print('\nPASS: catalog fixture rolled back after inspection.')
