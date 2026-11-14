-- DISPOSABLE EMPTY DEVELOPMENT DATABASE ONLY. Deletes all application records/audits.
-- Not an authorized owner-project rollback. Back up/restore data for any populated system.
drop function public.staff_record_create(text,text);
drop function public.staff_records_list(text);
drop function public.staff_gate(text);
drop function public.staff_session_open(text);
drop function public.staff_session_close();
drop schema mc_staff_private cascade;
drop role mc_staff_executor;
