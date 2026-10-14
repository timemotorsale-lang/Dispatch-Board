# R9 Disposition & Wholesale Implementation

Status: bounded repository implementation complete; activation pending  
Roadmap release: R9  
Milestone: M9  
Slices: IC-090 through IC-099

## 1. Outcome

R9 establishes `/vehicles/disposition-wholesale` as the permission-aware operating workspace for vehicle disposition and wholesale. It adds a controlled `InventoryDispositionCase` aggregate linked one-to-one with the canonical `InventoryUnit`; it does not create another vehicle identity or lifecycle authority.

The release covers candidate review through acknowledged settlement. Every consequential transition is a purpose-built, version-checked command with immutable event evidence. Recommendations explain and rank work but cannot approve, activate, accept an offer, release a vehicle, or close a settlement.

## 2. Enterprise workspace

The approved seven local destinations have stable URL state:

| Destination | URL state | Primary purpose |
| --- | --- | --- |
| Overview | `/vehicles/disposition-wholesale` | Portfolio totals, milestone health, capability truth, and current queue |
| Candidates | `?view=candidates` | Advisory candidates and accept, defer, dismiss, or reopen review |
| Appraisals | `?view=appraisals` | Evidence-based disposition valuation and freshness |
| Channels & Listings | `?view=channels` | Exact channel, reserve, price, fees, and activation decisions |
| Offers & Bids | `?view=offers` | Immutable offer versions, normalized net, expiry, and decisions |
| Settlements | `?view=settlements` | Sale/transfer completion and acknowledged proceeds reconciliation |
| Exceptions | `?view=exceptions` | Blocked work, mismatches, and owned resolution paths |

The workspace projects eight business milestones: Candidate Review, Appraisal, Channel & Pricing, Approval, Activated, Offers & Bids, Sold/Transferred, and Settled/Reconciled. Search and location filtering are operational. Capability labels distinguish internal facts, manual/degraded external paths, and unavailable provider functions.

The versioned read contract is exposed at `GET /api/disposition-wholesale`; purpose-built commands use `POST /api/disposition-wholesale` and remain subject to permission, rollout, location, amount, idempotency, and expected-version enforcement.

## 3. Slice conformance

| Slice | Repository implementation |
| --- | --- |
| IC-090 | Eligible InventoryUnit candidates are projected with age/exposure inputs, reason codes, source fingerprint, freshness, and an advisory score. Staff can accept, defer, dismiss, or explicitly reopen a review; ownership, target time, version, and audit evidence are preserved. |
| IC-091 | Disposition appraisals preserve evidence, comparable references, valuation range, confidence, expiry, notes, and immutable versions. Expired appraisals cannot support a new channel proposal. Acquisition appraisal remains a separate upstream concern. |
| IC-092 | Channel proposals freeze the channel, asking price, reserve, fees, expected net, time-to-sale, risk, policy version, and appraisal version. The server enforces the gross floor and retains recommendation alternatives. |
| IC-093 | Proposal approval requires the exact current proposal and policy version, amount authorization, and an actor independent from the proposer. Below-reserve offer acceptance requires an independent approval bound to the exact offer amount, offer version, and policy version. |
| IC-094 | Activation records the approved proposal version, mode, provider, request/reference IDs, external state, and acknowledgement. An active external claim requires acknowledgement and a reference; live adapters are not enabled. |
| IC-095 | Offers preserve verified source, immutable version, gross amount, fees, normalized net, terms, expiry, and decision evidence. Only the current unexpired offer version may be decided. |
| IC-096 | Completion requires current accepted-offer evidence plus title, release, custody, transport, and receipt gates. The completion actor must differ from the offer-decision actor. Completion advances the canonical InventoryUnit to wholesale/other disposition without inventing an external settlement claim. |
| IC-097 | Settlement records expected and actual proceeds, fees and credits, external references/states, acknowledgement, variance, verifier, and reconciliation result. The verifier must differ from the completion actor. Only an acknowledged, matched settlement closes the disposition case and canonical InventoryUnit. |
| IC-098 | Candidate and channel recommendations are advisory, versioned by source fingerprint, explain reasons and confidence, and expose input freshness. Closed acknowledged settlements now link expected net to actual net for sample size, signed bias, mean absolute variance, and within-tolerance calibration. Insufficient samples remain visibly insufficient; production thresholds remain governed by the R0 decision gate. |
| IC-099 | Seven destinations, eight milestones, portfolio KPIs, filtered queues, contextual command forms, exceptions, truthful capability states, responsive layout, API projection, and local review/approval behavior are implemented. Governed enterprise Reports remain an R10 dependency. |

## 4. Approval and mutation boundaries

- The proposer cannot approve their own channel/price/reserve proposal.
- Approval is bound to the exact proposal, policy, and authorized amount.
- Activation cannot claim an active external state without acknowledgement and a provider reference.
- Below-reserve offer acceptance requires explicit approval evidence.
- The offer decision actor cannot complete the sale or transfer.
- The completion actor cannot verify settlement.
- Completion requires title, release, custody, transport, and receipt evidence.
- Settlement closes only after acknowledged proceeds reconcile; mismatches remain open work.
- Every command uses server authorization, idempotency, optimistic aggregate version, serializable mutation, audit, domain event, and outbox evidence.
- Recommendations never execute a consequential transition.

## 5. Capability truth

- External auction, marketplace, listing, and DMS/accounting adapters are disabled.
- Activation is manual or sandbox-labelled and requires an external acknowledgement/reference before the UI may describe it as active.
- Candidate and channel algorithms are advisory and non-executing.
- Governed cross-console Reports, saved views, exports, policy administration, and enterprise approval queues remain R10 dependencies.
- Provider reconciliation and live-adapter certification remain R11 dependencies.

## 6. Data and migration boundary

R9 adds `InventoryDispositionCase` and immutable `InventoryDispositionCaseEvent` records plus controlled stage and operating-state enums. The migration is source-controlled at `prisma/migrations/20260718190000_inventory_console_r9_disposition_wholesale/migration.sql`.

The migration has not been applied to any environment by this implementation task. Deployment requires the normal backup, review, migration, rollback, and environment authorization process.

## 7. Verification evidence

- TypeScript typecheck: passed.
- Focused R9 and InventoryUnit gate: 3 test files, 20 tests passed.
- Prisma schema validation: passed.
- Full lint: passed with zero warnings.
- Production build: passed; 146 pages generated, including `/vehicles/disposition-wholesale` and `/api/disposition-wholesale`.

## 8. Activation boundary

Repository completion does not authorize production activation. The following remain pending:

- approved role/location assignments and configurable amount/delegation policies;
- representative candidate, appraisal, approval, offer, release, settlement, mismatch, retry, and concurrency table tops;
- calibrated candidate/channel recommendation thresholds with measured production outcomes;
- live auction, marketplace, listing, transport, title, DMS/accounting, and settlement acknowledgement adapters;
- migration deployment confirmation and production-data reconciliation;
- accessibility, responsive-device, production-volume, observability, recovery, and security evidence;
- operational training, support/runbook acceptance, monitored pilot, pause/rollback exercise, and business sign-off.

Until those gates pass, R9 is a bounded repository implementation with manual/degraded external paths and no production activation claim.
