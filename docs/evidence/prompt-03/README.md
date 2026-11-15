# Current status: live preflight — PARTIAL/BLOCKED

[Live-preflight evidence](live-preflight/README.md) independently confirms the expected project through read-only connector metadata, but the execution environment still receives proxy CONNECT 403 and a separate DNS failure. Hosted SQL/Auth work stopped as instructed. Hosted privileges, migrations, configuration and real integration remain NOT VERIFIED/BLOCKED. No provider changes or owner activation occurred.

Local checks passed: clean install, frontend typecheck/build, 17 simulated-provider SDK/HTTP tests, 29 real isolated PostgreSQL security cases plus recovery/catalog checks, backend syntax/startup and selected scans. An added test and ADR-003 amendment clarify that the gateway trusts BFF claim input for pending state; independent owner-JWT authorization is still required. No application/migration/dependency changes; prior nine-game and all earlier evidence are preserved. The next step is resolving the active runtime egress gate and completing read-only preflight before seeking specific provider-write approvals.

---

# Current status: owner-only refactor — PARTIAL/BLOCKED

The current design is [ADR-003](../../decisions/ADR-003-single-owner-boundary.md), with [owner-refactor evidence and security matrix](owner-refactor/README.md) and an [unapplied provider change plan](provider-change-plan.md). Exactly one operator-bound owner replaces multi-staff administration. `/owner` is separate; the owner explicitly confirmed preserving the accepted `/#/admin` lobby fallback and legacy source.

The proposal combines a narrow PostgreSQL gateway, one-use request-bound BFF permits and independently authorized owner-JWT RPCs. Application sessions use 30-minute inactivity/eight-hour immutable lifetime, encrypted provider tokens, serialized refresh, password/TOTP entry and fresh TOTP for sensitive note writes. Managed Auth tables remain untouched. Normal owner startup stays disabled and production refuses startup.

Real isolated PostgreSQL 17.12 passed 28 SQL cases plus recovery/reapply/catalog and pg/TLS/grant checks. Seventeen isolated SDK/HTTP tests, clean install, frontend typecheck/build, backend syntax, startup, selected secret scan and nine-game browser checks passed. Auth/PostgREST claims and the owner UI service are simulated; these are not live Supabase results. Real identity/MFA, external revocation/refresh, hosted RLS/persistence and end-to-end authorization remain BLOCKED. Conditional bounded revocation and pre-issued permit residual require explicit owner acceptance after live measurement. No provider modification, deployment or Prompt 4 occurred. Earlier evidence/designs below are historical and preserved unchanged.

---

# Current status: Auth redesign — PARTIAL/BLOCKED

The current proposal and evidence are in [auth-redesign/README.md](auth-redesign/README.md) and [ADR-002](../../decisions/ADR-002-staff-session-boundary.md). The unapplied migration now uses only application-owned objects; all managed auth.sessions policies/grants and runtime managed-table access have been removed. Real isolated PostgreSQL 17.12 tests passed (24 cases plus recovery/reapply), as did 13 isolated SDK/HTTP tests, clean install, frontend typecheck/build, backend syntax, selected scans and nine-game gameplay smoke checks. These are not live Supabase results.

The proposed five-minute non-renewable primary-authentication window deliberately permits a bounded residual after external provider revocation. Direct bearer RPCs do not run the BFF's online getUser check. These tradeoffs require explicit owner acceptance and real validation; immediate arbitrary external revocation is not established. Both production and normal development staff activation stay disabled. No owner-project connection or mutation, deployment or Prompt 4 occurred. All sections below are historical evidence, preserved unchanged.

---

# Current status: SQL review correction — PARTIAL/BLOCKED

The latest focused review and real isolated PostgreSQL test results are in [sql-review/README.md](sql-review/README.md). The draft idle policy, grants/RLS, migration atomicity and failure handling were corrected. **24 SQL tests passed on real PostgreSQL 17.12 with synthetic Auth**, plus recovery/conflict checks; this is not live Supabase verification. No connection to or modification of the owner project occurred during the review. The managed Auth policy/grant support boundary remains unresolved, and the migration is review-ready only, not approved or ready to apply. All earlier evidence and results below are historical and retained.

---

# Prompt 3 — BLOCKED, local scaffold only

Base verified by `git ls-remote` and explicit fetch: `879977e43db29eea8de20b5255c0404f09f8eb19` on `origin/codex/prompt-02-demo-ui`. The checkout's default fetch refspec tracks only main. Local worktree branch: `codex/prompt-03-staff-foundation`. No deployment, provider mutation or push was performed.

## Decisions and limitations

ADR-001 remains the intended architecture. `server/` is an intentionally unavailable Fastify placeholder bound to loopback; all staff paths return 503 without inspecting identity or serving data. It is not an authentication system or a staff landing page. No staff API, login, MFA, cookies, authorization, rate limit, CSRF, Origin or CORS implementation exists. Do not expose or deploy it as a staff service. No database migration or persistence implementation was produced; these need design, implementation and real Postgres/RLS verification. `.env.example` contains only empty owner-supplied placeholders and is not read by the stub. The Supabase connector returned an empty project list; owner selection/authorization of an appropriate project and test identities, region, allowed origin and MFA readiness are needed. No credentials should be shared in chat. Supabase changelog fetch returned HTTP 403; current documentation must be consulted before implementing the integration.

## Actual checks

| Check | Status | Evidence / limitation |
|---|---|---|
| Clean install | PASS | `clean-install.log`, npm ci --ignore-scripts --no-audit --no-fund, Node 24.22.1/npm 11.9.0 |
| Typecheck and production build | PASS | `typecheck.log`, `build.log` after clean install |
| Fail-closed stub | PASS | `server-test.log`: local inject test, including forged header; 503, not required 401/403 |
| Anonymous 401; non-staff 403; authorized staff | NOT RUN | No identity or protected operation implemented |
| CSRF/Origin; expiration/revocation; logout; forged role as auth test | NOT RUN | Stub denial is not evidence of these controls |
| Migration, RLS denial, authorized persistence across restart | BLOCKED | No migration, database or authorized provider project |
| Live Supabase identity, MFA and session behavior | BLOCKED | No selected authorized project or test identities |
| Client secrets | PARTIAL | `client-scan.log` scans selected key formats/names only; no live secrets configured, not a comprehensive secret audit |
| Nine-game browser regression | NOT RUN | `frontend-regression.log` establishes only unchanged frontend source; Prompt 2 browser evidence remains historical |

The existing workflow can deploy Pages from main or manual dispatch and was not run. No release or Prompt 3 acceptance is claimed. Exact file list is in `changed-files.txt`. Before further work, implement and verify the complete ADR session lifecycle, server-side role checks, MFA, rate limiting, CSRF/Origin protections and a least-privilege migration using an authorized test project, then execute every requested negative and persistence test. No wallet schema from later prompts was added.

## Recovery attempt — 2026-11-13

The original worktree and all uncommitted files were recovered without resetting or cleaning. `git ls-remote` again confirmed the accepted Prompt 2 SHA and no remote Prompt 3 branch. The Supabase connector now lists and reads the specified `my-casino-dev` project in `us-east-1`, `ACTIVE_HEALTHY`. Read-only connector inspection reported no public tables or policies, no migration history, and counts of zero Auth users, MFA factors and sessions. No provider-side modification was made. The connector provides no Auth settings read tool; Auth signup, MFA configuration and session settings are therefore unverified.

Direct runtime request `curl -sS -w '\nHTTP_STATUS=%{http_code}\n' https://ymgbvbocajthwhrljadn.supabase.co/auth/v1/settings` returned `curl: (56) CONNECT tunnel failed, response 403` and `HTTP_STATUS=000`. The Supabase changelog request also returned HTTP 403. The connector's documentation search was accessible and returned the current Auth MFA guidance: enforce `aal2` in server/API/database, not UI alone; RLS restrictive policies can enforce it. Supabase documents recommend per-request server clients and warn that signed access tokens may outlive revocation. These are design references, not implemented controls. Provider-dependent work was stopped under the recovery instruction until runtime network access is available. An exact migration and rollback must be prepared and explicitly approved before provider modifications; neither exists yet.

`recovery-install.log`, `recovery-typecheck.log`, `recovery-build.log`, and `recovery-server.log` record a repeated clean npm install, typecheck, build and fail-closed stub test (all exit 0). No backend TypeScript or backend build exists. `gameplay.cjs` is a copy of the Prompt 2 script with its screenshot output directory changed; `gameplay.log` and `gameplay/` record nine successful browser gameplay cycles against local production preview, including manual and automatic Crash cashout. The environment proxy blocked the optional Google Fonts request; the log records this console error. This is a smoke test, not exhaustive game certification. All identity, role, MFA, CSRF, logout, session, RLS and persistence acceptance tests remain NOT RUN/BLOCKED, and the service remains a 503 stub. No deployment, migration, auth change, user creation, commit or push occurred.

## Local implementation recovery

**PARTIAL / BLOCKED.** The original scaffold is preserved as `original-fail-closed-*.txt`. This work replaces the running stub with a loopback-only Fastify implementation and a separate protected `/staff` page and login page, using a per-request Supabase SSR client, HttpOnly Secure host-only auth cookies, same-origin CSRF validation, local IP rate limiting, generic errors, MFA checks, and database authorization RPCs. No user metadata or client role is used as authority. A draft versioned migration and detailed proposed provider changes are in `provider-change-plan.md`. No migration or provider setting has been applied. Production startup is intentionally disabled. The role/session/RLS design and cookie/session refresh behavior have not been tested with a provider; do not deploy it.

| Check | Result | Evidence / scope |
|---|---|---|
| Clean npm install | PASS | `local-install.log`; scripts, audit and funding notices disabled |
| Frontend typecheck/build | PASS | `local-typecheck.log`, `local-build.log` |
| Backend JS syntax | PASS | `local-syntax.log`; JavaScript is not typechecked |
| HTTP auth, forged role, AAL, CSRF/Origin, expiry/revocation/logout, outages and rate limit | PASS isolated only | `local-server-test.log`; fake provider and synthetic data, not Supabase integration. Fake logout/revocation do not establish actual provider revocation. The first rate-limit test exposed a plugin registration-order bug and failed; routes were moved after plugin registration, then the test passed. |
| Client secret scan | PARTIAL | `local-client-scan.log`; synthetic server-only canary and selected patterns absent, not a comprehensive audit. Server and migration source scan for selected secret formats found none. |
| Nine-game gameplay regression | PASS smoke | `local-gameplay.log` records an initial FAIL: the test waited for a cashout button after a first-tile mine. `final-gameplay.cjs` checks for the button before clicking it; `final-gameplay.log` and screenshots record nine passes and Crash auto cashout (exit 0). Optional external Google Fonts requests failed through the proxy. |
| Real Supabase auth, MFA, session cookies/refresh and logout | BLOCKED | Proxy CONNECT 403; no owner-supplied test identities or enrolled MFA |
| Migration, RLS and persistent authorized reads/writes | BLOCKED | SQL is draft and has not been applied or run on PostgreSQL; provider changes need explicit approval |
| Browser staff sign-in and integrated staff UI | BLOCKED | No reachable live provider or enrolled identity |

Global and route limits are in-memory and keyed by Fastify's direct peer IP; reverse proxy topology, rate-limit behavior across instances, session refresh races and CSRF rotation require real deployment testing. MFA enrollment is not implemented in this app; a trusted provider enrollment procedure is required. The `auth.sessions` SELECT policy and privilege grants require special review as they affect a managed schema. The service also lacks a verified owner bootstrap process. These are release blockers, not assertions of provider security.
