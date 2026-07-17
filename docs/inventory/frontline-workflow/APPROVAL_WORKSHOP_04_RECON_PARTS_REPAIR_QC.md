# Approval Workshop 04 - Recon, Parts, Repair, and Quality Control Approval

**Status:** Decision-ready; not conducted  
**Decisions:** `ITF-APR-100`-`129`  
**Slices:** 4. Recon Planning and Approval; 5. Parts and Repair Execution; 6. Quality and Safety Verification  
**Current gate:** `GO FOR APPROVAL WORKSHOP`; `NO-GO FOR CODE`  

## 1. Outcome

Approve or safely defer the complete operating model from accepted inspection findings through diagnosis, estimates, human authorization, parts custody, qualified repair execution, independent QC, rework, operational repair release, and verified downstream handoff.

Operational repair release is not title readiness, merchandising completion, or frontline authorization.

## 2. Internal sequence

1. **4A — Recon Scope, Estimate, Economics, and Authorization** (`100`-`109`).
2. **4B — Parts Source, Purchase, Receipt, Ledger, and Custody** (`110`-`113`).
3. **4C — Dispatch, Labor, Procedure, Safety, and Changed Scope** (`114`-`119`).
4. **4D — QC, Road Test, Failure, Rework, and Operational Release** (`120`-`129`).
5. **4E — Consolidated Gap, Tabletop, Sign-Off, and Three-Slice Readiness Review**.

## 3. Required participants

GM/Operations; Inventory; Shop/Recon Manager; diagnostician/estimator; financial approvers; Parts Manager/custodian; qualified technicians; independent QC/peer and road-test authorities; safety/EV/specialist authority; vendor/sublet owner; evidence/data/integration owner; workflow/pilot owner.

## 4. Recon Planning and Approval decisions

| Decision | Recommended disposition | Required approval direction | Safe default |
| --- | --- | --- | --- |
| `100` | APPROVE | Distinguish proposed scope, estimate, presented option, authorization, executable plan/job | No execution from estimate alone |
| `101` | APPROVE_WITH_CHANGE | Name diagnosis/estimate/planner/approver roles, limits, cumulative exposure, independence, backups | No authorization/executable plan |
| `102` | APPROVE_WITH_CHANGE | Define finding classes, diagnosis/procedure/correction evidence and no-action rules | Unresolved finding remains open/restricted |
| `103` | APPROVE_WITH_CHANGE | Approve labor/rates/duration, parts, sublet, fees/tax boundary, currency, quotes, expiry | No financial authorization |
| `104` | APPROVE_WITH_CHANGE | Define estimate assumptions, alternatives/options, uncertainty, forecast-to-complete, all-in exposure | Estimate remains draft |
| `105` | APPROVE_WITH_CHANGE | Define economics/disposition inputs, freshness, thresholds, alternatives and human authority | No automatic disposition |
| `106` | APPROVE | Define full/partial/declined/deferred/expired/revoked authorization and evidence; no implied approval | Only exact current authorization controls |
| `107` | APPROVE_WITH_CHANGE | Define changed-scope/cost tolerances, reapproval, cancellation, revocation and committed/in-progress recovery | Stop unauthorized changed work |
| `108` | APPROVE_WITH_CHANGE | Define job decomposition, lineage, parts, skills, bay/tools, procedure, dependencies, QC/evidence | No executable job if incomplete |
| `109` | APPROVE_WITH_CHANGE | Define planning completion and Parts/Repair/alternate handoff ownership, acceptance, targets and restrictions | Planning remains incomplete |

## 5. Parts and Repair Execution decisions

| Decision | Recommended disposition | Required approval direction | Safe default |
| --- | --- | --- | --- |
| `110` | APPROVE | Distinguish demand, quote/source, ordered, acknowledged, shipped, received usable, available, reserved, issued, installed and QC-ready | Never infer downstream state |
| `111` | APPROVE_WITH_CHANGE | Name parts roles/vendors, fitment/interchange/substitution authority, purchasing limits and exposure | No unapproved purchase/substitution |
| `112` | APPROVE_WITH_CHANGE | Define PO/ack/shipment/ETA/receipt/discrepancy/return/core/warranty/credit states and evidence | Provider status remains mapped/pending |
| `113` | APPROVE | Enforce ledger invariants, availability/reservation priority, custody transitions, release and corrections | No negative/double allocation or silent edit |
| `114` | APPROVE_WITH_CHANGE | Approve procedure publisher, technician/resource eligibility, dispatch/queue/conflict and no-generic-override | No dispatch without current eligibility |
| `115` | APPROVE_WITH_CHANGE | Define labor start/pause/resume/finish, productive classes, concurrency, correction and transfer | Labor state remains truthful; no clock fabrication |
| `116` | APPROVE_WITH_CHANGE | Define pre-work, lift/entry/road-test/EV/environmental/incident/stop-work/emergency rules | Stop/contain unsafe work |
| `117` | APPROVE | Require changed-scope reapproval; define sublet/reassignment/cancellation/revocation/recovery | No unauthorized continued work |
| `118` | APPROVE_WITH_CHANGE | Define procedure/evidence, installed/removed-part disposition, job completion, exception closure and QC envelope | Technician finish not QC-ready without evidence |
| `119` | APPROVE_WITH_CHANGE | Define stage gate and QC handoff owner/acceptance/targets/escalation | Repair stage remains incomplete |

## 6. Quality and Safety Verification decisions

| Decision | Recommended disposition | Required approval direction | Safe default |
| --- | --- | --- | --- |
| `120` | APPROVE | Distinguish technician finish, inspection, job pass, rework completion, order release and downstream readiness | No implied pass/release |
| `121` | APPROVE_WITH_CHANGE | Approve QC templates/supplements/applicability/procedure linkage/checks/tolerances/evidence/version/publisher | No QC without applicable template |
| `122` | APPROVE_WITH_CHANGE | Name qualified independent inspectors/peers, scope, assignment, workload, conflicts and backups | Executing technician cannot replace required verifier |
| `123` | APPROVE_WITH_CHANGE | Define QC bay/tools/calibration/scan/lift/EV/entry/specialist eligibility | Affected verification incomplete |
| `124` | APPROVE_WITH_CHANGE | Define road-test applicability, driver/legal/safety, route/conditions/evidence/alternative/incident/stop | No road test without every gate |
| `125` | APPROVE | Define pass/fail/incomplete, critical non-averaging, integrity, immutable correction/supersession | Critical failure remains failure |
| `126` | APPROVE_WITH_CHANGE | Define failure severity/containment/diagnosis/authorization/rework/warranty/sublet/repeat escalation | Restrict and route rework |
| `127` | APPROVE | Define rework completion, reinspection scope, prior-evidence reuse/invalidation, latest projection and targets | No pass until current reinspection passes |
| `128` | APPROVE_WITH_CHANGE | Define all-job pass, stopped labor, keys/custody, final condition/restrictions, authorizer and operational release | Repair order remains restricted |
| `129` | APPROVE_WITH_CHANGE | Define downstream route/acceptance, invalidation/recovery, stage completion, owner, timing and escalation | No downstream readiness claim |

## 7. Required configuration outputs

- role/qualification/separation and financial authority matrices;
- recon estimate/economics/authorization/version manifests;
- job/procedure/resource/dependency/QC requirements;
- vendor/parts source, status mapping, ledger and custody policy;
- labor, dispatch, stop-work, incident and changed-scope rules;
- QC/road-test/failure/rework templates and criticality;
- Parts/Repair → QC and QC → downstream handoff envelopes;
- clocks, escalation, evidence/access, degraded/provider reconciliation;
- exact exclusions and external-review/sublet paths.

## 8. Minimum tabletop cases

1. Complete diagnosis and routine approved plan.
2. Missing/ambiguous diagnosis or obsolete procedure.
3. Multiple alternatives and partial approval.
4. Plan crosses economics threshold.
5. Approval expires or is revoked after commitment.
6. Changed scope above tolerance mid-repair.
7. Quote versus order acknowledgement versus receipt mismatch.
8. Wrong/damaged/short/substitute part and fitment conflict.
9. Double reservation or part issued to wrong job.
10. Technician/bay/tool/qualification conflict.
11. Safety/EV/lift/incident stop-work.
12. Sublet work with provider outage/uncertain completion.
13. Technician completes without mandatory evidence.
14. Independent QC unavailable.
15. Critical QC failure and rework loop.
16. Repeat failure/comeback concern.
17. Road test unsafe/ineligible/interrupted.
18. All jobs pass but labor/keys/restriction remains open.
19. Operational release later invalidated.
20. No downstream capacity after valid release.

## 9. Slice readiness

- Slice 4 requires `100`-`109` plus predecessor and Workshop 1/2 approval.
- Slice 5 requires `110`-`119`, a valid current authorized plan, ledger/custody and qualified resources.
- Slice 6 requires `120`-`129`, independent coverage and non-waivable safety/QC rules.

Implement/pilot in order: Slice 4 → Slice 5 → Slice 6. Each has separate verification and activation.

## 10. Sign-off and current result

Required: GM/Operations; Inventory; Shop/Recon; Finance; Parts; Technician; independent QC/Safety/Road-Test; Data/Evidence/Integration; workflow/pilot owners.

**Current result:** documentation ready; 30 decisions `OPEN`; Slices 4–6 `NO-GO FOR CODE` until authorized sign-off.
