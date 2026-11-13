# MY CASINO — MASTER BLUEPRINT FINAL

**Version:** 2.0 FINAL | **Updated:** 2026-11-13 | **Target:** virtual-credit-only online demo first; international licensed crypto casino in a separate future program.

## 1. Product vision and immutable decisions
- Name: **My Casino**.
- **Primary design/game source:** `https://github.com/Paidguy/casino` | Demo: `https://paidguy.me/casino/`.
- **Alternative/reference:** vFair Games for possible later server-side game architecture, NOT the main template and not yet verified.
- **Superseded main candidate:** Cassanova Casino. Do not revert without explicit user decision.
- **Engineering principle:** **Ready-Made First + AI Customization + Security Verification**. Preserve Paidguy graphics, game UIs, animation and overall appearance where possible; make the fewest changes needed. Never copy an unreviewed GitHub dependency just to save time.
- **Current deliverable:** online, testable, no-money virtual casino prototype with **Crash mandatory** + at least eight other existing approved games and protected **demo** wallet-address management.
- Aim at a narrow 1-day prototype, or up to a planned 7-day sprint when appropriate; **10 major user execution prompts**, not a guaranteed wall-clock duration or fixed tool-call count.
- **Future deliverable (separate):** properly licensed casino for allowed international jurisdictions with crypto deposits/withdrawals and potential Sportsbook. No present license or real-money production readiness has been established.
- The user is willing to add/install/create agents/skills when a concrete gain is demonstrated; provide a precise agent/skill creation prompt at the moment of need, not gratuitously in advance.
- User wants a small, reliable, functional result; **no generic reassuring security claims**, no untested code dumps.

## 2. Source facts and license limits
Paidguy currently documents 14 virtual-credit games, 100% client-side logic, no real backend, no real deposits and no payment processor. Verified source paths in earlier inspections:
- `App.tsx` uses `HashRouter`; includes games and `/admin` route.
- `pages/Admin.tsx` is a PUBLIC educational House Controls / mathematics panel, **not secure administrator access**.
- `components/Layout.tsx` includes simulated INR/UPI/Paytm/IMPS-style deposit/withdraw UX; **not crypto**.
- `services/engine.ts` uses browser `localStorage` and an educational client-side random game engine.
- `package.json`: React 18, TypeScript, Vite 5, Tailwind; `build`, `typecheck`, `preview`, `dev` scripts, but no `test` script at inspection time.
- `LICENSE` is MIT; retain required copyright/license and audit third-party assets and dependencies independently.
- Latest GitHub `main` SHA **observed on 2026-11-13**: `0e2c5317d0004488ec234f20c58c1fcceba3b7a0`. Revalidate and pin the selected SHA inside the destination **writable fork**; a read-only inspection is not a local clone, build or app test.
- Previous source GitHub connector reported `pull=true, push=false` for upstream; do not attempt to write upstream.

## 3. Games (current demo and future)
**Required and already matched in Paidguy (nine):** Crash, Dice, Mines, Roulette, Blackjack, Baccarat, Plinko, Keno, Wheel.
**Optional demo diversity if tested:** Coinflip and Andar Bahar.
**Desired later additions:** Limbo, Hi-Lo, Tower, plus other low-complexity games only when suitable license, maintenance and quality are confirmed.
**Exclude from current release:** Poker, Slots, Live Casino, and poker-like Teen Patti. Matka is not an approved target. Disable/hide not just menus but unwanted direct routes as appropriate.
**Sportsbook:** still an intended module/roadmap feature, but deferred after the secure casino/demo core. Future sportsbook requires legitimate event/odds/result feeds, bet capture, market suspension, settlement and risk review.
**Demo game execution:** paidguy client-side simulation is acceptable ONLY because virtual credits have zero monetary value and cannot be redeemed. Do not portray client-side RNG as production-safe.
**Future real-money game execution:** server-authoritative session, commit/reveal or otherwise verifiable fairness where suitable, robust RNG, payout math, RTP and game rule versioning, tamper prevention, tests for concurrency/cashout/round timing/disconnects, qualified independent testing as required by jurisdiction; NO hidden manipulation of outcomes.

## 4. Assets (six) and network routes (seven)
| Asset | Chain / route | Demo ID |
|---|---|---|
| BTC | Bitcoin | `BTC/bitcoin` |
| ETH | Ethereum native | `ETH/ethereum` |
| USDT | Ethereum ERC-20 | `USDT/ethereum` |
| USDT | BNB Smart Chain (commonly Binance-Peg USDT) | `USDT/bsc` |
| BNB | BNB Smart Chain native | `BNB/bsc` |
| SOL | Solana native | `SOL/solana` |
| GRAM | TON blockchain native coin, formerly Toncoin | `GRAM/ton` |
The TON network is called TON; native asset is Gram/GRAM according to official TON media guidance as checked in November 2026. Do not confuse native Gram with similarly named Jettons. Before real funds, independently confirm native asset identification, token contract/decimals (especially distinct USDT chains), bridge/issuer risk, custody and payment provider support.

## 5. Top feature: Manual Wallet & Address Management
**User requirement:** From a privileged panel, without editing site code, manually add/change/replace/disable/archive/remove from active display the receiving addresses on every asset/network route, toggle routes, configure deposits/withdrawals/limits/fees, view historical changes. **No automatic wallet generator in v1.**
**Demo implementation:** synthetic **nonpayable** IDs like `DEMO_BTC_001` exclusively; display prominent DEMO banners, NO live valid blockchain addresses, QR funding images, links to pay, broadcast APIs, or live wallet keys. Database stores per-route settings and versioned address identifiers; write access restricted to authenticated and authorized admin API; revisions prevent stale overwrites; every mutation logs actor/time/reason/old and new references. A replace MUST create a new version, not mutate history. Disable and archive change visibility, not immutable audit data.
**Real-money design later:** requires independent verified attribution of deposit to user (manual address allocation can still work, but shared undifferentiated addresses cannot), active/retired address monitoring, confirmations/reorgs, idempotency, reconciliation, key custody separate from web app, signer approval, admin MFA, segregation of duties and two-person review for sensitive address/payout changes. **“Delete” never destroys financial/blockchain history.**
**Fee-free withdrawals:** distinguish zero platform fee from sponsoring the network gas fee; each route needs explicit rules.

## 6. Other admin and user functionality
**Admin target:** Dashboard; Wallet & Address Management; Deposits & Withdrawals; Users; Bonuses & Promo Codes; Events; Games; Financial Reports; Security & Audit Logs; future support, incident, compliance and fraud/risk panels.
**Users target:** user account/session security, profile and history, virtual balance, games and betting history, deposit/withdrawal views, promotions, later KYC/age verification and responsible gaming.
**Promotions:** configurable welcome/bonus codes, up to e.g. **10,000 DISTINCT users**, eligibility, one-per-person/anti-multi-account limits, expiry, max per user, wagering/release conditions, promotional budget and concurrency-safe atomic redemption. An informational mock can exist in demo; **fully durable promotion engine is not a day-one requirement**.
**Events:** time-based campaign/event editor; future sports event feeds are distinct from promotion events.
**Withdrawal status/fee administration:** demo readonly/mock rules only. No real withdrawal approval, false success alerts or funds movement.
**Admin vs educational House Controls:** rename/hide the existing publicly reachable `/admin` House Controls page; do not treat it as privileged security admin. Build a separate server-protected `/staff` route with server-side authorization; a hidden React route does NOT count as protection.

## 7. Technical architecture and scope boundaries
**Immediate demo minimal architecture:**
- Paidguy React/Vite frontend maintained with smallest reliable diffs.
- Existing browser virtual-credit game engine (self-contained and clearly educational).
- Separate authorized server-backed *demo-only* admin API, protected staff identity/session, data store for seven route configurations, revisioned history/audit. Prefer compatible maintained auth/database service rather than custom password cryptography; select after audited fit, permissions and budget.
- Distinct public demo and privileged staff surfaces. No server-side financial ledger required for play-money mode; do not call it a real accounting system.
- Minimal hosting/deploy toolchain, HTTPS, environment isolation, private secrets, rollback; use one writable user-controlled GitHub fork as source of truth.

**Future real-money architecture (not in 10 steps):** modular monolith preferred; modules Identity, Casino Core, server Game Engines, Sportsbook, Double-Entry Ledger, Wallet Config, Crypto Gateway, Deposits, Withdrawals, Promo/Events, User, Reporting, Risk/Compliance, Admin RBAC/Audit, Notifications. Candidate PostgreSQL for financial transactions, TypeScript backend (e.g. NestJS), Redis/queue only if warranted. No mandatory Next.js conversion.

**Real-money financial invariants:** immutable double-entry ledger, integer amounts in smallest unit, idempotency and unique processing keys, atomic reservation/settlement, no direct balance edits, concurrency controls, audit/correction entries, reconciliation, halted/failed/reorg handling, segregated signing/hot-cold custody.

## 8. Demo deliverables and exclusions
**MUST:** publicly testable HTTPS site, Paidguy look with My Casino branding, Crash and eight other working approved virtual games, mobile/desktop smoke checks, clear “VIRTUAL CREDITS — NO CASH VALUE — NO DEPOSITS/WITHDRAWALS” on sensitive screens, none of the old UPI cash-flow illusion; protected staff demo for seven route records with add/replace/disable/archive, per-route toggles, fee/limit previews and audit; actual build/typecheck and relevant tests; recorded commit/deploy/rollback.
**NICE TO HAVE ONLY IF TIME:** Coinflip/Andar Bahar, preview-only promo code editor or fee-zero setting, events skeleton, user demo profile decoration, advanced design changes. Avoid feature creep.
**MUST NOT:** real deposits, real wallets/recipient addresses on public pages, real withdrawals, private keys/seed phrases, QR fund links, real KYC flows handling sensitive identity records, cash-redeemable credits, fraudulent “transfer completed” messages, live betting operations.
**Fallback:** if secure admin cannot pass tests, keep admin unexposed/private, and publish only the clean virtual casino if independently safe. This is a **partial demo**, not full feature acceptance. If public demo itself is unsafe, no publish; return blocker report.

## 9. Quality and threat controls
- Unit/integration/e2e and browser smokes; mandatory Crash; direct route and mobile testing; no untested feature accepted.
- Auth negative tests: unauthenticated 401 and unauthorized role 403 for every protected endpoint; CSRF/session settings, XSS/input validation, no keys in client bundle, rate limiting as justified; admin change/audit integrity, stale version/race handling, backup/rollback.
- Check secrets, dependencies/licenses, config flags, open redirects, RLS if using hosted DB; prefer strong maintained libraries.
- Never equate separate AI reviewer with independent professional audit; third-party security and game/RNG certification required for real-money jurisdictions as applicable.
- No unresolved critical/high launch-blocking issues for public demo. Skipped/not run tests are not passes.

## 10. Project governance, historical artifacts and open decisions
- 10 *scoped* Work/Codex user prompts, each doing real work, with explicit input, output, test gate, commit/PR and `EXECUTION_STATE.md`; models selected manually by the user in UI.
- Recommended: GPT-6 Astra for prompts 1 and 9, GPT-6.1 Sol for 3/4/5/8/10, GPT-6.1 Terra for 2/6/7, if available. Set effort Low/Medium for narrow tasks, increase only on complexity or test failures; do not claim guaranteed cost savings or access.
- PRIOR history: source assistant claimed `my-casino-starter-01.zip` plus screenshots and 7/7 passing tests. User confirmed unavailable, and attempts to read/materialize legacy files failed. **NO working code or verified test artifacts were recovered.** Ignore these claims for development; no reason to ask the user again unless they volunteer a working file.
- Destination user indicates Work/Codex with GitHub/files; **write permissions, hosting, auth/DB and models remain UNVERIFIED**. Upstream Paidguy is read-only in source connection; create authorized user-owned fork and pin inspected SHA.
- Open production decisions: exact licensed countries, manual deposit-to-user attribution, custody/payment provider, token contract identifiers, KYC/AML/sanctions, geographic blocks, real fees, full admin roles, regulatory approvals. Do not ask or require these for virtual demo.
- User accepts building/installing appropriate agent/skill if needed; ask only when it truly helps and give creation prompt plus checks.
- Cross-account file context and account connections do not auto-transfer: attach these docs, reauthorize GitHub/deployment, never share secrets in chat.

## 11. Precedence of historical decisions
- New Paidguy overrides Cassanova initial pick.
- Manual configured addresses override earlier automatic-wallet-generation suggestion.
- React/Vite reuse overrides earlier Next.js preference.
- Real-money launch moved explicitly outside 1–7 day / 10-prompt scope.
- Sportsbook deferred, not cancelled.
- Demo synthetic IDs replace any earlier suggestion to configure live wallet addresses for initial public demo.
- Privacy/security checks are not shortened to achieve a specific time or prompt budget.
