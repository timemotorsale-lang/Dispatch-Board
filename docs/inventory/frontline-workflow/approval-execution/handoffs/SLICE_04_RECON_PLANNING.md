# Slice 4 Future Handoff — Recon Planning and Approval

**Status:** Prepared; `NO-GO FOR DESIGN/CODE/PILOT/ACTIVATION`  
**Direct approvals:** `ITF-APR-100`-`109`; applicable global/predecessor approvals  
**Catalog:** [`Recon Planning and Approval`](../../RECON_PLANNING_APPROVAL_DECISION_CATALOG.md)

## Outcome and boundary

Convert accepted findings into evidence-backed corrections, estimates and alternatives; evaluate economics without autonomous disposition; obtain exact human authorization; create executable jobs; and hand them to Parts/Repair or an approved alternate.

## Slice contract

| Requirement | Slice-specific contract |
| --- | --- |
| Entry trigger/gate | Accepted Inspection/Triage envelope; all findings owned; current restrictions and evidence |
| Authoritative inputs | Findings/diagnosis, procedure/labor sources, parts/sublet/cost/fees, quotes, target, carrying exposure, authority limits |
| Staff questions/options | Diagnosis sufficient? required/optional/no-action? which estimate option? approve full/partial/decline/defer? economics review? replan/cancel |
| Conditional route | Insufficient diagnosis → diagnostic work; above limit/economics → higher/human review; partial approval → exact subset; decline/defer → safe restriction/route |
| Roles | Diagnostician, estimator, recon planner, Inventory owner, financial approver, job planner, Parts/Repair consumer, disposition authority |
| Permissions/financial | Exact quote/estimate/version authority, cumulative exposure, reapproval and anti-splitting; no implied approval |
| Evidence | Finding-to-correction lineage, diagnosis, procedure/labor/part sources, quotes, estimate/options, assumptions, authorization and job requirements |
| Safety/legal/privacy | Restrictions and mandatory work visible; no unsafe deferral; access to cost/sensitive evidence role-controlled |
| States | Finding accepted → diagnosis/scope proposed → estimate draft/presented → authorized/partial/declined/deferred/revoked → plan/jobs executable → handoff accepted |
| Dependencies/effects | Consumes Slice 3; creates authorization ceiling and jobs for Slice 5; does not execute work |
| Timing/escalation | Diagnosis/estimate/approval/reapproval/handoff targets; authorization expiry; frontline target impact |
| Notifications | Exact approver, Inventory and downstream owner; no customer/public action in this inventory workflow |
| Exceptions/recovery | Stale quote, price/cost change, plan conflict, revoked authority, changed finding, capacity/economics issue |
| Cancellation/correction | Version new estimates/plans; revoke/cancel explicitly; recover committed parts/sublet/work and re-evaluate dependencies |
| Degraded/manual | Controlled signed/manual authorization and estimate evidence; no execution until reconciled to exact current version |
| Exit gate | Every finding disposed; exact current authorization; complete executable jobs/dependencies; Parts/Repair/alternate accepts envelope |
| Tabletop | `ITF-AE-TT-008`-`010`,`023`-`025` plus catalog cases |
| Pilot eligibility | Approved financial/role/procedure sources, narrow recon classes and limits; no ambiguous disposition route |
| Monitoring | Time to plan/approve, authorization defects, estimate variance, reapproval, economics reviews, handoff rejection |
| Pause/rollback/resume | Stop new plan execution, preserve authorizations/commitments, revoke or retain exact scope through human review, revalidate on resume |

## Future build order

Policy → plan/estimate/authorization/job model → versioned persistence → commands/permissions → events/evidence/idempotency → source integrations/reconciliation → planner/approver UX → degraded states → tests/tabletop/shadow/pilot/rollback → activation.

## Readiness blockers

Decisions `100`-`109`, exact roles, financial values, diagnosis/procedure sources, economics thresholds and predecessor/global controls remain open.
