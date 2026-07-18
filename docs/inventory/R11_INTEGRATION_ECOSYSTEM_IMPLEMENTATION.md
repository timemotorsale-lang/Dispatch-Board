# R11 Integration Ecosystem Implementation

Status: bounded repository and sandbox-harness implementation complete; provider activation pending  
Roadmap release: R11  
Milestone: M11  
Slices: IC-110 through IC-119

## 1. Outcome

R11 establishes `/integrations` as the manager-authorized operating workspace for provider boundaries. It replaces the earlier process-memory conflict queue with durable `EnterpriseIntegrationExchange` and `EnterpriseIntegrationConflict` records, purpose-built sandbox commands, immutable enterprise command/audit/event/outbox evidence, acknowledgement state, retry timing, owned reconciliation, and independent conflict verification.

The release is provider-neutral. It does not store credentials, perform a live network call, issue a partner credential, or activate a production adapter. External requests and signals never define internal domain completion without explicit acknowledgement and reconciliation.

## 2. Enterprise workspace

| Destination | Purpose |
| --- | --- |
| Overview | Capability truth, portfolio metrics, registry, exchanges, decision detail, and sandbox exercise |
| Systems registry | Owner, authority, direction, contract, mapping, environment, freshness, volume, fallback, and status |
| Source authority | Field/workflow authority and conflict rule without silent external overwrite |
| Exchanges | Durable inbound/outbound exchange, lineage, idempotency, version, attempt, acknowledgement, and failure state |
| Reconciliation | Missing, duplicate, mismatched, stale, rejected and out-of-balance owned cases |
| Sandbox pilots | Provider-neutral contract exercises with no credential or network call |
| Partner API | Scope, pagination, rate, idempotency, webhook, version and deprecation contract |
| Health | Shared outbox delivery and projection health |

The versioned read contract and sandbox commands use `/api/integrations`.

## 3. Approved registry

R11 registers eight explicit boundaries:

1. DMS & Accounting
2. VIN, History & Title
3. Market, Listing & Auction
4. Parts Vendors
5. Vehicle Transport
6. Messaging
7. Payment References
8. Governed Partner API

Every entry is `SANDBOX / CONTRACT_READY`. No entry is labeled pilot, active, or production.

## 4. Slice conformance

| Slice | Repository implementation |
| --- | --- |
| IC-110 | The eight-system registry records owner, authority, direction, resources, adapter/mapping versions, freshness, volume, failure fallback, environment and status. The source-authority matrix separates canonical facts, evidentiary/advisory facts, delivery acknowledgements and reference-only facts. |
| IC-111 | The adapter boundary requires organization context, contract/mapping version, idempotency key, request hash, correlation, lineage, direction, resource, external identity, bounded attempts and acknowledgement. Durable exchange commands atomically emit command, audit, domain event and outbox evidence. Credential values are prohibited; only a future external secret reference may cross that boundary. |
| IC-112 | Durable conflicts cover missing, duplicate, mismatched, stale, rejected and out-of-balance cases. Both snapshots remain preserved, the case is owned, and resolution requires another authorized manager before the exchange becomes reconciled. |
| IC-113 | The DMS/accounting sandbox contract can record sale/invoice/settlement packages, acknowledgement, rejection, amount/state mismatch and retry evidence. It performs no actual DMS/accounting call. |
| IC-114 | VIN/history/title is evidentiary and advisory. Source, capture context, expected/actual evidence and failures remain visible; the provider cannot silently overwrite Vehicle identity or title evidence. |
| IC-115 | Market/listing/auction contracts cover comparables, publication, offers and bids. Publication/offer acknowledgement remains distinct from advisory price recommendations. |
| IC-116 | Parts vendor contracts cover quote, order, acknowledgement, shipment, receipt, return and credit references, with reconciliation to authoritative Parts records. |
| IC-117 | Transport contracts cover request, confirmation, pickup, in-transit, delivery and exception signals, which must reconcile to internal custody and receipt evidence. |
| IC-118 | Messaging is consent-safe delivery only. Payment is reference-only. Payload validation rejects password, secret, token, authorization, PAN/card number, CVV/CVC and track-data fields. No card or credential data belongs in the exchange ledger. |
| IC-119 | The partner contract enforces active/expiring credentials, explicit scopes, cursor pagination capped at 100, bounded rate limits, idempotency request-hash conflicts, HTTPS webhook registration, versioning and deprecation. R11 issues no credential and activates no webhook. |

## 5. State and reconciliation rules

- Inbound and outbound direction are explicit.
- `REQUESTED` or `RECEIVED` is not provider acknowledgement.
- Matching acknowledgement preserves expected and actual evidence.
- Any detected mismatch moves the exchange to `RECONCILIATION_REQUIRED`.
- Retryable failure calculates a bounded next-attempt time; no unbounded retry loop exists.
- Conflict resolution never deletes or overwrites either snapshot.
- The conflict owner cannot verify their own resolution.
- Only verified resolution or accepted difference can move the exchange to `RECONCILED`.
- Production environment input is rejected by R11 repository commands.

## 6. Capability truth

- Adapters: `SANDBOX_HARNESS_ONLY`
- Credentials: `REFERENCE_BOUNDARY_NO_SECRETS`
- Partner API: `CONTRACT_ONLY_NOT_ISSUED`
- Production: `DISABLED`
- Migration: source-controlled, not applied by this task

## 7. Verification evidence

- TypeScript typecheck: passed.
- Focused R11 and regression tests: 3 files, 21 tests passed.
- Full lint: passed with zero warnings.
- Prisma schema validation: passed.
- Production build: passed; 147 pages generated, including `/integrations` and `/api/integrations`.

## 8. Activation boundary

Repository and harness completion does not authorize a provider pilot or production activation. The following remain pending:

- named actual providers, contracts, security review, credential vault integration, network allowlists and data-processing terms;
- provider-specific mapping fixtures and signed contract tests;
- webhook signature, timestamp, replay and origin validation;
- sandbox round trips against actual provider environments for all applicable success, duplicate, rejection, outage, retry and mismatch cases;
- authorized retry/replay/circuit-breaker controls, provider telemetry and support escalation;
- pilot roles, locations, volumes, success thresholds, pause/rollback, reconciliation sign-off and production migration application;
- R12 security, accessibility, performance, reliability, recovery and operational-readiness gates.

Until these gates pass, every registry entry remains sandbox-only and no provider state may be represented as live.
