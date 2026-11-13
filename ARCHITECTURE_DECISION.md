# ADR-001: Preserve the virtual casino; isolate demo staff configuration

- Date: 2026-11-13 UTC
- Milestone: Prompt 1/10 only
- Status: architecture selected; backend implementation and provisioning deferred to Prompt 3.
- Authority: [FINAL blueprint](docs/transfer/v2.0/01_MASTER_BLUEPRINT_FINAL_FA.md), [runbook](docs/transfer/v2.0/02_TEN_PROMPT_EXECUTION_RUNBOOK.md), [release gates](docs/transfer/v2.0/04_ACCEPTANCE_AND_RELEASE_GATES.md).
- Verified source base: `Paidguy/casino@0e2c5317d0004488ec234f20c58c1fcceba3b7a0`.
- Writable project: `https://github.com/jushkar/My-casino`, branch `codex/prompt-01-baseline`.

## Context and boundaries

Paidguy is a React 18 / TypeScript / Vite 5 / Tailwind application. The existing games, canvas/SVG graphics, audio and localStorage virtual-credit engine stay in place. Crash, Dice, Mines, Roulette, Blackjack, Baccarat, Plinko, Keno and Wheel are mandatory. Do not convert to Next.js or replace the game engines to add staff configuration.

The existing `#/admin` is unauthenticated educational House Controls. Its local `isAdmin` flag, bankroll buttons and browser storage provide no authorization. There is no current backend, database, staff login, wallet configuration API or financial ledger. `HashRouter` fragments never reach a server.

This design stores **demo configuration only**. Credits have no cash value and cannot be redeemed. It introduces no payment processor, blockchain RPC, live address, funding QR, signer, private key, on-chain monitor, payout or transferable balance. Existing cashier copy and excluded game routes are unresolved release blockers to remove in Prompt 2; this baseline is not release-ready.

## Decision: one small TypeScript BFF with managed Supabase Auth/PostgreSQL

Keep the Vite public SPA. Add one Node.js LTS / TypeScript **Fastify** backend-for-frontend (BFF), using supported releases selected and pinned during Prompt 3. Use **Supabase Auth** for staff identity/MFA and **Supabase PostgreSQL** for durable configurations, versions and audit. Use maintained Supabase server SDKs; never implement password hashing or a custom identity provider.

Deploy the SPA, `/staff/*` and `/api/*` behind one HTTPS origin when release is authorized. The BFF serves the staff entry only after session/role checks, and enforces authorization again on every staff API request. Public game assets remain static. GitHub Pages alone cannot host the BFF; do not mistake the inherited Pages workflow for a backend deployment option. No hosting vendor or billable resource is created by this ADR.

Request paths:

```text
Browser public games -> Vite assets + localStorage virtual simulation
Browser /staff       -> Fastify session + staff role/MFA gate -> staff UI
Browser /api/staff/*  -> Fastify session + role + CSRF + validation
                     -> Supabase user-scoped RPC -> PostgreSQL transaction
Browser /api/demo/*   -> optional sanitized read projection (no staff/audit data)
Fastify              -> Supabase Auth (verified identity + refresh/logout)
```

The game engine never grants staff privileges or writes the configuration database. `/staff` is a real HTTP path, not a supposedly secure `#/staff` link. Prompt 2 must relabel/isolate/remove legacy public House Controls and block unsupported direct game routes.

## Identity and session contract for Prompt 3

1. Invitation-only staff; disable public staff signup. Provision the owner through the authorized provider interface. Store `staff_roles(user_id, role, active)` server-side; allow no self-assignment, browser writes or user-editable metadata as authority. Start with one `wallet_admin` role and authenticated non-staff users for 403 tests.
2. Use Supabase Auth with enforced TOTP MFA for privileged access (`aal2`); recovery and initial invitations use provider workflows. No password or secret values in chat or source.
3. Use `@supabase/ssr` with a per-request server client and server-managed cookies; no Supabase staff token handling in browser code or localStorage. Set every auth cookie/chunk `HttpOnly`, `Secure` in HTTPS, `SameSite=Lax`, `Path=/`, no `Domain`. Respect provider token expiry. Do not cache staff HTML or authenticated responses.
4. Verify identity with the provider's server-side `getUser()` (not an unverified `getSession()` result alone), enforce session expiry/revocation and MFA, and check the current active staff role on **every** protected request. Define and test a 30-minute staff idle timeout and 8-hour maximum login age in Prompt 3; enforce server-side, never by a browser timer alone. Disable/revocation must immediately deny the next privileged operation. Logout revokes the provider session and expires all auth cookie chunks. Test refresh-token rotation and parallel refresh handling.
5. Every state-changing request requires a session-bound CSRF token and exact allowlisted `Origin`; reject missing/mismatched origins and cross-site requests. Login/callback flows require the auth flow's state/PKCE protection and fixed same-origin redirect targets. GET is read-only. Use JSON content types and strict body limits. No permissive credentialed CORS.
6. Rate-limit login/MFA and writes by account/IP as appropriate. Return 401 for absent/invalid/expired identity, 403 for authenticated non-staff or insufficient MFA/CSRF, 400 for invalid bodies, and 409 for stale revisions/idempotency conflicts. Do not expose provider internals in errors.

Runtime access to PostgreSQL uses the authenticated user's JWT and Supabase Data API/RPC, **not a service-role bypass**. Provider URL/publishable key and any privileged provisioning/migration credentials remain in server/environment settings; never put privileged keys in `VITE_*` variables. Runtime should not require a service-role key. Privileged migration credentials are separate from the running API and never shipped to a client.

## Data model and invariants for Prompts 4–5

Canonical route identity is an immutable enum/check plus unique `(asset, network)`:

| Asset | Network | Stable ID |
|---|---|---|
| BTC | Bitcoin | `BTC/bitcoin` |
| ETH | Ethereum native | `ETH/ethereum` |
| USDT | Ethereum ERC-20 | `USDT/ethereum` |
| USDT | BNB Smart Chain | `USDT/bsc` |
| BNB | BNB Smart Chain native | `BNB/bsc` |
| SOL | Solana native | `SOL/solana` |
| GRAM | TON native | `GRAM/ton` |

Use only these seven seeded routes. Never merge the two USDT networks. Labels follow the final blueprint; no token contracts or live-chain metadata are needed for a mock.

- `wallet_routes`: stable ID, current address-version reference (nullable), revision, display-enabled, demo deposit/withdraw preview toggles, min/max virtual units, platform-fee basis points, separate network-fee preview policy, updated actor/time. All transfer execution remains disabled irrespective of preview toggles.
- `wallet_address_versions`: immutable ID, route FK, increasing route-local version, synthetic identifier, created actor/time/reason. Unique `(route_id, version)` and composite references prevent cross-route pointers. Start at no address or `DEMO_*` fixture only.
- `wallet_route_revisions`: immutable snapshot of every config change, including selected version and lifecycle (`active`, `disabled`, `archived`) plus old/new references. Historical address payloads never change; retirement/archive is represented by later revisions. Archive never deletes audit or version rows.
- `admin_audit`: append-only event ID, authenticated actor UUID, server timestamp, action, route ID, reason, old/new revision/version references and request ID. Actor/time are derived server-side, never trusted from the request body. Avoid tokens, passwords and unnecessary personal data.
- `mutation_requests`: actor + idempotency key + request hash + stored result, unique per actor/key. A replay with the same payload returns the original result; a changed payload with the same key is rejected.

Accept a narrow bounded identifier such as `^DEMO_[A-Z0-9_]{1,48}$` in both API and DB constraints. The underscore-bearing format is not a live receiving address. Reject URLs, whitespace, QR payloads and arbitrary blockchain-address strings. No generator for real wallets. Use bounded nonnegative integers for virtual limits/fees, `min <= max`, and bounded fee basis points; never suggest these are a financial ledger.

Each mutation is **one PostgreSQL transaction**: validate staff identity/role, lock route, compare expected revision, validate input, allocate a new version when replacing, append config revision + audit + idempotent result, advance pointer/revision, then commit. Missing or stale expected revision rejects the whole operation with 409. Concurrent replacements must produce one winner and one conflict; retry requires a refresh. A rollback leaves no partial pointer, version or audit event.

## Database authorization and API shape

Enable RLS on exposed tables and remove direct INSERT/UPDATE/DELETE grants from anonymous and authenticated API roles. Staff role administration and raw audit data have no public access. No browser should obtain a staff JWT from the frontend bundle.

Expose narrowly granted read and mutation RPCs. Where definer rights are required to perform the atomic write despite denied direct table writes, use a dedicated least-privilege NOLOGIN function owner, fixed `search_path`, fully qualified names, no dynamic SQL, revoked default PUBLIC execution, and explicit authenticated-user/active-role/MFA checks **inside every function**. Do not rely on the BFF alone: direct anonymous/non-staff RPC calls must also be denied. Functions may not accept a caller-supplied actor as authority. Test the migration's grants and RLS with real anonymous and user clients. Document definer/RLS bypass behavior before enabling an endpoint.

Planned BFF endpoints (not implemented):

- Auth: login, MFA challenge/verification, logout; fixed callback route if required by the selected provider flow.
- `GET /api/staff/wallet-routes` and `GET /api/staff/wallet-routes/:id/history`.
- `POST /api/staff/wallet-routes/:id/addresses` to add/replace with a new version.
- `POST /api/staff/wallet-routes/:id/disable` and `/archive`.
- `PATCH /api/staff/wallet-routes/:id/settings` for preview settings.

Route IDs contain `/`: encode IDs safely or use separate allowlisted asset/network path parameters; never accidentally route both USDT configs to the same record. Every staff read/write requires authorization. No physical-delete endpoint. Optional public projection exposes only enabled demo labels/IDs and explicit no-funding text, never staff identity, audit or provider credentials.

## Threats and required evidence

| Threat | Design control | Required negative/behavior test |
|---|---|---|
| Public House Controls mistaken for staff access | Separate HTTP `/staff` + server checks; remove/relabel legacy page | Anonymous direct staff page/API denied; public route cannot mutate DB |
| Forged localStorage/role metadata, IDOR | Provider identity + authoritative active role + DB authorization | 401 missing/expired identity; 403 non-staff on every endpoint/RPC |
| Session theft, revocation lag, CSRF | HttpOnly secure cookies, provider validation, short staff session, CSRF/Origin checks, MFA | Logout/disable/expiry/refresh races; wrong/missing Origin/token denied |
| Lost updates or replayed replacement | Row lock + expected revision + idempotency in one transaction | Parallel edits, replay, changed-payload key conflict, transaction rollback |
| Silent history loss or unaudited direct writes | Immutable versions/revisions; restricted grants and RPCs | Direct table writes/deletes fail; all mutations retain before/after audit |
| Live funding or ambiguous UX | DEMO-only DB/API constraints; disabled real operations | Real-looking address/URL rejected; no payable QR, wallet link or transfer call |
| XSS/input/redirect abuse | Schema allowlists, React text rendering, CSP, fixed redirects, no raw HTML | Oversized bodies/HTML/URLs rejected or safely rendered; no open redirect |
| Service key or logs leak | Server-only env, least privilege runtime, redacted logs | Inspect built client assets and errors; no privileged credentials/tokens |
| Public demo accidentally deployed from baseline | Work on feature branch; do not push main/dispatch Pages workflow | Review workflow triggers; no deployment performed |
| Broken games hidden by successful compilation | Preserve game sources; scoped browser QA in Prompt 2 | All nine direct routes, Crash bet/cashout/animation, mobile checks |

No row in this table represents an executed security test in Prompt 1. Build/typecheck evidence is separate and does not establish gameplay, fairness or authentication correctness.

## Operational requirements, approvals and tradeoffs

Supabase consolidates established identity and relational storage; PostgreSQL transactions fit version/audit consistency. A small BFF gives explicit HTTP denial semantics and keeps staff tokens off browser JavaScript. This adds one server process and a managed dependency; localStorage-only staff state cannot meet durability/authorization requirements. A new full application framework or a money ledger is unnecessary.

Provider/project ownership, invitations, region, free-tier limits, supported SDK versions, backup retention and any costs are **not verified**. No Supabase connector/project or hosting identity is available in this session's tools/status. Architecture is selected conditionally on authorized service access; Prompt 3 must obtain the minimum provider authorization through product settings and confirm budget before provisioning. Never request credential values in chat. If access is unavailable, keep the backend/staff unexposed and report BLOCKED; do not silently substitute an insecure mock or another stack.

Development, test and eventual demo deployment must use separate configuration/data. Before release: versioned SQL migrations, seed exactly seven demo routes, backup/export and restore rehearsal, migration rollback/recovery procedure, redacted audit/health logs and HTTPS/security headers. Roll back frontend/API to a known source commit; take a DB backup before migration and test compatibility/recovery. History is never deleted to undo an address replacement: append a corrective revision. No Redis/queue is required for this demo.

The inherited CI deploys Pages on pushes to `main` or manual dispatch; it must be changed to a non-deploying validation workflow before any future merge to main. This prompt commits to the feature branch only, does not dispatch Actions, and does not deploy.

## Acceptance and next boundary

Prompt 1 accepts verified source/permissions, recorded baseline build/typecheck, source/license/route inventory, this architecture and committed execution state. The current source has release-blocking cashier copy, unsupported routes, no secure staff backend and no executed browser/security tests. No release is accepted.

Prompt 2 alone: minimal My Casino branding, nine approved games preserved, excluded routes blocked, legacy House Controls isolated, all apparent real funding/withdrawal claims/QR removed or disabled, then build/typecheck and desktop/mobile/Crash browser evidence. Backend implementation starts only in Prompt 3 after provider access is resolved. Stop after Prompt 1 in this task.
