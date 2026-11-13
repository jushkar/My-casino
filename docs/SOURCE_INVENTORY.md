# Prompt 1 source and route inventory

Observed 2026-11-13 UTC at source commit `0e2c5317d0004488ec234f20c58c1fcceba3b7a0`.

## Provenance and access

- Authorized project: [jushkar/My-casino](https://github.com/jushkar/My-casino), repository ID `1456860025`; authenticated GitHub login `jushkar`, connector push/admin true and collaborator permission admin.
- Upstream: [Paidguy/casino](https://github.com/Paidguy/casino), ID `1137422412`, pull true / push false. No upstream write attempted.
- Both remote `main` refs, original checkout HEAD and fetched `upstream/main` equal the source SHA above. Both Git trees: `720db7d9f85e65da5e10228ddc07cc5073a673d1`. `git diff --exit-code HEAD upstream/main` succeeded before documentation changes.
- This proves the selected source baseline is identical. The normalized connector metadata omits `fork`/`parent`; no unverified claim of GitHub fork-network membership is made. The writable user repository is sufficient for the runbook.
- Initial checkout branch `work`; untracked pre-existing `node_modules/` and `dist/`. No tracked source modifications. Work continues on `codex/prompt-01-baseline`.
- Final handoff was read from the attached ZIP and preserved unchanged at [transfer/v2.0](transfer/v2.0). ZIP CRC and all 18 Markdown hashes passed: [integrity evidence](evidence/prompt-01/transfer-integrity.log). Historical files are provenance only.

## Actual project structure

| Area | Actual files / purpose |
|---|---|
| Entry and routing | `index.html`, `index.tsx`, `App.tsx`; React 18 `HashRouter`, 19 explicit routes plus wildcard lobby |
| Shared UI | `components/Layout.tsx` shell/cashier/vault; `GameArtwork.tsx` inline SVG; `GameStudioBar.tsx`, `Leaderboard.tsx`, `LiveFeed.tsx` |
| Pages | 14 game pages, lobby, public House Controls, fairness, transactions and statistics |
| Simulation | `services/engine.ts`, `types.ts`; localStorage virtual bankroll, bets, history, seed/math helpers |
| Audio | `services/audio.ts`, `services/sound.ts`; browser Web Audio synthesis |
| Build/style | Vite, TypeScript strict/noEmit, Tailwind/PostCSS; `build` is `tsc && vite build` |
| CI | `.github/workflows/main.yml`: unpinned npm install, build, then GitHub Pages deployment on main push or manual workflow dispatch |
| Absent | Backend, migrations/DB, login/session middleware, secure staff API, test script/test suite |

## Routes in App.tsx

Browser URLs currently use `/#/path`. Presence in source is **not** proof of playable/browser-tested behavior.

| Route | Component | Blueprint disposition |
|---|---|---|
| `/` | Lobby | Preserve layout; brand/filter in Prompt 2 |
| `/crash` | Crash | Mandatory; page contains its own Layout and canvas animation |
| `/dice` | Dice | Mandatory |
| `/roulette` | Roulette | Mandatory |
| `/mines` | Mines | Mandatory |
| `/plinko` | Plinko | Mandatory |
| `/blackjack` | Blackjack | Mandatory |
| `/wheel` | Wheel | Mandatory |
| `/baccarat` | Baccarat | Mandatory |
| `/keno` | Keno | Mandatory |
| `/coinflip` | Coinflip | Optional; keep only after smoke tests |
| `/andarbahar` | AndarBahar | Optional; keep only after smoke tests |
| `/slots` | Slots | Exclude; currently still reachable, remove/block in Prompt 2 |
| `/teenpatti` | TeenPatti | Exclude poker-like game; currently reachable |
| `/matka` | Matka | Unapproved; currently reachable |
| `/admin` | Admin | Public educational controls; not protected staff |
| `/fairness` | Fairness | Educational client-side verifier; no money certification |
| `/transactions` | Transactions | Local sample receipts; cash-like language needs cleanup |
| `/statistics` | Statistics | Local session charts/reset |
| `*` | Lobby | Current catch-all; ensure excluded routes cannot revive games through menus/direct links |

Poker, Live Casino, Limbo, Hi-Lo, Tower and Sportsbook have no dedicated routes in this source. Teen Patti is explicitly excluded. Nine mandatory games and every original game source remain untouched by Prompt 1.

## Existing behavior and evidence anchors

- `App.tsx:90–109` declares the routes; `App.tsx:65` onward includes INR wallet repair copy. No route-level authentication.
- `pages/Admin.tsx:17` credits demo funds, resets bankroll and toggles turbo; `services/engine.ts:876` toggles browser `isAdmin`. These do not control a server.
- `components/Layout.tsx:106–128` calls local `deposit`/`withdraw` and displays transfer-like success messages; its deposit panel contains a hardcoded merchant UPI string and QR-like SVG. No ownership/payability verification was performed; treat these as release blockers and remove them, without contacting any recipient.
- `services/engine.ts:379–443` loads/saves localStorage; `:737–757` adds/subtracts local balance and logs sample transactions. No payment processing was found in those paths.
- `pages/Crash.tsx:141` starts rounds with stake deduction; `:182` schedules animation; `:242` and `:271` settle local bets/cashouts. RNG and seeds live on the client; `randomHex` uses `Math.random`. These mechanisms are educational, not server-authoritative settlement.
- README describes BroadcastChannel sync, but no BroadcastChannel implementation was found in the inspected source. Do not treat the README's multi-tab/atomicity claims as verified behavior.
- Focused source search found no `fetch`, XMLHttpRequest, WebSocket, browser env-secret reference or `dangerouslySetInnerHTML` in application files. This is static inspection, not a network trace or complete secrets/security audit.

## Dependencies, scripts and license

Reviewed `package.json`, TypeScript/Vite configs and CI before running build/typecheck. Root scripts contain no install/prepare lifecycle hooks. No dependency installation or lifecycle script was run in this task: the environment already had node_modules. Installed-package hook metadata is recorded in [dependencies.json](evidence/prompt-01/dependencies.json); esbuild has a postinstall binary installer, so a future clean install must review hooks and use scripts disabled initially.

Runtime: Node `v24.22.1`, npm `11.9.0`; Bun unavailable (`command -v bun` exit 1). `npm ls --depth=0` exit 0. Installed direct dependencies: React/React DOM `18.3.1`, React Router `6.30.6`, lucide-react `1.72.0`, Recharts `2.15.4`; tools: TypeScript `5.9.3`, Vite `5.4.21`, Tailwind `3.4.19`. Full requested/installed versions and declared direct licenses are in the evidence JSON.

The checked-in `bun.lock` is stale: workspace name `losslimit-casino` and Express/cors/tsx dependencies differ from the actual `maharaja-club-casino` manifest. No root npm lockfile exists. Baseline passed with the prepared environment, **not a clean frozen-lockfile install**. Repair/select one reproducible package-manager lock and validate a clean install before release; do not infer an Express backend from obsolete lock entries. No dependencies were upgraded in Prompt 1. Full transitive vulnerability/license review remains due before release; successful compilation is not an audit.

`LICENSE` is MIT, copyright 2025 Maharaja Exchange Contributors; file and notice are preserved verbatim. Direct packages declare MIT, ISC (lucide-react) and Apache-2.0 (TypeScript). Preserve distributed license/notice obligations, including transitive packages; this is a declaration inventory, not a legal rights clearance. Graphics inspected are inline SVG/canvas, audio is synthesized; `index.html` loads Google Fonts (Outfit, JetBrains Mono, Plus Jakarta Sans). Font redistribution/SIL-OFL and any third-party brand/asset rights require final release review; avoid claiming all assets are independently cleared.

## Baseline result and handoff

`npm run typecheck`: PASS, exit 0. `npm run build`: PASS, exit 0, Vite transformed 2128 modules. Build generated `dist/index.html`, CSS 61.24 kB and JS 466.65 kB; generated files are ignored, not committed or deployed. Logs are in [evidence/prompt-01](evidence/prompt-01).

No `test` script exists. No unit/integration/browser/gameplay/mobile or 401/403 test was run in Prompt 1. These are NOT RUN, never passing. Prompt 2 needs real browser evidence for all nine routes and Crash/manual cashout/mobile, plus the exact UI and excluded-route cleanup in the final runbook. Staff security/persistence tests begin after Prompt 3 implementation.
