# Slice 2 Future Handoff — Receipt and Custody

**Status:** Workflow/staff/approval documentation implemented; `NO-GO FOR DESIGN/CODE/PILOT/ACTIVATION`
**Direct approvals:** `ITF-APR-080`-`089`; applicable global/predecessor approvals  
**Catalog:** [`Receipt and Custody`](../../RECEIPT_CUSTODY_DECISION_CATALOG.md)

**Execution workspace:** [`Slice 2 workflow package`](../../approval-decisions/SLICE_02_RECEIPT_CUSTODY_WORKFLOW.md), [`decision gate`](../../approval-decisions/SLICE_02_DECISION_EXECUTION_GATE.md), [`open inputs`](../../approval-decisions/SLICE_02_OPEN_DECISIONS.md), [`tabletop`](../../approval-decisions/SLICE_02_TABLETOP_AND_ACCEPTANCE.md), and [`authorization`](../../approval-decisions/SLICE_02_IMPLEMENTATION_AUTHORIZATION.md)

## Outcome and boundary

Convert observed physical arrival into truthful, evidence-backed custody, location, property and condition, resolve or contain discrepancies/hazards, and produce an accepted Inspection handoff. Arrival alone is not receipt.

## Slice contract

| Requirement | Slice-specific contract |
| --- | --- |
| Entry trigger/gate | Observed arrival or accepted Slice 1 handoff; valid expected context; eligible receiving location/coverage |
| Authoritative inputs | VIN/identity, observed time/location, movement/provider context, receiver, keys/documents/accessories, odometer, condition, restrictions |
| Staff questions/options | Has vehicle arrived? identity match? custody accepted? property complete? new damage/hazard? placement available? accept/conditional hold/quarantine/reject/return/escalate |
| Conditional route | Match/safe → intake; mismatch → identity hold; discrepancy → claim/correction/conditional/reject; hazard → containment; after-hours → approved secure procedure |
| Roles | Receiver/custodian, inventory owner, location/lot owner, identity reviewer, claims authority, safety responder, Inspection consumer |
| Permissions/financial | Receipt/custody/claim/rejection commands by named authority; property value/recovery within approved limits |
| Evidence | Arrival, identity, odometer, comparable condition, property inventory, custody transfer, placement, discrepancies, restrictions and accepted exceptions |
| Safety/legal/privacy | No unsafe movement; hazard/EV/leak/fire/environment procedures; personal property and restricted evidence access |
| States | Arrival observed → physical control → custody accepted → intake complete → receipt complete → Inspection handoff accepted; distinct holds/rejection |
| Dependencies/effects | Validates/corrects Slice 1 expectations; supplies authoritative custody/condition to all later slices |
| Timing/escalation | Arrival variance, intake/receipt/handoff targets; capacity wait owned; after-hours and critical discrepancy escalation |
| Notifications | Receiver/Inventory/claims/safety/Inspection only when actionable; no sensitive evidence in broad channels |
| Exceptions/recovery | VIN mismatch, missing keys/docs/property, damage, disputed claim, no safe placement, unattended arrival, evidence failure |
| Cancellation/correction | Explicit rejection/return/transfer; supplement/supersede evidence; custody and placement never silently edited |
| Degraded/manual | Controlled paper/offline receipt with identity/custody minimums, later reconciliation and conflict review |
| Exit gate | Current accepted identity, custody, location, property, condition, restrictions, evidence and owned Inspection handoff |
| Tabletop | `ITF-AE-TT-003`-`007`,`023`-`025` plus catalog cases |
| Pilot eligibility | Approved receiving hours/locations, standard vehicles, no unresolved internal-drive dependence, trained receiver/backups |
| Monitoring | Unmatched arrivals, custody gaps, intake time, discrepancy/claim age, unsafe movement, handoff rejection, corrections |
| Pause/rollback/resume | Stop new receipt commands, preserve physical custody roster/manual procedure, reconcile every in-flight vehicle before resume |

## Future build order

Approved policy → receipt/custody aggregate → versioned persistence → permissions/commands → immutable evidence/events → movement/provider reconciliation → receiver/manager UX → offline/conflict states → tests/tabletop/shadow/pilot/rollback → activation.

## Readiness blockers

Decisions `080`-`089`, exact people/locations/evidence/safety and predecessor/global controls remain open. The non-code workflow package is complete, but no document substitutes for attributable policy approval or separate technical-design/implementation authority.
