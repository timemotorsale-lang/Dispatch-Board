# Consolidated 130-Decision Disposition Ledger

**Status:** Planning recommendation ledger; current execution state is maintained in the Execution Approval Register and Decision Signature Journal
**Rule:** Each `ITF-APR-*` identifier appears exactly once in this ledger. `Recommended` is advisory. The row-level `State` column preserves the preparation baseline and is superseded by later valid execution records.

## Field conventions

- `Authority / owner` lists the required approving role, followed by the accountable preparation/closure role where different.
- `Dependencies / slices` names the controlling dependency and affected lifecycle slices (`S1`-`S9`; `ALL`).
- `Closure evidence` is the minimum evidence needed in addition to the standard approval record.
- Exact proposal language is intentionally policy-like but remains subject to `APPROVE_WITH_CHANGE`.

## AE-1 — Program, scope and pilot (18)

| Decision | Recommended | Exact proposed policy | Safe default | Authority / owner | Dependencies / slices | Closure evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ITF-APR-001` | APPROVE | Adopt documented outcome, precedence, lifecycle and excluded authority | Planning only | GM/Operations / workflow owner | Constitution; ALL | Signed charter text/version | OPEN |
| `ITF-APR-002` | APPROVE | Adopt nine slices; first build ends at accepted Receipt/Custody handoff | No technical design | Workflow + policy owners | `001`; ALL | Signed lifecycle/boundary | OPEN |
| `ITF-APR-003` | APPROVE | Permit shadow and manager-confirmed/manual starts only; automatic start disabled | No workflow start | Inventory Manager / pilot owner | `001`,`002`; S1 | Trigger-mode record | OPEN |
| `ITF-APR-004` | APPROVE | Use versioned catalog questions/options for tabletop and log every change | No staff activation | Inventory + pilot staff / workflow owner | `002`; ALL | Tabletop terminology acceptance | OPEN |
| `ITF-APR-005` | APPROVE | Identity, authority, safety, custody, privacy, evidence and release gates are non-waivable | Hold affected action | GM/Operations / policy owner | `001`; ALL | Signed hard-gate manifest | OPEN |
| `ITF-APR-006` | APPROVE | Cancellation, acquisition reversal, transport recovery and disposition use separate commands | Existing manual authority | GM/Operations / workflow owner | `002`,`005`; S1 | Command-boundary approval | OPEN |
| `ITF-APR-010` | APPROVE | Limit initial program to Time Motor Sales, Minneapolis | No pilot location | GM/Operations / pilot owner | `001`; ALL | Organization/location record | OPEN |
| `ITF-APR-011` | APPROVE | Pilot only approved onsite trades, known sellers/dealers, approved auctions/carriers and verified onsite units | Excluded sources manual | Inventory Manager / acquisition owner | `010`; S1 | Cohort/exclusion manifest | OPEN |
| `ITF-APR-012` | APPROVE | Pilot standard passenger/light-duty vehicles; enumerate exclusions | Excluded vehicle stays out | Inventory + Shop/Safety | `011`; ALL | Vehicle eligibility matrix | OPEN |
| `ITF-APR-013` | APPROVE_WITH_CHANGE | Name exact receiving, secure containment, quarantine and after-hours locations/capabilities | No unspecified arrival route | Operations/Location / receiving owner | `010`; S1-S3 | Approved location/capability sheet | OPEN |
| `ITF-APR-014` | APPROVE | Allow no movement/onsite, approved carrier/tow and seller delivery; defer internal drive | No internal driving | Inventory + Safety/Insurance | `012`,`051`,`052`; S1-S2 | Movement-mode matrix | OPEN |
| `ITF-APR-015` | APPROVE_WITH_CHANGE | Use America/Chicago and approve exact hours, holidays, closures, coverage and after-hours containment | No automated SLA calendar | Operations / calendar owner | `010`; ALL | Published effective calendar | OPEN |
| `ITF-APR-070` | APPROVE | Require named cross-functional participants and at least 12 representative tabletop cases | No tabletop sign-off | Pilot owner / facilitator | AE-1–AE-7; ALL | Attendance, cases, results | OPEN |
| `ITF-APR-071` | APPROVE | Shadow thresholds are hypotheses requiring measured evidence | Automatic triggers disabled | Pilot + policy owners | `070`; ALL | Threshold/version record | OPEN |
| `ITF-APR-072` | APPROVE | Pilot one location, trained cohort, manager-confirmed starts, minimum 20 vehicles/30 days | No manual pilot | GM/Operations + pilot owner | `070`,`071`; S1 initially | Cohort/training/timebox | OPEN |
| `ITF-APR-073` | APPROVE | Require zero critical failures and approved reliability, outcome, usability, ownership and alert thresholds | No expansion | GM/Operations + pilot owner | `071`,`072`; ALL | Signed success scorecard | OPEN |
| `ITF-APR-074` | APPROVE_WITH_CHANGE | Name primary/backups for monitoring, incident, pause, rollback and resume with exact scope | Pilot off | GM/Operations / pilot owner | `072`,`073`; ALL | Authority/coverage roster | OPEN |
| `ITF-APR-075` | APPROVE | Automatic starts require completed shadow/manual exits and separate authorization | Automatic start off | GM/Operations + Inventory | `073`,`074`; ALL | Separate activation resolution | OPEN |

## AE-2A — Roles and responsibility (6)

| Decision | Recommended | Exact proposed policy | Safe default | Authority / owner | Dependencies / slices | Closure evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ITF-APR-020` | APPROVE_WITH_CHANGE | Name separate policy, service/workflow and pilot owners after workload/conflict review | No active ownership | GM/Operations / program sponsor | `001`; ALL | Named-role acceptance | OPEN |
| `ITF-APR-021` | APPROVE_WITH_CHANGE | Complete person-level capability, location, vehicle, qualification, schedule, backup and access records | No command grant | GM/Operations + role owners | `020`; ALL | Capability/access sheets | OPEN |
| `ITF-APR-022` | APPROVE_WITH_CHANGE | Name movement coordinator/executor/monitor, receiver, backups and handoff coverage | No live transport | Inventory + Operations/Safety | `021`; S1-S2 | RACI/coverage roster | OPEN |
| `ITF-APR-023` | APPROVE_WITH_CHANGE | Name independent identity-conflict reviewer and cancellation/reversal authorities | Identity hold | GM/Operations + Inventory/Office | `021`; S1-S2 | Independence/authority record | OPEN |
| `ITF-APR-024` | APPROVE_WITH_CHANGE | Approve permissible/prohibited role combinations and external-review routes | Independent action holds | GM/Operations + qualified owners | `020`,`021`; ALL | Separation matrix | OPEN |
| `ITF-APR-025` | APPROVE_WITH_CHANGE | Separate administrator and consequential-policy publisher; prohibit self-grant/publication | No policy publication | GM/Operations + Security/Data | `024`; ALL | Admin/publisher controls | OPEN |

## AE-2B — Authority and financial controls (7)

| Decision | Recommended | Exact proposed policy | Safe default | Authority / owner | Dependencies / slices | Closure evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ITF-APR-030` | APPROVE_WITH_CHANGE | Approve pilot currency, gross-exposure treatment and every cost class | No financial automation | GM/Operations + Controller | `001`; ALL | Cost/currency policy | OPEN |
| `ITF-APR-031` | APPROVE_WITH_CHANGE | Set command-specific limits by actor, action, vehicle, plan/order and period | No amount-based approval | GM/Owner/Controller | `030`,`021`; ALL | Signed limit matrix | OPEN |
| `ITF-APR-032` | APPROVE_WITH_CHANGE | Define quote count/type/source/expiry/comparison and narrow exceptions | No quote sufficiency | Financial + functional owners | `030`,`031`; S1,S4-S8 | Quote policy/examples | OPEN |
| `ITF-APR-033` | APPROVE_WITH_CHANGE | Set absolute/percentage reapproval thresholds; material scope/source changes always re-evaluate | Changed work stops | Financial + functional owners | `031`,`032`; S1,S4-S8 | Threshold/changed-scope tests | OPEN |
| `ITF-APR-034` | APPROVE | Aggregate gross correlated exposure across vehicle/cycle, purpose, plan/order/provider and time; prohibit splitting | Uncertain correlation holds | GM/Operations + Controller | `030`-`033`; ALL | Aggregation/anti-split tests | OPEN |
| `ITF-APR-035` | APPROVE_WITH_CHANGE | Define emergency categories, exact limit, coverage, evidence and retrospective reviewer | Existing emergency process | GM + Safety/Insurance + Controller | `031`,`034`; S1-S6 | Emergency matrix/review SLA | OPEN |
| `ITF-APR-036` | APPROVE_WITH_CHANGE | Define investment, forecast, carrying, margin, age and risk inputs plus human disposition thresholds | No automatic disposition | GM + Inventory + Controller | `030`,`034`; S1,S4,S7-S9 | Economics/threshold policy | OPEN |

## AE-2D — Timing, escalation and notifications (6)

| Decision | Recommended | Exact proposed policy | Safe default | Authority / owner | Dependencies / slices | Closure evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ITF-APR-040` | APPROVE_WITH_CHANGE | Set segmented acquisition-validation warning/due/overdue targets while preserving original age | Display age only | Inventory + Operations | `015`; S1 | Approved target table | OPEN |
| `ITF-APR-041` | APPROVE_WITH_CHANGE | Set plan/request/quote/approval/confirmation/pickup targets by movement segment | No automated escalation | Inventory/Transport + Finance | `015`,`040`; S1 | Segment SLA table | OPEN |
| `ITF-APR-042` | APPROVE_WITH_CHANGE | Set pickup/arrival warning, material, severe, stale/unknown and after-hours response thresholds | Manual provider monitoring | Inventory/Receiving + Operations | `015`,`041`; S1-S2 | Variance/response table | OPEN |
| `ITF-APR-043` | APPROVE_WITH_CHANGE | Approve structured pause reasons, authority, maximum review, expiry and continuing total age | Waiting does not auto-pause | Operations + stage owners | `015`; ALL | Pause policy/scenarios | OPEN |
| `ITF-APR-044` | APPROVE_WITH_CHANGE | Name E1-E5 primary/backups/on-call and acknowledgement, response, resolution and dwell targets | Existing manual escalation | GM/Operations + incident owners | `020`,`043`; ALL | Escalation roster/targets | OPEN |
| `ITF-APR-045` | APPROVE_WITH_CHANGE | Use durable in-app queue plus minimal-data channels with urgency, quiet, retry, fallback and delivery rules | No external notification | Operations + Security/Privacy | `044`,`054`; ALL | Notification/channel policy | OPEN |

## AE-2C — Evidence, privacy and security (7)

| Decision | Recommended | Exact proposed policy | Safe default | Authority / owner | Dependencies / slices | Closure evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ITF-APR-050` | APPROVE_WITH_CHANGE | Complete applicability, criticality, source, role, freshness, access, retention and correction for all first-slice evidence | No live evidence gate | Policy + Inventory + Evidence/Security | `005`,`054`,`055`; S1 | Evidence manifest | OPEN |
| `ITF-APR-051` | DEFER_SAFE | Internal driving stays disabled until roadworthiness/legal-operation source, validity, invalidation and alternate are approved | Tow/carrier only | Operations + Shop/Safety + Insurance/legal | `014`; S1 | Qualified roadworthiness policy | OPEN |
| `ITF-APR-052` | DEFER_SAFE | Internal driving stays disabled until driver/insurance source, scope, validity, privacy and revocation are approved | No internal driver | Operations + Insurance/HR/Privacy | `014`; S1 | Driver/coverage policy | OPEN |
| `ITF-APR-053` | APPROVE_WITH_CHANGE | Approve comparable pre/post condition evidence by source, method, vehicle and risk | Unproved route unavailable | Inventory + Receiving + Claims | `050`; S1-S2 | Condition matrix/tabletop | OPEN |
| `ITF-APR-054` | APPROVE_WITH_CHANGE | Approve item/field classification and view/action access; expose minimal eligibility results | Restricted evidence unavailable | Privacy/Security + role owners | `021`,`050`; ALL | Classification/access tests | OPEN |
| `ITF-APR-055` | APPROVE_WITH_CHANGE | Set class retention, hold, export, disposal, provider/backup rules and owners | No auto-disposal/bulk export | Records + Legal/Privacy + Security | `054`; ALL | Retention/hold schedule | OPEN |
| `ITF-APR-056` | APPROVE | Preserve originals; use supplement/reject/correct/supersede/conflict/quarantine with dependency reevaluation | Suspect evidence quarantined | Evidence + Security/Privacy + decision authority | `050`,`054`; ALL | Correction/quarantine tests | OPEN |

## AE-2E — Source authority, integration and reconciliation (6)

| Decision | Recommended | Exact proposed policy | Safe default | Authority / owner | Dependencies / slices | Closure evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ITF-APR-060` | APPROVE_WITH_CHANGE | Inventory actual acquisition sources and approve every material field/state/source/freshness mapping | No authoritative auto-start | Inventory + Controller + source owner | `050`; S1 | Field/source matrix | OPEN |
| `ITF-APR-061` | APPROVE | Preserve one canonical Vehicle/inventory cycle, raw/normalized VIN, mappings and duplicate/conflict controls | Identity conflict holds | Inventory + Identity/Data | `060`; ALL | Identity/reconciliation tests | OPEN |
| `ITF-APR-062` | APPROVE_WITH_CHANGE | Approve sources for reported, observed, planned, in-transit, arrival, custody, placement and item custody | Report alone cannot move/receive | Inventory + Receiving/Custody + Data | `060`,`061`; S1-S3 | State-source matrix | OPEN |
| `ITF-APR-063` | DEFER_SAFE | Provider integration stays advisory/manual until state mappings, idempotency and failure behavior are approved | Manual monitored path | Inventory/Transport + Integration owner | `060`,`065`; S1 | Adapter contract/tabletop | OPEN |
| `ITF-APR-064` | APPROVE | Keep DMS/accounting/website boundaries explicit; no implied posting, payment, publication or frontline truth | No external-write reliance | GM + Controller + Merchandising | `060`; ALL | Boundary/data-flow approval | OPEN |
| `ITF-APR-065` | APPROVE_WITH_CHANGE | Set field freshness, conflict authority, degraded levels, fallback, reconciliation and return-to-normal | Stale/conflict cannot pass gate | Data/Integration + Security + owners | `060`-`064`; ALL | Freshness/degraded runbook | OPEN |

## AE-3 — Receipt and Custody (10)

| Decision | Recommended | Exact proposed policy | Safe default | Authority / owner | Dependencies / slices | Closure evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ITF-APR-080` | APPROVE | Keep arrival observed, physical control, custody acceptance, intake completion and receipt completion distinct | Arrival observed only | Inventory/Receiving / workflow owner | `061`,`062`; S2 | State/handoff approval | OPEN |
| `ITF-APR-081` | APPROVE_WITH_CHANGE | Name receivers/backups and exact receiving, secure, quarantine and after-hours locations/hours/procedure | No unattended/unspecified route | Operations + Receiving | `013`,`022`; S2 | Roster/location procedure | OPEN |
| `ITF-APR-082` | APPROVE_WITH_CHANGE | Require VIN/identity, odometer, arrival, location, custody, receiver, time and evidence | No custody acceptance | Inventory + Receiving/Data | `050`,`061`,`062`,`081`; S2 | Receipt evidence manifest | OPEN |
| `ITF-APR-083` | APPROVE_WITH_CHANGE | Define expected/observed keys, documents, accessories, personal property, custody, discrepancy and recovery | Preserve actual; discrepancy open | Receiving + Inventory/Claims | `050`,`082`; S2 | Property/custody template | OPEN |
| `ITF-APR-084` | APPROVE_WITH_CHANGE | Define comparable arrival-condition evidence by source, method, vehicle, risk and safe conditions | Hold/restricted alternate | Inventory + Receiving/Claims | `053`,`082`; S2 | Condition evidence matrix | OPEN |
| `ITF-APR-085` | APPROVE_WITH_CHANGE | Define limited movement, drivers/methods and EV, leak, fire, environmental, structural and hazard containment | Emergency process only | Operations + Shop/Safety | `051`,`052`,`084`; S2 | Safety/movement procedure | OPEN |
| `ITF-APR-086` | APPROVE_WITH_CHANGE | Define eligibility for secure, temporary, restricted, quarantine and inspection-ready placement | Safest approved containment | Operations/Location + Receiving | `013`,`081`,`085`; S2 | Placement matrix | OPEN |
| `ITF-APR-087` | APPROVE_WITH_CHANGE | Define discrepancy materiality, owner, evidence, correction, claim, rejection/return, expiry and follow-up | Material discrepancy blocks | Inventory + Claims/Receiving | `083`,`084`; S2 | Discrepancy/claim policy | OPEN |
| `ITF-APR-088` | APPROVE | Receipt requires current identity, custody, location, property, condition, restrictions, evidence and accepted exceptions | Receipt incomplete | Inventory + Receiving | `082`-`087`; S2 | Gate/tabletop proof | OPEN |
| `ITF-APR-089` | APPROVE_WITH_CHANGE | Name Inspection handoff producer/consumer, envelope, acceptance/rejection, target, capacity wait and escalation | Owned wait; no completion | Inventory + Shop/Inspection | `088`,`040`-`045`; S2-S3 | Handoff contract | OPEN |

## AE-3 — Inspection and Triage (10)

| Decision | Recommended | Exact proposed policy | Safe default | Authority / owner | Dependencies / slices | Closure evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ITF-APR-090` | APPROVE | Keep performed, evidence accepted, finding classified, triage assigned and stage complete distinct | Performed remains unaccepted | Shop/Inspection + Data | `089`; S3 | State model approval | OPEN |
| `ITF-APR-091` | APPROVE_WITH_CHANGE | Approve template families, supplements, applicability, versions, dates, invalidation and author/publisher separation | No inspection start | Shop/Safety + policy publisher | `025`,`050`; S3 | Template/version manifest | OPEN |
| `ITF-APR-092` | APPROVE_WITH_CHANGE | Name inspector roles, qualifications, certifications, scope, collaboration, transfer and backup | No unqualified assignment | Shop/Safety + HR/qualification owner | `021`,`024`; S3 | Qualification matrix | OPEN |
| `ITF-APR-093` | APPROVE_WITH_CHANGE | Define bay/lift/tool/scan/measurement/calibration/road-test/specialist eligibility and availability | Affected check incomplete | Shop/Safety + resource owner | `092`; S3 | Resource/calibration manifest | OPEN |
| `ITF-APR-094` | APPROVE_WITH_CHANGE | Define safe start, lift, entry, movement, road test, EV, structural, environmental, incident and stop rules | Contain; do not continue | Shop/Safety + qualified authority | `085`,`092`,`093`; S3 | Safety/incident procedure | OPEN |
| `ITF-APR-095` | APPROVE_WITH_CHANGE | Define result values, units, measurements, tolerances, provenance and evidence | Missing/invalid cannot pass | Shop/QC + evidence owner | `091`,`093`; S3 | Result/tolerance catalog | OPEN |
| `ITF-APR-096` | APPROVE_WITH_CHANGE | Approve finding classes, diagnosis boundary, severity, critical restriction, owner and triage dispositions | Critical restriction active | Shop/Safety + Inventory | `095`; S3 | Finding/triage catalog | OPEN |
| `ITF-APR-097` | APPROVE_WITH_CHANGE | Define authority/evidence for no-action, no-recon, specialist, title, disposition and rejection/return routes | Unapproved route unavailable | Inventory + Shop + qualified owners | `096`,`036`; S3-S4,S7 | Alternate-route matrix | OPEN |
| `ITF-APR-098` | APPROVE | Preserve originals and require correction, reinspection, supersession, reuse eligibility and dependent invalidation | Latest accepted unconflicted evidence | Evidence + Shop/Inspection | `056`,`095`; S3 | Correction/invalidation tests | OPEN |
| `ITF-APR-099` | APPROVE_WITH_CHANGE | Require all-item/finding disposition and named Recon/alternate handoff, envelope, target, acceptance and escalation | Stage incomplete | Shop/Inspection + Recon/Inventory | `096`-`098`; S3-S4 | Completion/handoff contract | OPEN |

## AE-4 — Recon Planning and Approval (10)

| Decision | Recommended | Exact proposed policy | Safe default | Authority / owner | Dependencies / slices | Closure evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ITF-APR-100` | APPROVE | Distinguish proposed scope, estimate, presented option, authorization and executable plan/job | No execution from estimate | Shop/Recon + Finance | `099`; S4 | State model approval | OPEN |
| `ITF-APR-101` | APPROVE_WITH_CHANGE | Name diagnosis, estimate, planning and approving roles/limits/independence/backups | No authorization/plan | GM + Shop + Finance | `021`,`024`,`031`; S4 | Role/authority matrix | OPEN |
| `ITF-APR-102` | APPROVE_WITH_CHANGE | Define finding classes, diagnosis/procedure/correction evidence and no-action rules | Finding open/restricted | Shop/Recon + Safety | `096`,`099`; S4 | Diagnosis/scope rules | OPEN |
| `ITF-APR-103` | APPROVE_WITH_CHANGE | Approve labor/rates/duration, parts, sublet, fees/tax boundary, currency, quotes and expiry | No financial authorization | Controller + Shop/Parts | `030`-`033`; S4 | Estimate financial policy | OPEN |
| `ITF-APR-104` | APPROVE_WITH_CHANGE | Define estimate assumptions, options, uncertainty, completion forecast and all-in exposure | Estimate draft | Shop/Recon + Finance | `102`,`103`; S4 | Estimate template/examples | OPEN |
| `ITF-APR-105` | APPROVE_WITH_CHANGE | Define economics/disposition inputs, freshness, thresholds, alternatives and human authority | No automatic disposition | GM + Inventory + Controller | `036`,`065`,`104`; S4 | Economics decision policy | OPEN |
| `ITF-APR-106` | APPROVE | Define full/partial/declined/deferred/expired/revoked authorization and evidence; no implied approval | Exact current authority only | Authorized approver + Evidence | `101`,`104`; S4 | Authorization contract | OPEN |
| `ITF-APR-107` | APPROVE_WITH_CHANGE | Define changed scope/cost tolerances, reapproval, cancellation, revocation and committed/in-progress recovery | Stop changed work | Finance + Shop/Recon | `033`,`106`; S4-S5 | Reapproval/recovery tests | OPEN |
| `ITF-APR-108` | APPROVE_WITH_CHANGE | Define job lineage, parts, skills, resources, procedure, dependencies, QC and evidence | Incomplete job nonexecutable | Shop/Recon + Parts/QC | `102`,`106`; S4-S6 | Executable-job schema | OPEN |
| `ITF-APR-109` | APPROVE_WITH_CHANGE | Define planning completion and Parts/Repair/alternate handoff ownership, acceptance, targets and restrictions | Planning incomplete | Shop/Recon + Parts/Dispatch | `108`,`040`-`045`; S4-S5 | Handoff contract | OPEN |

## AE-4 — Parts and Repair Execution (10)

| Decision | Recommended | Exact proposed policy | Safe default | Authority / owner | Dependencies / slices | Closure evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ITF-APR-110` | APPROVE | Distinguish demand, source, ordered, acknowledged, shipped, received usable, available, reserved, issued, installed and QC-ready | Never infer downstream state | Parts + Shop | `109`; S5 | Parts state model | OPEN |
| `ITF-APR-111` | APPROVE_WITH_CHANGE | Name parts roles/vendors, fitment/interchange/substitution authority, purchase limits and exposure | No unapproved purchase/substitution | Parts + Finance + Shop | `031`,`034`; S5 | Vendor/authority matrix | OPEN |
| `ITF-APR-112` | APPROVE_WITH_CHANGE | Define PO, acknowledgement, shipment, ETA, receipt, discrepancy, return, core, warranty and credit evidence | Provider state pending | Parts + Integration/Finance | `063`,`065`,`111`; S5 | Status/evidence mapping | OPEN |
| `ITF-APR-113` | APPROVE | Enforce ledger invariants, availability/reservation priority, custody, release and corrections | No negative/double allocation | Parts + Data/Controller | `056`,`110`; S5 | Ledger/concurrency tests | OPEN |
| `ITF-APR-114` | APPROVE_WITH_CHANGE | Approve procedure publisher, technician/resource eligibility, dispatch/queue/conflict and no generic override | No ineligible dispatch | Shop/Safety + Dispatcher | `025`,`108`; S5 | Procedure/eligibility matrix | OPEN |
| `ITF-APR-115` | APPROVE_WITH_CHANGE | Define labor start/pause/resume/finish, productive classes, concurrency, correction and transfer | Truthful labor state | Shop + Controller/HR | `043`,`114`; S5 | Labor event policy/tests | OPEN |
| `ITF-APR-116` | APPROVE_WITH_CHANGE | Define pre-work, lift/entry/road-test/EV/environmental/incident/stop-work/emergency rules | Stop/contain unsafe work | Shop/Safety + qualified authority | `035`,`094`,`114`; S5 | Safety procedure/tabletop | OPEN |
| `ITF-APR-117` | APPROVE | Require changed-scope reapproval and controlled sublet/reassignment/cancellation/revocation/recovery | No unauthorized continuation | Shop + Finance + vendor owner | `107`,`116`; S5 | Changed-scope/recovery tests | OPEN |
| `ITF-APR-118` | APPROVE_WITH_CHANGE | Define procedure evidence, part disposition, job completion, exception closure and QC envelope | Finish not QC-ready | Shop/Technician + Evidence/QC | `108`,`113`-`117`; S5-S6 | Completion/QC envelope | OPEN |
| `ITF-APR-119` | APPROVE_WITH_CHANGE | Define stage gate and QC handoff owner, acceptance, targets and escalation | Repair stage incomplete | Shop/Dispatch + QC | `118`,`040`-`045`; S5-S6 | Stage/handoff contract | OPEN |

## AE-4 — Quality and Safety Verification (10)

| Decision | Recommended | Exact proposed policy | Safe default | Authority / owner | Dependencies / slices | Closure evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ITF-APR-120` | APPROVE | Distinguish technician finish, inspection, job pass, rework completion, order release and downstream readiness | No implied pass/release | QC + Shop/Inventory | `119`; S6 | QC state model | OPEN |
| `ITF-APR-121` | APPROVE_WITH_CHANGE | Approve QC templates, applicability, procedure links, checks, tolerances, evidence, version and publisher | No QC without template | QC/Safety + policy publisher | `025`,`118`; S6 | QC template manifest | OPEN |
| `ITF-APR-122` | APPROVE_WITH_CHANGE | Name qualified independent inspectors/peers, scope, assignment, conflicts, workload and backups | Executor cannot self-verify | Shop/QC + GM | `021`,`024`,`121`; S6 | Independence/coverage roster | OPEN |
| `ITF-APR-123` | APPROVE_WITH_CHANGE | Define QC bay/tools/calibration/scan/lift/EV/entry/specialist eligibility | Verification incomplete | QC/Safety + resource owner | `121`,`122`; S6 | QC resource manifest | OPEN |
| `ITF-APR-124` | APPROVE_WITH_CHANGE | Define road-test applicability, driver/legal/safety, route/conditions/evidence/alternate/incident/stop | No road test without gates | Safety/Insurance + QC | `051`,`052`,`123`; S6 | Road-test policy | OPEN |
| `ITF-APR-125` | APPROVE | Define pass/fail/incomplete, critical non-averaging, integrity and immutable correction/supersession | Critical failure remains | QC/Safety + Evidence | `121`; S6 | Criticality/correction tests | OPEN |
| `ITF-APR-126` | APPROVE_WITH_CHANGE | Define failure severity, containment, diagnosis, authorization, rework, warranty/sublet and repeat escalation | Restrict and route rework | QC + Shop/Finance | `117`,`125`; S6 | Failure/rework policy | OPEN |
| `ITF-APR-127` | APPROVE | Define rework completion, reinspection scope, evidence reuse/invalidation, latest projection and targets | No pass until reinspection | QC + Shop | `126`; S6 | Reinspection tests | OPEN |
| `ITF-APR-128` | APPROVE_WITH_CHANGE | Require all jobs pass, stopped labor, keys/custody, final condition/restrictions and named release authorizer | RO restricted | QC + Shop/Inventory | `115`,`120`-`127`; S6 | Release-gate proof | OPEN |
| `ITF-APR-129` | APPROVE_WITH_CHANGE | Define downstream route/acceptance, invalidation/recovery, owner, timing and escalation | No downstream readiness | QC + Inventory/Title | `128`; S6-S7 | Handoff/invalidation contract | OPEN |

## AE-5 — Title and Document Readiness (10)

| Decision | Recommended | Exact proposed policy | Safe default | Authority / owner | Dependencies / slices | Closure evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ITF-APR-130` | APPROVE_WITH_CHANGE | Qualified counsel/compliance names jurisdictions, entities, source/vehicle/route applicability, hard gates and legal-review boundary | No live evaluation | Counsel/Compliance + GM | `010`-`014`; S7 | Qualified applicability approval | OPEN |
| `ITF-APR-131` | APPROVE | Distinguish requirement, receipt, custody, verification, acceptance, submission, acknowledgement, agency completion and readiness | Never infer downstream state | Title/Office + Compliance | `130`; S7 | State model approval | OPEN |
| `ITF-APR-132` | APPROVE_WITH_CHANGE | Approve templates/forms/versions/applicability/evidence/original-copy/electronic/signature/capacity/expiry/publisher | No evaluation without template | Compliance + Title/publisher | `025`,`130`; S7 | Requirement manifest | OPEN |
| `ITF-APR-133` | APPROVE_WITH_CHANGE | Name coordinator, custodian, preparer, verifier, reviewer, filing/fee roles, access, separation, delegation and backups | No unqualified review | GM + Compliance + Office | `021`,`024`; S7 | Role/access matrix | OPEN |
| `ITF-APR-134` | APPROVE_WITH_CHANGE | Define VIN/party/assignment/signature/date/odometer/brand/history/disclosure/chain/POA/entity integrity and correction | Unknown critical item blocks | Compliance + Title reviewer | `061`,`132`; S7 | Integrity/checklist policy | OPEN |
| `ITF-APR-135` | APPROVE_WITH_CHANGE | Define lien/payoff/release, lost-title/special process, seller/lender/agency dependencies and qualified review | Dependency open/restricted | Compliance + Title/Finance | `130`,`134`; S7 | Special-process mappings | OPEN |
| `ITF-APR-136` | APPROVE_WITH_CHANGE | Define original/electronic custody, storage, scan, transfer, shipment, export/redaction, retention/hold, incident and disposal | Protect; no disposal | Records/Privacy/Security + Title | `054`,`055`,`133`; S7 | Custody/retention procedure | OPEN |
| `ITF-APR-137` | APPROVE_WITH_CHANGE | Define packet, signature, filing/fee authority, provider mapping/freshness, rejection/resubmission/outage/reconciliation | No filing/completion claim | Title + Controller + Integration | `031`,`063`-`065`; S7 | Filing/provider contract | OPEN |
| `ITF-APR-138` | APPROVE_WITH_CHANGE | Enumerate blockers/constrained states, permitted/prohibited work, disclosure, review/expiry and economics; no generic override | Critical block active | Compliance + GM/Inventory | `036`,`134`-`137`; S7-S9 | Constrained-state matrix | OPEN |
| `ITF-APR-139` | APPROVE_WITH_CHANGE | Define all-requirement final review, downstream acceptance, invalidation/frontline suspension, owner, timing and escalation | Readiness false | Compliance/Title + Merchandising | `138`; S7-S8,S9 | Final gate/handoff contract | OPEN |

## AE-6 — Merchandising and Pricing (10)

| Decision | Recommended | Exact proposed policy | Safe default | Authority / owner | Dependencies / slices | Closure evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ITF-APR-140` | APPROVE | Distinguish verified source, draft/approved content, proposed/approved price, request/ack/live/reconciled publication and review-ready package | Never infer downstream state | Inventory/Merch + Data | `139`; S8 | State model approval | OPEN |
| `ITF-APR-141` | APPROVE_WITH_CHANGE | Define full/constrained preparation prerequisites, physical readiness, templates, media requirements, freshness and permitted work | Draft-only or hold | Inventory/Merch + Shop/Title | `128`,`139`; S8 | Eligibility matrix | OPEN |
| `ITF-APR-142` | APPROVE_WITH_CHANGE | Approve sources/verification for identity, equipment, mileage, condition, title/history/disclosure, warranty/certification/service/promotional claims | Omit unverified claim | Content/Compliance + source owners | `061`,`065`,`134`; S8 | Fact/claim source manifest | OPEN |
| `ITF-APR-143` | APPROVE_WITH_CHANGE | Define media capture, lineage, truthfulness, editing, quality, privacy, accessibility, language, review, access and retention | Draft/unpublished | Merch/Media + Privacy/Compliance | `054`,`055`,`142`; S8 | Media policy/examples | OPEN |
| `ITF-APR-144` | APPROVE_WITH_CHANGE | Define content templates/disclosures/variants/material changes and AI/provider provenance, evaluation, human review, fallback and kill switch | Output draft only | Content/Compliance + Data/Security | `025`,`142`,`143`; S8 | Content/AI control manifest | OPEN |
| `ITF-APR-145` | APPROVE_WITH_CHANGE | Define cost/exposure/accounting boundary, eligible market/comparables, freshness, confidence, margin/floor/ceiling/incentive/uncertainty | Analysis advisory | Controller + Inventory/Pricing | `030`,`036`,`065`; S8 | Pricing-input policy | OPEN |
| `ITF-APR-146` | APPROVE_WITH_CHANGE | Name pricing roles/limits/separation/aggregation/effective/expiry/floor exception/reapproval/aging/disposition behavior | No customer price | GM + Controller + Pricing | `031`,`034`,`145`; S8 | Price authority matrix | OPEN |
| `ITF-APR-147` | APPROVE_WITH_CHANGE | Approve channels/accounts/mappings/payloads and publish/update/pause/remove authority, idempotency and desired state | No automatic publication | Merch + Channel/Integration | `063`-`065`,`146`; S8 | Channel/command matrix | OPEN |
| `ITF-APR-148` | APPROVE | Keep request/ack/live/removed distinct; define observed evidence, required channels, drift, duplicate, retry, outage, fallback and reconciliation | Pending/unknown | Channel/Integration + Merch | `147`; S8 | Reconciliation tests | OPEN |
| `ITF-APR-149` | APPROVE_WITH_CHANGE | Define package final review, Frontline handoff, invalidation/recovery, owner, targets/escalation and pilot measures | Not review-ready | Merch + Frontline reviewer | `140`-`148`; S8-S9 | Package/handoff contract | OPEN |

## AE-7 — Frontline Release Review (10)

| Decision | Recommended | Exact proposed policy | Safe default | Authority / owner | Dependencies / slices | Closure evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ITF-APR-150` | APPROVE | Distinguish upstream completion, package assembly, evaluation, authorization, projection, availability and post-release verification | Never infer downstream state | GM/Frontline + Inventory | `149`; S9 | State model approval | OPEN |
| `ITF-APR-151` | APPROVE_WITH_CHANGE | Approve templates/dimensions/applicability/criticality/sources/freshness/no-average/evaluator/version/publisher | No evaluation | GM + Frontline policy owner | `025`,`065`; S9 | Readiness policy manifest | OPEN |
| `ITF-APR-152` | APPROVE_WITH_CHANGE | Approve exact identity, custody, inspection/recon/QC/safety, title, condition, content, price, channel, owner/placement and sales-intake gates | Critical missing blocks | Frontline authority + all stage owners | `088`,`099`,`128`,`139`,`149`; S9 | Whole-gate matrix | OPEN |
| `ITF-APR-153` | APPROVE_WITH_CHANGE | Name qualified independent reviewers, authority, scope, delegation, assignment, conflicts, backups and audit | No release authority | GM + Frontline owner | `021`,`024`; S9 | Reviewer/coverage roster | OPEN |
| `ITF-APR-154` | APPROVE_WITH_CHANGE | Enumerate only permitted noncritical exceptions with authority/evidence/disclosure/expiry/review/residual risk/auto-suspension; prohibit critical exceptions | No exception | GM + qualified stage authorities | `005`,`151`,`152`; S9 | Exception catalog | OPEN |
| `ITF-APR-155` | APPROVE | Freeze exact package/source versions/fingerprint; require idempotency, concurrency, immutable authorization and atomic/reconciled projection/recovery | No partial release | Frontline + Data/Integration | `149`,`151`-`154`; S9 | Atomic command tests | OPEN |
| `ITF-APR-156` | APPROVE_WITH_CHANGE | Define physical placement/keys/custody, digital/internal visibility, lead routing, Sales acceptance and readiness display | Authorized not available | Inventory/Lot + Sales/Channel | `155`; S9 | Availability reconciliation | OPEN |
| `ITF-APR-157` | APPROVE_WITH_CHANGE | Define post-release timing/owners and mileage/condition/price/listing/title/safety/expiry triggers plus minor-correction boundary | Material change suspends | Frontline + stage owners | `156`; S9 | Verification/trigger policy | OPEN |
| `ITF-APR-158` | APPROVE_WITH_CHANGE | Define immediate holds, human suspension authority/scope, notifications, correction, full-package reinstatement and audit | Critical restrict; no auto-reinstate | GM/Frontline + Safety/Title | `045`,`157`; S9 | Suspension/reinstatement tests | OPEN |
| `ITF-APR-159` | APPROVE_WITH_CHANGE | Define stage completion, pilot cohort/measures/targets/escalation/pause/rollback and reservation/sales boundary | No activation/sales claim | GM + pilot/workflow owners | `070`-`075`,`150`-`158`; S9 | Final slice/pilot charter | OPEN |

## Ledger result

Recommended dispositions: `APPROVE` 36; `APPROVE_WITH_CHANGE` 91; `DEFER_SAFE` 3; `REJECT` 0. Current executed dispositions are maintained separately: 19 approved, 3 safely deferred and 108 open.
