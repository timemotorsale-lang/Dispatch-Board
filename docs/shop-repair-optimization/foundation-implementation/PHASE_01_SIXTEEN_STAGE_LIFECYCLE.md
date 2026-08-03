# Phase 1 - Sixteen-Stage Shop and Recon Lifecycle

**Decision ID:** `SRO-FND-001`
**Status:** `PROPOSED`

## Exact proposed lifecycle

| # | Code | Stage name | Entry condition | Exit evidence |
| ---: | --- | --- | --- | --- |
| 1 | `SHOP_ENTRY` | Shop Entry / Arrival Detected | Vehicle is physically observed at the controlled shop boundary | Identity candidate, arrival time, entry point and source request recorded |
| 2 | `CUSTODY_CHECK_IN` | Custody and Check-In | Entry record exists and staff can safely accept custody | VIN/stock/RO match, keys, odometer, fuel, visible condition, belongings, location and custody owner recorded |
| 3 | `LANE_SCOPE_CONFIRMATION` | Lane and Scope Confirmation | Custody is accepted or an explicit custody exception is active | Customer-pay, Inventory Recon, internal/fleet, warranty or sublet lane and governing authority confirmed |
| 4 | `SAFETY_PRIORITY_TRIAGE` | Safety and Priority Triage | Lane is known sufficiently to evaluate restrictions | Immediate hazards contained; class of service and movement restrictions recorded |
| 5 | `INSPECTION` | Inspection | Correct inspection template, safe location and eligible inspector are available | Required observations, measurements, media, defects and incomplete items recorded |
| 6 | `DIAGNOSIS` | Diagnosis | A concern or inspection finding requires cause/scope determination | Tests, observations, cause assessment, uncertainty and next diagnostic step recorded |
| 7 | `FINDINGS_VERIFICATION` | Findings Verification | Inspection/diagnosis version is submitted | Findings are accepted as plan-ready or returned to Stages 5-6 with exact deficiencies |
| 8 | `REPAIR_PLAN_ESTIMATE` | Repair Plan and Estimate | Verified findings support executable alternatives | Versioned jobs, labor, parts, sublet, QC, cost and completion range prepared |
| 9 | `AUTHORIZATION_APPROVAL` | Authorization and Approval | Current plan/estimate version is decision-ready | Exact current scope is accepted, partially accepted, declined, deferred or returned for revision |
| 10 | `PARTS_RESOURCE_READINESS` | Parts and Resource Readiness | Authorized executable work exists | Parts kit, procedure, technician skill, bay, lift, tool, equipment, time and evidence prerequisites verified |
| 11 | `READY_FOR_DISPATCH` | Ready for Dispatch | Every mandatory job-start gate passes | Current readiness decision and eligible alternatives recorded |
| 12 | `ASSIGNED_STAGED` | Assigned and Staged | Human dispatcher selects an eligible combination | Technician/resource assignment, sequence, destination and revalidation time recorded |
| 13 | `REPAIR_EXECUTION` | Repair Execution | Vehicle/job is safely started under current authorization | Authorized work completes, pauses safely, or returns through a controlled changed-scope/readiness loop |
| 14 | `TECHNICIAN_COMPLETE` | Technician Complete | Assigned technician submits completed execution | Labor/parts/procedure/evidence and known restrictions are complete enough for QC intake |
| 15 | `QC_RELEASE_READINESS` | QC, Road Test and Release Readiness | QC intake accepts the technician-complete package | Applicable independent QC/road-test passes or exact rework is routed to Stage 13 |
| 16 | `HANDOFF_SHOP_EXIT` | Handoff and Shop Exit | Operational release package passes and receiving owner is eligible | Receiving owner accepts custody; exit time, location, odometer, restrictions and downstream correlation recorded |

## Transition controls

- No stage advances from elapsed time, display status, prediction, recommendation or physical location alone.
- Authorization does not imply readiness; technician completion does not imply QC pass; QC pass does not imply customer delivery or Inventory frontline release.
- A stage change requires current subject version, actor, effective time, source evidence, prior/next stage and reason.
- Corrections, reversals, cancellations and reopened work are explicit events; history is never silently rewritten.
- A vehicle may remain in one physical zone across several administrative stages.

## Controlled loops

| Condition | Required route |
| --- | --- |
| Identity/custody conflict | Hold at Stage 1 or 2; quarantine movement until resolved |
| New safety restriction | Return to Stage 4 and contain |
| Incomplete/contradictory finding | Return to Stage 5 or 6 |
| Changed scope/new finding | Return to Stage 8, then Stage 9 for current authorization |
| Authorization revoked/expired | Return to Stage 9; stop affected work safely |
| Part/resource/skill failure | Return to Stage 10 |
| Assignment invalidated before start | Return to Stage 11 |
| QC failure | Create attributable rework and return to Stage 13 |
| Receiving-owner rejection | Remain at Stage 15 or 16 with exact rejection reason; custody stays with Shop |

## Proposed approval

Approve these sixteen codes, labels, meanings and transition rules as the canonical Shop and Recon lifecycle. This amends the earlier coarse state vocabulary without invalidating its control principles.
