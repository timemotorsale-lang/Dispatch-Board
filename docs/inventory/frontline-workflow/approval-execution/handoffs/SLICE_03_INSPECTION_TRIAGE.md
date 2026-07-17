# Slice 3 Future Handoff — Inspection and Triage

**Status:** Prepared; `NO-GO FOR DESIGN/CODE/PILOT/ACTIVATION`  
**Direct approvals:** `ITF-APR-090`-`099`; applicable global/predecessor approvals  
**Catalog:** [`Inspection and Triage`](../../INSPECTION_TRIAGE_DECISION_CATALOG.md)

## Outcome and boundary

Perform the applicable qualified inspection safely, accept structured evidence, classify every finding, maintain restrictions, and hand complete findings to Recon Planning or an authorized alternate route.

## Slice contract

| Requirement | Slice-specific contract |
| --- | --- |
| Entry trigger/gate | Accepted Receipt/Custody handoff; applicable current template; qualified person and eligible resources |
| Authoritative inputs | Vehicle/custody/condition/restrictions, template/version, qualifications, bay/lift/tools/scans/calibration, prior evidence |
| Staff questions/options | Which inspection applies? safe to start? result per item? finding class/severity? diagnosis required? continue/supplement/stop/specialist/no-recon/disposition |
| Conditional route | Missing template/resource/qualification → wait/alternate; critical finding → contain; incomplete item → remain open; valid N/A → evidence; specialist/title route → authorized handoff |
| Roles | Inspection owner, qualified inspector, collaborator/specialist, safety authority, evidence reviewer, Recon/alternate consumer |
| Permissions/financial | Assignment/result/acceptance/triage/correction commands; diagnostic/road-test/spend require exact authority |
| Evidence | Template snapshot, item results, measurements/units/tolerances, scans/media, finding/evidence lineage, restriction and triage disposition |
| Safety/legal/privacy | Safe entry/lift/movement/road-test/EV/environment; stop-work/incident; media/restricted data access |
| States | Assigned → ready → in inspection/paused → performed → evidence accepted → findings classified/triaged → stage complete/handoff accepted |
| Dependencies/effects | Uses Slice 2 truth; restrictions constrain all later work; findings become Recon inputs but not authorized repair |
| Timing/escalation | Start, active, pause, specialist and handoff targets; critical findings immediate; capacity waits owned |
| Notifications | Inspector/owner/safety/specialist/Recon based on action; deduplicate unchanged restrictions |
| Exceptions/recovery | Obsolete template, resource failure, interrupted/transfer, measurement conflict, wrong vehicle, evidence upload failure |
| Cancellation/correction | Cancel/reassign safely; preserve originals; reinspection/supersession invalidates dependent findings/handoffs |
| Degraded/manual | Approved offline template/evidence capture; no missing critical result treated as pass; reconcile before completion |
| Exit gate | Every applicable item and finding has accepted evidence/disposition; restrictions current; Recon/alternate consumer accepts envelope |
| Tabletop | `ITF-AE-TT-006`-`008`,`023`-`025` plus catalog cases |
| Pilot eligibility | Approved templates/resources/qualifications and standard pilot vehicle scope; specialist exclusions explicit |
| Monitoring | Invalid start, incomplete/invalid results, critical containment, transfer/reinspection, restriction age, handoff rejection |
| Pause/rollback/resume | Disable affected template/version, protect active inspections/restrictions, complete or safely transfer manually, revalidate on resume |

## Future build order

Approved policy/templates → inspection/finding model → persistence/versioning → assignment/result/triage commands → events/evidence → resource/source adapters → technician/manager UX → failure/offline → tests/tabletop/shadow/pilot/rollback → activation.

## Readiness blockers

Decisions `090`-`099`, exact templates, tolerances, qualifications, resources, safety/road-test rules and predecessor/global controls remain open.
