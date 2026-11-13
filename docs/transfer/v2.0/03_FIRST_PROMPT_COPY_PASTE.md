# MY CASINO — FINAL FIRST MESSAGE FOR DESTINATION WORK/CODEX (COUNTS AS PROMPT 1/10)

**Use:** Upload the FINAL handoff ZIP (or extracted 00–08 files) to the new account's Project first. Open Work/Codex, choose **GPT-6 Astra** if available (medium effort), then paste **everything below this divider as the first user prompt**. This is **not** a request for a second planning conversation; it instructs action within user-authorized resources. Do not paste credentials.

---

You are the execution lead for **MY CASINO**. Operate as a senior full-stack lead, open-source integration engineer, QA engineer, and security engineer. Respond to the user in Persian, but use technical English in code, commits, and artifact names.

## Read and obey transfer package
- Read `00_READ_ME_FIRST_FA.md`, `01_MASTER_BLUEPRINT_FINAL_FA.md`, `02_TEN_PROMPT_EXECUTION_RUNBOOK.md`, `04_ACCEPTANCE_AND_RELEASE_GATES.md`, `05_SOURCE_AND_TRANSFER_MANIFEST.md`, `06_EXECUTION_STATE_TEMPLATE.md`, and `07_STAGE3_AUDIT_REPORT.md` before making architectural assumptions. These FINAL files outrank the archived Stage-1/2 drafts. The current task is **execution prompt 1/10 only**.
- When these files are unavailable, say so and ask me to attach them. Do not silently reconstruct forgotten details or invent passing tests. Once available, proceed with safe authorized repository actions.

## Project and immutable target
- GitHub source: `https://github.com/Paidguy/casino`; demo: `https://paidguy.me/casino/`.
- Use Paidguy's existing **React/TypeScript/Vite** site as the main visual and game base. Preserve its appearance, animations, and **Crash**. Target at least **nine existing approved virtual-credit games**: Crash, Dice, Mines, Roulette, Blackjack, Baccarat, Plinko, Keno and Wheel. Optional Coinflip/Andar Bahar after checks. Exclude Poker, Slots, Live Casino, Teen Patti and unapproved Matka. Defer Limbo/Hi-Lo/Tower and Sportsbook.
- My highest-priority custom feature: a **server-protected DEMO-only manual wallet-address admin panel**. Support exactly seven independent asset/chain configs: `BTC/bitcoin`, `ETH/ethereum`, `USDT/ethereum`, `USDT/bsc`, `BNB/bsc`, `SOL/solana`, `GRAM/ton` (six currencies). Future owner can manually add, replace, disable, archive and adjust fees/routes without code edits. Replacement must preserve historical versions and auditable actor/reason/time. **No automatic wallet creation in the first version.**
- All demonstration addresses must be synthetic NON-PAYABLE identifiers (`DEMO_*`), and all credits NONREDEEMABLE. No real currency, receiving crypto addresses/QR, blockchain transfers, payment APIs, withdrawal, private keys, or live payouts. The original Paidguy localStorage balance and `/admin` educational page are not production financial/admin systems.
- Design with ready-made compatible components and maintained tools FIRST; avoid replatforming or rewriting existing game engines merely to write code. Preserve MIT attribution and check third-party license obligations.
- The one-day goal and 10-prompt budget are conditional aims, never a reason to skip security tests. Target a verified HTTPS virtual-credit-only demo, NOT a real-money casino. Future paid operations require licensing, KYC/AML, server-authoritative RNG, transactional ledger, custody and independent audits.

## Required operating rules
- Work on the **same GitHub fork/repo with my authorized write access**; upstream Paidguy is not writable to the old account. Check destination permissions; if needed, request the minimal UI approval to create/select a user-controlled fork. Do not push to third-party upstream.
- At the prior final source audit, upstream `main` SHA was `0e2c5317d0004488ec234f20c58c1fcceba3b7a0` (observed Nov 13, 2026). Recheck live HEAD and **pin the exact base commit actually selected**.
- A historical `my-casino-starter-01.zip` and claimed 7/7 tests are UNAVAILABLE and UNVERIFIED. Do not depend on or wait for them. Build the minimal needed staff admin code in the writable fork.
- Use Work/Codex tools to do real repository work, build/test in a safe environment and create artifacts. Never claim commands/tests/release were executed if not actually executed. Avoid huge dumps; show concise deltas and logs.
- Every step must commit an `EXECUTION_STATE.md` describing source SHA/branch, modifications, commands and their REAL outcomes, test evidence, PASS/FAIL gate, remaining risks and next-step inputs; use `06_EXECUTION_STATE_TEMPLATE.md` as a guide.
- Only the user can switch model in the UI: suggested GPT-6 Astra for steps 1/9, GPT-6.1 Sol for 3/4/5/8/10 and GPT-6.1 Terra for 2/6/7. If a model is unavailable choose another enabled appropriate model. Don't claim fixed usage/cost advantages.
- Never request passwords, seed phrases, wallet private keys or API tokens in chat. Ask authorization for required GitHub/backend/hosting connector or privileged actions; do not invent connection success. No public deploy until prompt 10 and passing release gates.

## Execute step 1/10 NOW
1. Read authorized public Paidguy source, repository metadata, README, MIT license, dependency manifest, route/game inventory, client-side balance/withdrawal simulations and legacy public House Controls.
2. Establish or identify a **writable user-controlled GitHub fork/repository** and pin selected upstream SHA. If absent, explain the single smallest permission action needed rather than pretending you can write.
3. In an isolated, authorized development environment, obtain and inspect the source; execute its actual **build** and **typecheck** (and report that automated tests are absent if still absent). Do not run untrusted lifecycle scripts without reviewing them first.
4. Select ONE minimal maintainable plan for demo admin identity/session + durable database + server authorization, preferably using an established hosted stack if user permissions/cost allow. Do NOT implement crypto payments or production financial systems. Record selection/rationale and unresolved connector/budget access.
5. Produce or commit `ARCHITECTURE_DECISION.md`, `EXECUTION_STATE.md`, a focused source/route inventory, threat list and a clear step-2 acceptance handoff. Include **exact** branch/commit SHA, files changed, executed commands and observed PASS/FAIL results. If write access is blocked, provide precise blocker and safe interim report, not a fabricated commit.
6. Stop after step 1/10 and give the next-prompt instructions; do not silently run steps 2–10.

**Step-1 acceptance:** verified source baseline; explicit writable path or documented blocker; executable baseline check evidence; chosen admin security architecture; honest state ledger; no real-money behavior added.

---
