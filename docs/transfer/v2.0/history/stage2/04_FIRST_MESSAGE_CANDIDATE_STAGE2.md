# MY CASINO — Proposed FIRST MESSAGE for Destination Work/Codex (Stage-2 candidate, NOT final)

**Usage**: AFTER Stage 3 QA, upload the final transfer ZIP to the new account's Project; open **Work or Codex with access to files and an authorized writable GitHub fork**, choose the model indicated for prompt #1 (Astra if available), and send the revised version of this message. Do not paste password, private keys, recovery phrases or API credentials.

---

You are the execution lead for **My Casino**, a virtual-credit-only casino demo based on the MIT-licensed open-source repository `https://github.com/Paidguy/casino` (demo: `https://paidguy.me/casino/`). You have been handed portable project documents in the attached transfer bundle.

**FIRST ACTION:** Read `00_README.md`, `02_MASTER_CONTEXT_V1_5.md`, `03_TEN_PROMPT_RUNBOOK_V2.md`, `01_STAGE2_AUDIT.md` and the final Stage-3 amendments (when attached). Summarize only material conflicts or blockers; do not silently discard decisions. The Stage-3 final pack outranks Stage-2 if it expressly revises something.

Our desired milestone is a **verified HTTPS virtual-credit-only demo** with My Casino branding, **Crash and eight other existing approved Paidguy games**, and a **server-protected demo Admin Wallet & Address Management console** for seven asset+chain paths: BTC/bitcoin, ETH/ethereum, USDT/ethereum, USDT/bsc, BNB/bsc, SOL/solana, GRAM/ton.

**Immutable project decisions:** Paidguy is the frontend base; reuse its existing game UI, logic, and animations only for play-money simulation. No Poker, Slots, Live Casino or Teen Patti in launch scope. Defer Sportsbook, Limbo, Hi-Lo, Tower and real-money capabilities. Admin adds/replaces/disables/archives *synthetic non-payable* address identifiers manually; replace creates a new version and retains historical records. All staff writes need authenticated, authorized server APIs and audit history. Do not add working deposits, withdrawals, real receiving wallet addresses, QR funding flow, blockchain keys, cash-out or redeemable credits.

**Ten-prompt operating rule:** Follow the ten stages in the Runbook, one scoped deliverable per prompt, preserving repository state and test evidence. Each stage outputs paths changed, actual checks and logs, commit or PR ref, PASS/FAIL gate, unresolved risks, next step. Never claim tests or deployment happened if they were not executed. Do not bypass security gates for the ten-prompt target. If source/hosting/provider access is missing, report the shortest user approval/action needed and continue with safe available tasks.

**Artifact provenance:** Historical assistant referred to `my-casino-starter-01.zip` and 7/7 tests, but **the ZIP is unavailable and the tests are not independently verified**. Start from original Paidguy source; do not assume the starter is present. Prior Stage-1 transfer ZIP contains only documentation. Upstream Paidguy is not writable from the source account; confirm destination GitHub write access to a user-owned fork and pin base commit. Recheck MIT/third-party rights.

**TASK NOW: execute ONLY PROMPT 1/10** (repository reconnaissance and architecture decision), with the model selected in the UI: inspect real source, build/typecheck in isolated environment, record exact commit, choose minimal safe hosted database and admin authentication approach, and create an auditable `EXECUTION_STATE.md` plus a precise risk/decision log. Do not implement real-money payments or deploy the site yet.

Any connected accounts or deployment operations require explicit user authorization. Work efficiently: no large repo dump, use changed-file summaries and exact tested evidence.

---

*Stage-2 note*: In Stage 3, replace filenames/priority with final pack, verify the model labels and any verified destination permissions, and tighten first action. This candidate is deliberately not marked FINAL.
