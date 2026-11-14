# ADR-002 — Proposed staff sessions without managed Auth access

Date: 2026-11-14 UTC. **PROPOSED; explicit owner acceptance required. Prompt 3 PARTIAL/BLOCKED.**

This is a reviewable amendment to [ADR-001](../../ARCHITECTURE_DECISION.md), not an accepted relaxation of its immediate disable/revocation requirement. React/Vite, Fastify, Supabase Auth/PostgreSQL and the virtual-credit-only boundary remain. Both production startup and activation through the normal development entrypoint are disabled. No provider changes have been made.

## Evidence and problem

The owner reports that the development project's `auth.sessions` is owned by `supabase_auth_admin`, RLS is enabled without policies, and `postgres` cannot SET ROLE to that owner. Those facts invalidate the earlier policy/grant proposal. We did not query the owner project in this task. The active draft now contains **no managed Auth DDL, grants, policies, SELECTs, foreign keys or helper dependencies**. The older draft is retained as historical evidence only.

Official sources were consulted through documentation search, not project access. [getUser](https://supabase.com/docs/reference/javascript/auth-getuser) makes an Auth network request; [getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims) verifies the signature with JWKS (which may be cached), or Auth for symmetric keys. Neither reference promises immediate rejection of every externally revoked session. [Sign-out](https://supabase.com/docs/guides/auth/signout) explicitly says issued access tokens remain valid until expiry. [Sessions](https://supabase.com/docs/guides/auth/sessions) documents session-row checks, but also delayed cleanup for certain expiry policies. It does not establish permission to add managed-table policies.

[MFA](https://supabase.com/docs/guides/auth/auth-mfa) documents signed `aal` and `amr` entries, including password and TOTP timestamps, and explicitly describes restricting operations to recent password authentication. Live timestamp preservation during refresh/challenge, session-ID behavior, user disablement and clock skew still need verification. There is no invented introspection API, revocation webhook, admin session-list guarantee or assumed universal logout notification in this design.

## Alternatives considered

| Option | Identity/MFA and security guarantee | Revocation and refresh behavior | Database privileges / network | Complexity and compatibility |
|---|---|---|---|---|
| A. Per-request getUser + getClaims + current database role | Auth-backed identity, signature-verified AAL2, no metadata-based role authority; outages deny BFF access | Does not prove arbitrary external session revocation. SDK refresh can occur while loading a session even with automatic refresh disabled. Refresh must be explicitly controlled | User-scoped Data API, no service key; Auth on every BFF request, JWKS as needed, PostgreSQL for roles | Small, supported SDK surface, but insufficient alone for the previous immediate-revocation contract |
| B. Supported signOut / provider session controls | Supported local/global/others logout requests; provider time limits apply at documented lifecycle points | Revokes provider refresh/session state; existing JWTs may remain valid. Token expiry is not proof of immediate logout. Repeated refresh as a probe is not documented as universal introspection and has reuse exceptions (default 10 seconds) | Auth endpoint; no managed-table permissions for SDK logout. Strong documented row-existence check would need managed access that we cannot safely assume | Supported logout is retained. Managed policies, Auth-owner bridge, BYPASSRLS helper and service-key-based custom introspection are rejected |
| C. Private durable application registry | Database role + AAL2 + signed session ID + opaque capability; durable tombstone and expiry, current role every operation; atomic audit | Precise local application revocation, independent of process memory. External provider revocation is not automatically copied into it. No refresh may resurrect a tombstone | Only application schema/tables/functions; same user JWT through PostgREST. DB must be reachable; BFF also requires Auth | Moderate, small schema; no coupling to managed Auth table layout/ownership |
| D. Short provider JWT lifetime / bounded staff window | Signed exp and AAL2 with a measurable residual window | A 5-minute JWT TTL alone still depends on refresh/revocation semantics. An arbitrary later first-use or refreshed iat anchor can reopen access; do not use either as a lifetime reset | Changing provider JWT TTL requires separate owner approval and affects other clients; no DB managed access | Provider recommends not going below 5 minutes. Refresh, skew and in-flight work must be tested. Insufficient alone for immediate revocation |

## Recommended proposal: A + C with a stricter form of D

Use a **non-renewable, five-minute staff window** anchored to the earliest signed `amr` password-authentication timestamp. It is not anchored to first staff use, JWT `iat`, refresh time, or a client timestamp. Require a fresh password sign-in and provider TOTP challenge for staff entry. No public signup, enrollment, self-elevation, OAuth or magic-link entry is added.

For each privileged BFF request, load the cookie session only as transport, call `getUser(access_token)`, verify with `getClaims(access_token)`, validate issuer/audience/user ID/session ID/exp/password age, require signed AAL2, then use user-scoped SQL authorization. JWT signature verification is the SDK/PostgREST responsibility; the SQL harness's claim injection is not signature verification.

At successful MFA, the BFF generates 32 random bytes for a new HttpOnly/Secure host-only capability cookie. The application registry stores its SHA-256 hash, signed provider session ID and user ID. SQL opening also checks active `wallet_admin`, AAL2 and the signed primary-authentication time. Registry expiry is immutable: `min(password_auth_time + 300 seconds, JWT exp at opening)`. `ON CONFLICT DO NOTHING` never replaces another capability or resurrects an existing session. No runtime DELETE or expiry-update permission exists.

Every protected SQL operation repeats identity, AAL2 and active-role checks and locks that session row until its transaction ends. Expiry is evaluated using wall time after obtaining the lock. READ COMMITTED is required; other isolation modes fail closed. App logout upserts a tombstone, including when it races before MFA/open, and appends an audit event in the same transaction. Reads/writes/open/close serialize on this state. A request authorized before logout can finish before logout acquires the lock; logout does not undo previously authorized work. Subsequent requests and replays are denied.

There is no BFF refresh endpoint. A transport allowlist blocks every `/auth/v1/token` grant except password before any network request, independently of the SDK's automatic-refresh setting. Redirects are rejected, outbound provider origin is fixed, and each fetch has a ten-second timeout. Tokens nearing expiry may be denied early when the SDK attempts refresh. Access/refresh tokens stay in server-managed HttpOnly cookies, never frontend JavaScript or localStorage. The refresh token is not used to extend staff access. Theft of a complete live JWT/capability remains bearer-token theft; we do not claim elimination of replay during a valid window or idempotent record creation.

### Precisely bounded limitations requiring approval

This proposal **does not meet ADR-001's immediate arbitrary external-provider revocation requirement**. Assuming provider password AMR timestamps are authentic and do not advance on refresh/MFA, and clocks are synchronized, access cannot be authorized at or after password time + 300 seconds (or the earlier saved/token expiry). The residual after external logout is at most the remaining part of that interval, not a new five minutes after each request/logout/refresh. Real validation of these assumptions is BLOCKED. Do not present 300 seconds as a measured live guarantee yet. In-flight operations are not canceled at the deadline.

This replaces the previous 30-minute staff idle / eight-hour absolute proposal with a stricter five-minute absolute staff window. No activity extends it, including successful activity. First access after 31 minutes is deliberately denied and requires fresh authentication. This is a stated policy change, not the old incorrect `last_seen = session creation` idle calculation.

**Direct Data API boundary:** authenticated public RPCs must be assumed callable directly with a provider JWT; they are not private because their URLs are obscure. They independently enforce active DB role, AAL2, signed primary-authentication freshness, session tombstones, capability and RLS. A valid staff JWT holder can directly open a capability; the capability is not proof of BFF origin. Such calls do not execute BFF `getUser`, CSRF, Origin or IP limits. They can remain usable during an Auth-only outage or external logout inside the same bounded window if PostgREST/DB remain available. BFF requests fail closed on Auth outage; all paths fail closed on required database failure. **Accepting this direct-path distinction is part of the explicit tradeoff**, not a claim of universal online Auth introspection. If the owner requires online Auth availability for every direct RPC as well, this proposal is insufficient; keep it disabled and separately design a narrowly scoped server-attestation boundary.

No custom user-editable claim hooks may issue/modify trusted `sub`, `session_id`, `aal`, `exp`, `role` or password `amr` semantics. Actual project signing configuration and PostgREST issuer/audience validation must be reviewed before activation.

### Different events are not interchangeable

| Event | Effect / limitation |
|---|---|
| Application logout | Durably closes this application session first, even after staff demotion or AAL downgrade, using an otherwise valid user JWT. Clears cookies only after local revocation succeeds. DB failure reports failure; it does not claim invalidation |
| Local staff-session revocation | Registry tombstone denies all subsequent operations for that provider session ID, including refreshed JWTs; an operator may separately disable the authoritative staff role for all that user's sessions |
| Provider logout | BFF requests supported `signOut({scope:'local'})` after local close. API reports whether SDK succeeded or provider outcome was unconfirmed. Neither means outstanding JWTs disappeared |
| External provider logout | No assumed callback into the registry. getUser may reject, but if it still accepts the JWT the bounded residual is explicit |
| Provider token expiry | Deny the token even if application expiry is later; blocked SDK refresh requires reauthentication. Saved registry expiry never extends |
| Application expiry | Deny even if the provider token/session remains valid. No automatic renewal and no resetting a row on first-use retry |
| Provider administrative disablement/deletion or MFA removal | Detection depends on what the supported Auth verification actually returns and on signed-claim expiry; no untested immediate-ban or immediate-AAL-downgrade promise. Emergency application role disablement provides the app-controlled boundary |
| Application role disablement | Current DB role denies the next authorized operation regardless of old JWT metadata; in-flight operations already authorized are not retroactively undone |

## Acceptance and activation gates

Explicit owner acceptance of the bounded external-revocation/direct-Data-API tradeoff and five-minute reauthentication policy is required. Review readiness is not approval. If the owner retains the exact original immediate external requirement, no compliant implementation has been established with the available supported interfaces; stay BLOCKED.

After acceptance, a separately authorized live test phase must verify claims/signatures, MFA and password AMR behavior through refresh, logout/disablement outcomes, direct RPC denials, actual hosted PostgreSQL privileges/RLS, durable state across BFF restarts, HTTPS cookies/CSRF and proxy/rate limiting. The startup guard must not be removed simply because local tests pass. See [provider plan](../evidence/prompt-03/provider-change-plan.md) and [evidence](../evidence/prompt-03/auth-redesign/README.md). No deployment authorization is sought here.
