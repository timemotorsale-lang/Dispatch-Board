# Phase 7 - Inventory-to-Shop Handoff

**Decision ID:** `SRO-FND-007`
**Status:** `PROPOSED`

## Authority boundary

Inventory owns acquisition capital, recon plan/economics, priority, frontline target, disposition and downstream frontline release. Shop owns accepted custody, diagnosis, repair execution, parts consumption, operational QC evidence and safe return. Shop completion never declares an Inventory unit frontline-ready.

## Inbound handoff: Inventory to Shop

The handoff is decision-ready only when it contains:

- canonical Inventory Unit, vehicle/VIN, stock number and organization/location;
- exact Inventory lifecycle/workflow version and correlation identifier;
- current custody/location, keys and movement restrictions;
- accepted receipt, inspection and diagnosis/finding versions;
- approved recon plan version, authorized amount and approving authority;
- authorized jobs or explicit diagnostic authorization;
- target frontline date, Inventory commitment class and priority rationale;
- known parts demand, source/ETA evidence and existing reservations;
- required QC, road-test and evidence templates;
- safety, title/document, warranty, privacy or disposition restrictions;
- authoritative Inventory owner, Shop receiver, target acceptance time and recovery contact.

### Inbound decisions

| Result | Meaning | Effect |
| --- | --- | --- |
| `ACCEPTED` | Identity, authority, custody and minimum execution package pass | Create/link one authoritative `INVENTORY_RECON` repair order and enter Shop Stage 1 or current verified arrival stage |
| `ACCEPTED_WITH_RESTRICTION` | Safe controlled acceptance is possible but named restriction remains | Record blocker/restriction; no affected work starts |
| `REJECTED_CORRECTION_REQUIRED` | Package is incomplete, contradictory, stale or unauthorized | Inventory remains owner; exact correction list returned |
| `QUARANTINED_CONFLICT` | Identity, safety, custody or version conflict exists | No advancement; manager reconciliation required |

Shop acceptance target is one staffed hour after physical arrival and receipt of a decision-ready package. Physical delivery alone does not constitute acceptance.

## Changed-scope loop

When Shop finds scope outside the current plan:

1. Safely stop only the affected work.
2. Record finding, evidence, current stage/location, time/cost/parts/QC impact and proposed alternatives.
3. Create `BLK-SCOPE-CHANGED` and invalidate affected readiness/assignment.
4. Return a versioned change request to Brock Harris as Inventory authorizer.
5. Inventory approves, partially approves, declines, changes disposition, or requests more diagnosis.
6. Shop revalidates authorization, parts, resources, target and QC before resume.

No silence, preliminary estimate or increased financial exposure is approval.

## Outbound handoff: Shop to Inventory

The Shop return package must contain:

- linked Inventory Unit and authoritative Inventory Recon repair order;
- inbound handoff and current Shop lifecycle versions;
- completed, declined, deferred, cancelled and open job dispositions;
- actual labor, parts, sublet and total recon exposure with reconciliation status;
- parts installed/returned/core/warranty state;
- technician completion and applicable independent QC/road-test evidence;
- final odometer, current location, key location and custody owner;
- remaining restrictions, open recalls/findings and approved deferrals;
- final media/evidence references and correction lineage;
- Shop releaser, proposed receiving owner, handoff time and next Inventory action.

### Outbound decisions

| Result | Meaning | Effect |
| --- | --- | --- |
| `INVENTORY_ACCEPTED` | Package, custody and restrictions accepted | Shop Stage 16 completes; Inventory may evaluate its next lifecycle gate |
| `INVENTORY_ACCEPTED_RESTRICTED` | Inventory accepts custody with explicit non-frontline restriction | Shop exits; Inventory remains blocked from affected downstream gate |
| `RETURNED_FOR_SHOP_CORRECTION` | Shop evidence/work package fails acceptance | Custody remains or returns to Shop; route to Stage 13-15 as applicable |
| `RECONCILIATION_HOLD` | Cost, part, identity or version mismatch exists | No downstream readiness projection until independently resolved |

Inventory acceptance target is one staffed hour after a complete Shop return package. Inventory alone decides movement to Title/Document Readiness, Merchandising/Pricing, Frontline Release Review, or Disposition Review.

## Reliability controls

- One open Inventory Recon repair order per accepted handoff unless an explicit recovery links a successor.
- Every request is idempotent by organization, Inventory Unit, handoff type and version.
- Stale-version and duplicate requests return the current authoritative result without repeating side effects.
- Integration failure preserves both authoritative records, opens a reconciliation blocker and uses the approved manual recovery path.
