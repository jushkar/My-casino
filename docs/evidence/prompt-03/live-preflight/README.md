# Prompt 3 live preflight — PARTIAL / BLOCKED

2026-11-15 UTC. Repository `jushkar/My-casino`; branch `codex/prompt-03-staff-foundation`; verified starting local/remote HEAD `c68fd73134dda5a58255969729b83612ccb71dd1`. Accepted Prompt 2 SHA `879977e43db29eea8de20b5255c0404f09f8eb19` remains an ancestor. Starting worktree was clean. [Repository preflight](repository-preflight.log), [exact changed paths](changed-files.txt).

**Connectivity restoration was not confirmed.** One bounded, deliberately unauthenticated request from the actual execution environment failed at proxy CONNECT. Following the owner's explicit stop condition, no further hosted SQL/Auth/network tests were performed. The concurrently requested authenticated connector metadata did confirm the intended project. Local tests and documentation work continued; no provider writes or activation occurred.

## Connectivity and identity

[Raw sanitized diagnostic](connectivity.json), observed at 2026-11-15 20:05 UTC:

| Layer | Result | Observation |
|---|---|---|
| Local target DNS lookup | FAIL | `socket.gaierror: [Errno -3] Temporary failure in name resolution` |
| Proxy CONNECT to expected HTTPS host | FAIL | CONNECT status 403; curl exit 56 |
| Exact network error | FAIL | `curl: (56) CONNECT tunnel failed, response 403` |
| TLS/certificate verification | NOT RUN | Tunnel was rejected before target TLS. Curl's default `ssl_verify_result=0` is **not** a successful TLS check here |
| Target HTTP response | NOT RUN | HTTP 000: no response from the Supabase endpoint, neither provider 401 nor provider 403 |
| Runtime authenticated Supabase access | BLOCKED | No API key/token/cookie supplied; no authenticated request attempted |
| Authenticated connector project metadata | PASS, read-only | Expected id/ref `ymgbvbocajthwhrljadn`, name `my-casino-dev`, region `us-east-1`, status `ACTIVE_HEALTHY`; [identity evidence](project-identity.json) |

The request used curl with config-file loading disabled (`-q`), HTTPS only, a ten-second connect limit, twenty-second total limit, no retries/redirects, body discarded and only numeric connection/status metrics returned. No verbose headers, proxy values, credentials or cookies were printed. The target was exactly `https://ymgbvbocajthwhrljadn.supabase.co/auth/v1/health`.

CONNECT 403 proves the active proxy refused the tunnel. It does not identify the specific allowlist rule, policy layer or configuration propagation issue; those controls are not visible here. Local DNS failed independently, although a CONNECT proxy can perform target resolution itself. This is not evidence of a Supabase Auth failure or a TLS-cipher failure. Connector/public-docs access runs on separate infrastructure and is not a successful runtime connection.

**Smallest next configuration action:** the environment administrator should verify that the intended rule is applied to this active Codex runtime and permits CONNECT to the exact project hostname on port 443 through the approved proxy. Resolve runtime DNS if required by that topology. Keep TLS verification intact. No proxy bypass, wildcard network opening, Supabase setting change or credential disclosure is needed to diagnose this failure. No environment policy was changed here and the failed project request was not repeated.

## Hosted PostgreSQL and privilege assessment

The metadata connector reports database version **17.11.0.019**, engine **17**, release channel **ga**. This is control-plane metadata, not `SELECT version()` or a test of the migration. The draft's PostgreSQL 16+ membership syntax is consistent with the reported major version, but local PostgreSQL 17.12 success does not prove hosted 17.11 compatibility.

| Hosted check | Status | What is established |
|---|---|---|
| Project identity/health/version metadata | PASS | Narrow metadata described above only |
| SQL server version and SQL execution principal | NOT RUN / NOT VERIFIED | Stopped after runtime connectivity failure |
| Existing application schemas/tables/functions and data conflicts | NOT RUN / NOT VERIFIED | No hosted catalog or application row query |
| Migration history or draft-name collision | NOT RUN / NOT VERIFIED | Historical empty-project reports are not current evidence |
| CREATEROLE, role transfer, SET/INHERIT/ADMIN, ownership | NOT RUN / NOT VERIFIED | No experimental DDL or role change used to prove permission |
| Default ACLs, memberships, BYPASSRLS, schema CREATE | NOT RUN / NOT VERIFIED | Need fresh catalog results; custom default grants may differ from local fixture |
| Data API exposed schemas and public RPC grants | NOT RUN / NOT VERIFIED | Neither database GUC hints nor a healthy project would alone prove the running PostgREST configuration |
| Hosted RLS/function behavior | BLOCKED | Proposed objects not tested on hosted provider |
| Dedicated gateway login/direct or session-pool TLS | BLOCKED | Actual endpoint, CA, username/session_user and authentication have not been verified |
| Auth/JWT/MFA configuration | NOT VERIFIED | No setting read/change; available connector tools have no dedicated Auth configuration reader. Do not dump general settings to search for secrets |

A [prepared metadata-only SQL script](../../../../tests/owner/hosted-preflight.sql) lists version, relevant roles/memberships, owners/ACLs, collision objects, default privileges, RLS metadata, selected nonsecret Data API settings and event-trigger metadata. It wraps SELECTs in a read-only transaction. It does not read Auth rows, role passwords, settings containing secrets, SQL function bodies, policy literal expressions, user data or connection strings. It was executed only in isolated PostgreSQL to check the query itself ([result](prepared-query-isolated-check.log)); it is **not hosted evidence**. Migration-history metadata and actual exposed-schema/Auth configuration still require separate supported inspection after the connectivity gate succeeds.

## Architecture and direct-RPC review

The application and migration are unchanged in this continuation. Review reconfirmed singleton operator-bound authority, no public self-enrollment or secondary app administrator, protected `/owner`, accepted `/#/admin` lobby fallback, password/TOTP entry, 30-minute idle/eight-hour immutable maximum, fresh TOTP for note writes, durable local revocation, no managed Auth table dependency, no service key and no bypass-RLS runtime connection. Startup stays hard-disabled and production refuses to run.

The gateway has only the five session/permit functions. In the real isolated fixture it cannot read raw tables, provision/reassign the owner, execute the owner RPC alone, inherit other roles or bypass RLS. The public RPC requires the current owner plus matching AAL2 JWT claims, application session and unused request-bound permit. Actual PostgREST must independently verify the bearer token; SQL claim injection in tests does not prove that step.

**Gateway qualification:** it is a trusted BFF attestor, not a JWT verifier. A gateway credential can submit synthetic claim JSON for the already-bound owner and create pending state/audit/permits. It cannot create a new binding or cryptographically valid provider JWT. New SQL test 29 explicitly demonstrates accepted pending state followed by denial of gateway-only and non-owner execution. A gateway credential plus a matching valid owner JWT could bypass online BFF verification, and gateway-only compromise can forge pending audit or deny service. Credential custody and this trust assumption need explicit owner/security review. Do not describe the gateway as incapable of synthesizing any owner-related state.

The public SECURITY DEFINER RPC is an explicit, narrowly controlled exception to Supabase's guidance favoring invoker functions and avoiding exposed definer helpers. Isolated ownership/ACL/RLS tests support this proposal; hosted default ACLs, private-schema exclusion and authenticator membership still need verification. This continuation does not approve or weaken that architecture. See [ADR-003 amendment](../../../decisions/ADR-003-single-owner-boundary.md) and [official compatibility review](documentation-review.md).

## Auth, JWT and revocation analysis

Five-minute JWT lifetimes are documented as supported; the actual project TTL is NOT VERIFIED and was not changed. The BFF/SQL ceiling remains 300 seconds. Password and TOTP AMR timestamp behavior, AAL2 stability, token reissuance following MFA, refresh reuse exceptions and actual external logout/disable/factor-removal results require real authorized identities. No identity was created, signed in, enrolled or challenged.

App logout/disablement is distinct from provider logout, expiry and user disablement. Local registry tombstones are tested in isolated PostgreSQL; real provider revocation is not. The proposed residual bound is the remaining <=300-second JWT lifetime **only if** the provider refuses subsequent refresh and MFA reissuance for externally revoked sessions. If that condition fails, no five-minute bound is established. An already-issued permit can authorize its exact operation within ten seconds, subject to JWT/application expiry; this does not add ten seconds beyond JWT expiry. Already-authorized work is not retroactively canceled.

Cross-instance refresh is serialized by database row locks and committed encrypted state in the design. Fake SDK tests and real SQL locking test those components separately. Provider-success/DB-commit-failure recovery, real refresh races and cross-instance hosted behavior remain BLOCKED. Do not equate the SDK's documented reuse exceptions with a successful recovery guarantee.

## Tests actually run

| Category | Check | Result | Evidence |
|---|---|---|---|
| Real hosted read-only | Project metadata/identity | PASS | `project-identity.json` |
| Real execution environment | Supabase HTTPS / local DNS | FAIL | `connectivity.json`; provider-dependent work stopped |
| Real hosted catalog | Privileges, RLS, migration conflicts, settings | NOT RUN | Stop condition; NOT VERIFIED |
| Local dependencies | Clean `npm ci --ignore-scripts --no-audit --no-fund` | PASS | `clean-install.log` |
| Local frontend | Typecheck/production build | PASS | `typecheck.log`, `build.log` |
| Simulated Supabase | Backend SDK/HTTP security suite, 17 tests | PASS isolated | `server.log`; ephemeral signing keys/fake provider/repository |
| Local backend | All server JS syntax and disabled entrypoints | PASS | `syntax.log`, `startup.log` |
| Backend TypeScript/bundling | Not configured for the existing JS server | NOT RUN | No backend TS compilation/build claim |
| Real isolated PostgreSQL 17.12 | 29 security cases: owner singleton/denial, RLS/grants, expiry, concurrency/replay, direct-RPC and gateway boundary, audit, migration conflicts/recovery/reapply | PASS | `sql.log` |
| Real isolated PostgreSQL | Ownership/ACL/RLS catalog; prepared read-only queries | PASS isolated | `isolated-catalog.log`, `prepared-query-isolated-check.log` |
| Local source/evidence | Selected secrets and synthetic server-only client canary | PASS scoped | `secrets-scan.log`; not a comprehensive audit |
| Public gameplay | Nine-game browser regression this continuation | NOT RUN | Application, migration, dependencies and public source unchanged; prior [nine-game PASS evidence](../owner-refactor/gameplay.log) preserved, not counted as a new run |
| Real hosted integration | Owner/non-owner identity, TOTP, refresh/logout, actual Data API denial, persistence | BLOCKED / NOT RUN | Network and explicit provider-change/identity approval gates |
| Native hosted DB / HTTPS browser | Dedicated-role TLS/password login; Safari/proxy/multi-instance tests | NOT RUN | No alternate connection attempt after network stop |

Commands and exit codes are in individual logs. SQL uses a fresh network-isolated disposable container `mc-p3-live-preflight`, pinned image `postgres@sha256:846a7ddaa67a4b354ae1d21087b683901aa6113a4ed626d3787cfbf6c85e3e07`, tmpfs database, synthetic principals/claims and no Auth schema. The migration runs as a non-superuser CREATEROLE fixture principal. Fixture setup has privileges that runtime roles do not possess. These are real PostgreSQL tests, not live Supabase tests. Earlier evidence and failed attempts remain intact.

## Proposed hosted changes and approval gates

**No hosted changes were applied.** The [exact existing draft and recovery plan](../provider-change-plan.md) remain proposed. No migration edit was needed for this local preflight. The following items are a checklist, not bundled authorization:

- [ ] First restore supported runtime connectivity and finish the already-authorized read-only catalog/configuration preflight. Confirm the same project, exact history/default ACLs and absence of conflicting applied versions. Stop on any mismatch.
- [ ] Review/approve the exact migration hash and affected objects: `mc_owner_private`, five tables, fourteen RLS policies, thirteen functions including public `owner_action`, and three narrow roles. No managed Auth change. The gateway remains NOLOGIN in the draft.
- [ ] Approve a verified backup/restore and migration-runner plan, checking PostgreSQL 17.11 permissions and transaction behavior. The isolated destructive cleanup script is not a hosted rollback recipe.
- [ ] Separately approve dedicated gateway LOGIN/credential and supported direct/session-pool endpoint, verified TLS/CA and restricted connectivity. No grant to authenticator/authenticated, no table access, no role inheritance/BYPASSRLS. Secret delivery must use an approved secret store, never chat or evidence.
- [ ] Separately approve one privately provisioned owner identity and a non-owner test identity, password/TOTP enrollment and recovery-material custody. The operator must verify the owner UUID and record a specific provisioning approval. No public signup/first-user/email-based elevation.
- [ ] Inspect then separately approve a 300-second provider JWT setting if needed, plus any required password/TOTP/sign-up configuration. Record prior values and effect on existing clients; never disable rotation safeguards to pass tests.
- [ ] Explicitly accept or redesign the gateway-attestor/public-definer trust assumptions and conditional external-revocation/in-flight residual, after actual live measurements.
- [ ] Authorize only the enumerated development integration scenarios in the provider plan. Keep normal startup disabled; use a separately reviewed test harness and securely supplied credentials. No deployment is part of that test approval.

Rollback prerequisites: establish restorable backup and operator access first; abort a failed transaction instead of weakening grants; preserve audits/tombstones/data after any successful live test; prefer reviewed forward correction over destructive teardown once populated. Credential compromise requires revoking the narrow gateway login/rotating its credential and disabling the app owner through an approved operator procedure. Auth-setting recovery restores recorded prior values with explicit review. Recovery of the owner binding requires disablement, expected-old-UUID verification and audited operator-only reassignment. None was executed.

## Decision and next action

**PARTIAL/BLOCKED, not ready to begin a write-enabled live test phase.** High-priority release blockers remain: unverified hosted privilege/RPC boundary and provider session/MFA/revocation behavior, plus unresolved gateway trust acceptance. No new Critical runtime defect was demonstrated by this limited local review; this is not a claim that hosted security has no Critical/High defects.

The smallest next action is correction/confirmation of the active Codex proxy policy for the exact project endpoint, then a bounded recheck and the already-authorized read-only preflight. A write approval request would be premature while the connection and hosted privilege gates remain unresolved. No migration, role/grant change, Auth/JWT/MFA setting, identity provisioning, `/owner` activation, deployment, main merge or Prompt 4 occurred.
