# Enterprise Vehicle Console Product Architecture

**Status:** Planning foundation only  
**Program:** Inventory / Vehicle Operations strengthening  
**Design posture:** Independent console inside Dispatch Board, not a standalone DMS replacement

## 1. Product decision

Build an **Enterprise Vehicle Console** by strengthening the existing Inventory / Vehicles section. Do not create a separate DMS surface on CCC Home as the initial move.

The console should be independent in product ownership, routes, records, and reliability boundaries, but it should reuse existing Dispatch Board foundations for:

- authentication and authorization;
- canonical Vehicle Registry;
- tasks and assignments;
- documents and photos;
- appointments;
- shop and repair operations;
- sales and CRM context;
- reporting and audit;
- integration and data movement controls.

This gives Time Motor Sales DMS-like operating depth without creating a second source of truth.

## 2. Product principles

1. **Simple screen, serious backend.** Staff should see short forms, obvious next actions, and clear blockers. The system should maintain versioned commands, audit, reconciliation, and recovery underneath.
2. **One vehicle identity.** VIN, stock number, customer relationship, inventory unit, repair order, and deal are related records, not interchangeable identities.
3. **Vehicle first, workflow second.** Staff should be able to find or create the vehicle, then choose the correct path.
4. **No duplicate work systems.** Use shared Tasks, Documents, Appointments, Shop, CRM, and Reports rather than rebuilding them inside Inventory.
5. **Consequences require gates.** Add Vehicle can create a vehicle identity, but it should not silently purchase, stock, price, advertise, repair, sell, or title a vehicle.
6. **Recoverable by design.** Every material command should be auditable, idempotent, reversible by compensating action, or safely retryable.
7. **Honest capability labels.** Manual, draft, synced, stale, blocked, partial, simulated, or unavailable states must be visible.

## 3. Console topology

### Primary entry

CCC Home should surface one clear entry:

- **Vehicle Operations**

Inside Vehicle Operations:

- Dashboard
- Add Vehicle
- Vehicle Search
- Inventory Units
- Recon / Shop Queue
- Frontline Readiness
- Title / Document Exceptions
- Merchandising / Photos
- Reports
- Administration

### Primary records

| Record | Meaning | Notes |
| --- | --- | --- |
| Vehicle | Physical vehicle identity | Canonical identity and history. |
| InventoryUnit | Dealership-controlled commercial inventory cycle | One vehicle can have multiple inventory cycles over time. |
| VehicleRelationship | Customer, dealership, vendor, or uncertain relationship | Effective-dated and source-attributed. |
| CustodyEvent | Where the vehicle is and who accepted custody | Used for location and accountability. |
| VehicleReadiness | Projection of blockers and next action | Derived from evidence, tasks, commands, and workflow states. |
| VehicleDocument / Media link | Documents, photos, evidence, title, purchase, repair proof | Stored once, related many ways. |
| VehicleTask | Shared Task with vehicle context | Must remain in universal Task system. |
| VehicleTimelineEvent | Explainable operational history | Projection from commands, audits, tasks, documents, integrations. |

## 4. Domain boundaries

| Domain | Owns | Does not own |
| --- | --- | --- |
| Vehicle Registry | canonical identity, VIN/stock/plate observations, duplicate cases | purchase authority, repair authorization, customer deal authority |
| Inventory Console | inventory unit lifecycle, readiness, blockers, vehicle operations view | accounting ledger, payroll, payment processing |
| Shop / Recon | repair orders, repair jobs, diagnostics, QC, technician work | vehicle identity replacement |
| CRM / Sales | customer/deal/opportunity relationship and sales follow-up | inventory custody or title readiness |
| Documents | file metadata, storage relationship, retention, checksum | domain decisions based only on upload existence |
| Tasks | assignment, due date, comments, checklist, status | authoritative inventory state transitions by itself |
| Integrations | external identity, sync status, reconciliation, freshness | blind overwrite of canonical records |

## 5. Enterprise backend expectations

The console should use the command/event/projection posture already described by the inventory architecture:

```text
User action
-> command request
-> permission and rollout check
-> validation and duplicate guard
-> aggregate state transition
-> audit event
-> domain event
-> outbox/integration message when needed
-> projection refresh
-> visible staff result
```

For staff, that should feel like:

```text
Find vehicle -> choose purpose -> complete required fields -> review consequence -> continue
```

## 6. Resilience posture

The console should be able to degrade without becoming misleading.

| Failure | Staff experience | Backend behavior |
| --- | --- | --- |
| VIN decoder unavailable | Manual entry remains available and labeled manual | Record decoder freshness and retry opportunity |
| photo upload fails | Vehicle can still be created if photos are optional | Preserve upload error and retry |
| duplicate uncertainty | Staff can save as draft or open duplicate review | No forced duplicate canonical creation |
| integration unavailable | Show stale/disabled state | Queue or block external sync based on authority |
| projection stale | Show last refreshed time | Rebuild projection from command/audit source |
| command conflict | Show current record and ask staff to reconcile | Reject stale version with conflict result |

## 7. First-class user roles

| Role | Primary use |
| --- | --- |
| Inventory staff | Add vehicles, receive vehicles, assign location/custody, add photos/docs, clear readiness blockers. |
| Manager | Approve exceptions, duplicate resolution, purchase/readiness/title decisions, reports. |
| Recon / shop staff | Receive recon work, update repair blockers, attach evidence, move toward QC. |
| Sales staff | See frontline-ready vehicles, vehicle detail, photos, deal/customer context. |
| Office / title staff | Resolve title, document, ownership, and packet exceptions. |
| Admin | Configure required fields, statuses, permissions, import/export and integration gates. |

## 8. Data quality rules

- VIN is normalized, validated when possible, and stored with raw input.
- Non-VIN or invalid-VIN exceptions require a reason.
- Stock number is not physical vehicle identity.
- Customer-owned vehicles must not become inventory without explicit ownership transition.
- InventoryUnit requires dealership-controlled intent or ownership path.
- Odometer readings are observations, not overwritten facts.
- Custody/location changes require actor, time, and reason.
- Financial fields require integer cents and authority.
- High-impact states require evidence and command history.

## 9. Non-goals for the first build

- Full accounting or general ledger.
- Contracting, F&I menu, lender submission, tax calculation, or payment processing.
- Automatic DealerCenter/Reynolds sync.
- Public website listing syndication.
- Autonomous pricing, purchase, wholesale, or sale.
- Replacing the existing Task, Document, Shop, CRM, or Appointment foundations.

