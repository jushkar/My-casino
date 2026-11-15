# ADR-003 — Single owner, durable sessions and a BFF permit boundary

Date: 2026-11-15 UTC. Scope: Prompt 3 only. **Product policy approved by the owner; implementation is a disabled, locally tested draft. Prompt 3 PARTIAL/BLOCKED.**

This replaces the multi-staff/five-minute application-session proposal in [ADR-002](ADR-002-staff-session-boundary.md), which is preserved as a rejected historical design. React/Vite, Fastify, Supabase Auth and PostgreSQL remain the architecture. No second identity provider, homemade password storage, service-role API key or bypass-RLS database connection is introduced.

## Approved product change

Exactly one application account may be the privileged owner. Its UUID is bound by a trusted operator through a separately approved process; neither email, first login, registration, editable metadata nor a browser setting chooses it. There are no staff accounts, secondary application administrators, invitation features or owner-reassignment panel. A database operator is a separate infrastructure trust role, not another application administrator.

The private entry is `/owner`. The inspected accepted baseline retains `pages/Admin.tsx` but does not route it: `/#/admin` falls back to the lobby. When this discrepancy was reported, the owner explicitly chose to **preserve accepted routing**. No public route/game/House Controls source was changed or reclassified as the owner dashboard.

The target application policy is 30 minutes of inactivity and eight hours maximum from password authentication, with password and TOTP MFA at entry and fresh TOTP for sensitive actions. The old five-minute absolute staff window is removed. A separate five-minute **provider JWT lifetime ceiling** below does not shorten the eight-hour application session; verified refresh can renew provider tokens inside the fixed application lifetime.

## Decision: two independently enforced authorization stages

Keep actual owner data operations user-scoped through Supabase PostgREST, but require a short-lived, single-use BFF permit as well as the verified owner JWT. The permit is created through a dedicated PostgreSQL gateway role. It is **not** an opaque URL, CORS rule, owner JWT alone or an unverified shared-secret header.

1. The browser holds a random 256-bit opaque `__Host-mc-owner` capability in a Secure, HttpOnly, host-only, SameSite=Lax cookie. No Supabase access/refresh token is sent to browser JavaScript, HTML, localStorage or sessionStorage. Each password login creates a new random capability and application UUID; it never adopts the submitted cookie.
2. Provider tokens are encrypted in an application-owned PostgreSQL session row using Node's AES-256-GCM, random IV and application-session UUID as authenticated additional data. The encryption key stays outside the database/source and is separate from the gateway credential and CSRF signing secret. This is bearer-material storage, not custom identity/password cryptography.
3. The BFF uses `pg` with certificate verification and the dedicated `mc_owner_gateway` database principal. It has no table access, role memberships, BYPASSRLS, provisioning authority or owner-data RPC execution. Its five private functions can create/lock/update a capability-bound encrypted session, issue an action permit, or close that session. It cannot assume `authenticated`, executor or operator roles. The migration creates this role NOLOGIN; enabling a narrowly scoped login requires separate provider approval.
4. In one READ COMMITTED database transaction, the BFF locks the singleton binding and application session, checks disablement/expiry, decrypts tokens, and uses the maintained Supabase SDK to restore/refresh the provider session. It calls online `getUser()` and signature-verifying `getClaims()` for each privileged request. Any required Auth/JWKS/database failure denies authorization; no fallback cache or mock is enabled in normal startup.
5. After verification it persists rotated tokens and creates a random permit. The private database function binds the permit to the application session, capability hash, action, note hash and critical verified JWT claims (subject, provider session ID, AAL, issuer, audience, iat, exp, password and TOTP times). It stores only the permit hash. The gateway transaction commits before the next stage, avoiding a lock held against the same session by a separate PostgREST transaction.
6. The BFF calls the single public `owner_action` RPC using the **actual owner's access token**, through the SDK's explicit `accessToken` callback. It does not use gateway credentials or a service key for this call and cannot silently refresh the token between permit creation and consumption.
7. PostgREST must independently validate the JWT. SQL then independently checks the singleton binding, AAL2/TOTP, claims match, provider/session identity, permit payload/action/expiry, capability binding, owner generation and application expiry. It locks the session and permit, consumes the permit and applies activity/data/audit changes atomically. A failed transaction has no successful mutation or activity extension; its unused permit may only retry that exact operation within the same short deadline.

The only privileged data RPC remains externally addressable, but a direct caller possessing only a provider JWT cannot authorize it, mint a permit, read private tables, or perform provisioning. A gateway credential alone cannot execute owner-data operations: it still lacks the owner's valid provider JWT and cannot SET ROLE to a user/executor. This distinction is exercised in real PostgreSQL role/ACL tests and an actual TLS `pg` connection. Hosted Supabase/PostgREST behavior is still unverified.

## Singleton authority, RLS and audit

`mc_owner_private.binding` has a primary key constrained to the constant `1`; at most one binding can exist, including when disabled. Zero rows means no authorized owner. The bound UUID is unique and never sourced from editable metadata. A generation counter invalidates earlier sessions during disablement/recovery. Session rows bind immutable application UUID, provider session UUID, owner UUID, generation, capability hash, password time and absolute deadline. Provider session UUIDs are unique, so an old provider session cannot acquire a replacement capability or application identity.

The three infrastructure roles are NOINHERIT/NOSUPERUSER/NOCREATEROLE/NOBYPASSRLS. The executor owns runtime functions, the operator owns three operator functions, and neither owns tables. Tables belong to the migrator and have ENABLE/FORCE RLS. Gateway has EXECUTE only on its five private functions; authenticated has EXECUTE only on public `owner_action`. PUBLIC/anon/service-role execution of the new functions is revoked. No managed Auth table grants, policies, SELECTs, foreign keys or helpers are needed.

Fourteen narrow policies scope access by the singleton key, capability/permit hashes and derived owner identity. Runtime record reads are creator-scoped. The executor has UPDATE only on session token/activity/revocation columns, permit consumption and the constant singleton column needed for a locking SELECT. It cannot change the bound UUID, enabled flag, generation, session identity or absolute expiry. SQL tests found that `SELECT FOR SHARE` also needed an UPDATE policy; that policy is limited to `singleton=1`, with no grant to change actual authority fields.

Provisioning, disablement and recovery require operator-only SQL functions, a recorded approval reference/reason, and actual PostgreSQL `session_user` attribution. Approval text records a human decision; supplying text is not authorization. Runtime session changes and note creation use owner/session-derived audit records in the same transaction. Audit is append-only to runtime roles and actor/record/session scoped. Trusted migration administrators, role administrators and superusers can still change the database; this is not DBA-tamper-proof auditing.

## Session policy and concurrency

- Password authentication must be recent (at most five minutes) when starting/completing entry. TOTP must be represented by signed AAL2 and a recent signed `totp` AMR timestamp no earlier than the password authentication. The pending entry window is five minutes; it grants no owner operations.
- First successful entry initializes `last_seen` from database wall-clock time. Successful owner reads/actions update it monotonically. Input/CSRF denials, rejected RPCs, factor listing and provider refresh alone do not count as activity. There is no background keep-alive polling.
- At 30 minutes inactivity, access is denied. The immutable absolute deadline is no later than the original signed password time plus eight hours. Refresh, step-up, activity, capability replay and new JWT iat cannot move it. Existing expired/revoked/provider-session identifiers cannot be reopened.
- The demo note write is the only sensitive owner mutation currently implemented. SQL requires a TOTP authentication within five minutes for it; stale assurance returns a step-up-required 403. The UI asks for a code, preserves the note in memory and requires the owner to review/save again. No wallet operations or administrator creation exist.
- Gateway transactions serialize provider refresh against all other operations on that session. The database stores the new encrypted tokens before another BFF process can load them. Opaque browser cookies are not rotated during refresh, so delayed refresh responses cannot reinstall old bearer credentials after logout.
- App logout commits a durable revocation and removes stored token material first, even after expiry/disablement or during an Auth outage. It then requests provider-local logout with the user's JWT using the same SDK method internally used by `auth.signOut`. No service/admin credential is used. The response distinguishes `appRevoked` from `providerLogout: sdk-success/unconfirmed`. Database failure does not report successful logout.
- Binding locks precede session locks; actions then lock permits. Disablement/recovery serializes with running operations and revokes all old sessions. Once the disabling transaction commits, subsequent operations are denied. Previously authorized work is not retroactively canceled. Timestamp checks happen after lock acquisition, using `clock_timestamp()`; transaction-start time cannot revive an expired request.

The UI displays idle/absolute expiry. On expiry/outage, unsaved nonmonetary note text stays only in the existing tab's DOM, while displayed records are cleared on expiry. Reauthentication opens a separate tab; closing/reloading the draft tab discards it. No credentials, tokens or drafts are persisted in browser storage. Intentional logout clears the draft.

## Revocation and outage guarantees: precise limits

Local application logout, operator disablement and recovery are under application database control. When online Auth rejects identity or the gateway reports application expiry, the BFF also attempts a durable local close after rolling back the failed transaction; later provider recovery cannot reopen a successfully tombstoned row. If that close fails due to a database outage, no successful invalidation is claimed. Their durable rejection behavior is proven only on isolated PostgreSQL so far. Provider logout, external session revocation, user disable/delete and MFA removal are different events. `getUser()` is an online identity check, **not a promise of immediate arbitrary session revocation**.

Both BFF and SQL reject provider JWTs whose `exp-iat` exceeds 300 seconds, as well as expired tokens. This requires a separately approved five-minute provider JWT setting and live verification of token/refresh/MFA issuance. The intended external-revocation residual is at most the remaining token lifetime if the provider rejects all subsequent refresh and MFA reissuance for that revoked session. **That prerequisite is not yet proven.** Token TTL alone, a registry and getUser do not establish it. No immediate arbitrary external-provider revocation guarantee is claimed. Operator application disablement is the emergency app-controlled mechanism; do not substitute an external provider ban alone.

Direct requests cannot issue permits during an Auth outage. A permit already issued before an outage/external revocation can still authorize its bound action for at most ten seconds after issuance, subject to JWT, role and application expiry checks. Work authorized before a boundary can finish afterward. This is a bounded in-flight decision, not continuous online introspection. A stolen valid application cookie is still a bearer capability; an attacker may make fresh requests while it remains valid, and fresh TOTP is required for sensitive writes. Successful permit replay, expired/revoked-capability renewal and extension beyond eight hours are denied. We do not claim universal theft/replay prevention.

Refresh can succeed at Auth while the subsequent database commit fails. Provider refresh reuse/parent-token behavior may allow recovery, but that behavior is not assumed; failure requires reauthentication and cannot reset application lifetime. A provider outage never renews activity or permits. Gateway/DB outage denies access and cannot falsely acknowledge logout.

## Alternatives rejected

| Alternative | Reason |
|---|---|
| Direct owner JWT RPCs as in ADR-002 | Can bypass online BFF verification and browser request protections; unsuitable for the longer application window |
| Static shared-secret header or obscured RPC URL | Replay and leakage concerns; inadequate alone. Use DB permissions plus expiring single-use, request-bound permits and independent owner JWT/RLS checks |
| Broad service-role key / bypass-RLS BFF connection | Would expand the BFF's authority and remove independent database checks |
| Direct SQL for all data with BFF-supplied identity alone | Would lose independent user-scoped PostgREST JWT enforcement. Gateway is restricted to session/permit functions instead |
| Per-request browser SSR-token refresh / in-memory locking | Browser response races and multiple processes can reuse rotated credentials; durable row locks and encrypted server-side tokens avoid that race |
| Managed auth.sessions policy/owner bridge | Unsupported permission/upgrade boundary already established; remains excluded |

## Approval and live-validation boundary

The owner has approved single-owner product scope, the 30-minute/eight-hour target and preservation of accepted public routing. This does **not** approve a provider migration, identity creation, Auth-setting change, database login credential or activation. The bounded external-revocation contract and operational key/credential custody still require explicit owner review/acceptance after live verification. If immediate arbitrary provider revocation is retained as mandatory, that gate remains unresolved.

Required live work includes hosted role/ACL/RLS/catalog verification; private-schema exclusion; actual gateway login with verified TLS; Auth/JWKS/Data API reachability; provisioned owner and non-owner test cases; password/TOTP/AMR/session-ID/refresh behavior; external logout/user-disable/MFA-reissue tests; real multi-process persistence; HTTPS/Safari cookie/CSRF/UI behavior; parameter/token log redaction; shared rate limits/proxy configuration; and backup/recovery/key-retention tests. Normal startup stays disabled and production startup throws. No migration, owner identity, Auth setting, deployment or Prompt 4 work is authorized here.

## Official references reviewed

- [getUser](https://supabase.com/docs/reference/javascript/auth-getuser) and [getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims): online user verification versus JWT signature verification.
- [Sessions](https://supabase.com/docs/guides/auth/sessions) and [signing out](https://supabase.com/docs/guides/auth/signout): JWT lifetime, refresh reuse exceptions and remaining validity after logout.
- [MFA](https://supabase.com/docs/guides/auth/auth-mfa): AAL and password/TOTP AMR timestamps; stale assurance after factor changes.
- [Postgres roles](https://supabase.com/docs/guides/database/postgres/roles), [database functions](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), and [database connections](https://supabase.com/docs/guides/database/postgres-js): supported role/connection/function mechanisms; permissions and definer risk.
- The pinned Supabase JS SDK supports explicit `accessToken` callbacks and uses `auth.admin.signOut(accessToken, scope)` internally for normal logout. No admin-user creation/list/delete method is used. SDK behavior was exercised against fake network transport, not the owner project.

The changelog request returned HTTP 403 and was not retried. Documentation search was accessible. No project connector query or direct project network diagnostic was performed during this refactor.
