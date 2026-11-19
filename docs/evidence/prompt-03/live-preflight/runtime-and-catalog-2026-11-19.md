# Prompt 3 read-only preflight, 2026-11-19 UTC

Feature branch `codex/prompt-03-staff-foundation` matched remote commit `8bf41c18b9e9c56ae925b3c1dc8d6bbee364c987` before this evidence update. Accepted Prompt 2 commit `879977e43db29eea8de20b5255c0404f09f8eb19` is an ancestor.

## Cloud runtime

The current enforced policy was **unrestricted**, observed revision 1. Source configuration version `ea1c37716810af0931fd7ccb93bc426f51b89593c5a1dda7636edff86274326e~cecfgver_6afe4242cb5c81a0af1a34270687c259` permitted the project host. One credential-free GET to `https://ymgbvbocajthwhrljadn.supabase.co/auth/v1/health` used the inherited proxy and default TLS verification. Proxy CONNECT returned 200, curl's certificate verification result was 0, the origin returned 401 and curl exited 0. Runtime HTTPS reachability passed. Earlier restricted-runtime CONNECT 403 results remain historical evidence.

## Supabase connector

The connector identified project `my-casino-dev`, ref `ymgbvbocajthwhrljadn`, in us-east-1 as ACTIVE_HEALTHY. The metadata SELECTs from `tests/owner/hosted-preflight.sql` were grouped into one result inside a read-only transaction. The connector also listed migrations.

| Check | Hosted observation |
|---|---|
| Database | PostgreSQL 17.11, SSL enabled on server. Connector inspector was postgres with CREATEROLE. |
| Migration history and collisions | Empty migration list, migration history relation absent. No matching draft owner roles, application relations, owner/staff functions or policies in the checked scope. |
| Default grants | Functions created by postgres in public default to EXECUTE for anon, authenticated and service_role. The draft revokes those grants before granting authenticated access to public.owner_action. Resulting ACLs are untested. |
| Data API exposed schemas | UNVERIFIED. The inspector's pgrst.db_schemas was NULL and the allowlisted role/database settings query returned zero rows. Exclusion of mc_owner_private remains UNVERIFIED. |
| Auth configuration | JWT lifetime in seconds, TOTP enrollment and TOTP verification remain UNVERIFIED. The attached connector has no Auth or Data API configuration reader. |
| Dedicated gateway TLS and login | NOT RUN |
| Real owner and non-owner access, hosted RLS enforcement, persistence | NOT RUN |

## Owner readback on iPad

In Safari, open the project pages below and report only the displayed fields. If the Data API is disabled and the list is hidden, report that state.

| Dashboard page | Nonsecret field |
|---|---|
| [Data API → Settings](https://supabase.com/dashboard/project/ymgbvbocajthwhrljadn/integrations/data_api/settings) | **Exposed schemas**. Copy the complete list to determine whether mc_owner_private is excluded. |
| [Authentication → Sessions](https://supabase.com/dashboard/project/ymgbvbocajthwhrljadn/auth/sessions) | **Access token expiry time**, in seconds. |
| [Authentication → Multi-Factor](https://supabase.com/dashboard/project/ymgbvbocajthwhrljadn/auth/mfa) | **TOTP (App Authenticator)**. Enabled means enrollment and verification enabled. Verify Enabled means verification only. Disabled means both off in the Dashboard control. |

## Separate owner approvals still outstanding

- Approve the exact migration and backup/restore and migration-runner plan.
- Approve the dedicated gateway role login, credential provisioning and verified TLS connection.
- Approve owner and non-owner test identities, owner binding, MFA enrollment and recovery custody.
- Review the current Auth settings before approving any necessary change to the proposed 300-second JWT lifetime or password, signup and TOTP configuration.
- Accept or redesign the gateway-attestation, public definer RPC and revocation tradeoffs before authorizing enumerated live integration tests.

Prompt 3 remains partial. This continuation performed read-only provider checks and changed repository documentation only.
