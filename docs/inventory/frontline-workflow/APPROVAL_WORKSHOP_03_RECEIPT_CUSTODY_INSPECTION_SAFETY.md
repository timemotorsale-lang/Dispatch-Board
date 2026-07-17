# Approval Workshop 03 - Receipt, Custody, Inspection, and Safety Approval

**Status:** Decision-ready; Slice 2 execution documents prepared; workshop not conducted
**Decisions:** `ITF-APR-080`-`099`  
**Slices:** 2. Receipt and Custody; 3. Inspection and Triage  
**Current gate:** `GO FOR APPROVAL WORKSHOP`; `NO-GO FOR CODE`  

## 1. Outcome

Approve or safely defer every policy needed to receive a physical vehicle, establish truthful custody and condition, protect people/property, perform the applicable inspection, contain critical findings, and hand accepted findings to Recon Planning or an approved alternate route.

This workshop does not approve repair, spend, title sufficiency, publication, frontline release, sale, or delivery.

## 2. Internal sequence

1. **3A — Receipt State, Roles, and Custody Authority** (`080`-`083`).
2. **3B — Condition, Placement, Hazards, and Discrepancy Control** (`084`-`089`).
3. **3C — Inspection Templates, Qualifications, and Resources** (`090`-`094`).
4. **3D — Results, Findings, Triage, Correction, and Handoff** (`095`-`099`).
5. **3E — Consolidated Gap, Tabletop, Sign-Off, and Slice Readiness Review**.

## 3. Required participants

GM/Operations; Inventory Manager; receiving/custody and lot representatives; Shop/Safety Manager; qualified inspectors/technicians; EV/high-voltage or specialist authority where applicable; Privacy/Data/Evidence owner; claims/insurance authority; workflow owner; pilot owner.

Absent qualified authority results in `DEFER_SAFE` for the affected action.

## 4. Receipt and Custody decisions

| Decision | Recommended disposition | Exact approval direction | Safe default |
| --- | --- | --- | --- |
| `080` | APPROVE | Keep arrival observed, physical control, custody acceptance, intake completion, and receipt completion distinct | Arrival remains observed only |
| `081` | APPROVE_WITH_CHANGE | Name receivers/backups; exact receiving, secure, quarantine and after-hours locations/hours/procedure | No unattended/unspecified receipt route |
| `082` | APPROVE_WITH_CHANGE | Approve VIN/identity, odometer, arrival, location, custody, receiver, time, and evidence requirements | Do not accept custody/receipt |
| `083` | APPROVE_WITH_CHANGE | Define expected/observed keys, documents, accessories, personal property, custody, discrepancy, value/recovery | Preserve actual custody; discrepancy remains open |
| `084` | APPROVE_WITH_CHANGE | Define comparable arrival-condition evidence by source, method, vehicle, risk, light/weather, and safe access | Required route holds or uses approved restricted alternate |
| `085` | APPROVE_WITH_CHANGE | Define limited movement, driver/method, EV/high-voltage, leaking fluid, fire, environmental, structural and hazard containment | No movement except existing emergency process |
| `086` | APPROVE_WITH_CHANGE | Approve eligibility for secure, temporary, restricted, quarantine, inspection-ready placement and movement between them | Vehicle stays in safest approved containment |
| `087` | APPROVE_WITH_CHANGE | Define discrepancy materiality, owner, evidence, correction, claim, return/rejection, risk authority, expiry and follow-up | Critical/material discrepancy blocks completion |
| `088` | APPROVE | Require current identity, custody, location, property, condition, restrictions, evidence and accepted exceptions; critical gates non-waivable | Receipt remains incomplete |
| `089` | APPROVE_WITH_CHANGE | Name Inspection handoff producer/consumer, envelope, acceptance/rejection, target, capacity waiting, restrictions and escalation | Owned waiting handoff; no inspection completion claim |

## 5. Inspection and Triage decisions

| Decision | Recommended disposition | Exact approval direction | Safe default |
| --- | --- | --- | --- |
| `090` | APPROVE | Keep inspection performed, evidence accepted, finding classified, triage assigned, and stage complete distinct | Performed work remains unaccepted |
| `091` | APPROVE_WITH_CHANGE | Approve template families, supplements, applicability, versioning, effective dates, invalidation, author/publisher separation | No inspection start without applicable template |
| `092` | APPROVE_WITH_CHANGE | Name inspector roles, qualifications, certifications, scope, collaboration, transfer and backup | No unqualified assignment |
| `093` | APPROVE_WITH_CHANGE | Define bay/lift/tool/scan/measurement/calibration/road-test/specialist eligibility and availability | Affected check remains incomplete |
| `094` | APPROVE_WITH_CHANGE | Define safe start, lift, vehicle entry, limited movement, road test, EV/high-voltage, structural, environmental, incident and stop rules | Contain and escalate; do not continue |
| `095` | APPROVE_WITH_CHANGE | Define pass/fail/attention/incomplete/not-applicable, units, measurements, tolerances, provenance and evidence | Missing/invalid item cannot pass |
| `096` | APPROVE_WITH_CHANGE | Approve finding classes, diagnosis boundary, severity, critical restriction, owner, and triage dispositions | Critical restriction remains active |
| `097` | APPROVE_WITH_CHANGE | Define authority/evidence for no-action, no-recon, specialist, title follow-up, disposition, return/rejection and alternate routes | Route requiring unapproved authority unavailable |
| `098` | APPROVE | Preserve originals and require correction, reinspection, supersession, reuse eligibility and dependent invalidation | Latest unconflicted accepted evidence controls |
| `099` | APPROVE_WITH_CHANGE | Define all-item/finding disposition gate and Recon/alternate handoff ownership, envelope, target, acceptance and escalation | Inspection/Triage remains incomplete |

## 6. Required configuration outputs

- named receiving/inspection roles, primary/backups, coverage and qualifications;
- approved location/placement/hazard matrix;
- receipt evidence manifest and property inventory template;
- inspection template/applicability/resource manifest;
- result, finding, restriction, discrepancy and triage taxonomies;
- clock/pause/escalation/notification rules;
- handoff envelopes for Receipt → Inspection and Inspection → Recon/alternate;
- correction, reinspection, claim, return/rejection and degraded-mode rules;
- exact accepted `DEFER_SAFE` exclusions.

## 7. Minimum tabletop cases

1. Onsite trade-in with complete keys/documents and no movement.
2. Carrier arrival with matching identity and no new damage.
3. After-hours arrival with approved containment.
4. VIN mismatch at arrival.
5. Missing key/document/accessory and disputed value.
6. New transport damage and claim disagreement.
7. Inoperable/leaking/EV-high-voltage/hazard condition.
8. No eligible secure or inspection placement.
9. Inspection template ambiguity or obsolete version.
10. Inspector/resource/calibration unavailable.
11. Critical safety finding requiring immediate containment.
12. Interrupted/transferred inspection.
13. Incomplete versus valid not-applicable result.
14. Finding requires specialist/diagnosis/title route.
15. Correction invalidates prior accepted finding/handoff.
16. No Recon capacity after valid completion.

Every case must identify owner, authority, evidence, clock, restriction, handoff, escalation, and safe recovery.

## 8. Slice readiness gates

### Slice 2 ready for technical design only when

`080`-`089` and applicable Workshop 1/2 decisions are approved/safely deferred; receiving people/locations/evidence are exact; acceptance cases have owners; no critical custody/safety gap is uncontained.

### Slice 3 ready for technical design only when

`090`-`099` and predecessors are resolved; templates/resources/qualifications/tolerances are exact; critical containment and routing are approved; acceptance cases have owners.

Each slice retains separate implementation, verification, pilot and activation gates.

## 9. Sign-off and current result

Required: GM/Operations; Inventory; Receiving/Custody; Shop/Safety/Inspection; Privacy/Data/Evidence; applicable Insurance/Specialist; workflow/pilot owners.

**Current result:** documentation ready; 20 decisions `OPEN`; Slices 2 and 3 `NO-GO FOR CODE` until authorized sign-off.

The Slice 2 execution materials are linked from the [`approval-decisions workspace`](approval-decisions/README.md). They provide the exact operating and verification structure for `080`–`089` but do not close those decisions.

