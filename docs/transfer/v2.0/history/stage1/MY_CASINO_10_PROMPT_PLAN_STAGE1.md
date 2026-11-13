# MY CASINO — 10-PROMPT EXECUTION PLAYBOOK (STAGE 1 / PROVISIONAL)

Prepared 2026-11-13. For transfer into a different account / folder. This is the **first-pass plan**, to be critically audited and optimized in stages 2 and 3. Nothing here proves the product is launched.

## Objective & guarantees

A safe, working, hosted **virtual-credit-only** demo in 10 focused implementation prompts, if all repo, tools, write access, hosting and quality gates are available. "10 prompts" means a bounded execution sequence, **NOT** a guarantee of success, 24-hour elapsed time, real-money launch, or zero bugs. Never bypass a gate to stay within count; prompt 10 can become a "blocker report / remediate" instead of deployment.

## Model routing (verified against OpenAI public model guide 2026-11-13)

- **GPT-6 Astra**: highest complexity, threat modeling, repo-wide architecture decisions and independent security audit (used sparingly to optimize cost/time).
- **GPT-6.1 Sol**: engineering and integration of complex code, APIs, automated tests, and deployment (balanced accuracy/cost).
- **GPT-6.1 Terra**: quick, narrower UI edits, straightforward forms, visual checks and documentation (fast/economical).
- Model availability is account, plan and environment dependent. If missing, use the strongest authorized available alternative with the same task boundaries. Model names should be **manually selected** when starting each prompt in Work/Codex; a textual prompt cannot force another model.
- Keep a reusable project-context file and handoff state log; don't paste the entire chat into each prompt. Include only the master context plus files directly relevant to that prompt; reuse diffs, test logs, and repository state. Prefer exact-file tasks, explicit acceptance gates and summarized logs over verbose repetition.

| # | Model | Execution assignment | Output + gate |
|---|---|---|---|
| 1 | **6 Astra** | Read the master context; fetch/pin Paidguy fork/source; inventory actual routes/dependencies; inspect legacy ZIP if provided; select safe demo backend/auth solution; define exact task limits. | Verified repo revision, change plan, risk log, baseline build/typecheck or clearly stated blocker. No source claim without inspection. |
| 2 | **6.1 Terra** | Minimal branding/nav updates only; preserve existing game source & animations; hide out-of-scope games, keep Crash + 8 virtual games; prominent DEMO labels. | UI screenshots/build and game-route smoke tests, no real payments. |
| 3 | **6.1 Sol** | Implement secure demo data/API foundation using trusted hosted/backend components, schema for seven asset/network paths, address versioning and immutable audit records. | Persisted mock data with migration/schema tests, server-side validations; no live secrets. |
| 4 | **6.1 Sol** | Admin authentication/session + server-side RBAC/authorization protecting every admin endpoint; lock down educational `/admin` route appropriately. | Deny anonymous, unauthorized-role and direct-API access in automated tests. |
| 5 | **6.1 Sol** | Backend wallet address add/replace/disable/archive, network toggles, fee/limits with testnet/synthetic records only and reliable history. | CRUD + concurrent changes, anti-overwrite, audit and scope tests all pass. |
| 6 | **6.1 Terra** | Connect protected Wallet Management admin UI to real demo API; forms, table, archive/history, status; responsive design. | Full user/admin browser flow, permission failures handled, no client-only security assumptions. |
| 7 | **6.1 Terra** | Demo user-side crypto asset/network selectors, deposit/withdraw buttons clearly disabled/nonoperational; optional promo/event mock only if schedule allows. | No action can transfer value, no live address/QR; UI reflects stored demo configuration safely. |
| 8 | **6.1 Sol** | Add regression unit/integration/E2E test suites, smoke across Crash and 8 other selected games, auth/API concurrency, mobile and responsive. | All mandatory checks pass with links to actual logs; prioritize fixes over new features. |
| 9 | **6 Astra** | Independent security / architecture review of code/diff and failure modes; remediate verified High/Critical issues; stop if unresolved. | Security assessment with evidence, change list, no unsolved release blockers, QA sign-off proposal. |
| 10 | **6.1 Sol** | Deploy via authorized hosting and connected repo; HTTPS, env separation, smoke tests, rollback, release notes; if blocked output precise no-launch report. | Public verified demo URL *only if* deployment tool reports it and end-to-end checks pass. No imaginary URL or success claim. |

## Hard gates applying to every prompt

- Use the repo state produced by preceding prompt. Do not create parallel conflicting code branches unless intentional and later integrated.
- Read current files before editing; use small reversible commits/PRs; minimum change surface; no unauthorized access.
- No acceptance of payment, no real wallets, no private keys, no production custody, no cash-value prizes.
- Keep game engine/browser wallet demonstrably virtual-credit only.
- After every prompt: summarize **actual changed paths**, tool actions, tests **executed** vs **not executed**, results, known risks/blockers, commit/ref, next prompt input. Never claim passing tests without logs.
- If a high/critical flaw blocks a public demo, **stop or keep it private**. Never use prompt-count pressure to bypass controls.

## Essential acceptance criteria for prompt 10

- Website accessible via a VERIFIED HTTPS URL, not invented.
- Crash + >=8 approved existing virtual-credit games functional; excluded Games not prominent.
- Admin panel protected by real server-side auth/permissions; all seven asset/network configs stored on demo backend; add/replace/disable/archive/history visibly work; audit records verifiable.
- No ability to deposit/withdraw crypto and no public live address/QR; all pages clarify virtual nature.
- Build/typecheck/test reports and deployment smoke logs; no known unmitigated high/critical issue. Monitoring/rollback minimal.
- If unmet, report incomplete acceptance accurately; actual live real-money casino remains OUT OF SCOPE.

## Efficiency and escalation

Use Astra only for project-wide/high-risk reasoning; Sol for the core engineering flow; Terra for scoped UI and polishing. The integration agent should *not* install random GitHub repos without supply-chain/license review. Use ready-made integrations only after confirming version, maintainer, license, compatibility and testability. Ask user to connect GitHub/hosting or provide assets only at the point they become actual blockers; never request passwords/private keys in chat.
