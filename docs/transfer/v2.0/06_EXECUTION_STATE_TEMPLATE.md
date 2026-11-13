# EXECUTION_STATE.md — REQUIRED PER-PROMPT COMMIT TEMPLATE

Keep a *single compact updated file* in the writable repository. This template is not evidence of any actual completed work.

```markdown
# My Casino Execution State

- Current milestone: X/10
- Gate: PASS | FAIL | BLOCKED | PARTIAL
- Upstream source repo: https://github.com/Paidguy/casino
- Pinned upstream base SHA: [actual verified SHA]
- Writable project repository/branch: [actual user-owned URL/branch]
- Current HEAD commit / PR: [actual SHA/PR or NOT AVAILABLE]
- UTC date/time: [observed]

## Scope completed
- [what is implemented and what remains mock]

## Source changes
| Path | Change | Why |
|---|---|---|
| ... | ... | ... |

## Checks actually executed
| Command or browser test | Result | Evidence path/log | Notes |
|---|---|---|---|
| ... | PASS/FAIL/SKIP | ... | ... |

## Security posture
- Virtual-credit only confirmation:
- No payable receiving addresses/QR/real payment calls:
- Negative auth tests (401/403):
- Known risk (severity + owner):

## Blockers / approvals
- [missing permission/provider access/cost/hosting authorization]

## Next prompt handoff
- Prompt number:
- Model recommended:
- Prerequisite input/files:
- Exact acceptance checks:
```

Rule: a summary written by an agent without a real commit/test reference is NOT proof. If privileges to commit are absent, report `BLOCKED` and produce a safe patch/diff as artifact. Avoid logging tokens, secrets, personal data and real wallet private material. On every step, also preserve short `CHANGELOG` or PR description if useful.
