-- DESTRUCTIVE: only for this empty/disposable isolated fixture, never the owner
-- project. Populated systems require an approved backup/restore/forward change.
drop function public.owner_action(uuid,text,text,text);
drop schema mc_owner_private cascade;
drop role mc_owner_gateway;
drop role mc_owner_executor;
drop role mc_owner_operator;
