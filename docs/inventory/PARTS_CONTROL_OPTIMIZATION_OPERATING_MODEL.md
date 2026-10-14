# Parts Control Optimization Operating Model

**Product:** Time Motor Sales Dispatch Board  
**Module:** Inventory Console / Parts Staff Workspace / Shop & Recon  
**Version:** 0.1 planning and design baseline  
**Date:** 2026-07-26  
**Status:** Approved planning/design direction; implementation must proceed in controlled vertical slices  
**Branch:** `codex/parts-staff-workspace`

## 1. Purpose

Parts waste is treated as an operational control problem, not a UI problem.

The system must reduce duplicate ordering, late ordering, missing physical parts, untracked returns, stalled repairs, and unclear accountability by making every required part traceable from need to source decision, order, receipt, bin/location, issue, installation, return, credit, or exception.

No part should exist as loose memory, a text message, an unlinked paper note, or an unlabeled shelf item.

## 2. Product principle

Every part must answer six questions at all times:

1. **Why does this part exist?** Linked demand, repair order, job, vehicle, or approved stock reason.
2. **Who owns the next action?** Named staff role and user when assigned.
3. **What is the exact state?** Demand, ordered, received, binned, issued, installed, returned, credited, or blocked.
4. **Where is it physically?** Counter, RO bin, shelf/bin, technician cart, vehicle, return area, vendor, or unknown.
5. **What is the risk?** Promise delay, duplicate exposure, missing location, wrong/damaged part, no credit, stale vendor ETA.
6. **What should happen next?** Source, reserve, order, receive, bin, issue, install confirmation, return, reconcile, or escalate.

If any answer is missing, the system marks the part or demand as an exception instead of treating it as normal work.

## 3. Canonical records

| Record | Purpose | Must link to | Cannot be replaced by |
| --- | --- | --- | --- |
| Repair Order | The customer or inventory repair authority and promise context | Vehicle, customer when applicable, repair jobs, authorization, parts demands | A parts note, technician comment, vendor invoice, or task |
| Repair Job | The scoped operation that may require parts | Repair Order, technician/workbench, diagnosis, labor/scope version | Generic task text |
| Part Demand | The canonical need for a part | Repair Order, Repair Job where known, vehicle, requesting actor, quantity, required time | Purchase order, chat message, paper list |
| Source / Requisition | The source decision before commitment | Part Demand, vendor/location options, ETA, cost, fitment, selected/rejected alternatives | Informal phone call without evidence |
| Purchase Order | The vendor commitment | Approved requisition, line items, amounts, ETA, delivery location | Part Demand |
| Receipt | The physical arrival and inspection event | Purchase Order/transfer/manual approved source, quantity, condition, receiver | Vendor invoice alone |
| Part Custody / Location Event | Where the part physically is and who moved it | Part, quantity, from/to location, custodian, timestamp | Static note |
| Reservation / Kit Record | What is held for a specific repair | Part Demand, available quantity, RO bin or source location | “It should be here” assumption |
| Return / Recovery Record | Unused, wrong, warranty, core, or credit recovery | Original source, part, amount expected/actual, reason, status | Delete or silent adjustment |

## 4. Required state model

### Demand states

`DRAFT -> REQUESTED -> QUALIFIED -> SOURCING -> ORDER_READY -> ORDERED -> PARTIALLY_RECEIVED -> RECEIVED -> RESERVED -> ISSUED -> INSTALLED -> CLOSED`

Allowed exception states:

- `DUPLICATE_REVIEW`
- `FITMENT_REVIEW`
- `APPROVAL_BLOCKED`
- `VENDOR_BLOCKED`
- `ETA_RISK`
- `MISSING_LOCATION`
- `WRONG_OR_DAMAGED`
- `RETURN_REQUIRED`
- `CREDIT_PENDING`
- `CANCELLED`

### Physical part states

`EXPECTED -> ARRIVED -> INSPECTED -> ACCEPTED -> BINNED_TO_RO -> ISSUED_TO_TECH -> INSTALLED`

Alternate physical paths:

- `COUNTER_STOCK`
- `QUARANTINED`
- `RETURN_AREA`
- `RETURNED_TO_VENDOR`
- `CREDIT_RECEIVED`
- `UNKNOWN_LOCATION`

The system must not allow a repair order to be considered parts-ready when required parts are unknown, unverified, multiply reserved, damaged, unbinned, or not linked to that exact repair order.

## 5. Parts Staff Workspace design

The Parts Staff landing page should be a direct-to-work console, not a broad management dashboard.

Primary sections:

1. **Unblocking Now** - demands currently blocking active repairs or promise times.
2. **Request / Source Queue** - technician/advisor/manager demands not yet ordered or reserved.
3. **Duplicate Risk** - possible repeated orders, repeated demands, or received-but-not-used parts.
4. **Arriving / Receiving Today** - expected arrivals with receiving and binning actions.
5. **Unknown Location / Unissued Parts** - accepted parts not in a verified bin, counter, technician custody, or vehicle.
6. **Returns & Credits** - wrong, unused, core, warranty, or returnable parts awaiting vendor credit.
7. **Vendor Cutoff Risk** - demands that must be ordered before a vendor cutoff to protect a repair promise.

The Parts Staff page should answer: “What do I need to do right now to unblock work and prevent waste?”

## 6. Duplicate protection algorithm

Before a part demand can become a purchase order, the system must evaluate duplicate exposure.

### Inputs

- Repair order and repair job
- Vehicle VIN, year/make/model/trim/engine where available
- Requested part number, description, category, side/location, and quantity
- Existing part demands for the repair order
- Open purchase orders
- Received but unissued parts
- Reserved/bin parts for the vehicle or RO
- Returns and quarantined parts
- Similar recent orders for the same VIN, RO, or concern

### Outcomes

| Outcome | Meaning | Required action |
| --- | --- | --- |
| `NO_DUPLICATE_FOUND` | No active matching demand/order/stock | Continue sourcing/order flow |
| `POSSIBLE_DUPLICATE` | Similar item exists but not exact | Staff must review and choose use existing, continue, cancel, or escalate |
| `HARD_DUPLICATE` | Same or equivalent part already active for same RO/job | Block order until manager/authorized override |
| `RECEIVED_AVAILABLE` | Part appears physically available | Route to verify/bin/issue instead of order |
| `RETURN_OR_QUARANTINE_MATCH` | A returned/wrong/damaged candidate exists | Staff must resolve condition before reusing or reordering |

### Required override fields

If staff proceeds after a duplicate warning:

- reason for additional order;
- reviewed existing demand/order/receipt identifiers;
- approver if policy requires;
- expected effect on repair promise and cost;
- immutable audit event.

## 7. Late order prevention algorithm

The system must calculate parts timing risk before the repair becomes delayed.

### Inputs

- Repair order promise/target time
- Diagnosis completion time
- Required part demand time
- Vendor cutoff schedule
- Vendor ETA range and confidence
- Shop schedule/bay/technician readiness
- Current authorization status
- Part criticality and whether work can continue without it

### Risk levels

| Level | Condition | Example action |
| --- | --- | --- |
| Green | Demand can be sourced and received before needed time | Normal queue |
| Yellow | Order window is narrowing or ETA confidence is weak | Bring into Parts Staff priority queue |
| Orange | Vendor cutoff or promise protection window is close | Alert Parts + Advisor/Shop Manager |
| Red | Cutoff missed or ETA cannot protect promise | Escalate, require customer-safe update or promise review |

### Required alerts

- Diagnosis complete but no parts demand after configured interval.
- Demand requested but no sourcing action after configured interval.
- Demand source selected but not ordered before vendor cutoff.
- PO issued but no acknowledgement after configured interval.
- Expected arrival missed.
- Part received but not binned/issued.

## 8. Parts readiness algorithm

Every repair order receives a live parts readiness state.

| Readiness | Meaning |
| --- | --- |
| `NO_PARTS_REQUIRED` | Current authorized scope requires no parts |
| `PARTS_NOT_REQUESTED` | Scope likely requires parts but no demand exists |
| `REQUESTED_NOT_ORDERED` | Demand exists but no reservation/order commitment |
| `ORDERED_WAITING` | PO/transfer exists; part not received |
| `PARTIAL_KIT` | Some but not all required parts are ready |
| `READY_BINNED` | All required parts are verified, reserved, and binned to the exact RO/job |
| `ISSUED_TO_TECH` | Parts moved to technician/job custody |
| `BLOCKED_PARTS` | Wrong, missing, damaged, late, unapproved, duplicate, or unknown-location part blocks work |

The repair board must not only say “Waiting on Parts.” It must expose the reason and next action, such as:

> Waiting on front passenger caliper. PO acknowledged. ETA Jul 27, 10:00 AM. Promise at risk if not received by 12:00 PM.

## 9. Custody and location controls

Every physical movement must create a custody/location event.

Required fields:

- part identity and quantity;
- source state and destination state;
- from location and to location;
- repair order/bin if applicable;
- actor;
- timestamp;
- condition;
- exception reason if damaged, missing, wrong, or unknown;
- optional photo/barcode evidence.

Approved standard locations:

- Parts counter
- RO bin / shelf
- Technician cart
- Vehicle
- Return area
- Quarantine
- Vendor
- Unknown location

`UNKNOWN_LOCATION` is an exception, not a normal state.

## 10. RO bin and labeling model

Every repair order that requires parts should have an assigned bin/shelf reference.

Recommended label:

- Repair order number
- Vehicle identifier
- Customer or inventory unit label
- Part description and part number
- Quantity
- Demand identifier
- Received by
- Received date/time
- Bin/shelf location

Receiving should ask the staff member to assign or confirm the RO bin before the part can count as `READY_BINNED`.

## 11. Role accountability

| Role | Can do | Cannot do by default |
| --- | --- | --- |
| Parts Staff | Source, reserve, receive, bin, issue, return, reconcile parts within granted authority | Change repair scope, authorize customer estimate, close repair order, override manager policy |
| Technician | Request parts, clarify need, confirm installation/unused return | Purchase parts, silently change quantity/source, mark unverified parts ready |
| Service Advisor | See customer-safe status, communicate delay/approval needs, request clarification | Bypass parts readiness, receive stock, approve duplicate purchasing unless granted |
| Shop Manager / Vehicle Operations Lead | See production impact, resolve blocked/late parts, re-prioritize within policy | Hide duplicate/waste evidence or bypass custody |
| General Manager / Authorized Manager | Override duplicate or high-cost rules with reason | Delete audit trail or alter physical history |

## 12. Measurement system

The system should measure waste and accountability as first-class operational KPIs:

- duplicate order warnings;
- confirmed duplicate orders prevented;
- late order count;
- average time from diagnosis complete to part demand;
- average time from demand to order;
- vendor cutoff misses;
- expected vs actual ETA variance;
- received-not-binned age;
- unknown-location parts count;
- return pending count and dollars;
- credit pending age and dollars;
- repair delay hours caused by parts;
- emergency/rush order count;
- parts readiness accuracy;
- first-time correct part rate.

## 13. Prohibited duplication

Do not create separate parts truth in:

- technician notes;
- advisor comments;
- generic tasks;
- Shop & Recon cards;
- Inventory home cards;
- vendor invoice imports;
- free-text repair order comments.

Those surfaces may display or link to parts truth, but the canonical record remains Part Demand, Purchase Order, Receipt, Custody/Location Event, Reservation/Kit, and Return/Recovery.

## 14. Implementation roadmap

### Slice PCO-1: Parts accountability planning and role source of truth

- Adopt this operating model.
- Align Parts Staff landing page and role matrix.
- Confirm canonical records and prohibited duplication.

### Slice PCO-2: Part Demand command foundation

- Create/read/update Part Demand through purpose-built commands.
- Attach demands to Repair Order/Repair Job/Vehicle.
- Add duplicate check read model before order creation.

### Slice PCO-3: Parts Staff action queue

- Populate Unblocking Now, Request/Source Queue, Duplicate Risk, Receiving Today, Unknown Location, Returns & Credits, and Vendor Cutoff Risk from canonical records.

### Slice PCO-4: Duplicate protection gate

- Block or warn on duplicate demand/order/receipt candidates.
- Require override reason and immutable event when staff continues.

### Slice PCO-5: Timing and vendor cutoff risk

- Add vendor cutoff configuration.
- Compute late-order risk.
- Escalate promise risk to Parts Staff, Shop Manager, and Advisor.

### Slice PCO-6: Receiving, binning, and custody

- Require receipt inspection.
- Require verified location/bin before readiness.
- Add custody events and unknown-location exception handling.

### Slice PCO-7: RO kit readiness

- Calculate repair-order parts readiness from demand, reservation, receipt, custody, and issue/install facts.
- Surface reason-specific waiting-on-parts status to Shop & Recon, Technician Workbench, Advisor Workspace, and Vehicle Operations Lead.

### Slice PCO-8: Returns, cores, credits, and recovery

- Track unused/wrong/core/warranty returns.
- Track expected and actual credit.
- Escalate stale recovery dollars.

### Slice PCO-9: Manager leakage dashboard

- Add duplicate, late, missing, return, credit, and delay metrics for management without cluttering the Parts Staff work surface.

## 15. Acceptance criteria

The design is successful when:

- a part cannot be ordered without a demand or approved stock reason;
- duplicate candidates are visible before commitment;
- staff can locate every received part or see it as an exception;
- repair orders explain exactly why they are waiting on parts;
- late ordering risk is visible before the customer promise fails;
- returns and credits remain visible until recovered;
- managers can see leakage metrics without forcing technicians or parts staff into management pages.

