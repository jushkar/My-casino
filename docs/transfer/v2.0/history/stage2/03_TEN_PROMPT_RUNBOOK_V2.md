# MY CASINO — Ten-Prompt Execution Runbook v2 (STAGE 2 DRAFT)

Prepared 2026-11-13. Run **only after** Stage 3 final handoff, in destination Work/Codex with user-authorized GitHub and hosting access. Ten messages is a planned **milestone budget**; Work may perform many tool actions inside one prompt. No auto-model switching: choose the available model manually in UI before starting each milestone. **Do not execute this runbook during transfer review.**

## Definition of success — NOT real-money casino

Verified HTTPS **virtual-credit-only** My Casino site: Paidguy presentation, Crash + eight more approved games, basic branding, no live payment, protected staff-only address-management demo with seven configuration routes, reliable add/replace/disable/archive + audit trail in server storage, passing mandatory checks, and a reproducible tagged commit/rollback path. Any unmet gate returns an honest blocker, not a fabricated URL. A 24-hour demo is aspirational and conditional. A real-currency launch remains a separate, licensed/audited project.

## Cross-prompt execution contract (add to every prompt by reference)

> Read `02_MASTER_CONTEXT_V1_5.md` and the project state log if not already cached. Operate only on the current writable fork and documented project paths. No real-money functionality or wallets. Do not introduce live crypto addresses, private keys, API keys in source/chat, on-chain transfers, scannable QR, or cash redeemability. Prefer existing audited code, preserve license notices. Use smallest safe change; execute tools and tests rather than just writing plans. After completing this task write/update `EXECUTION_STATE.md` with base/head commit, modified paths, commands/checks actually run with status, artifacts/screenshots, unresolved blockers, acceptance verdict, input for next prompt. Do not claim a test passed without log evidence. Stop and report for missing permissions, secrets, severe findings or authorization barriers. No unapproved deployment.

## Optimized ten steps

| # | Choose model | Main task | Must-have evidence / gate |
|---|---|---|---|
| 1 | **GPT-6 Astra** | Repository baseline, fork/write permission, dependency/license audit, source pin; deployment and hosted auth/database selection | Commit SHA, tree/route inventory, build/typecheck results, written solution decision; block on missing permissions |
| 2 | **GPT-6.1 Terra** | Paidguy minimum branding, virtual credits notice, Crash + 8 game routes, disallow unwanted games and misleading old payment UX | Build; screenshot; functional route smoke; no real cash wording/payment |
| 3 | **GPT-6.1 Sol** | Secure staging backend skeleton: trusted hosted auth, session, admin role + Postgres and protected API; **do not publicly expose until gate** | 401/403 negative tests, no secrets in client, persistent admin session, migrations |
| 4 | **GPT-6.1 Sol** | Seven-route demo data model, strict server validation, revisioned immutable history, test fixtures | Schema checks for asset+network IDs, duplicate/revision rejection, forbidden API tests |
| 5 | **GPT-6.1 Sol** | Admin wallet configuration endpoints (add/replace-as-version/disable/archive), toggles and fee limits, append-only audit | API integration, concurrency/replay/stale update/role tests, audit record check |
| 6 | **GPT-6.1 Terra** | Protected staff Wallet Management UI bound to server API, responsive forms/table/history/feedback | Real browser staff flow and unauthorized flow, build, mobile screenshot |
| 7 | **GPT-6.1 Terra** | Safe public mock wallet screens showing seven route labels; Deposit and Withdraw disabled, no real addresses; promo/event shell ONLY if time | User test: no spendable value, no QR or live payment, no false withdrawal success |
| 8 | **GPT-6.1 Sol** | Full test pass and bug fixes: all approved games, Crash, admin, auth, routing, responsive, performance smoke | Reproducible test logs, typecheck/build, negative auth/API, address version, clean report |
| 9 | **GPT-6 Astra** | Independent-in-workflow architecture/security second pass (distinct from external professional audit); prioritize remediation | Findings with file/line evidence, proven fixes, no unresolved public-demo High/Critical flaws |
| 10 | **GPT-6.1 Sol** | Approved HTTPS deploy, verify URL, public smoke and rollback, final report; if any gate fails do not publish | Verified link, commit/ref, smoke and configuration evidence; otherwise blocker report |

## Copyable per-prompt task bodies

### Prompt 1 — Astra: baseline and decision record
```
Implement step 1/10 of the My Casino handoff. Read the Stage-3 final transfer files; treat Stage-2 runbook as a candidate if Stage-3 not present. Retrieve official Paidguy source https://github.com/Paidguy/casino through authorized GitHub and establish a USER-OWNED WRITABLE fork/repo; do not try to push to upstream. Record exact original commit SHA. Inspect license/assets/dependencies, game and admin routes, client-side wallet, builds and scripts. Execute safe baseline build/typecheck in a disposable environment. Decide ONE minimal safe backend/auth/database approach for virtual demo (trusted hosted service acceptable), with access/budget blockers stated. Provide `ARCHITECTURE_DECISION.md`, `EXECUTION_STATE.md`, risk log and evidence. Do not build casino payment systems. Gate: verified base and authorized write path, successful baseline checks or precise blocker.
```

### Prompt 2 — Terra: scoped front end
```
Step 2/10. Using the locked repository baseline and state log, minimally brand Paidguy as My Casino. Preserve Crash plus Dice, Mines, Roulette, Blackjack, Baccarat, Plinko, Keno, Wheel; keep optional Coinflip/Andar Bahar only if they pass smoke tests. Remove navigation and direct access for Slots, Teen Patti, poker-like games and Matka; avoid rewriting game engines. Clearly label all play-money values as nonredeemable VIRTUAL CREDITS. Remove/hide misleading UPI/Paytm/IMPS simulated cash deposit and withdrawal claims. Preserve upstream license. Run build/typecheck and screenshot mobile/desktop; report routes tested and update state.
```

### Prompt 3 — Sol: secure admin foundation
```
Step 3/10. Implement the selected minimal server-backed staging solution, database and a trusted admin identity/session mechanism. Enforce server-side authorization on every staff endpoint; differentiate legacy public House Controls from new staff management route. Keep the staff interface unpublished/private until anonymous and non-admin requests are demonstrably denied. Never ship privileged DB/service role keys in frontend bundles. Add permission-negative tests and migration instructions. User must connect services/approve permissions through interface; do not request passwords in chat. Update state with actual tests.
```

### Prompt 4 — Sol: demo configuration schema
```
Step 4/10. Implement durable demo-only records with a unique `(asset, chain)` combination for BTC/bitcoin, ETH/ethereum, USDT/ethereum, USDT/bsc, BNB/bsc, SOL/solana and GRAM/ton. Add independently configurable deposit/withdraw flags, fee and min/max rules, address version records, revision/updated_by, and append-only audit events. Fixtures MUST be invalid for live payments (`DEMO_*` identifiers), without QR codes; production-only address format checks are explicitly out of scope. Prevent duplicate active logical versions or stale overwrite. Write migration/schema/authorization tests and record results.
```

### Prompt 5 — Sol: API and audit
```
Step 5/10. Add fully authorized backend endpoints for manual add, replace-by-new-version, disable, archive, read/history and route toggles/fee config. Never permanently delete historical records. Require reason and actor for sensitive changes; return safe failures for invalid inputs. Test anonymous access, role downgrade, stale revisions, races, replay, path manipulation, audit immutability and persistence. Only demo synthetic identifiers. Update state with endpoint contract and test logs.
```

### Prompt 6 — Terra: secure staff UI
```
Step 6/10. Use compatible existing table/form components to create a responsive staff-only Wallet Management dashboard for the seven routes. Connect it to protected server APIs: list, add, replace, disable, archive, history, toggles, fee/limits. Expose clear DEMO-only labels and robust loading/error states. Do not implement auth only in React or store secrets locally. Browser-test successful and denied operations plus mobile layout; document screenshots/evidence.
```

### Prompt 7 — Terra: user-facing demo shell
```
Step 7/10. Display six assets/seven paths as informative demo-only selectors, with Deposit/Withdraw nonoperational and conspicuously marked unavailable. DO NOT display live valid recipient addresses, copyable real address text, QR, chain transactions or claim transfers completed. If extra time remains, add nonfunctional preview of promo codes (10,000 user limit), zero platform fee toggle (network fee policy undecided), and events, but DO NOT delay core acceptance. Test no payment path is reachable and existing game routes still work.
```

### Prompt 8 — Sol: tests and bug fixes
```
Step 8/10. Run/build a reproducible QA matrix: typecheck/build, Crash + 8 approved virtual-credit games, mobile/desktop, admin session expiration, anonymous/non-admin direct API, versioning/archival, route config, concurrency and audit trail; inspect bundle for leaked sensitive values, unsafe dependencies and misleading cash flows. Fix verified bugs minimally. Produce machine-readable or linked logs and a PASS/FAIL checklist; do not mark skipped checks as passed.
```

### Prompt 9 — Astra: security release review
```
Step 9/10. Perform a fresh adversarial code/config review against the agreed virtual-demo threat model and OWASP ASVS relevant controls. Check unauthorized address writes, CSRF/session policy, injection/XSS, sensitive config leakage, auth bypass, old public /admin path, payment and cash-value confusion, upstream license and production flags. Document findings with exact files and reproductions; implement or assign validated fixes, rerun impacted tests. This is NOT a substitute for a paid independent audit before real money. Mark public deployment BLOCKED if unresolved High/Critical risk.
```

### Prompt 10 — Sol: controlled release
```
Step 10/10. Only if every release gate is met and the user grants hosting authorization, deploy the virtual-credit demo to a VERIFIED HTTPS URL. Check that admin is truly protected, no live crypto address/payment/withdrawal exists, Crash + 8 games operate, mobile layout works, and state persists. Capture actual URL, deployment status, pinned commit, smoke logs, rollback instructions and known limitations. If blocked, do not claim success: deliver a concise blocker/fix checklist and a private preview or reproducible local artifact if safe. Update final execution state.
```

## Acceptance test matrix (minimum)

- Game routes: `crash, dice, mines, roulette, blackjack, baccarat, plinko, keno, wheel` all navigate/play with nonredeemable credits.
- Client: no real deposits/withdrawals, no valid recipient addresses/QR, no live wallet SDK or hidden real-money feature flags; virtual-credit notice on critical screens.
- Staff API: 401 unauthenticated; 403 unauthorized role; authorized mutation requires appropriate session; audit all changes; no public data writes.
- Data: seven unique `(asset, chain)` routes; replace creates a new record, old stays retained/retired; disabled route not publicly advertised; race/stale revision guarded; archived data can be inspected historically.
- DevOps: repo and dependency provenance, license, build/typecheck, test logs, HTTPS and env isolation, rollback, no credentials in code/artifacts.
- If any gate is not proven, verdict is **NOT ACCEPTED**. No production payment flow within this runbook.

## Token/time optimization

- Astra x2 (steps 1,9), Sol x5 (3,4,5,8,10), Terra x3 (2,6,7), **subject to availability**. Avoid use of Astra for small UI copy changes. Use Sol when Terra repeatedly fails tests; don't insist on a fixed model if evidence shows it is inefficient.
- One short `EXECUTION_STATE.md` acts as a baton: current commit/PR, affected files, passed/failed tests, blockers, next task. Keep the master context as a stable file in repo/Work, do not paste full chat for every prompt.
- Tight task scope; parallelize independent static audit/asset review only when tools allow, never simultaneous edits to the same file/branch. Reuse well-maintained services for auth/data; no installing unvetted random repos. Prefer one backend stack and a single source of truth.
- If using ChatGPT Work/Codex, a "prompt" can cause multiple agent tool actions. Do not confuse prompt count with number of tool calls or elapsed time; stop for user approvals where needed.
