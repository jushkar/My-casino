# Historical Bun lockfile

`bun.lock` is retained byte-for-byte from the Paidguy baseline. It describes a different workspace (`losslimit-casino`) and unused Express/cors/tsx dependencies. It is archived here rather than silently discarded. It is not an installation input for this application.

The supported package manager is npm 11.9.0 on Node 24.22.1. Use the root `package-lock.json` and `npm ci --ignore-scripts --no-audit --no-fund`, then `npm run typecheck` and `npm run build`. The clean installation evidence is under `docs/evidence/prompt-02/closure/`. The esbuild platform binary is supplied by its optional platform package; the clean build verifies that install scripts are unnecessary for this tested Linux platform. Other platforms must run the same checks; do not assume binary availability.
