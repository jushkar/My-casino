# Provider change plan — single owner, unapplied draft

**Prompt 3 PARTIAL/BLOCKED. Reviewable only; no permission to apply or activate.**

[ADR-003](../../decisions/ADR-003-single-owner-boundary.md) is the current proposal. The owner approved one application owner, `/owner`, 30-minute inactivity/eight-hour maximum, and preservation of accepted routing. The baseline `/#/admin` falls back to the lobby; legacy House Controls source remains unchanged/unrouted. Prior plans/designs are preserved in `owner-refactor/previous/`, ADR-002 and earlier evidence.

No owner-project connection or modification occurred. The exact SQL is [20261113231743_staff_foundation.sql](../../../supabase/migrations/20261113231743_staff_foundation.sql). Its filename is historical; its content is the **unapplied owner-only draft**. If any environment has applied an earlier version, stop and create a reviewed forward migration instead. Never replay this replacement over existing staff objects.

## Exact affected objects

One private schema: `mc_owner_private`. Five tables:

| Table | Purpose / limits |
|---|---|
| `binding` | One row only: primary key `singleton` CHECK = 1, unique non-null owner UUID, enabled flag and generation. Zero rows authorizes nobody. No owner UUID is seeded |
| `sessions` | Immutable application/provider session IDs, owner/generation, capability hash, password time and absolute deadline; encrypted tokens, pending/activation/activity/revocation timestamps. Provider session ID and capability hash unique. No runtime DELETE or lifetime/identity update |
| `permits` | Hashed random single-use nonce, session/capability binding, allowed action, note hash, critical verified claims, ten-second deadline, consumed timestamp. No browser/gateway direct reads |
| `records` | Minimal durable, bounded printable nonmonetary note with creator/time. No wallet schema |
| `audit` | Append-only runtime/operator events with owner/session/record attribution, DB time and operator approval/reason where appropriate. No token/password/TOTP payloads |

Thirteen functions, all fixed empty search_path and explicit grants:

- Private helpers: `hash(text)`, `shape(jsonb)`, `bind_lock(boolean)`, `session_lock(text,boolean)`.
- Gateway-only: `gateway_begin(uuid,text,jsonb,text)`, `gateway_lock(text)`, `gateway_save(text,jsonb,text)`, `gateway_permit(text,jsonb,text,text,text)`, `gateway_close(text)`.
- Operator-only: `provision_owner(uuid,text,text)`, `disable_owner(uuid,text,text)`, `recover_owner(uuid,uuid,text,text)`.
- One authenticated public RPC: `owner_action(uuid,text,text,text)`; allowed actions are entry, status, note read/create and step-up. It requires both a BFF-issued permit and the actual owner's JWT. There is no provisioning/reassignment/signup/invitation RPC for browsers.

No managed Auth schema object, foreign key, helper, policy, grant or SELECT is referenced. UUID defaults need no sequences. There are fourteen scoped RLS policies and ENABLE/FORCE RLS on all five tables. Exact statements and predicates are in the migration; do not substitute broad grants or unrestricted policies to work around a hosted permission failure.

## Infrastructure role and privilege model

| Role | Authority |
|---|---|
| `mc_owner_gateway` | NOLOGIN by default; NOINHERIT/NOBYPASSRLS/no role creation. USAGE on private schema and EXECUTE on exactly five gateway functions. No tables, operator functions, user RPC or membership in other roles. Separately approved runtime login only |
| `mc_owner_executor` | NOLOGIN/NOBYPASSRLS/NOINHERIT. Owns ten helper/runtime functions, no tables. SELECT on singleton binding; UPDATE only the constant singleton key needed for locking; scoped session/permit/note rights and audit INSERT. Cannot update owner UUID/enabled/generation or session identity/absolute time |
| `mc_owner_operator` | NOLOGIN/NOBYPASSRLS/NOINHERIT. Owns the three operator functions; controlled binding writes, old-session revocation/token removal and operator audit INSERT. Never granted to the BFF, authenticated, anon or authenticator |
| Trusted migrator | Owns app schema/tables and creates roles/functions. Not a runtime credential. Privileged administrators remain trusted and can alter owned objects |

PostgreSQL 17 creates a bootstrap ADMIN-only membership for a non-superuser CREATEROLE role creator. The migration temporarily grants SET/INHERIT and schema CREATE for ownership transfer, revokes them before commit and permits only the trusted migrator's ADMIN-only membership with SET/INHERIT false. It rejects runtime memberships, executor/operator/gateway-owned relations and effective public CREATE. ADMIN can deliberately regrant permissions; this is a trusted migration boundary, not a defense against a malicious DBA. PostgreSQL 16+ membership syntax is required; tests used 17.12.

PUBLIC, anon, authenticated, service_role and gateway function EXECUTE defaults are explicitly revoked; only the intended RPC/gateway functions are regranted. Global default privileges on unrelated functions are not changed. Future functions need equivalent review. Ordinary table owners can bypass RLS unless FORCE applies; superusers/BYPASSRLS can bypass FORCE. Neither runtime function owner owns a table or has an inheritable bypass role. RLS remains effective under the tested ownership model.

## Direct Data API boundary and BFF flow

The Data API RPC is not hidden or trusted because of CORS. User JWT alone, guessed capability, client role/header/metadata and a random permit all fail. Gateway credential alone cannot execute owner-data RPCs or SET ROLE to authenticated. It also cannot alter the binding or read raw tables.

After online getUser and verified getClaims, the BFF commits an encrypted token update and a ten-second permit through the gateway connection. It then sends the actual user JWT and permit to PostgREST. SQL matches identity/AAL/session/action/body/claims and consumes the permit with data/audit/activity in one transaction. Each stage requires current singleton authority. A failed action rolls back consumption and data; retry is limited to the same permit contents/deadline and cannot duplicate a successful action. No permit or provider token is returned to the browser.

This keeps independent user-scoped JWT/RLS authorization. The database gateway is system access for the BFF, not another owner account. Its credentials must be unique and scoped, never the project's postgres password, service-role key or bypass-RLS connection. A fully compromised BFF remains trusted enough to act with captured owner sessions; the design does not claim protection against server takeover or all bearer-cookie theft.

## Session and revocation policy

The initial password and TOTP must each be recent at entry. Pending sessions last five minutes without owner access. Successful entry initializes activity using DB wall time. Successful authenticated owner actions extend inactivity to at most 30 minutes, bounded by an immutable eight-hour deadline from the original password event. Refresh, factor listing, invalid input/CSRF, rejected permits and step-up failure do not extend activity. No background heartbeat. Sensitive note writes require TOTP within five minutes; there are no wallet/admin-management actions.

Provider refresh is serialized under the durable session-row lock across BFF processes. New encrypted tokens are saved before another process loads them. Provider access/refresh tokens never live in browser storage/cookies. Session IDs/capability binding/password time/absolute expiry cannot change, old provider session IDs cannot reopen, and local close/recovery tombstones remain. Logout clears encrypted token material durably before requesting provider-local logout and clearing opaque cookies. The API reports uncertainty about provider logout rather than conflating it with local invalidation.

Provider JWTs with `exp-iat > 300` are rejected by BFF and SQL. A five-minute provider JWT setting therefore requires separate approval. Current hosted settings are not known to meet it. Intended external-revocation residual is bounded by the remaining provider token lifetime **only if** actual provider logout/disablement rejects refresh and MFA token reissuance. This must be tested, not inferred from getUser or JWT expiry. Immediate arbitrary external-provider revocation remains unproven. Local owner disablement is the emergency app-controlled action.

An already-issued permit can finish its exact action within ten seconds after issuance during a subsequent Auth outage, subject to all JWT/owner/session expiry checks; it cannot renew itself. Already-authorized work is not retroactively canceled. These in-flight/bounded-revocation tradeoffs require explicit owner acceptance before activation, after live measurements. The longer owner session is not declared live-safe on isolated test results.

## Provisioning and recovery process — requires separate approval

1. Keep normal startup disabled. Confirm the development project, migration history, hosted PostgreSQL version, existing objects/data/default ACLs/memberships, exposed schemas, signing/claim configuration and gateway connection support through a separately authorized read-only preflight. No such project check was performed in this task.
2. Review the exact migration and backup/restore plan. Obtain explicit approval for those specific provider changes before applying once through migration history. Conflicting schemas/roles/public names abort the transaction. Do not drop or overwrite unexpected data or managed Auth objects.
3. A trusted operator explicitly provisions **one** application Auth identity through an approved private operator process; do not derive it from public signup, first login, an email equality check, user metadata, or a panel invitation. No invitations/additional-admin UI is implemented. Establish the intended project's Auth user UUID through authenticated provider verification and out-of-band owner identity verification. Supabase Dashboard operator identity/MFA is not the application's end-user identity/MFA.
4. The operator/owner completes an approved password/TOTP enrollment and recovery-material custody procedure outside this app. The app implements login/challenge, not enrollment/recovery. Do not paste credentials, TOTP seed/codes, tokens, encryption keys, connection strings or recovery material into chat/evidence. No owner identity or test user was created here.
5. With explicit approval, grant a trusted operator SQL login narrowly controlled access to `mc_owner_operator` for the change window (or approved direct EXECUTE on the three functions), never to a browser/API/gateway role. Use parameterized calls: `provision_owner(owner_uuid, approval_reference, reason)`. Owner UUID is a secure operator-supplied parameter, not committed source. A second binding attempt fails even when the first is disabled. Verify audit and singleton constraints, then revoke temporary operator access. `session_user` records the SQL login; link the approval reference to the human operator's change record when a shared provider SQL login is used.
6. Enable LOGIN only for the dedicated gateway role with a unique securely generated credential, verified TLS/CA and restricted connectivity after separate approval. All other role properties/grants stay narrow. Store the gateway URI, 32-byte token encryption key and CSRF secret independently outside source/frontend. The migration itself leaves the gateway NOLOGIN and creates no passwords.
7. To disable the owner, call operator-only `disable_owner(expected_uuid, approval_reference, reason)`. It locks authority, revokes sessions, clears stored tokens and audits atomically. The expected UUID prevents accidental targeting. No current provider reachability is needed for this app-controlled action.
8. Recovery/reassignment requires a new explicit owner-approved identity verification and recovery review. First disable the old binding, then call `recover_owner(expected_old_uuid, approved_new_uuid, approval_reference, reason)` in the controlled operator context. Active bindings cannot be reassigned; recovery increments generation and never revives old sessions. The same UUID may be re-enabled after separately approved account recovery. Previous records/audits remain; new owner reads are creator-scoped. There is never a second active application owner.

The operator functions require authority through database privileges, not merely an approval string. No browser can call them. Non-owner denial testing may use an existing approved non-privileged identity; creating any new test identity requires separate approval and never grants another administrator.

## Migration, rollback and custody

The migration is transactional and apply-once. Precommit errors roll back. Exact local tests apply it as a non-superuser CREATEROLE migrator with application schema privileges, without any Auth schema. If the hosted migrator lacks compatible app-only rights, stop; do not grant Auth ownership or bypass privileges.

Before approved application, export/back up relevant data and rehearse restoration. For populated systems, disable the owner service and use a reviewed forward fix or compatible backup restore; never erase audit history to undo a change. `tests/owner/recovery.sql` is destructive cleanup only for a disposable/empty fixture, not an owner-project rollback command. Transactional cleanup rollback and clean reapply passed locally. Hosted backup/restore has NOT RUN.

Key rotation/loss requires a reviewed recovery process: stop owner service, revoke sessions/clear encrypted bearer material or perform controlled re-encryption, distribute the new key to all instances, then require fresh entry. The key is not stored in PostgreSQL. Expired/used permit retention and expired encrypted-token cleanup need an approved maintenance policy before activation; runtime roles cannot delete tombstones/audit. Capacity, backup retention and log redaction (including SQL bind parameters, cookies and authorization headers) require live review. Do not commit real UUIDs/claims/credentials in evidence.

## Required live validation — BLOCKED / NOT RUN

- Reach Auth/JWKS, user-scoped Data API and the scoped database endpoint through legitimate environment policy; current direct project HTTPS CONNECT 403 remains an existing blocker, not retried here. Confirm native PG connectivity separately, without tunneling around controls.
- Verify hosted migration permissions, owner/operator/gateway role separation, no accidental authenticator membership, private-schema exclusion and exact ACL/RLS/catalog results. Verify actual gateway SCRAM/password authentication, TLS/CA/name verification and credential revocation; local wire fixture used isolated trust authentication.
- Verify owner/non-owner/anonymous behavior, real TOTP entry/step-up, signed password/TOTP AMR and provider session-ID stability through refresh/challenge. Test key rotation, missing/forged/stale claims and provider JWT TTL ceiling.
- Measure external local/global logout, user disable/delete, factor removal and MFA token reissuance while the app session is active, including rejected refresh at token expiry. Do not accept the proposed residual bound without those results.
- Attack the Data API directly: owner JWT without permit, invalid/used/expired permit, forged subject/role/claims/body/action/session, gateway credential without user JWT, and races with disablement/logout. Verify an Auth outage prevents new permits; document the short already-issued-permit residual.
- Real BFF processes sharing PostgreSQL: refresh rotation, delayed responses, provider-success/DB-commit-failure recovery, expiry during lock waits, concurrent logout/recovery, persistence across actual application restart. Local independent psql/pg connections are not live Supabase integration.
- Real HTTPS/Safari owner flow: opaque HttpOnly/Secure cookies, CSRF after login/logout, Origin and rate-limit enforcement, idle/absolute expiry messages, draft retention and step-up. The Chromium localhost UI test uses a fake owner service; it does not prove real MFA or HTTPS/Safari behavior.

## Deployment assumptions — feature disabled

Production startup throws and `OWNER_LIVE_SECURITY_VERIFIED` remains hard-coded false. Valid environment values cannot activate the owner feature. Vite public routes/game sources remain unchanged. No main merge, workflow dispatch, public deployment, DNS, paid resources or Prompt 4 work.

A later reviewed topology must place public assets and `/owner`, `/owner/*`, `/api/owner/*` behind one HTTPS origin with no owner response caching. Preserve exact Origin/headers; no CORS reflection. Cookie: Secure, HttpOnly, Path=/, no Domain, SameSite=Lax; CSRF bootstrap is Strict and bound by HMAC to the opaque owner cookie. Never share secrets through VITE variables or frontend bundles.

Current Fastify `trustProxy:false` and loopback bind prevent trusting arbitrary forwarded headers. Behind a proxy, peer-IP limits may group all users; before activation use an explicitly trusted proxy chain and shared atomic rate limits/account-abuse controls for multiple BFF instances. CSRF/encryption keys must be consistent across instances; session/refresh locks are already database-backed. Node PG pool is small, uses READ COMMITTED and transaction-local lock/statement/idle timeouts; failed rollback connections are discarded. Direct/session-pool topology, concurrency budgets, wall-clock synchronization, network timeouts and safe log/secret custody still require live validation.
