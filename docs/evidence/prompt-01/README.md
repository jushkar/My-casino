# Prompt 1 evidence index

Captured in the authorized `/workspace/My-casino` environment on 2026-11-13 UTC. Log files contain actual stdout/stderr, command, UTC start and exit code; `checks.json` indexes the baseline commands. No historical passing test claim was reused.

| Check | Result | Evidence |
|---|---|---|
| ZIP CRC + all 18 included Markdown SHA256 hashes | PASS | `transfer-integrity.log` |
| Authorized project owner / push access; upstream read-only | PASS (connector metadata) | `github-access.json` |
| Live origin/upstream main and fetched source tree identity | PASS | `origin-head.log`, `upstream-head.log`, `source-pin.log` |
| Node/npm availability | PASS | `runtime.log`, `npm-version.log` |
| Bun availability | UNAVAILABLE, exit 1 (nonblocking; npm scripts used) | `bun-availability.log` |
| Installed direct dependencies | PASS inventory, exit 0; not a vulnerability audit | `installed-dependencies.log`, `dependencies.json` |
| TypeScript baseline | PASS, exit 0 | `typecheck.log` |
| Build baseline | PASS, exit 0 | `build.log` |
| Unit/integration/browser/gameplay/mobile tests | NOT RUN in Prompt 1; no existing test script | `dependencies.json` manifest scripts; `docs/SOURCE_INVENTORY.md` |
| Staff 401/403, CSRF, persistence, concurrency tests | NOT RUN; backend not implemented | `ARCHITECTURE_DECISION.md` planned gates |
| Full dependency advisory/transitive-license audit | NOT RUN; release requirement | `docs/SOURCE_INVENTORY.md` |
| Clean dependency installation | NOT RUN; preinstalled dependencies used | stale Bun lock risk in source inventory |
| Deployment | NOT RUN / NOT AUTHORIZED in Prompt 1 | inherited workflow reviewed; feature branch only |

## Additional commands actually executed

Repository discovery and source review used `pwd`, `rg --files`, `ls -la`, `unzip -l`, `find /workspace -name AGENTS.md -not -path '*/node_modules/*' -print`, `git status --short --branch`, `git remote -v`, `git log -5 --format='%H %s'`, `git ls-files`, `git branch -avv`, and focused `cat`, `sed -n` and `rg -n` reads of the files identified in SOURCE_INVENTORY. No AGENTS.md was found. Read `/etc/codex/network-policy.json`; cloud status reported connected/running, current observations, enforced restricted policy, no configured provider secrets/identities. No environment change was made.

Python standard-library commands extracted the ZIP into `/workspace/scratch/my-casino-transfer` with path containment checks; `ZipFile.testzip()` and `hashlib.sha256` checked archive/manifest. All eight required FINAL documents and the optional skill/agent guidance were read. The final runbook was reread separately after initial output truncation. Python read installed `package.json` manifests for dependency/version/license/hook metadata and captured subprocess command output to these logs. Metadata JSON is labeled as normalized connector observations, not raw API output.

Branch/provenance setup commands:

```sh
git switch -c codex/prompt-01-baseline
git remote add upstream https://github.com/Paidguy/casino.git
git fetch --no-tags upstream main
git diff --exit-code HEAD upstream/main
git rev-parse HEAD^{tree} upstream/main^{tree}
```

The initial runtime probe chained `command -v bun` before `npm ls --depth=0`; it exited 1 on absent Bun, so npm ls did not run in that probe. npm ls and each baseline command were then executed separately and captured. No failure is counted as a successful test.

No `npm install`, `npm test`, lifecycle install script, payment action, wallet connection, Actions dispatch or deployment command was executed. Future steps must retain this distinction.

The first staged `git diff --cached --check` returned exit 2 because three captured logs ended in an extra blank line; the commit command did not run. Log EOFs were normalized to one newline (command output content unchanged), then the staged whitespace check was rerun. This was a documentation-format check failure, not a failed app build/typecheck.
