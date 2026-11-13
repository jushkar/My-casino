# MY CASINO — Files, Provenance & Cross-Account Transfer (Stage 2)

As of 2026-11-13. This is a DOCUMENTARY handoff pack; it contains **no executable app source** and **no validated admin starter**.

## Artifact status (important distinctions)

| Item | Status | Meaning |
|---|---|---|
| Stage-1 transfer documentation ZIP | **FOUND, integrity checked** | Documentation only; NOT the missing admin implementation |
| Stage-2 files in this directory | **CREATED, hashed and packaged** | Revised documentation for Stage-3 audit and new-account handoff |
| Previous `my-casino-starter-01.zip` | **MISSING / UNVERIFIED** | User has explicitly confirmed no longer available; no dependency on it |
| Prior preview screenshots and '7 tests passing' | **Historical claim only / not independently verified** | Do not assume they are deliverables or evidence |
| Paidguy upstream repository | **PUBLIC READ ACCESS** | Needs authorized writable fork in destination account; base SHA not pinned |
| User destination Work/Codex | **USER SAYS AVAILABLE** | Verify actual feature/plugin/model rights after transfer |
| Hosting and hosted admin backend | **NOT CONNECTED / NOT VERIFIED** | Authorization/connection required before public deploy |
| Live production money features | **NOT BUILT / OUT OF SCOPE** | Never describe virtual demo as real-money-ready |

## Stage-1 package verification

- Filename: `MY_CASINO_STAGE1_TRANSFER_DRAFT.zip`
- SHA-256: `72d2e010161a35877436ee4a54fb10c49d630cf776812d5ae6447f81acdf82d2`
- ZIP self-check: PASSED using zip integrity test.
- Stage-1 ZIP is **not necessarily included separately**; the two original Stage-1 `.md` docs are copied to `stage1_reference/` inside this Stage-2 archive.

## Stage-2 content SHA-256 list (before packaging)

| Path inside package | Bytes | SHA-256 |
|---|---:|---|
| `00_README.md` | 1970 | `92f441feef5588ac3fffd1694978abea1e45bfb16aea3f911f8346043e2e4b75` |
| `01_STAGE2_AUDIT.md` | 6594 | `1fd2e837c7c785957b302767145f2f7ead62277143db1663f3e0627cd2977827` |
| `02_MASTER_CONTEXT_V1_5.md` | 17158 | `c02f461b169e676431b421c0734e0753e6e0b7106e742b4b191f0c15a4607fcb` |
| `03_TEN_PROMPT_RUNBOOK_V2.md` | 12852 | `fd05eb07cbfe7ec1821dc337509ea9d572cb91137d946bef0e4bc49c515e3de4` |
| `04_FIRST_MESSAGE_CANDIDATE_STAGE2.md` | 3893 | `508557528631faa2bca627d4988a62cab773bba2fde217917a419a74a9e202c7` |
| `06_STAGE3_REVIEW_CHECKLIST.md` | 2360 | `8813967571a0d49b878cf1c44e41a508e4ec927eb4cc0b405f69903550d5a2e9` |
| `stage1_reference/MY_CASINO_10_PROMPT_PLAN_STAGE1.md` | 6671 | `db1a2021d8e3b44440cf9db204138e69aee5489e2b50e1623d07d802a3bd23cb` |
| `stage1_reference/MY_CASINO_MASTER_CONTEXT_STAGE1.md` | 13625 | `0e752229e3bd847d6e944a8bf05d26fb9989c7b50dc4d672b6837516b66b5020` |

## Required manual destination steps (not yet executed)

1. In the destination account create/select a new ChatGPT Project/folder and upload the **final Stage-3 transfer ZIP** (the Stage-2 ZIP may be used for review only). Do not assume chats, saved context, attached files or account permissions migrate by moving a folder.
2. Open **Work/Codex** in the destination account and confirm model availability and rights to work with GitHub and files. User may need to explicitly connect/approve GitHub and hosting services. NEVER share a password, API secret, seed phrase or private key in chat.
3. Create an authorized **user-owned writable fork** of `Paidguy/casino`, preserving upstream MIT license and any third-party asset notices. If Work/Codex cannot push or edit, connect a writable repository through UI. Pin the base commit SHA in prompt 1.
4. Set up hosting and a secure hosted auth/DB service only when selected in the prompt-1 architecture review. Check free tier/budget and authorized operations. Never put service-role tokens in browser. No bank/crypto wallet connection needed for demo.
5. Paste the Stage-3 FINAL first-message prompt, select Astra (or available strongest alternative) for execution prompt 1, and follow each stage gate. Stage-2 candidate prompt is not final.
6. Keep all actual source commits, test logs and deployment artifacts in **the writable repository**, not in chat memory alone. Preserve `EXECUTION_STATE.md` as the cross-prompt baton.

## Required separation

- Public demo: virtual credits; no cash value, no blockchain interactions, no real receiving addresses/QR.
- Future paid/licensed product: distinct specification, licensing, KYC/AML, independent game/security auditing, real double-entry ledger, protected key custody and deposit attribution.

## Remaining transfer risks

- Ten prompts is a constrained process goal, not a guarantee that Work can obtain permissions or safely finish deployment.
- Source may change; verify real GitHub content and dependencies when actual execution begins.
- Model access and usage limits vary per destination plan, interface and workspace.
- Branch decisions from this chat must remain intact; Stage-3 pack is source of truth in destination.
