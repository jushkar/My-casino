# Prompt 3 focused SQL security review

**Result: review-ready draft; NOT ready to apply. Prompt 3 remains PARTIAL/BLOCKED.**

Preflight local and remote feature HEAD both matched `eccab5a3badca6d26d3c6dc535048b66be25e289`, with a clean worktree. Accepted Prompt 2 lineage and FINAL blueprint/runbook/gates, ADR, execution state, actual Fastify/SSR adapter, primary migration and earlier evidence were reviewed. No owner-project connection, migration, Auth settings change, user creation, deployment or Prompt 4 work occurred in this task. Supabase documentation search was used without querying the owner project. Original SQL and provider plan are preserved here as `.txt` copies; all prior Prompt 1–3 evidence remains intact.

## Findings and corrections

| Finding | Severity | Failure/exploit scenario | Correction | Evidence | Remaining risk |
|---|---|---|---|---|---|
| First staff activity inherited ordinary Auth session age | Medium | A first eligible staff request after 31 minutes was denied although the eight-hour absolute lifetime had not elapsed | Distinct `first_seen`, initialize both activity timestamps at first eligible staff use using DB wall time; never overwrite on conflict | SQL 01–04, 07 | Real provider timestamps/claims still unverified |
| Transaction-start time and lock waits could use stale expiry/activity | High | A transaction started before expiry could pass later with `now()`; a stale snapshot could miss revocation | `clock_timestamp()` after row lock; repeat Auth/role checks; READ COMMITTED only, deny stale snapshot modes | SQL 06, 18, 23 | In-flight authorized work is not canceled; live BFF/refresh behavior remains blocked |
| Broad executor policies and unverified ownership/membership | High, latent privilege boundary | `USING(true)` allowed any row if executor rights became reachable; NOLOGIN/NOINHERIT alone do not prevent SET ROLE or table-owner RLS bypass | Scope policies to caller user/session/actor; author-private records; FORCE private RLS; UPDATE grant only on last_seen; enforce no executor-owned tables or memberships and no inherited CREATE | SQL 12–16, 19, 22; `catalog.log` | Trusted migration/table administrators and BYPASSRLS/superusers can still change/bypass controls; never grant runtime executor membership |
| Permissive Auth policies combine with OR | Medium | An unrelated PUBLIC permissive policy could expose other Auth session rows to the executor | Add restrictive `mc_staff_session_scope` alongside the scoped permissive policy; reject extra Auth column/table SELECT privilege | SQL 13, 16, 20 | Two custom policies remain a managed-schema compatibility dependency |
| Session row existence is insufficient to establish every expiry condition | High, partially addressed | Provider-expired rows may remain until cleanup; an expired claim should not be usable even if a row exists | Check own absolute lifetime, JWT exp, optional Auth not_after, UUID/role/AAL and active DB role | SQL 02, 07–11 | Full Supabase inactivity/refresh/revocation semantics and managed column compatibility remain BLOCKED |
| Managed Auth changes not proven supported/applicable | High, unresolved blocker | Customer migration role may not own auth.sessions; upgrades can change policies, columns, ACLs or cleanup behavior | Keep narrow managed dependency explicit, fail closed on incompatible columns/RLS/grants, refuse broad privilege workaround; no owner-project application | SQL 24; incompatible-column atomic failure; current docs below | No Supabase support contract, actual hosted grants/catalog or upgrade test established. Do not apply |
| Invalid request input could extend staff activity through BFF gate | Medium | Bad note input reached a successful gate before a 400 response | Validate input before BFF gate and before SQL mutation gate; denied CSRF already precedes gate | New sixth server test; SQL 05 | Successful authorization reads count as activity even without a write; this is documented policy |
| Concurrent logout during first-use FK insertion | Low, safe-denial correctness | Session deletion between visibility check and insert could raise an FK error and become generic 503 | Catch FK violation within gate subtransaction, roll back changes and return unauthenticated | SQL 08, 21 | Local Auth row deletion is modeled logout, not actual Supabase revocation evidence |
| Unwrapped DDL and repeat/object conflicts | Medium | Mid-migration failure could leave some privileges or objects in place; blind rerun could collide | Explicit transaction and apply-once conflict preflight; do not replace/reuse existing objects; ACLs revoked before commit; final environment assertions | SQL 17; recovery and ambient CREATE/incompatible-column tests | Hosted migration history and runner behavior require separate validation |
| Audit integrity/authority checks | Reviewed, no new defect | Caller forges actor, metadata or record owner; audit insert fails after record insert | DB derives actor; audit policy binds own record; runtime has no update/delete; record and audit remain atomic | SQL 11–15 | No privileged administrator tamper-proofing or live persistence claim |

## Precise session policy

The eight-hour absolute limit starts at Auth creation, including ordinary non-staff time. First eligible staff access at one hour is allowed and starts staff idle time then. Subsequent successfully authorized staff requests update last_seen. At 30 minutes idle (inclusive) the stored row expires and can never be reinitialized by the same session ID, including refreshed JWTs. First_seen is immutable to the runtime, last_seen is the only writable session column, and no runtime DELETE exists. Denied role/AAL/claim/revocation/idle/input paths do not extend an existing activity timestamp. A new authenticated session ID is required after idle expiry. New UUID reuse by a trusted provider/admin is outside the local model.

Primary-key conflict handling and a row lock serialize first and subsequent use; last_seen is monotonic under concurrent calls. Checks use current wall time after waiting and re-read Auth/roles under READ COMMITTED. Access is decided at database statement/transaction visibility, not as a global cancellation primitive. Already-authorized in-flight work may complete when revocation commits later. A committed session deletion is denied on the next request; repeatable-read and serializable callers are rejected to avoid stale snapshots. Deadlocks/serialization/outage errors fail closed through the BFF generic 503 handler. Token refresh preserves the session ID, so it does not grant a fresh staff idle window.

## Privilege-boundary conclusion

The executor owns four SECURITY DEFINER functions, no tables, and no role memberships. NOLOGIN only prevents direct login. NOINHERIT does not prevent an explicitly granted SET ROLE membership. Ordinary table owners bypass RLS unless FORCE applies, while superuser/BYPASSRLS still bypass FORCE; the tests demonstrate the owner bypass and membership behaviors. Private tables are FORCE RLS and owned by the migration administrator. Executor reads/writes are scoped by RLS and narrow ACLs. Auth table remains owned by the synthetic `supabase_auth_admin`, with RLS enabled and no forced-owner behavior assumed. No CREATE remains on either schema. Functions use empty search_path and qualified relations, with no dynamic SQL. Built-ins resolve through pg_catalog.

Anon/authenticated/service_role have no private table/schema access or private helper EXECUTE. Only authenticated gets the three intended public RPCs. PostgREST must validate JWT signature/issuer/audience/expiry before setting its trusted request claims. SQL does not implement JWT signature verification. The isolated tests intentionally set synthetic claims as a local superuser: they prove downstream SQL decisions, not JWT security. `user_metadata` and `app_metadata` have no authorization role. Active staff status is read from the table each gate, so stale role metadata does not elevate. RLS now limits records to their author, which narrows the previous all-staff read behavior. No schema/sequence blanket grants are added; UUID defaults need no sequences.

PUBLIC EXECUTE is PostgreSQL's default for new functions. This draft explicitly removes it for every function in the same transaction, including private helper, before exposing authenticated-only public RPCs. It does not change unrelated global default privileges. Every future function needs the same review and catalog checks. A compromised/trusted function owner or migration administrator can alter owned functions or grants; the zero-membership and server-only credential model is an essential boundary, not a defense against an already-privileged database administrator.

## Supabase support conclusion

Current [Supabase sessions documentation](https://supabase.com/docs/guides/auth/sessions) documents `session_id` correlation and row-existence checks after logout. It also documents delayed deletion for some expiration cases and refresh-token reuse behavior. [Managed-schema guidance](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting#drift-detected-your-database-schema-is-not-in-sync-with-your-migration-history) warns managed schemas may change with upgrades. These sources support the motivation for a lookup but do not prove custom Auth policy/grant support or stability.

No current owner-project catalog was queried, as expressly prohibited. Earlier observations recorded Auth RLS enabled, but actual current owners, memberships, existing policies/ACLs, column shape, hosted role permissions and upgrade behavior remain NOT RUN here. The isolated fixture is not a copy of Supabase's real schema. Its managed-like ownership shows that CREATEROLE alone is insufficient to add a policy to another role's table. The migration was tested as a local superuser; actual hosted postgres is not assumed equivalent. PostgreSQL 17 CREATEROLE's automatic role administration/membership behavior may cause the draft's final zero-membership assertion to reject a hosted runner, too. This must be solved through a supported and approved owner provisioning process, not relaxing runtime constraints.

An alternative that avoids managed changes and still proves immediate arbitrary provider revocation has not been established. Offline JWT checks, getUser alone, shorter TTL, or a BFF-only revocation list are insufficient for that requirement. An Auth-owner/postgres-owned bridge or BYPASSRLS executor would expand the approved trust boundary. Thus managed Auth support remains a high release blocker even though the SQL approach works on the test fixture.

## Execution evidence and reproduction

- `postgres-tests.log`: **24/24 PASS**, real PostgreSQL **17.12**, plus four successful recovery/conflict checks. Synthetic Auth fixture, no GoTrue/Auth service/PostgREST, no real test identities. `postgres-tests-initial.log` (19 tests) and `postgres-tests-22.log` preserve earlier successful runs before subsequent hardening.
- `catalog.log`: actual role flags, membership count, table ownership, FORCE/RLS states, policy predicates, function owners/search paths/ACLs, column rights and sequence count.
- `initial-recovery.log`: successful cleanup of the first local iteration. Before this recorded success, the first attempt to reverse the older local draft failed because the newly added restrictive policy did not exist in that older schema (`policy "mc_staff_session_scope" ... does not exist`). The explicit transaction rolled back; no partial cleanup was committed. The isolated recovery script now uses IF EXISTS for that new policy so either review draft can be reversed. This was a local test harness correction, not owner-project recovery.
- `server-tests.log`: **6/6 PASS**, fake-provider HTTP tests, including rejection of invalid input before any activity gate call. Not live provider verification.
- `typecheck.log`, `build.log`, `backend-syntax.log`: frontend typecheck/build and backend JS syntax PASS; backend JS is not typechecked.
- `secrets-scan.log`: selected source/build credential patterns and server-only synthetic canary PASS; not a comprehensive secret audit.
- `frontend-preservation.log`: public/game sources unchanged. Browser gameplay was not rerun for this scoped SQL review; prior nine-game final-gameplay evidence is retained.

Exact local commands (run only on a disposable container with no published port):

```sh
docker pull postgres:17
docker run --detach --name mc-p3-sql-review --network none --tmpfs /var/lib/postgresql/data -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17
docker exec mc-p3-sql-review pg_isready -U postgres
python3 tests/sql/review.py
python3 tests/sql/catalog.py
npm run test:server
npm run typecheck
CSRF_SECRET=SQL_REVIEW_SYNTHETIC_CANARY_93157 npm run build
node --check server/app.js
node --check server/provider.js
node --check server/index.js
```

`image.log` records the pulled immutable image digest and network isolation. For reproducibility replace the image tag with that digest. Test scripts only invoke psql via docker exec against the named local container; they accept no remote URL or credentials. Each run creates a new local database. Fixture roles are cluster-wide; the runner reverses its own staff role before recovery/reapply checks. The fixture uses trust auth on local sockets inside the network-disabled disposable container only, with no host port. This is not an application authentication setting.

Migration replay is deliberately an atomic conflict failure, not a silent no-op. Isolated destructive recovery removed staff objects/grants/policies and preserved synthetic Auth rows; corrected migration reapplied afterward. Existing ambient PUBLIC CREATE or a missing managed `not_after` column caused full rollback. Recovery SQL is test-only and destroys staff data, so it is not approved for the owner project. Live provider sessions/MFA/refresh/logout, actual project RLS/ACLs, durable Supabase persistence and supported upgrade/recovery remain **BLOCKED / NOT RUN**.
