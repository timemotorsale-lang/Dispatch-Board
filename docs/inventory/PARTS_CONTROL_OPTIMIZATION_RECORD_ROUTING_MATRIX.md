# Parts Control Optimization Record Routing Matrix

**Product:** Time Motor Sales Dispatch Board  
**Module:** Parts Staff Workspace / Shop & Recon / Repair Order  
**Version:** 0.1 planning and design baseline  
**Date:** 2026-07-26  
**Status:** Approved planning/design direction

## 1. Matrix purpose

This matrix defines where each parts-related record is created, viewed, acted on, and prohibited from being duplicated.

The purpose is operational clarity: staff can work quickly, but the system keeps one authoritative parts truth.

## 2. Page and record routing

| Page / workspace | Primary user | Shows | Creates / mutates | Must link to | Prohibited duplication |
| --- | --- | --- | --- | --- | --- |
| Parts Staff Home | Parts Staff | Urgent demand, duplicate risk, receiving, unknown location, returns, vendor cutoff risk | Direct actions through Parts Demand, PO, Receipt, Custody, Return commands | Repair Order, Repair Job, Vehicle, Vendor, Location/Bin | Broad inventory tower, technician execution, free-text parts ledger |
| Demand Queue | Parts Staff | Requested/qualified demands and sourcing readiness | Qualify, source, reserve, order-ready, cancel with reason | Repair Order/Job, requester, authorization, vehicle | Purchase order without demand |
| Parts Counter | Parts Staff | Searchable part, demand, PO, receipt, bin, return context | Receive, bin, issue, return, correct custody by reversal | Part Demand, PO, Receipt, Custody Event | Unlinked counter notes |
| Receiving Today | Parts Staff | Expected arrivals and missed ETAs | Receive, inspect, accept, discrepancy, assign bin | PO/Transfer, vendor, RO bin | Treating vendor delivery as readiness before inspection/bin |
| Unknown Location Queue | Parts Staff / Manager | Accepted parts without verified location | Locate, correct location, quarantine, escalate | Receipt, custody history, RO/bin | Hiding unknown parts inside comments |
| Returns & Credits | Parts Staff / Manager | Unused/wrong/core/warranty return exposure | Start return, mark shipped, reconcile credit | Original demand/order/receipt, vendor, amount | Deleting unused parts or closing without credit status |
| Repair Order | Advisor, Manager, Technician, Parts | Parts readiness and blockers | Displays linked parts truth; creates demand only through authorized flow | Part Demand, readiness, custody, return | Free-text “waiting on parts” without reason |
| Technician Repair Workbench | Technician | Job parts, readiness, issued parts, request clarification | Request part, confirm installed/unused, add explanation | Repair Job, Part Demand, evidence | Technician-created purchase/order records |
| Service Advisor Workspace | Service Advisor | Customer-safe parts status and promise risk | Advisor update/comment, customer communication, approval follow-up | Repair Order, Part Demand, Promise | Receiving/binning/purchasing controls |
| Shop & Recon | Shop Manager / Vehicle Operations Lead | Production impact of parts blockers | Reprioritize/escalate within policy | Repair Order, readiness, blocker owner | Separate parts board with conflicting status |
| Vehicle Operations Lead Workspace | Vehicle Operations Lead | Cross-lane operational impact | Escalation, assignment, exception follow-up | Inventory Unit, RO, Parts readiness | Daily parts execution clutter unless assigned |
| Manager Leakage Dashboard | Manager | Waste/risk metrics and unresolved exceptions | Policy review, override with reason, assignment | All canonical parts records | Staff-facing operational queue |

## 3. Entry route rules

1. Technician discovers part need -> Technician Workbench creates or proposes Part Demand.
2. Advisor intake does not create a final demand unless an approved pre-diagnosis package requires it.
3. Parts Staff qualifies demand before purchase commitment.
4. Purchase Order can only originate from approved demand, approved stock replenishment, or approved manual exception.
5. Receiving can only satisfy readiness after inspection and bin/location confirmation.
6. A repair order parts-ready state is derived; staff cannot manually type it into existence.
7. Returns stay open until vendor return or credit recovery is resolved.

## 4. State ownership

| State / concern | Owning workspace | Backup / viewer |
| --- | --- | --- |
| Demand requested | Technician Workbench or Repair Order | Parts Staff |
| Demand qualified | Parts Staff | Shop Manager |
| Duplicate review | Parts Staff | Manager if override required |
| Source selected | Parts Staff | Manager/Finance by authority threshold |
| PO issued | Parts Staff | Manager |
| Received/inspected | Parts Counter / Receiving | Manager |
| Binned to RO | Parts Counter | Technician/Shop viewer |
| Issued to technician | Parts Counter | Technician Workbench |
| Installed | Technician Workbench | Parts Staff viewer |
| Wrong/damaged part | Parts Counter | Shop Manager, Advisor viewer when customer impact exists |
| Unknown location | Parts Staff Home | Manager escalation |
| Return/credit pending | Parts Staff Home | Manager/Finance |
| Customer promise at risk | Advisor Workspace | Shop Manager, Vehicle Operations Lead |

## 5. Required cross-page displays

| Surface | Display wording required |
| --- | --- |
| Shop & Recon card | Specific waiting reason, part name, owner, ETA, and next action |
| Technician Workbench | Required parts, issued parts, missing parts, install/unused-return controls |
| Advisor Workspace | Customer-safe summary and whether promise/approval is at risk |
| Vehicle Operations Lead | Parts blockers by operational impact, not every transaction |
| Manager | Waste, duplicate, late, unknown-location, return, and credit exposure |

## 6. Hard prohibitions

- Do not allow “waiting on parts” without a reason code.
- Do not allow received parts to count as ready without verified usable condition and location.
- Do not allow purchase commitment without duplicate review.
- Do not allow closing a return without disposition or credit status.
- Do not delete parts history to correct mistakes; use reversal/correction events.
- Do not make Parts Staff use the full management console for daily work.

