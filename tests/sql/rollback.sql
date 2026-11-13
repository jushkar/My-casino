-- DESTRUCTIVE ISOLATED-TEST RECOVERY ONLY. Never use on owner data without backup
-- and a separate reviewed owner approval. No CASCADE: unexpected dependencies fail.
begin;
drop function public.staff_gate();
drop function public.staff_records_list();
drop function public.staff_record_create(text);
drop function mc_staff_private.gate();
drop policy mc_staff_current_session on auth.sessions;
drop policy if exists mc_staff_session_scope on auth.sessions;
revoke select(id,user_id,created_at,not_after) on auth.sessions from mc_staff_executor;
revoke usage on schema auth from mc_staff_executor;
drop table mc_staff_private.audit;
drop table mc_staff_private.records;
drop table mc_staff_private.sessions;
drop table mc_staff_private.roles;
drop schema mc_staff_private;
drop role mc_staff_executor;
commit;
