# MY CASINO — SOURCE, ASSETS AND TRANSFER MANIFEST

Document date: 2026-11-13. An attachment inventory is NOT an executable repository or a deployed service.

## Public source verification
- Main: https://github.com/Paidguy/casino
- Demo: https://paidguy.me/casino/
- Public GitHub branch: `main`
- Last observed `main` commit: `0e2c5317d0004488ec234f20c58c1fcceba3b7a0` (retrieved with GitHub read connector on Nov 13, 2026). Reverify when forked; do not assume this is forever latest.
- Upstream repo permission in source account: read (`pull=true`), **no push** (`push=false`). This does not predict destination account permissions.
- `LICENSE`: MIT (preserve notices); additional dependency/image/audio asset rights must be checked.
- `README.md`: 14 educational games, virtual ₹ balance, client-side HMAC-SHA256 simulation, no backend/payment.
- `package.json`: `dev`, `build`, `typecheck`, `preview`, **no `test` script** at inspection.
- `App.tsx`: `HashRouter`; active virtual game routes + public `/admin` route.
- `pages/Admin.tsx`: House Controls/telemetry, not secure admin auth.
- `components/Layout.tsx`: simulated UPI/Paytm/IMPS deposit/withdraw modal, not cryptocurrency handling.
- `services/engine.ts`: virtual game simulation and browser state.
- TON native asset rebranding reference: https://ton.org/media/ — Gram/GRAM token, TON chain.
- Security reference: https://asvs.owasp.org/.
- Work/Codex model availability references: https://help.openai.com/en/articles/20001354-gpt-6-and-other-models-in-chatgpt and https://help.openai.com/en/articles/20001516-managing-usage-with-gpt-6-astra-in-work-and-codex.

## Historical generated files and their current trust status
| Item | Status | Action in destination |
|---|---|---|
| `my-casino-starter-01.zip` | NOT AVAILABLE; user says missing and no readable source recovered | Don't wait, don't trust as implemented |
| `my-casino-admin-preview.png` | Historical preview, not reliable code/test proof | Not needed |
| `my-casino-starter/REPO_INTEGRATION_AGENT_PROMPT.md` | Historical generated prompt, not verified as current/complete | Replaced by final runbook |
| Previous reported “7/7 tests passed” | NOT INDEPENDENTLY VERIFIED | Run real tests from scratch |
| `MY_CASINO_STAGE1_TRANSFER_DRAFT.zip` | Stage-1 **documentation**, locally available in source environment | Archived key docs in final package |
| `MY_CASINO_STAGE2_TRANSFER_REVISED.zip` | Stage-2 **documentation**, locally available in source environment | Archived key docs in final package |
| `MY_CASINO_FINAL_TRANSFER_V2_0.zip` | Final DOCUMENT-only handoff; test ZIP CRC/manifest | Upload to destination |

## Cross-account transfer mechanics
1. Download final ZIP from this source conversation.
2. Create a new folder/Project in the other account; upload final ZIP (or extracted final Markdown files if ZIP inspection unavailable).
3. Grant destination Work/Codex access to GitHub **after** connecting/authorizing through product UI; use/create user-owned writable fork. A connection does not migrate automatically.
4. Select the model manually in Work/Codex; confirm actual options in that account. No hidden model-switch command in prompts.
5. Paste `03_FIRST_PROMPT_COPY_PASTE.md` as the first of ten execution user prompts. Agent works on REAL source, verifies commit, builds/tests and writes `EXECUTION_STATE.md`.
6. Before prompt 10, grant explicit deployment consent, select/verify hosting and server auth/DB provider; do not include credentials in chat.
7. Keep commits, release and test evidence in writable repository — not merely chat text. Original conversation and attachments do not migrate automatically.

## Required final-package contents
```
00_READ_ME_FIRST_FA.md
01_MASTER_BLUEPRINT_FINAL_FA.md
02_TEN_PROMPT_EXECUTION_RUNBOOK.md
03_FIRST_PROMPT_COPY_PASTE.md
04_ACCEPTANCE_AND_RELEASE_GATES.md
05_SOURCE_AND_TRANSFER_MANIFEST.md
06_EXECUTION_STATE_TEMPLATE.md
07_STAGE3_AUDIT_REPORT.md
08_OPTIONAL_AGENTS_AND_SKILLS.md
SHA256SUMS.txt
history/stage1/*.md
history/stage2/*.md
```

## SHA-256 checksums and integrity
The machine-generated `SHA256SUMS.txt` inside this archive lists hashes of all included Markdown files. The ZIP itself is tested with `ZipFile.testzip()` before release; that proves archive integrity, **not** correctness of the website or independent security certification.
