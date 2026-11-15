# Prompt 3 owner-only refactor — PARTIAL / BLOCKED

Date: 2026-11-15 UTC. Repository: `jushkar/My-casino`. Branch: `codex/prompt-03-staff-foundation`. Starting local/remote HEAD: `b2d0bb9c6f5bd242f13bf06d507499f318a201f0`; accepted Prompt 2 ancestor: `879977e43db29eea8de20b5255c0404f09f8eb19`. The containing commit is the delivery revision; its exact pushed SHA is reported separately. [Exact changed paths](changed-files.txt).

The owner approved one privileged account, `/owner`, 30-minute inactivity/eight-hour maximum lifetime, and preserving accepted public routing. The inspected baseline keeps legacy House Controls source but routes `/#/admin` to the lobby. That behavior is explicitly preserved; it is never the owner dashboard. All nine public games and accepted artifacts are unchanged ([preservation.log](preservation.log)).

[ADR-003](../../../decisions/ADR-003-single-owner-boundary.md) replaces the rejected multi-staff/five-minute application-session proposal. The [provider plan](../provider-change-plan.md) describes exact objects, role grants, operator provisioning/recovery and live tests. The existing migration filename is retained as an **unapplied draft**, not an applied migration edited in place. No project connection, migration, user creation, Auth/MFA setting, deployment, workflow dispatch or Prompt 4 work occurred.

## Implemented boundary

A database singleton chooses the one owner UUID through operator-only, audited functions. Browser metadata, email, first login and public signup never choose it. The owner browser receives only an opaque Secure/HttpOnly cookie. Provider bearer tokens are encrypted in the private session registry; database row locks serialize refresh and logout across application processes. App sessions have immutable identity and expiry, local revocation tombstones, and no silent lifetime renewal.

A dedicated, narrowly granted PostgreSQL gateway role obtains a ten-second, one-use permit after online Supabase SDK identity/signature verification. The BFF then calls PostgREST with the actual owner's JWT. SQL independently enforces current binding, AAL2, session, exact claims/action/body/permit and expiry; mutation, permit consumption, activity and audit commit together. An owner JWT alone cannot mint permits or authorize direct RPCs. The gateway alone cannot call the owner-data RPC, assume other roles, provision the owner or read raw private tables. No service-role key, bypass-RLS runtime connection or managed Auth-table access is used.

Normal startup remains 503 even with syntactically complete configuration; production refuses startup. These guards are hard-coded. Test fixtures inject fake services explicitly; normal startup has no mock switch.

## Actual test matrix

PASS below means the stated isolated/local scope only. No row establishes live Supabase Auth, RLS, persistence or end-to-end authorization.

| Check | Result | Evidence / scope |
|---|---|---|
| Clean installation | PASS | [clean-install.log](clean-install.log), `npm ci --ignore-scripts --no-audit --no-fund`, 247 packages; lockfile committed |
| Frontend TypeScript/build | PASS | [typecheck.log](typecheck.log), [build.log](build.log); `npm run typecheck`, `npm run build` |
| Backend execution/syntax | PASS | [server-final.log](server-final.log): 17 tests; [backend-syntax.log](backend-syntax.log). Server is JavaScript, not TypeScript |
| Backend TypeScript/build artifact | NOT RUN / not applicable | No backend TS compiler or bundling stage; Node executes checked JavaScript directly |
| Anonymous 401, non-owner 403, AAL1 denial/AAL2 success, forged headers | PASS isolated | HTTP fake-service cases plus installed SDK tests and real SQL cases 3–7; fake claims are not provider identity evidence |
| CSRF/Origin/content type, cookie binding, no CORS reflection, safe errors/rate limits | PASS isolated | HTTP suite; no live reverse proxy or distributed limiter |
| Zero/second owner, unauthorized provisioning, current disablement, recovery | PASS real PostgreSQL | SQL cases 1–4, 12–15, 27–28; trusted operator functions only, no real Auth identity |
| Thirty-minute idle/eight-hour absolute limit, wall-clock and no revival | PASS real PostgreSQL | SQL cases 8–11, 14–16, 25–26. Controlled timestamp fixtures test boundaries without waiting eight hours |
| Concurrent activity, refresh, logout, revocation, replay | PASS isolated | Real SQL cases 18–20 and SDK/fake-repository concurrency test. Real provider rotation remains BLOCKED |
| Expired provider JWT/invalid audience, forged signatures/claims | PASS isolated | Real SQL expiry/audience checks and installed SDK with ephemeral test signing key/fake JWKS. Hosted keys/claims not tested |
| Direct RPC, old capability, permit payload/claims/expiry/replay | PASS real PostgreSQL | SQL cases 6–7, 14–18, 26; actual gateway SQL role restrictions in [wire-final.log](wire-final.log). PostgREST JWT validation is simulated |
| External provider logout while app session active | PASS explicit simulation; live BLOCKED | SDK fake transport deliberately lets getUser accept an externally revoked unexpired JWT, then rejects revoked refresh. This proves the test model/handling, not actual Supabase behavior |
| Auth/DB outage; durable local close before provider logout | PASS isolated | HTTP/SDK tests prove generic 503 and no new permits; real SQL tombstones. No false successful logout during DB failure |
| RLS/ACL/ownership/audit isolation and atomicity | PASS real PostgreSQL | [sql-final.log](sql-final.log): 28/28; [catalog.log](catalog.log). All five tables FORCE RLS; no runtime role owns a table or bypasses RLS |
| Persistence | PASS isolated database | Actual independent psql/pg connections retain records, encrypted test token state and revocation. App restart is simulated by independent clients; no actual hosted BFF restart test |
| Migration conflicts/recovery/reapply | PASS real PostgreSQL | SQL 24, 27 and post-suite disposable cleanup/reapply. Existing-object collision aborts rather than overwrites |
| Actual `pg` connection and TLS verification | PASS isolated | [wire-final.log](wire-final.log): dedicated session_user, certificate validation/rejection, transactions and ACL denials. Local fixture uses trust authentication; provider SCRAM/credentials NOT RUN |
| Startup disablement | PASS | [startup.log](startup.log): actual Node subprocesses; development 503 and production refusal |
| `/owner` UI / accepted `/#/admin` routing | PASS isolated browser | [browser-final.log](browser-final.log), [screenshots](browser/). Fake owner service, Chromium localhost; expiry retains draft in memory, step-up requires manual save, logout clears draft |
| Nine-game gameplay and Crash manual/auto cashout | PASS smoke | [gameplay.log](gameplay.log), [screenshots](gameplay/). Crash, Dice, Mines, Roulette, Blackjack, Baccarat, Plinko, Keno, Wheel. Optional Google Fonts proxy failure persists; fallback fonts functional |
| Selected secret/client canary scan | PASS scoped | [secrets-scan.log](secrets-scan.log). Synthetic server-only build canary absent from client; selected key/JWT/credential formats absent from changed source/evidence. Not a comprehensive secret audit |
| Real Supabase identity/TOTP/AMR/refresh/logout/disablement | BLOCKED | Direct project HTTPS proxy CONNECT 403 remains the prior known blocker; no repeated diagnostic. No real identities/MFA or provider modification authorized in this task |
| Hosted PostgREST/RLS/gateway/persistence and direct-RPC attacks | BLOCKED | Needs separately approved migration, gateway login/configuration and real provider test phase |
| HTTPS/Safari, multi-instance proxy/limits, backup/key rotation | NOT RUN | Required before activation; local Chromium/TLS database checks are not substitutes |
| Full dependency/independent release security audit | NOT RUN | Selected source checks and local tests do not establish release acceptance |

## Security review matrix

Severity describes the failure if the affected design were activated. Corrections remain local until hosted tests prove them.

| Finding | Severity | Failure / exploit scenario | Exact correction | Evidence | Remaining risk |
|---|---|---|---|---|---|
| Multi-staff authority conflicts with owner policy | High | Second privileged account or self-selection becomes possible | Constant-PK singleton, operator-only provisioning/disable/recovery, no browser reassignment, no email/metadata authority | SQL 1–4, 12–15, 28; HTTP missing-route checks | Trusted operator identity/change process must be approved and tested |
| Direct bearer RPC bypasses BFF verification | High | Owner JWT alone continues RPCs during Auth outage, outside BFF Origin/CSRF/verification | Private gateway-only, short one-use request-bound permit plus independently checked actual user JWT and owner RLS | SQL 6–7, 17–18, 21, 26; wire denials | Hosted role topology/claims validation unverified; pre-issued permit has <=10-second residual |
| Longer app window cannot imply immediate external revocation | High / unresolved release gate | Provider JWT remains usable after external logout, or provider reissues tokens | Online verification every permit; 300-second JWT lifetime ceiling in BFF/SQL; local registry revocation; explicit conditional residual | Fake-provider external-logout test; SQL 10–11, 14 | Provider refresh AND MFA reissuance behavior unverified; bound requires owner acceptance and measurement |
| Refresh races and process-local sessions | High | Two processes reuse refresh material; delayed response restores logged-out session | Encrypted server-side token state, database row locks, immutable opaque cookie/session IDs, commit local close first | SDK concurrency; real SQL 18–20; actual pg transactions | Provider success followed by DB commit failure requires reauthentication; real provider races not tested |
| Idle and absolute expiry conflated / replay renewal | High | First use/activity/JWT refresh shifts hard expiry, or denied requests renew idle | DB wall time, fresh entry, idle starts at successful entry, immutable password-anchored eight-hour limit, no heartbeat, provider SID unique | SQL 8–16, 25–26 | Real signed AMR timestamp stability through refresh/MFA must be verified |
| Sensitive action uses stale MFA | High | Long-lived AAL2 authorizes later mutation without fresh challenge | SQL requires signed TOTP within five minutes for note creation; UI step-up then explicit manual save | SQL 16; browser step-up | Live TOTP/AMR/challenge behavior and factor removal unverified |
| Table-owning/BYPASSRLS definer or inherited privilege | High | SECURITY DEFINER silently escapes intended RLS | Dedicated non-login executor/operator, no table ownership/bypass/membership; FORCE RLS, fixed search_path, explicit EXECUTE revokes and narrow column grants | SQL 21–23, 28; catalog and wire | Migrator/DBA remains trusted; hosted default ACLs must be inspected |
| Missing lock policy made binding invisible to FOR SHARE | Medium availability | Legitimate gateway sees no owner and denies every login | UPDATE policy only constant singleton=1; UPDATE grant only constrained singleton column; authority fields remain unmodifiable | [binding-lock-diagnostic.log](binding-lock-diagnostic.log), final SQL 28 | Actual hosted role catalog still needs verification |
| Audit failure not atomic / forged actor | High | Data changes without durable attributable audit | Record/activity/permit/audit in one transaction; actor/session/record RLS and operator approval constraints | SQL 2, 22, 27 | DBAs can alter history; runtime append-only is not DBA-proof |
| Audience not included in permit boundary | Medium defense in depth | Critical claim set could omit target audience | SQL validates authenticated audience and binds it with other claims; BFF independently validates issuer/audience | Final SQL 11; pre-correction logs retained | Supabase JWT verification remains a hosted integration requirement |
| Broad connection or TLS URI override | High | Misconfiguration gives runtime postgres privileges or disables TLS | URI role/protocol/query checks, session_user assertion, certificate verification and bounded transactions | SDK config test; real wire TLS and role tests | Actual gateway login/CA/Supavisor compatibility not tested |
| Observed Auth rejection later becomes accepted again | High | Provider recovery reopens a previously rejected app session | On Auth401/app expiry, attempt durable close after rollback; no new activity on failure | Final SDK observed-rejection test; SQL tombstone cases | DB outage cannot persist revocation; response never claims successful invalidation |

## Failed evidence retained

- `sql-initial.log`: fixture race (`No such container`) before Docker readiness, not a migration result.
- `sql-first-run.log`: binding lock/RLS failure; `binding-lock-diagnostic.log` isolates visible SELECT versus invisible FOR SHARE. The narrow lock policy corrected it. `sql-second-run.log` passed 26 cases; later final suite has 28.
- `wire-initial-failure.log` and `wire-certificate-permissions-failure.log`: ephemeral local certificate ownership/directory permission failures. Fixed only the disposable fixture's file ownership/modes; TLS verification stays enabled. No private key is committed.
- `browser-initial.log`: the test expected a House Controls heading absent from the accepted routing. The owner chose to preserve the lobby fallback. `browser-breadcrumb-failure.log`: overly broad page-text comparison included different route breadcrumbs; corrected assertions verify lobby heading, nine game links and absence of owner content.
- `final-review.log`: initial staged-path assertion failed because Git recognized two exact archived-source renames; comparison with `--no-renames` includes both source and destination and passes. No source was lost.
- `before-audience-*` preserves passing SQL/catalog/wire evidence before the final audience check. `server-before-*` and `startup-before-complete-config.log` retain earlier narrower passes. All earlier Prompt 3 failed evidence remains unchanged.

## Reproduction and environment

Versions are in [runtime.log](runtime.log): Node 24.22.1, npm 11.9.0, Python 3.12.14, Docker 29.9.2 and Chromium 156.0.8078.79. Database was real PostgreSQL 17.12 from local image `postgres@sha256:846a7ddaa67a4b354ae1d21087b683901aa6113a4ed626d3787cfbf6c85e3e07`. No Auth schema exists in the SQL fixture. The migration is applied as the non-superuser `mc_migrator` CREATEROLE principal, not as the test harness superuser.

Commands executed for the applicable checks:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run build
npm run test:server
node --check server/app.js  # each server/*.js file was checked
TEST_PG_CONTAINER=mc-p3-owner python3 tests/owner/sql.py
node tests/owner/wire.mjs
python3 tests/owner/startup.py
node tests/owner/browser.mjs
node docs/evidence/prompt-03/owner-refactor/gameplay.cjs
python3 tests/owner/scan.py
```

Build ran with a clearly synthetic canary in server environment names; no actual provider credentials. The SQL test creates a fresh randomized database inside the named disposable Docker fixture and uses synthetic claims; it must never target the owner project. It exercises SQL grants/RLS/transactions, not Supabase signature verification. Tests use privileged fixture setup to control timestamps and inject failures; application roles do not have those setup powers. `catalog.log` records the exact read-only catalog command/database and migration hash is in `sql-final.log`.

The wire test requires a separate fresh local PostgreSQL container bound only at `127.0.0.1:65437`, with a temporary self-signed certificate for localhost/127.0.0.1 at `/tmp/my-casino-owner-wire/cert.pem`, private key readable only by its local PostgreSQL UID, and SSL enabled. It uses that public certificate as an explicit trusted CA and rejects the same endpoint without that CA. Its temporary gateway LOGIN is only a fixture change; the draft migration leaves NOLOGIN. Host authentication in this isolated fixture is trust, not proof of provider password authentication. Both fixture data directories are disposable tmpfs; cleanup/reapply scripts are destructive and never a production rollback recipe.

Browser scripts use the environment-installed Playwright and Chromium, with local Vite production preview on port 4173. Owner UI test injects a fake owner service on port 3004 and disabled service on 3005; no test account is created anywhere. Raw test output/screenshots and previous source snapshots are preserved. `tests/redesign/sql.py` now points to the archived ADR-002 migration so that historical tests do not misrepresent the current draft.

## Remaining acceptance and approvals

Prompt 3 remains **PARTIAL/BLOCKED**. Real identity/MFA, hosted permissions/RLS, end-to-end persistence and revocation are not verified. The owner-only draft is ready for architecture/security review, not application or activation. Approvals still required: exact provider migration; dedicated gateway login/credential/network configuration; explicit owner/test identity provisioning and TOTP enrollment; five-minute provider JWT setting; and acceptance of the conditional external-revocation and already-issued-permit residual. No deployment authorization is requested.

The immediate next step is review of ADR-003 and the concrete provider plan. After separate approval and restored supported connectivity, execute its live test plan. If immediate arbitrary external-provider session revocation remains mandatory, no supported guarantee has yet been established; keep the feature disabled. Future backup/key rotation/expired-token retention, shared rate limits, HTTPS proxy/Safari and operational recovery checks are release prerequisites. Stop at Prompt 3.
