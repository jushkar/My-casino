# Prompt 3 — Auth architecture redesign evidence

**PARTIAL/BLOCKED. Review-ready proposal, not accepted or ready to activate/apply.**

Starting local/remote feature HEAD was `56a2796b6d349c81fbae62b717f15e0ace5813e9`, with a clean tree inspected before editing. Accepted Prompt 2 ancestry is preserved. The FINAL blueprint/runbook/gates, ADR-001, execution history and actual server/SQL implementation were reviewed. `preflight.log` repeats the branch/HEAD/remote/ancestry checks and confirms unchanged public source/dependencies/workflows/FINAL documents. No owner Supabase project connection or mutation, network-diagnostic retry, deployment, main merge, or Prompt 4 work occurred.

The recommendation and alternatives A–D are in [ADR-002](../../../decisions/ADR-002-staff-session-boundary.md). Exact provider objects, permissions, rollout/recovery and live test prerequisites are in [provider-change-plan.md](../provider-change-plan.md). The edited migration remains **unapplied outside disposable isolated databases**. Earlier SQL/provider/plan snapshots and all earlier evidence remain intact; historical SQL tests now explicitly target the preserved old draft.

## Security review matrix

| Finding | Severity | Exploit/failure scenario | Exact correction / disposition | Test evidence | Remaining risk |
|---|---|---|---|---|---|
| Managed Auth policy/grant path cannot be assumed available | High compatibility/release blocker | postgres does not own auth.sessions and cannot SET ROLE to its owner | Remove all managed Auth schema grants/policies/SELECTs/FKs/helpers. Use only app tables and signed PostgREST request context | SQL 01 and catalog: Auth schema does not exist in fixture, migration applies | Actual hosted runner/PostgREST/configuration still unverified |
| getUser is not universal session-revocation introspection | High acceptance gap | External logout may leave a valid JWT accepted; an app registry does not observe external state | Explicit proposed five-minute non-renewable primary-authentication window, current DB role, AAL2, no implicit refresh; owner approval required, startup disabled | SQL 10 intentionally permits modeled external logout inside the bound, then denies at bound; SDK signature/age tests | No live proof of external logout/disable behavior or stable password AMR. Does not meet original immediate external revocation requirement |
| Direct Data API can bypass BFF online verification | High acceptance gap unless tradeoff approved | Valid staff JWT invokes public RPC while Auth-only service is unavailable or after external logout | Every RPC enforces its own DB role/AAL/expiry/session boundary; document bounded residual and lack of BFF getUser/Origin/rate limiting on this bearer path | SQL direct RPC negative tests and catalog execution ACLs | This distinction also requires explicit approval; universal online-Auth gate would require a different design |
| Refresh/first-use time could reopen or extend staff access | High | Refreshed iat or later first use grants a new window after provider logout | Signed earliest password AMR anchor, immutable min(anchor+300, token exp) registry expiry, no refresh grants allowed through BFF transport | SQL 06–08, 16, 19, 20, 23; SDK refresh transport and expiry tests | Signed AMR preservation across real provider refresh/MFA remains BLOCKED. Five-minute sign-in UX is stricter than old idle policy |
| Logout/open/refresh race and stale cookie replay | High | Delayed MFA/open resurrects a session after logout, or cookie removal alone leaves bearer access | Close upserts permanent session tombstone; row locks serialize open/read/write/close; no DELETE or expiry-update grant; close before best-effort provider logout | SQL 08–09, 11–12, 16, 22; SDK concurrent refresh/logout and cookie-clearing assertions | Already-authorized work can complete; theft of an active bearer/capability permits use inside its window; no blanket anti-replay claim |
| Non-superuser ownership transfer / automatic role membership | High if runtime privileges leak | Function ACL transfer fails, or executor becomes reachable through inheritance/SET ROLE | Temporary migrator-only membership and CREATE for transfer, revoke before commit; forbid runtime/executor memberships, table ownership, schema CREATE; allow only trusted migrator's bootstrap ADMIN-only membership with SET/INHERIT false | Preserved initial failure logs; SQL 15, 19, catalog, non-superuser migration and recovery | ADMIN can deliberately regrant. Migrator/table owner and superusers remain trusted; hosted version/ACLs need review |
| RLS bypass via ownership or broad policies | High | Function owner owns tables or bypass role, sees another user's records/session, forges audit actor | Executor owns no tables, no bypass/memberships; FORCE RLS, user/session/author predicates, narrow column grants; no unrestricted policies | SQL 05, 13–15, 19, 21; catalog | Trusted DB administrator can change/bypass policies. No claim of audit tamper-proofing against DBA |
| Audit not atomic / cross-user attribution | High | Mutation commits without audit or uses caller-supplied actor/session | Derive identity from verified context; insert audit in same transaction; scoped policy + record/session FKs; no runtime audit read/update/delete | SQL 04, 09, 14, 21, 22 | Raw DBA role/bootstrap changes use controlled operator evidence, not this in-app audit |
| Expired SDK session was returning infrastructure failure | Medium | SDK attempts blocked refresh; getSession returns auth error which became 503 | Map session 400/401/403 to missing identity; preserve 503 for verification outages; generic 403 for SQL permission race/AAL failure | `server-expiry-failure.log`, corrected SDK tests and real-SDK-to-Fastify HTTP response test | SDK emits fixed synthetic error stack to server console in test; live error logging/redaction still requires review, no stack in HTTP responses |
| Provider outage / ambiguous logout success | High if misreported | Treat failed provider call as authorization or report cookie-only logout as full revocation | Required online BFF verification/DB errors deny; commit local close first; API distinguishes `appRevoked` and `providerLogout: sdk-success/unconfirmed` | HTTP outage tests; SDK Auth/DB logout failure tests; SQL durable tombstones | sdk-success is library success, not proof all JWTs are invalidated. DB failure does not claim successful logout |
| Production accidentally enabled by configuration | High exposure risk | Correctly shaped env values activate an unverified design | Hard-coded pending-owner/live-validation activation guard; production startup throws; default routes 503 | `startup.log` with real local child processes, synthetic configuration | Guard removal is a later reviewed change, not authorized by these tests |

## Test matrix

| Check | Result | Evidence / scope |
|---|---|---|
| Clean installation | PASS | `install.log`: npm ci --ignore-scripts --no-audit --no-fund, 236 packages; no manifest/lock changes |
| Frontend TypeScript / production build | PASS | `typecheck.log`, `build.log`, after clean install, exit 0; synthetic server-only canary present in build environment |
| Backend checks | PASS syntax / tests | `syntax.log`, `server-final.log`: 13 tests, exit 0. Server is existing JavaScript, not TypeScript; no backend TS typecheck or bundling is claimed |
| Anonymous, non-staff, missing/AAL1, authorized AAL2, forged role/session | PASS isolated | Fake-provider Fastify authorization plus real SDK/synthetic signed JWT and direct SQL claims; not real identities |
| Signature, issuer/audience, password age and expired provider JWT | PASS isolated | Installed SDK uses ephemeral in-memory RSA test key and fake Auth/JWKS transport. Forged signature rejected. No private key/token values printed or committed |
| CSRF/Origin/session binding, rate limits, generic 401/403/503 | PASS isolated | Fastify injection, including SDK-to-HTTP denial/error mapping |
| Expired/revoked app session, logout, concurrent open/close/write | PASS real SQL / isolated SDK | SQL 06–12, 16, 18–19, 22–23; transport prevents refresh networking; local app revocation only |
| External provider logout while app remains active | PASS modeled limitation; live BLOCKED | SQL 10 assumes valid JWT remains accepted, explicitly allows residual inside bound and denies afterwards. This does not simulate a promise of immediate revocation |
| Privilege catalog, RLS isolation and audit atomicity | PASS real PostgreSQL | `sql-final.log`, `catalog.log`; 24/24 tests, no Auth schema or PostgREST server |
| Persistence across simulated application restarts | PASS real PostgreSQL connections | SQL 12 uses independent psql processes/sessions; data and revocation survive client process exit. Not a real Fastify/provider restart test or durable-volume restart |
| Repeat migration, transactional recovery, cleanup/reapply | PASS isolated PostgreSQL | SQL 17, 24 and final recovery/reapply; non-superuser migration runner; only disposable data |
| Client/server selected credential scans | PASS scoped | `secrets-scan.log`; selected patterns and synthetic server canary/privileged identifiers absent from client bundle. Not a comprehensive secret audit |
| Nine-game regression + Crash manual/auto cashout | PASS smoke | `gameplay.log`, script, ten screenshots; actual local production build. All nine cycles checked balance/history/display. Optional Google Fonts requests FAIL with proxy tunnel error; game checks pass using fallback fonts |
| Startup disabled | PASS | `startup.log`: production rejects startup, development remains 503 with syntactically complete synthetic configuration |
| Live provider identity/MFA/enrollment, AMR/refresh/revocation/disable semantics | BLOCKED / NOT RUN | Runtime proxy CONNECT 403 remains supplied blocker; no retries, authorized identities or owner policy acceptance |
| Hosted migration, real Supabase RLS/persistence/authorization/HTTPS Safari UI | BLOCKED / NOT RUN | No owner-project connection/modification or permission to apply; no live-provider substitution with mocks |

## Failures preserved

`sql-initial.log`: non-superuser SET ROLE/ownership grant failure. `sql-ownership-failure.log`: helper ACL inaccessible after ownership transfer. `sql-admin-membership-failure.log`: zero-membership assumption failed because PostgreSQL retains creator ADMIN-only membership. These exposed actual draft compatibility issues, corrected by the bounded temporary transfer and final privilege invariant above.

`sql-first-full-failures.log`: initial 20-test full run had two harness defects: parsing a composite row as pipe-separated output, and two separate clock_timestamp evaluations differing by a microsecond at a five-minute CHECK boundary. Corrected harness uses a selected column and one statement timestamp. The active SQL did not change to bypass either constraint.

`server-expiry-failure.log`: real SDK expired-session path threw instead of returning missing identity; corrected mapping now tested through HTTP. `pre-install-*` preserve earlier successful checks. `pre-pause-sql-final.log` preserves the first successful 24-test SQL run. The usage-limit pause stopped the temporary container; `catalog-container-stopped.log` records that initial catalog attempt could not run. Reinitialized the disposable tmpfs DB and reran all 24 SQL tests/recovery before final catalog collection. No persistent owner data was involved.

## Reproduction and environmental limits

Run from the repository root. Node/npm versions are in `runtime.log`. All DB commands below target a **local disposable Docker container**, with no network and no published port. Local trust authentication is confined to that isolated container. Do not point these tests/recovery at the owner's project.

```sh
docker run --name mc-p3-auth-final --network none --tmpfs /var/lib/postgresql/data -e POSTGRES_HOST_AUTH_METHOD=trust -d postgres@sha256:846a7ddaa67a4b354ae1d21087b683901aa6113a4ed626d3787cfbf6c85e3e07
# After pg_isready succeeds inside the disposable container:
TEST_PG_CONTAINER=mc-p3-auth-final python3 tests/redesign/sql.py
# Use the generated database name printed by the runner, not a provider URL:
docker exec -i mc-p3-auth-final psql -X -U postgres -d GENERATED_TEST_DB -v ON_ERROR_STOP=1 < tests/redesign/catalog.sql
npm ci --ignore-scripts --no-audit --no-fund
npm run test:server
npm run typecheck
CSRF_SECRET=ISOLATED_SERVER_BUILD_CANARY_NOT_A_SECRET SUPABASE_PUBLISHABLE_KEY=ISOLATED_SERVER_BUILD_CANARY_NOT_A_SECRET npm run build
python3 tests/redesign/startup.py
python3 tests/redesign/scan.py
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
# In a separate process while preview is running:
CASINO_URL=http://127.0.0.1:4173 node docs/evidence/prompt-03/auth-redesign/gameplay.cjs
```

The SQL runner creates fresh synthetic UUIDs and local roles per fresh cluster. It needs a new empty disposable container for a clean rerun because cluster-level executor ownership intentionally rejects reuse. PostgreSQL is **17.12**; actual SQL, ACLs, RLS, locks and persistence ran. Auth/GoTrue/PostgREST were **not** running; JWT context was set by the privileged test harness. SDK tests used the installed Supabase libraries with fake transport and ephemeral signing keys. Neither suite proves real Supabase session revocation, hosted migration privileges, AMR stability or end-to-end BFF persistence.

Next: owner reviews ADR-002's explicit tradeoff (including direct RPCs) and the exact app-only draft, then a separately approved provider validation phase after legitimate connectivity is restored. If immediate arbitrary external-provider revocation remains mandatory, the proposal is not acceptable and must remain disabled. Review readiness does not authorize applying this migration. Exact changed paths are in `changed-files.txt`; the containing commit and pushed SHA are reported at delivery.
