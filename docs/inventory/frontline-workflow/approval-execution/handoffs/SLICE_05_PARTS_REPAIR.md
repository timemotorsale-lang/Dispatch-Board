# Slice 5 Future Handoff — Parts and Repair Execution

**Status:** Prepared; `NO-GO FOR DESIGN/CODE/PILOT/ACTIVATION`  
**Direct approvals:** `ITF-APR-110`-`119`; applicable global/predecessor approvals  
**Catalog:** [`Parts and Repair Execution`](../../PARTS_REPAIR_EXECUTION_DECISION_CATALOG.md)

## Outcome and boundary

Source, purchase, receive, reserve and control parts; dispatch only authorized ready work to qualified technicians/resources; record safe execution, labor and changed scope; and produce an evidence-complete QC handoff. Technician completion does not pass QC.

## Slice contract

| Requirement | Slice-specific contract |
| --- | --- |
| Entry trigger/gate | Accepted current executable job; authority, procedure, dependencies and requirements known |
| Authoritative inputs | Job/authorization, demand/fitment, vendor offers/ETA, parts ledger/custody, technician qualification, resources, procedure/safety/QC rules |
| Staff questions/options | Parts required/available/reserved? source/substitute/transfer? purchase? job ready? assign/stage/start/pause/resume/reassign? changed scope/sublet/cancel? finish to QC? |
| Conditional route | Missing/unusable parts → source/wait; substitute → technical/financial approval; ineligible tech/resource → alternate; changed scope → stop/reapprove; incident → contain |
| Roles | Parts demand/source/purchase/receiver/custodian, dispatcher, technician, Shop/Safety, sublet owner, financial approver, QC consumer |
| Permissions/financial | PO/source/substitute/issue/dispatch/labor/finish commands; exact limits/cumulative exposure; job authorization ceiling |
| Evidence | Demand/offer/PO/ack/ETA/receipt/discrepancy, reservation/custody/install/return/core/warranty, procedure/labor/measurements, pause/change/incident, completion envelope |
| Safety/legal/privacy | Pre-work/lift/entry/EV/environment/stop-work; qualification; restricted incident/employee data; no productivity-based safety override |
| States | Demand → source/order/receipt/usable/reserved/issued/installed/reconciled; job ready/staged/active/paused/changed/completed/ready-for-QC |
| Dependencies/effects | Consumes exact Slice 4 jobs; creates parts/labor/execution truth and QC requirements for Slice 6 |
| Timing/escalation | Source/approval/ETA/receipt/readiness/dispatch/active/pause/handoff clocks; original age preserved |
| Notifications | Parts/job owner, approver, dispatcher, safety/QC; actionable ETA/change/incident only |
| Exceptions/recovery | Wrong/damaged/short part, cost/ETA change, double reservation, issued-not-used, resource conflict, sublet outage, procedure deviation |
| Cancellation/correction | Explicit PO/job cancellation, return/release/reversal, labor correction, custody supersession and safe partial-work recovery |
| Degraded/manual | Durable manual ledger/custody/labor/evidence procedure; no fabricated availability; idempotent later reconciliation |
| Exit gate | All applicable jobs evidence-complete for QC; parts/labor/custody reconcile; no unauthorized scope/active clock/unowned critical exception; QC accepts |
| Tabletop | `ITF-AE-TT-009`,`011`-`013`,`023`-`025` plus catalog cases |
| Pilot eligibility | Approved vendor/parts/financial/procedure/qualification/resource policies; narrow job classes; manual provider fallback |
| Monitoring | Parts readiness/accuracy, ETA variance, purchase authority, ledger conflict, job-start validity, labor state, change/rework precursors |
| Pause/rollback/resume | Stop dispatch/purchase automation, preserve jobs/parts/custody/labor, finish safe active steps manually, reconcile before resume |

## Future build order

Policy → parts/job/dispatch/labor models → persistence/constraints → permissions/commands → events/audit/evidence/idempotency → vendor/resource adapters → parts/dispatcher/technician UX → degraded/manual → tests/tabletop/shadow/pilot/rollback → activation.

## Readiness blockers

Decisions `110`-`119`, purchasing limits, vendors/state mappings, fitment/substitution, procedures, qualifications, safety and predecessor/global controls remain open.
