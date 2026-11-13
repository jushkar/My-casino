# MY CASINO — OPTIONAL AGENT/SKILL RULES

The user is willing to add or create AI agents/skills if and only if they measurably improve speed, quality or security. Do not slow the ten-prompt sprint by installing agents merely because they sound useful.

## When to suggest a new agent/skill
- Source analysis repeatedly misses files, inconsistent API shapes or licensing details → **Repository Integration Auditor**.
- Privileged admin API is built and security findings remain complex → **Dedicated Auth/RBAC Reviewer**, ideally independent of the implementing agent.
- Game regressions or dynamic-browser testing is bottlenecking → **Playwright QA Skill** for browser journeys, screenshots and traces.
- Deployment stalls from environment permissions or CI setup → **Deployment/CI Helper**.

## Agent creation contract (give user when needed)
Name, why now, prerequisites, precise tool access and guardrails, creation prompt, expected source files/outputs, objective acceptance and usage limits. Read-only access by default; do not grant production wallet, financial or secret permissions. No agent may self-certify an externally audited real-money system.

### Reusable build prompt for a dedicated QA agent

> Create an agent named **My Casino QA Gatekeeper**. It can read the authorized source fork, its diffs and CI/test artifacts, and run only approved test commands/browser checks in a sandbox. It must not transfer money, access wallet private keys, approve production releases, edit the real-money ledger, or grant itself repository/hosting privileges. Objective: independently verify Crash + eight game routes, virtual-credit-only UI, admin 401/403 denials, seven demo asset-network routes, address version retention, audit logging, mobile display and absence of payment APIs/valid receiver addresses. Return **PASS/FAIL/SKIP for every test with command, logs, file paths and actionable reproduction steps**. A skipped check is NOT a pass. Recommend fixes but never claim a security guarantee or deploy without approval.

**Important:** The ordinary Work/Codex agent may already run these checks. Use a separate agent only if it truly adds isolated review or parallel browser-testing capacity.
