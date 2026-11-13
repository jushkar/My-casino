# MY CASINO — ACCEPTANCE CRITERIA & SECURITY GATES (FINAL)

The following are **requirements**, not currently executed test results. Independent external audit is for **future licensed real-money operation**; the ten-prompt demo requires realistic QA and a focused security review but does not claim certification.

## A. Virtual demo acceptance (all mandatory unless explicitly noted)

### Source and build
- [ ] GitHub user-owned repo is writable; the fork's upstream and pinned base SHA are recorded, with MIT and third-party license notices preserved.
- [ ] Dependencies and scripts were reviewed before installation/execution; build and TypeScript typecheck both actually completed (with logs), or the launch is BLOCKED.
- [ ] Build/release can be reproduced from commit/tag and rolled back.

### Gameplay and front end
- [ ] My Casino branding works without disruptive layout changes.
- [ ] Required **nine** routes playable with virtual credits: Crash, Dice, Mines, Roulette, Blackjack, Baccarat, Plinko, Keno, Wheel.
- [ ] Crash animation, bet/cashout interactions function in browser demo tests; no claim of server-side fair settlement for money.
- [ ] Unsupported Slots, Poker/Teen Patti, Live Casino and Matka are not advertised or accessible as active approved games.
- [ ] Main desktop and mobile screens and navigation have no blocking errors.
- [ ] Public screens clearly state: *VIRTUAL CREDITS ONLY — NO MONETARY VALUE — NO DEPOSITS OR WITHDRAWALS*.
- [ ] Old INR/UPI/Paytm/IMPS mock payment flow cannot be mistaken for completed real deposits/withdrawals.

### Safe wallet-admin prototype
- [ ] All **seven** distinct route identities are configured independently.
- [ ] Stored demo recipient IDs are **synthetic and nonpayable**; no live blockchain address, funding QR or payable URL exposed.
- [ ] Valid staff identity + server-side authorization is required on EVERY mutating API; test unauthenticated 401 and non-admin 403.
- [ ] Admin can add, replace-as-new-version, disable, archive, view prior versions and manage demo route/fee/limit settings via UI.
- [ ] Address replacement does NOT overwrite or erase old versions; archived records stay readable in audit history.
- [ ] Route pair uniqueness and stale version/concurrent edit protection tested.
- [ ] Audit log records actor, time, action, reason and before/after reference; anonymous write attempts cannot mutate DB.
- [ ] Session expiration / CSRF / relevant XSS and injection defenses checked, and client bundle contains no privileged credentials.
- [ ] Staff frontend remains inaccessible or private if any security gate fails. Existing public educational `/admin` is not claimed as privileged.

### Deployment and truthfulness
- [ ] Release was approved by user through appropriate hosting interface and is at a **verified HTTPS URL**.
- [ ] Staging/production demo environment secrets and DB access are separated; backup/rollback instructions exist.
- [ ] Relevant regression/negative/browser test logs available, all failed checks recorded, no unexplained skipped checks called “passed”.
- [ ] No known unresolved public-demo Critical/High security flaw; release notes include limitations and risk controls.

**Demo decision:** PASS only after mandatory checks; PARTIAL if virtual casino is safe but protected staff admin withheld; BLOCKED if payments/unsafe admin/error/permission blockers remain. Ten prompts do not override this gate.

## B. Real-money platform: future, separate launch checklist

### Licensing and customers
- [ ] Jurisdiction-by-jurisdiction licensing and legal advice, geographic restrictions, age verification, KYC, AML, sanctions screening, privacy and responsible-gaming controls.
- [ ] Consumer notices, actual provider contracts and dispute/withdrawal handling approved for target markets.

### Custody and blockchain
- [ ] Design reviews for native BTC/ETH/BNB/SOL/GRAM and exact USDT ERC20 vs BSC contract/token IDs, decimals, network identifiers and provider support.
- [ ] Reliable **per-user deposit attribution** despite manual address management; never an ambiguous shared address.
- [ ] Monitoring of old/deactivated addresses, confirmations, reorgs, chain outages, duplicates and replay.
- [ ] Private keys never in client/frontend/admin DB/chat; isolated signer, least privilege, custody policy, cold/hot storage, recovery and emergency stops.
- [ ] Withdrawals: approved recipient binding, 2FA/admin dual authorization for sensitive actions, thresholds, risk/AML checks, rate limits and secure signing.
- [ ] Fees: distinguish platform fee waived from blockchain network fee sponsored by operator; consistently record cost and user-facing terms.

### Accounting and games
- [ ] Double-entry ledger with immutable entries and authorized corrections, integer smallest units per asset, idempotency, atomic reservation/settlement, concurrency test, reconciled liability/reserve balances.
- [ ] Server-authoritative per-game randomness and payouts, published rules/house edge, appropriate proof and independent randomness/math tests, no player-targeted result manipulation.
- [ ] Real-time Crash bets/cashout/downtime/fraud edge cases handled and independently assessed.
- [ ] Sportsbook (if/when enabled): licensed odds/results feed, event settlement/void rules and risk management.
- [ ] Bonus codes have atomic capacity enforcement for **10,000 distinct eligible users**, budget caps, expiration, KYC and anti-abuse.

### Assurance and operations
- [ ] Source/dependency security audit, penetration test, OWASP ASVS target profile, threat modeling, incident response and backups/disaster recovery.
- [ ] Qualified external game/RNG/casino software testing and certifications according to relevant jurisdiction.
- [ ] Formal release/change approvals, monitoring, secure operations and readiness decision signed off by accountable humans.

**Real-money launch decision:** NOT AUTHORIZED by any demo checklist or 10-step runbook. Never infer a licence or safety certification from the virtual prototype.
