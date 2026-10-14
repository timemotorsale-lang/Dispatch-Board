# Inventory Console R4 Acquisition and Appraisal Implementation

**Release / milestone:** R4 / M4  
**Slices:** IC-040 through IC-048  
**Implemented:** 2026-07-18  
**Branch:** `codex/inventory-console-r4-acquisition-appraisal`  
**Repository result:** `BOUNDED IMPLEMENTATION COMPLETE — INTERNAL FIXTURE EXIT PASSED; MIGRATION AND PILOT NOT ACTIVATED`  
**Activation:** Repository only; migration deployment, external bidding, payment/accounting, transport adapters, pilot, and production remain unauthorized

## Outcome

R4 introduces a governed pre-control `InventoryAcquisitionCase`. A case is linked to the canonical Vehicle, location, owner, source, purpose, and expiry, but it has no InventoryUnit and creates no ownership relationship until an independently authorized, evidenced commitment crosses the financial-control boundary.

The older `InventoryAcquisitionAppraisal` and `InventoryPurchaseAuthorization` records require an InventoryUnit and therefore remain post-acquisition compatibility records. R4 does not repurpose them as pre-acquisition authority.

## Slice evidence

| Slice | Repository implementation and bounded status |
| --- | --- |
| IC-040 | Unique source/reference intake, canonical Vehicle, location/owner authority, active-case and open-InventoryUnit duplicate stops, expiry, watch, decline, cancellation, and immutable case registration |
| IC-041 | Versioned evidence snapshot with VIN quality, trim certainty, mileage, condition, title/history, seller authority, evidence references, hard conflicts, and `INSUFFICIENT` fail-closed behavior |
| IC-042 | Immutable appraisal submissions retained in case-event history, comparable count/snapshot, valuation inputs, confidence algorithm/version, expiry, revision/supersession, and downstream recommendation/authorization invalidation evidence |
| IC-043 | Integer-cent maximum-all-in and maximum-bid calculation, explicit cost components, risk reserve, policy ceiling, sensitivity, explanation/version, expiry, confidence stop, and mandatory human decision boundary |
| IC-044 | Exact-version authorization request/decision, four-eyes requester/approver separation, delegated amount-capability evaluation, conflict disclosure, expiry, rejection, and one-active-case-per-vehicle anti-splitting control |
| IC-045 | Immutable offer/counter versions in event history, exact approved amount ceiling, accepted-evidence requirement, expiry and reapproval boundary, with external acknowledgement honestly `NOT_CONNECTED` |
| IC-046 | Atomic accepted-evidence validation, effective Vehicle relationship, unique InventoryUnit, initial state event, InventoryUnit aggregate version, acquisition event/audit/outbox, and case linkage |
| IC-047 | Pre-control cancellation and post-control non-destructive reversal review; an InventoryUnit can never be deleted or cancelled through the opportunity command |
| IC-048 | Idempotent internal handoff state with InventoryUnit, intended route, event/audit/outbox, and disabled external transport adapter truth |

## Workflow and routes

```text
Workflow Launcher
  → /vehicles/acquisition-appraisal
  → Register opportunity
  → Qualify evidence
  → Submit appraisal version
  → Calculate advisory maximum
  → Request exact-version authorization
  → Independent approve/reject
  → Record offer/counter/accepted evidence
  → Confirm financial acquisition
  → Create Vehicle relationship + one InventoryUnit atomically
  → Record internal transport handoff
```

| Contract | Purpose |
| --- | --- |
| `/vehicles/acquisition-appraisal` | Permission-scoped R4 operating workspace |
| `GET/POST /api/acquisition-cases` | Read projection and governed opportunity intake |
| `GET /api/acquisition-cases/{id}` | Case, exact snapshots, linked unit, and immutable history |
| `POST /api/acquisition-cases/{id}/commands` | State-aware R4 command surface |

## Invariants

- An opportunity, evidence package, appraisal, or recommendation cannot create an InventoryUnit.
- Low or insufficient appraisal confidence cannot produce an eligible maximum bid.
- Proposed amount cannot exceed the governed recommendation/policy ceiling.
- A requester cannot approve the same authorization.
- An offer cannot exceed the exact approved proposal.
- Accepted commitment requires an evidence reference.
- Financial acquisition cannot be future-dated and must precede the stage target.
- A Vehicle cannot have another active acquisition case or open InventoryUnit; opportunity aggregate identity is deterministically derived from the command idempotency key so exact retries return the original result.
- InventoryUnit, relationship, initial history, case link, command ledger, audit, event, and outbox are one database transaction.
- Post-control correction requires reversal review; destructive cancellation is rejected.

## Data and migration

Migration `20260718130000_inventory_console_r4_acquisition_appraisal` adds two append-only-compatible tables and two enums. It does not alter or remove existing columns or records. Prisma schema validation passes. The migration has not been applied to a deployed or user database.

## Verification

- Prisma schema validation: passed.
- Prisma Client type generation: passed with `--no-engine`; the standard engine replacement was blocked by a local Windows/OneDrive file lock.
- TypeScript typecheck: passed.
- Focused R4 domain and UI tests: 10 passed.
- R3/R4/navigation regression set: 4 files and 27 tests passed.
- Focused R4 lint: passed with zero warnings.
- Full repository lint: passed with zero warnings.
- Next.js production build: passed using an isolated output directory because the local OneDrive-backed `.next` cache was locked; 138 pages generated and all four R4 routes registered.

## Capability truth and remaining gates

- Internal acquisition-case aggregate, commands, projection, workspace, audit/event/outbox, and InventoryUnit boundary: implemented.
- External auction/listing/VIN/title/history/market/bid/payment/accounting/transport connectors: disabled and not contacted.
- Cross-vehicle cumulative-exposure authority requires an approved capital policy and is not inferred from placeholder data; per-command delegated amount limits and one-case-per-vehicle anti-splitting are enforced.
- Automated expiry/escalation scheduler and notification delivery are not activated; expiry is enforced at command time.
- Migration deployment, real data, pilot reconciliation, support sign-off, and production rollout: not authorized.
- No commit, push, pull request, merge, deployment, external mutation, or rollout activation was performed by this implementation.

## R4 repository exit

The bounded internal exit passes: no opportunity, evidence package, appraisal, recommendation, unapproved offer, or unsupported external assertion creates inventory. R4 must not be represented as deployed, externally integrated, pilot-ready, or production-complete until migration, cumulative-capital policy, provider contracts, pilot fixtures, operational sign-off, and activation evidence exist.

## Wave 7 compensation amendment — 2026-07-19

IC-047 now separates pre-control cancellation from a terminal post-control `COMPLETE_REVERSAL` command. Reversal requires an independent verifier, evidence, and explicit title, payment, and custody dispositions; it atomically closes the acquisition relationship, recovers eligible acquisition costs, closes the InventoryUnit and any frontline workflow, and preserves command/audit/event/outbox history. Open repair work or retail completion fails closed into the owning unwind path. Operational compensation and downstream reconciliation still require a real exercise, so the mixed slice remains partial.
