# Slice 6 Future Handoff — Quality and Safety Verification

**Status:** Prepared; `NO-GO FOR DESIGN/CODE/PILOT/ACTIVATION`  
**Direct approvals:** `ITF-APR-120`-`129`; applicable global/predecessor approvals  
**Catalog:** [`Quality and Safety Verification`](../../QUALITY_SAFETY_VERIFICATION_DECISION_CATALOG.md)

## Outcome and boundary

Independently verify applicable repair and safety requirements, conduct controlled road testing when required, preserve failed-QC/rework loops, authorize operational repair release, and obtain downstream Inventory/Title acceptance. Shop release is not frontline readiness.

## Slice contract

| Requirement | Slice-specific contract |
| --- | --- |
| Entry trigger/gate | QC accepts evidence-complete execution envelope; applicable template/resources/independent verifier available |
| Authoritative inputs | Jobs/procedures/execution evidence, installed parts/labor, restrictions, QC template/tolerances, verifier qualification, road-test requirements |
| Staff questions/options | Applicable checks? pass/fail/incomplete? peer verification? road test required/eligible? contain/rework/diagnose/reapprove/specialist? release/handoff? |
| Conditional route | Missing template/resource/evidence → incomplete; critical fail → restrict/rework; road test ineligible → approved alternate/wait; repeat fail → escalation |
| Roles | Independent QC/peer, road-test authority/driver, Shop/Safety, rework technician/dispatcher, release authorizer, downstream Inventory/Title consumer |
| Permissions/financial | QC result/rework/release commands separated from executor; rework/warranty/sublet cost authority exact |
| Evidence | Template snapshot, per-item results/measurements, peer/road-test evidence, failures/rework, reinspection, keys/final condition/restrictions and release package |
| Safety/legal/privacy | Critical no-average; roadworthiness/driver/route/conditions; incident/stop; evidence access; no self-verification where independence required |
| States | Ready for QC → inspection active/incomplete/pass/fail → rework active/complete → reinspection → operational release authorized → handoff accepted |
| Dependencies/effects | Consumes Slice 5; failure returns exact work; pass removes only verified restrictions; supplies downstream condition/release truth |
| Timing/escalation | QC start/finish, road-test, rework/reinspection, repeat failure, release/handoff targets; critical failure immediate |
| Notifications | QC/Shop/Safety/rework owner/downstream; critical restriction and release invalidation actionable and deduplicated |
| Exceptions/recovery | Independent verifier/resource absent, road-test interruption, evidence conflict, repeat failure, provider/sublet dispute, post-release invalidation |
| Cancellation/correction | Preserve QC originals; correct/supersede; cancel/replan rework; invalidate release/handoff when dependent truth changes |
| Degraded/manual | Approved physical QC/checklist evidence; critical results cannot be omitted; reconcile before digital release claim |
| Exit gate | Latest applicable checks pass, labor stopped, keys/custody/final condition/restrictions reconciled, release authorized and downstream accepts |
| Tabletop | `ITF-AE-TT-013`-`015`,`023`-`025` plus catalog cases |
| Pilot eligibility | Approved QC templates/independence/resources/road-test rules; narrow repair classes; qualified backups |
| Monitoring | First-pass yield, critical failure, rework/repeat, road-test eligibility/incidents, release defects/invalidation, handoff time |
| Pause/rollback/resume | Stop release commands, preserve/restrict affected vehicles, continue safe manual QC/rework, re-evaluate all in-flight releases before resume |

## Future build order

Policy/templates → QC/rework/release model → versioned persistence → independent permissions/commands → events/evidence → resource/downstream reconciliation → QC/manager UX → failure/manual → tests/tabletop/shadow/pilot/rollback → activation.

## Readiness blockers

Decisions `120`-`129`, exact templates, independent roles, resources, road-test, criticality, rework and predecessor/global controls remain open.
