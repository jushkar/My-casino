# MY CASINO — FINAL CROSS-ACCOUNT HANDOFF

Version: **2.0 FINAL** | Date: **2026-11-13** | Stage: **3 of 3 COMPLETED**
Language: Persian for decisions; English for execution prompts.

## Purpose
Transfer all established decisions and a verified ten-prompt execution plan to a **new ChatGPT account/project**. This is a **documentation and execution handoff**, not a finished website, authorized gambling platform, deployment, or recovered prior admin ZIP.

## Source-of-truth order
1. `01_MASTER_BLUEPRINT_FINAL_FA.md` — binding product scope and architectural decisions.
2. `02_TEN_PROMPT_EXECUTION_RUNBOOK.md` — ten Work/Codex implementation prompts and acceptance gates.
3. `03_FIRST_PROMPT_COPY_PASTE.md` — ONE self-contained first user message that counts as **execution prompt 1/10**.
4. `04_ACCEPTANCE_AND_RELEASE_GATES.md` — demo acceptance and separately scoped real-money requirements.
5. `05_SOURCE_AND_TRANSFER_MANIFEST.md` — public repo evidence, artifact provenance, cross-account logistics.
6. `06_EXECUTION_STATE_TEMPLATE.md` — mandatory handoff state file to commit after every execution step.
7. `07_STAGE3_AUDIT_REPORT.md` — final QA findings and remaining open decisions.
8. `08_OPTIONAL_AGENTS_AND_SKILLS.md` — how to decide whether an extra agent/skill is worthwhile.
9. `history/` — Stage-1/2 drafts for provenance ONLY. Never use a superseded instruction from history over these FINAL files.

## How to move to the other account
1. Download `MY_CASINO_FINAL_TRANSFER_V2_0.zip` from the source conversation and retain the ZIP locally.
2. Open a new Project/folder in the **destination** ChatGPT account. Upload this final ZIP. If Work/Codex cannot inspect ZIP attachments directly, extract it locally and upload files 00–08 separately (same names), or give Work/Codex access to a repository containing them.
3. In the destination account, open Work or Codex and verify you have **read + write** permission on a user-controlled GitHub fork/new repository. The original `Paidguy/casino` was read-only to the source connector. Connect GitHub and hosting using authorized product flows; do not paste secrets into chat.
4. Select **GPT-6 Astra**, if it appears in Work/Codex. Otherwise use the strongest available coding/reasoning model. The user must choose the model in the product UI — wording in the prompt does not change the model automatically.
5. Paste the **entire** `03_FIRST_PROMPT_COPY_PASTE.md` content as **execution prompt 1/10**, attaching all FINAL documents. Do **not** send an additional setup prompt that consumes the ten-prompt budget.
6. After each step, ensure `EXECUTION_STATE.md` is committed and contains an actual SHA/PR, precise changed files, commands/tests run with PASS/FAIL, blockers, and the next-step gate. Choose the next model using the runbook and send the next numbered prompt.
7. Prompt 10 may publish only a TESTED, AUTHORIZED HTTPS **virtual-credit-only** demo, or must return a truthful blocker/private-preview report. No real-money launch in this runbook.

## Do not import presumed state
- The previous `my-casino-starter-01.zip` cannot be recovered from this conversation environment and user states they do not have it. Historical “7/7 tests passed” is NOT independently verified.
- This final package contains **no executable casino source**, no privileged credentials, and no running site. Source is retrieved from the **public original Paidguy GitHub repository** in prompt 1.
- Neither private conversation history, persistent memory, files, nor GitHub/hosting connections migrate automatically between accounts.

## What success looks like
A verified HTTPS site with My Casino styling and **Crash + 8 other existing Paidguy games**, all with nonredeemable virtual credits, PLUS a server-protected **DEMO ONLY** staff panel for seven independent asset/network configuration paths (synthetic nonpayable address IDs), with replace/disable/archive/history, tests, logs and rollback evidence.

**A ten-prompt workflow and a 24-hour goal are aspirations, not guarantees. Do not remove security tests to meet either target.**
