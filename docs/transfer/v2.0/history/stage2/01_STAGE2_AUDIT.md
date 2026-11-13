# MY CASINO — Stage 2 Critical Audit (2026-11-13)

## Overall finding
Stage 1 context and plan were **substantially complete**, and its ZIP was verified locally in Stage 2 (archive CRC check passed); however ten execution prompts will not reliably produce a public demo without tool permissions, a writable source-of-truth repository, secured admin APIs, automated tests and hosting access. Prompt count is a workflow constraint, NOT an assertion of elapsed duration, total autonomy or security.

## Corrected or strengthened items

1. **Absent prior starter**: User confirmed the historical `my-casino-starter-01.zip` is unavailable. Prior assistant's claims of an admin starter and 7/7 passing tests have **no verified backing source**. Treat as historical descriptions only; rebuild minimal implementation directly in fork, without inventing missing code. The Stage 1 transfer ZIP IS available and checked, but it is only documentation.
2. **Public repo not writable**: Earlier source-side connector reported `pull=true`, `push=false` for `Paidguy/casino`. The destination needs its own fork or other writable authorized repository and a pinned base SHA. Read-only Github public repo is not a deployment workspace.
3. **Auth before admin exposure**: Avoid an intermediate deployed, unprotected wallet control panel. Create demo database + trusted admin auth + server-side permission enforcement within the same closed work unit (prompt 3). Never equate a hidden route with authorization.
4. **Existing `/admin` is not an admin system**: Paidguy route is an educational client-side House Controls page. Relabel/remove it from public admin navigation. Place new staff control behind a separate route/permission boundary; never reuse the old component as secure authorization.
5. **Fake demo address safety**: For public demo, use non-payable synthetic identifiers (`DEMO_BTC_001` etc.), **not syntactically valid mainnet addresses**, scannable QR codes or links to fund the site. Mock validator is isolated from any future production blockchain address validator. A future production address must be checked with correct network/asset formats and ownership/attribution method.
6. **Single trusted stack, not many templates**: Keep Paidguy React/Vite. Prefer one well-maintained hosted auth + transactional DB integration (e.g., Supabase Auth + Postgres + RLS/server actions, subject to technical audit) rather than building auth from scratch or mixing competing boilerplates. Final selection is a prompt-1 decision, not approved by fiat.
7. **No false cash flows**: Replace misleading UPI/Paytm/IMPS simulated credits and `₹` real-money cues with plainly labeled virtual-credit demo UI; no real deposit/withdraw action, webhook or smart-contract call.
8. **No loss of UI diversity**: Preserve nine in-scope existing games (Crash, Dice, Mines, Roulette, Blackjack, Baccarat, Plinko, Keno, Wheel). Optional Coinflip and Andar Bahar after tests. Hide or disable direct out-of-scope routes: Poker/Teen Patti, Slots, Live Casino; Matka not an approved target. Defer Limbo, Hi-Lo, Tower and Sportsbook.
9. **Financial rules separated from demo**: Demo admin can show *configuration only*, never serve as a real payments gateway. Production requires attribution of manual receiving addresses to users, immutable transaction history, confirmation/reorg handling, secure signing, approval workflow, double-entry ledger, independent audit and licensing.
10. **Race conditions and versioning**: Replacing an address creates a new version while retaining the old record; archiving removes public display only. Audit event for every mutation. Demo server should prevent stale overwrites (revision/version checks) and reject anonymous/non-admin calls.
11. **Tests begin early**: Add a minimal test harness near foundation, not on day 8 only; smoke-test Crash and all active games before release. Run build/typecheck/tests/authorization negatives after each significant change.
12. **Release gate is conditional**: If High/Critical security issues remain, if permissions or hosting are absent, or if any primary acceptance condition fails, prompt 10 returns blocker/evidence report rather than publishing an unsafe URL. User must authorize any external deployment/account connection actions.
13. **Model routing accuracy**: Official OpenAI sources describe Astra for demanding architecture/security, Sol for engineering, and Terra for scoped UI/writing; availability in Work/Codex depends on plan/permissions. Recommendations are not guaranteed account entitlements or token/cost commitments. Models are selected by user/UI, not by text claiming to switch the running model.
14. **TON/GRAM nomenclature confirmed**: TON remains the blockchain; native asset is called Gram/GRAM after 2026 rebrand. Do not confuse it with an imitation TON Jetton named GRAM. Official TON brand documentation and Blockchain.com support corroborate rebrand; revalidate provider compatibility before real money.
15. **USDT BSC specificity**: BNB Chain commonly uses Binance-Peg USDT, which must be identified by contract address/chain ID and distinguished from Ethereum-native USDT. For real payments, independently verify contracts, decimals, custody support and counterparty/bridge risk. Do not hardcode an unverified contract address from any AI answer.
16. **Third-party rights**: Paidguy license is MIT, but asset/dependency license review and preserving attribution are required. No blind insertion of random GitHub code.
17. **Cross-account transfer**: Another account doesn't inherit this conversation, memory, uploaded/generated attachments, app connections, GitHub authorizations or hosting access. Upload all Stage 3 files explicitly and re-establish necessary permissions.

## Source pointers (revalidate live at execution)
- Paidguy repository: https://github.com/Paidguy/casino
- Paidguy demo: https://paidguy.me/casino/
- Official TON asset: https://ton.org/media/ and https://www.ton.org/
- BNB Chain token guidance: https://github.com/bnb-chain/mpp-sdk (separate token definitions)
- OpenAI model choices: https://academy.openai.com/en/pages/chatgpt-5-6-champion-launch-resources-tzoyyc and https://developers.openai.com/api/docs/guides/model-selection
- OWASP ASVS: https://asvs.owasp.org/

## Key constraint
No user passwords, recovery phrases, private keys, payment provider credentials or real wallet addresses should be included in any transfer document or prompt. Work/Codex can request installation/connection through authorized interfaces; user must approve account connections and privileged writes.
