# Phase 1 - Sixteen-Stage Shop and Recon Lifecycle

**Decision ID:** `SRO-FND-001`
**Status:** `ADOPTED - IMPLEMENTED`

## Canonical adopted lifecycle

| # | Code | Stage name | Entry condition | Exit evidence |
| ---: | --- | --- | --- | --- |
| 1 | `SERVICE_RECON_JOB_INTAKE` | Service / Recon Job Intake | A customer concern or Inventory Recon request exists | Work lane, vehicle, requester, concern, commitment and intake owner recorded |
| 2 | `JOB_SCOPE_DEFINITION` | Job Scope Definition | A complete attributable intake exists | Requested outcome, inclusions, exclusions, work intent and scope authority are versioned |
| 3 | `WORK_ORDER_CREATION` | Work Order Creation | The initial scope version is accepted | One controlled repair order links the scope, requested operations and preliminary authorization status |
| 4 | `VEHICLE_INTAKE_CUSTODY` | Vehicle Intake & Custody | The physical vehicle arrives against a controlled work order | Vehicle identity, arrival condition, keys, location, custody and movement restrictions recorded |
| 5 | `SAFETY_MOBILITY_TRIAGE` | Safety & Mobility Triage | Vehicle identity and custody are accepted | Immediate hazards, mobility class, containment and operational priority recorded |
| 6 | `INSPECTION_CONCERN_VERIFICATION` | Inspection & Concern Verification | Safe inspection may begin under the current scope | Required inspection, measurements, media and concern-verification result recorded |
| 7 | `DIAGNOSIS` | Diagnosis | A verified concern or finding requires cause determination | Tests, observations, supported cause, uncertainty and proposed correction recorded |
| 8 | `FINDINGS_REPAIR_PLAN` | Findings & Repair Plan | Current inspection and diagnosis support planning | Verified findings become versioned jobs, labor, parts, dependencies and estimate |
| 9 | `AUTHORIZATION` | Authorization | The current repair-plan version is decision-ready | Exact current scope is accepted, partially accepted, declined or pending with attribution |
| 10 | `PARTS_RESOURCE_READINESS` | Parts and Resource Readiness | Authorized executable work exists | Parts kit, procedure, technician skill, bay, lift, tool, equipment, time and evidence prerequisites verified |
| 11 | `DISPATCH_WORK_STAGING` | Dispatch & Work Staging | Every job-start prerequisite is current | Technician, bay, time, keys, parts and instructions are assigned and staged within WIP limits |
| 12 | `REPAIR_EXECUTION` | Repair Execution | Attributable dispatch is confirmed | Authorized work completes, pauses safely, or enters controlled changed-scope handling |
| 13 | `TECHNICIAN_COMPLETION` | Technician Completion | Assigned technician finishes the authorized correction | Labor closes and technician self-check, measurements, photos and exceptions are submitted |
| 14 | `QUALITY_CONTROL_ROAD_TEST` | Quality Control & Road Test | Technician completion evidence is current | Independent QC and any required road test pass, or exact rework returns to Stage 12 |
| 15 | `RELEASE_HANDOVER_READINESS` | Release & Handover Readiness | QC and road-test gates pass | Final scope, cost, keys, documents, destination and receiving party are reconciled |
| 16 | `VEHICLE_HANDOVER_SHOP_EXIT` | Vehicle Handover & Shop Exit | The current release-readiness package passes | Receiving party accepts custody and the physical Shop exit is recorded |

## Transition controls

- No stage advances from elapsed time, display status, prediction, recommendation or physical location alone.
- Authorization does not imply readiness; technician completion does not imply QC pass; QC pass does not imply customer delivery or Inventory frontline release.
- A stage change requires current subject version, actor, effective time, source evidence, prior/next stage and reason.
- Corrections, reversals, cancellations and reopened work are explicit events; history is never silently rewritten.
- A vehicle may remain in one physical zone across several administrative stages.

## Controlled loops

| Condition | Required route |
| --- | --- |
| Identity/custody conflict | Hold at Stage 4; quarantine movement until resolved |
| New safety restriction | Return to Stage 5 and contain |
| Incomplete/contradictory finding | Return to Stage 6 or 7 |
| Changed scope/new finding | Return to Stage 8, then Stage 9 for current authorization |
| Authorization revoked/expired | Return to Stage 9; stop affected work safely |
| Part/resource/skill failure | Return to Stage 10 |
| Assignment invalidated before start | Remain at Stage 11 and restage |
| QC failure | Create attributable rework and return to Stage 12 |
| Receiving-owner rejection | Remain at Stage 15 or 16 with exact rejection reason; custody stays with Shop |

## Proposed approval

Approve these sixteen codes, labels, meanings and transition rules as the canonical Shop and Recon lifecycle. This amends the earlier coarse state vocabulary without invalidating its control principles.
