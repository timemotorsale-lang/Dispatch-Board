# Inventory Console Gap Closure — Wave 5 Integration Hardening

**Branch:** `codex/inventory-console-gap-closure-wave-5-integration-hardening`  
**Scope:** Repository acceptance for IC-111 and IC-119  
**Status:** Implemented and verified in the repository; migration and provider activation pending

## Outcome

Wave 5 replaces the remaining process-memory security boundary with a durable, manager-governed sandbox control plane. `/integrations/security` exposes credential-reference policy, signed webhook subscriptions, verified delivery receipts, and partner-request authorization evidence without returning or storing secret values.

This closes repository acceptance only. It does not select an actual provider, configure a production vault, perform a provider round trip, apply the migration, or authorize pilot/production traffic.

## Implemented controls

| Boundary | Repository behavior |
| --- | --- |
| Credential references | Durable partner/system/key ownership, supported scopes, exact HTTPS origins, bounded rate, expiry, idempotency and request-hash conflict detection |
| Secret values | `env://` and `vault://` references only; values are resolved outside the database and never returned by the read model |
| Webhook registration | Active sandbox credential with `webhook:manage`, HTTPS URL, exact-origin allowlist, event allowlist, API version, bounded timestamp tolerance and external secret reference |
| Webhook ingress | One-megabyte limit, valid JSON, prohibited sensitive-field rejection, HMAC-SHA256 verification, exact version/origin/event matching and timestamp replay window |
| Replay defense | Unique organization/subscription/delivery identity plus fail-closed duplicate rejection |
| Delivery evidence | Hash-only durable receipt with delivery, event, version, origin, key ID, verification state and timestamps; no provider payload or secret retained |
| Partner authorization | Durable credential expiry/revocation/scope checks, API version validation, rolling rate enforcement, idempotency request-hash conflict detection and correlation ID |
| Domain authority | A verified callback records provider evidence only; it performs no owning-domain mutation and cannot define workflow completion |

## Durable records

- `IntegrationCredentialReference`
- `IntegrationWebhookSubscription`
- `IntegrationWebhookDelivery`
- `IntegrationPartnerRequest`

The source-controlled migration is `20260718234500_inventory_console_gap_closure_wave_5`. It is intentionally not applied by this branch.

## Slice disposition

| Slice | Result |
| --- | --- |
| IC-111 | Repository complete: the existing durable adapter/exchange harness is now backed by external-only credential references, signed/replay-protected ingress, metrics, and focused contract tests |
| IC-119 | Repository complete: partner scope, expiry, rate, idempotency, API version, exact-origin webhook signature, timestamp, replay and audit-ledger behavior is durable |
| IC-110 | Still decision-blocked: actual systems, provider owners, volumes and source-authority matrix are not approved |
| IC-113–IC-117 | Still require external evidence: no real provider sandbox or pilot round trip has been executed |

The vertical-slice audit therefore moves from 60 complete / 40 partial to 62 complete / 38 partial. The 17 external-evidence and 4 decision-blocked counts do not change.

## Verification

- Prisma schema validation
- TypeScript typecheck
- Focused HMAC, origin, version, timestamp, secret-reference, safe-read-model and durable-ledger tests
- R11 regression tests
- 121-slice conformance audit
- Full lint, test suite and production build

## Activation boundary

Before any real provider traffic is enabled, the program still needs an approved actual-system registry, external credential-provider configuration, key rotation/revocation exercises, network allowlists, provider-specific certified contract tests, reconciled sandbox round trips, security review, deployment evidence, pilot authority, pause/rollback evidence and the applicable R12 gates.
