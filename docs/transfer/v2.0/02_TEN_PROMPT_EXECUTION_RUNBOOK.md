# MY CASINO — TEN EXECUTION PROMPTS (FINAL)

**These are the next TEN user prompts in destination Work/Codex — not ten tool calls.** Prompt #1 is supplied in full as `03_FIRST_PROMPT_COPY_PASTE.md`. Use the appropriate prompt body below for steps 2–10. Each task should actually modify/test code in the **same authorized writable repository**. Do not use this runbook in the old account for implementation.

## Shared operating contract — implicitly applies to every step
1. First read final `01_MASTER_BLUEPRINT_FINAL_FA.md` and `EXECUTION_STATE.md`; do NOT re-summarize the entire source history each time. The final docs outrank stage1/stage2 draft history.
2. **Scope = virtual-credit-only demo.** No crypto network, real addresses, transferable funds, real deposits/withdrawals, payout signer, payment API, live bets, or cashier claims. No secrets in messages, code, output or logs.
3. Work on the SAME user-owned GitHub repository, with pinned upstream base; smallest changes necessary. Reuse Paidguy game visuals/logic for demo. Preserve MIT and third-party notices. Do not replatform unnecessarily.
4. Actual Work/Codex actions are allowed only with authorized repository/environment access. Ask user to approve connections/hosting before privileged external actions; no credentials typed in chat. If inaccessible, perform safe available work and clearly mark blockers.
5. Every step ends with an updated and **committed** `EXECUTION_STATE.md` containing current HEAD/PR, files changed, implemented behavior, tests actually executed and logs, PASS/FAIL acceptance, security concerns, next task. Where writing unavailable, output patch/artifact plus BLOCKED instead of invented commit.
6. Do not hide failing build/tests, silently skip negative auth cases, or release unsafe admin endpoints. Failure means fix in the same Work session if reasonable; if impossible document why and carry NOT ACCEPTED.
7. The model is selected **manually in UI by user**, not by instructing the assistant to switch itself. Balance quality and usage; on failed scoped task upgrade to Sol/Astra instead of producing repeated speculative answers.
8. At prompt #10, deploy only after explicit approval and verified release gates. 10 prompts and a one-day target are aspirational; extra safety work/authorization may require more interactions.

## Model and effort routing (recommendation, confirm destination availability)

| # | Suggested Work/Codex model | Reasoning effort | Input to read | Output |
|---|---|---|---|---|
| 1 | GPT-6 Astra | Medium | Final package + Paidguy source | verified baseline, repo fork and ADR |
| 2 | GPT-6.1 Terra | Low/Medium | frontend routes + state | minimal branding & game UX |
| 3 | GPT-6.1 Sol | Medium/High | state + architecture | secured admin backend/auth/DB |
| 4 | GPT-6.1 Sol | Medium | schema + config | seven-route versioned data model |
| 5 | GPT-6.1 Sol | Medium/High | DB + auth | secure manual address CRUD/audit API |
| 6 | GPT-6.1 Terra | Medium | API contract + staff UI | protected staff dashboard |
| 7 | GPT-6.1 Terra | Low/Medium | public cashier + menus | nonpayable public mock display |
| 8 | GPT-6.1 Sol | Medium/High | test matrix/diffs | regression fixes and test evidence |
| 9 | GPT-6 Astra | Medium/High | focused security diff/logs | security audit & validated fixes |
| 10 | GPT-6.1 Sol | Medium | release checklist + state | authorized verified HTTPS deploy or blocker |

**Fallback:** If exact model unavailable, use best enabled model for the role: Astra → strongest available reasoning/coding model; Sol → strongest efficient coding model; Terra → efficient coding model. Never pretend account entitlement or a model switch. No fixed token price/usage guarantee. For efficient use, read narrowed files/diffs, run targeted checks early, keep one `EXECUTION_STATE.md`, and avoid repeatedly pasting the full context.

## Prompt 1/10 — Astra — verified baseline and fork
Use the exact text in `03_FIRST_PROMPT_COPY_PASTE.md` as the first user message. Gate: verified upstream SHA, authorized writable fork/branch, real build/typecheck result (or precisely documented environment blocker), license check, original route inventory and architecture decision selecting ONE backend/auth/DB approach; commit `EXECUTION_STATE.md` and ADR. Do not deploy. This can involve multiple repository actions within one user prompt.

## Prompt 2/10 — Terra — preserve and simplify game UI
**Copy as next message:**

> Execute MY CASINO step **2/10** using the FINAL master blueprint and latest committed `EXECUTION_STATE.md` in the same repository. Preserve Paidguy look and client-side virtual game behavior. Brand as My Casino with minimal changes. Keep **Crash, Dice, Mines, Roulette, Blackjack, Baccarat, Plinko, Keno, Wheel** (optional Coinflip and Andar Bahar after smoke tests); remove/hide unsupported Slots, Teen Patti/poker-like and Matka routes/menu. Existing public `/admin` House Controls must not pretend to be a secure staff system: relabel/isolate or remove appropriately. Replace all cash-like INR/UPI/Paytm/IMPS deposit and withdraw claims with clear **nonredeemable virtual-credit demo** messaging and disabled funding actions. No real addresses or QR. Run build/typecheck and browser route/Crash/mobile smoke tests, capture evidence and screenshots if possible, commit results and state. PASS only when no cash-value confusion or broken required games remain.

**Dependencies / risk:** step 1 fork and functioning baseline; templates often have hardcoded `₹` and dummy payment messages. **Gate:** all nine routes exist, Crash works, no live-looking payment UI; evidence and diff.

## Prompt 3/10 — Sol — protected admin foundation
**Copy as next message:**

> Execute step **3/10** on the pinned fork, using architecture decisions and `EXECUTION_STATE.md`. Implement ONE simple, maintained, server-backed admin auth + persistent demo database option; use established secure services/libraries rather than hand-building password storage. Create separately protected `/staff` (or equivalent) and server API, with admin role checks on EVERY privileged endpoint. Treat Paidguy's existing `/admin` as a public educational page, not an auth mechanism. Do not publish staff endpoints until denial tests pass. Require secure session management and appropriate CSRF protection. Keep all DB service credentials on server only, add migrations/deploy notes and negative unauthenticated/non-admin tests (401/403). Commit files, real logs and state; if user permission to connect backend is missing, request the minimum authorization and mark BLOCKED instead of faking setup.

**Dependencies / risk:** hosting/service access and architecture locked. **Gate:** real persistence + authenticated server-side denial tests + no secrets in frontend.

## Prompt 4/10 — Sol — seven-route demo data model
**Copy as next message:**

> Execute step **4/10** in the same fork. Model exactly seven canonical asset/network IDs `BTC/bitcoin`, `ETH/ethereum`, `USDT/ethereum`, `USDT/bsc`, `BNB/bsc`, `SOL/solana`, `GRAM/ton` with stable unique IDs. Add DEMO-only fields for receiving address identifiers (must start `DEMO_` and be **invalid on live chains**), version number, current/retired/archive status, deposit/withdraw enable flags, minimum/maximum and platform-fee demonstration settings, actor/reason/timestamps and append-only admin audit. Replacement generates a NEW version; old records are never hard-deleted. Use server-side constraints and stale-revision detection. No real address validators or on-chain integrations. Add migration and data-integrity tests, commit and update state. Gate: all seven unique configurations, correct versioning, audit evidence and controlled writes.

**Risk:** route conflation for two USDT chains, stale overwrites and silent delete. **Gate:** test duplicate rejection, version retention and revision collision.

## Prompt 5/10 — Sol — wallet CRUD API & access controls
**Copy as next message:**

> Execute step **5/10**. Implement protected, documented server endpoints for demo config listing, add, replace-new-version, disable, archive, settings (route flags, fees, limits) and read-only history. Validate every input server-side; authorize each request; log actor, action, reason and changed references. No physical deletion of history or live chain addresses. Test unauthorized 401/403, invalid data, repeat submits/idempotency where needed, stale revisions, concurrency, audit integrity and persistence across sessions. Show actual test logs and endpoint examples with `DEMO_*` placeholders only. Commit state and code; gate FAIL if anonymous writes or unlogged changes are possible.

**Dependencies:** steps 3–4. **Risk:** security bypass and lost history.

## Prompt 6/10 — Terra — staff wallet dashboard
**Copy as next message:**

> Execute step **6/10**. Using the EXISTING design tokens and one compatible maintained form/table component stack, build the responsive `Wallet & Address Management` **DEMO** staff UI for seven asset/network pairs. Connect to server-protected API. Include add, replace, disable, archive, route toggles, configurable fee preview, min/max settings and history; show confirmations, empty/loading/error states and warning before sensitive changes. Do not implement auth by only hiding a React route; do not ship private credentials or valid blockchain addresses. Test full authenticated browser workflow and anonymous denial on desktop/mobile. Commit and update state with screenshots and real test evidence.

**Dependencies:** step 5 APIs. **Risk:** client-only state pretending to be persisted and route leaks. **Gate:** durable data after refresh and denied unauthorized edits.

## Prompt 7/10 — Terra — safe public wallet demo and optional polish
**Copy as next message:**

> Execute step **7/10**. Create a public, **non-payable** informational wallet interface showing the six assets and seven distinct route labels. Deposit and Withdraw must be visibly disabled and explain **NO REAL MONEY / VIRTUAL CREDITS ONLY**. No live-address text, scannable funding QR, transfer submission, wallet connection, blockchain RPC or webhook. If all required features and tests already pass, optionally add strictly mock UI for bonus/promo max 10,000 distinct users, zero-platform-fee/network-fee explanation and events. Never slow the core demo for optional features. Run public/private UX checks, no-funding negative tests, and game regression. Commit evidence/state.

**Dependencies:** existing site, safe staff config. **Risk:** accidental funding or misleading payments. **Gate:** no usable payment action or realistic fund-claim text.

## Prompt 8/10 — Sol — regression and resilience
**Copy as next message:**

> Execute step **8/10**. Run a reproducible automated + browser QA matrix over all nine required game routes including Crash, virtual balance behavior, navigation/mobile, admin auth expiration/CSRF and 401/403, seven-route uniqueness, replace-as-version/history, concurrency/stale updates, config persistence and audit. Check dependency/security risks, secrets in client bundle, no real payment code path, license notices and disabled unsupported game routes. Fix verified bugs minimally, then rerun affected and full important suites. Record EVERY actual command/check and PASS/FAIL/SKIP with log artifact. Do not count a skipped check as passed. Commit and update `EXECUTION_STATE.md`.

**Dependencies:** all core features integrated. **Risk:** regressions between Paidguy and new staff code. **Gate:** no core acceptance failure or known unmitigated High/Critical issue.

## Prompt 9/10 — Astra — security + adversarial review
**Copy as next message:**

> Execute step **9/10** as a FRESH security reviewer, not relying on earlier optimistic developer claims. Review authenticated staff API, role escalation, CSRF/session, injection and XSS, state synchronization, audit integrity, stale/replay operations, provider secret exposure and public demo cash-value misrepresentation. Include file/line and reproduction evidence for each finding and propose/implement fixes within the authorized fork. Re-run affected tests and summarize unresolved risks ranked by severity, with an explicit RELEASE PASS/BLOCKED verdict. Check against relevant OWASP ASVS controls. This review is NOT a substitute for independent external production casino auditing. Update and commit state.

**Dependencies:** step 8 and source access. **Gate:** no unresolved known High/Critical public-demo risk and evidence of negatives/tests.

## Prompt 10/10 — Sol — authorized controlled release
**Copy as final message:**

> Execute step **10/10** ONLY if all previous gates pass. Verify hosting access and ask for explicit user approval before any public deployment or paid resource creation. Deploy the virtual-credit-only My Casino site to a real, verified HTTPS URL. Verify online Crash and eight other games, demo credits/no-cash language, inability to make real transfers, strong staff route/API authorization, seven configuration paths, history persistence, responsive layout, logs/monitoring and rollback. Save the actual deployment URL, source SHA/tag, environment/release notes, screenshots and smoke evidence; commit final `EXECUTION_STATE.md` and release report. If deployment is unsafe/not authorized/unavailable, do NOT make up a URL or claim success; return precise blockers and, where safe, a private preview or runnable artifact.

**Dependencies:** 1–9 PASS and user-approved hosting. **Gate:** public verified demo with reproducibility; else truthful BLOCKED/PARTIAL report.

## Priority if schedule slips
Never cut security tests or fake outcomes. Cut in this order: advanced branding polish → optional games → optional promo/event mock → public wallet selector decoration. If secure admin cannot be delivered, keep it private and mark partial delivery; never publish unauthorized write endpoints. Do not cut Crash, the distinction of virtual-only money, authorization, or truthful test logs.

## Future work explicitly NOT in any of 10 prompts
Real-money deposit/withdrawal, contract addresses and live chain indexing, KYC/AML/age, licensed real betting, production server RNG/ledger, auto-wallet generator, Sportsbook, Limbo/Hi-Lo/Tower and production-level promo engine. These are later separately authorized phases.
