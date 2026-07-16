# Inspection and Triage Decision and Scenario Catalog

**Status:** Proposed third vertical-slice catalog  
**Catalog ID:** `INV-ITF-IT`  
**Version:** `0.1.0`  
**Activation:** Not approved; documentation only

## 1. Outcome and boundary

This catalog begins when Receipt and Custody produces an attributable Inspection and Triage handoff, or when an authorized safety-containment path permits a deliberately limited inspection. It ends when:

- the correct, effective inspection template and required supplements are selected;
- inspector, location, vehicle, tools, evidence, and safe-work prerequisites are verified;
- every applicable required item is examined, measured, tested, or explicitly left incomplete with an owned blocker;
- observations and findings are classified without overstating diagnosis, cause, repair, liability, or legal conclusions;
- critical safety, identity, environmental, and security conditions are contained;
- each finding has an accountable triage disposition, dependency, evidence, and target;
- a versioned inspection is accepted, superseded, held incomplete, or rejected;
- the vehicle is routed to Recon Planning, qualified Diagnosis, Title/Document follow-up, specialist/safety containment, Disposition Review, or a policy-approved no-recon path.

Inspection completion does not approve spending, authorize repairs, declare title readiness, pass final QC, or make the vehicle frontline-ready.

## 2. Three distinct inspection facts

The workflow must not collapse these into one “Inspection Complete” action:

1. **Inspection performed:** An eligible person observed/tested the vehicle using a defined template.
2. **Inspection evidence accepted:** Required sections, measurements, evidence, and attribution pass the inspection gate.
3. **Triage disposition assigned:** Every finding is routed to owned work, review, containment, or an authorized no-action outcome.

A technician may finish physical examination while evidence is incomplete or triage remains unresolved. The inventory lifecycle advances only through the accepted gate and route decision.

## 3. Relationship to existing records

- The canonical `Vehicle` and open `InventoryUnit` remain identity and inventory-cycle authorities.
- `InventoryReceipt` and `VehicleCustodyEvent` remain authoritative for receipt context and current location/custody.
- Inventory recon work uses an `INVENTORY_RECON` repair order rather than a second work-order system.
- `VehicleInspectionVersion` remains the versioned DVI evidence record with template code/version/snapshot, item results, summary, author, timing, and supersession.
- Existing item results `PASS`, `ADVISORY`, `FAIL`, and `NOT_APPLICABLE` remain base result meanings.
- `NOT_APPLICABLE` means the approved template item genuinely does not apply. It must never mean not inspected, unable to inspect, unknown, skipped, unavailable, or evidence missing.
- `RepairDiagnosisVersion` owns evidence-backed cause/uncertainty/proposed-correction conclusions where diagnosis is required.
- `InventoryReconHandoff` links an accepted inspection version to one recon repair order/plan without duplicating work.
- The workflow coordinates these records and must not create competing inspection, diagnosis, repair-order, or task authorities.

Current application behavior is not proof that all catalog gates are implemented. Recording a DVI must not automatically imply that this workflow’s evidence and triage exit gate passed.

## 4. Entry trigger catalog

| Trigger ID | Claimed event | Required correlation | Initial response |
| --- | --- | --- | --- |
| `IT-TRG-001` | Receipt and Custody completes | Receipt gate snapshot, vehicle/unit, location, custody owner, exceptions | Evaluate inspection readiness |
| `IT-TRG-002` | Receipt completes with permitted noncritical exceptions | Same plus carried exceptions/dependencies | Evaluate whether exceptions restrict inspection scope |
| `IT-TRG-003` | Safety-containment assessment requested | Physical identity/location, hazard category, qualified authority, limited scope | Create restricted inspection plan only |
| `IT-TRG-004` | Prior external inspection imported | Source, effective time, template mapping, evidence, lineage, confidence | Reconcile; never accept solely because imported |
| `IT-TRG-005` | Existing internal inspection recovery/backfill | Canonical vehicle/order/unit, historical evidence, reason, recovery authority | Create explicitly labeled recovery version |
| `IT-TRG-006` | Reinspection requested | Superseded inspection/finding, reason, changed condition or review authority | Select full or scoped reinspection |
| `IT-TRG-007` | Material condition discovered after completion | New evidence, reporter, time, affected item/scope | Suspend affected triage decisions and reopen/supersede |

### Entry and duplicate rules

| Rule ID | Condition | Required result |
| --- | --- | --- |
| `IT-RULE-001` | Receipt hard gate is unresolved | Block normal inspection; allow only approved containment/specialist scope |
| `IT-RULE-002` | Same trigger/idempotency key is replayed | Return existing inspection workflow result without duplicate tasks/events |
| `IT-RULE-003` | Active inspection already exists for same order/scope | Route to existing work or controlled concurrent-section model; do not duplicate silently |
| `IT-RULE-004` | Vehicle identity/location differs from handoff | Stop and reconcile before normal inspection |
| `IT-RULE-005` | Prior inspection is stale, incomplete, unmapped, or conflicting | Use as reference evidence only; require approved current verification |
| `IT-RULE-006` | Inspection template/effective policy cannot be determined | Create policy/template exception; no generic permissive default |
| `IT-RULE-007` | Vehicle intent changes to wholesale/return/disposition review | Reevaluate required inspection scope with authority; preserve completed evidence |

## 5. Coordination states

These workflow substates coordinate work and must map to existing inventory, repair-order, inspection, task, and exception states rather than replacing them:

```text
HANDOFF_RECEIVED
  -> TEMPLATE_AND_SCOPE_SELECTION
  -> READINESS_EVALUATION
  -> INSPECTION_IN_PROGRESS
  -> EVIDENCE_REVIEW
  -> FINDING_CLASSIFICATION
  -> TRIAGE_ROUTING
  -> INSPECTION_GATE_REVIEW
  -> INSPECTION_ACCEPTED
  -> RECON_OR_ALTERNATE_HANDOFF

Alternate:
  -> WAITING_FOR_RESOURCE
  -> LIMITED_SAFETY_ASSESSMENT
  -> SAFETY_CONTAINMENT
  -> SPECIALIST_DIAGNOSIS_REQUIRED
  -> IDENTITY_OR_DATA_HOLD
  -> DISPOSITION_REVIEW
  -> SUPERSEDED_OR_REINSPECTION
  -> CANCELLED_OR_INVALID_TRIGGER
```

## 6. Decision-entry contract

Before presenting an inspection decision, show:

- canonical vehicle and inventory identity;
- acquisition type, intended disposition, vehicle class, mileage, powertrain, and relevant modifications;
- actual location/custody and movement restrictions;
- receipt evidence, damage, missing-property, safety, hazard, and document exceptions;
- prior inspections/diagnoses with source, age, version, status, and confidence;
- effective template/policy source and missing data;
- current owner, inspector/queue, target, dependencies, and open clocks;
- what the response will test, release, block, supersede, or route.

Staff can report incorrect or unsafe prefilled information without first accepting it.

## 7. Template and scope decisions

### `IT-DEC-001` — Which inspection program applies?

Inputs may include:

- retail, wholesale, return, transfer, or undecided intent;
- new/used status, age, mileage, class, weight, use, and acquisition source;
- gasoline, diesel, hybrid, plug-in hybrid, battery-electric, or other powertrain;
- known collision, flood, fire, theft, salvage/brand, modification, or special-use history;
- jurisdiction/location requirements;
- warranty/certified-program requirements when actually applicable;
- receipt condition, safety, and hazard flags.

Responses:

- Approved standard retail inspection template;
- standard template plus named supplements;
- limited safety/containment template;
- qualified specialist template;
- wholesale/disposition assessment template;
- return/rejection evidence template;
- template cannot be determined.

The selected template records code, version, complete snapshot, effective policy, applicability inputs, selection reasons, and selecting authority.

### `IT-DEC-002` — Are supplemental inspection sections required?

Possible supplements, only when approved:

- EV/high-voltage and charging;
- hybrid system;
- diesel/emissions after-treatment;
- four-wheel/all-wheel-drive;
- commercial/heavy-duty;
- convertible/removable roof;
- advanced driver-assistance systems;
- prior collision/structural;
- flood/water/fire exposure;
- modified/aftermarket equipment;
- accessibility/special equipment;
- certified/warranty program;
- jurisdiction-specific safety/emissions.

Missing specialist eligibility or equipment creates a dependency; it does not make the supplement `NOT_APPLICABLE`.

### `IT-DEC-003` — Can prior inspection evidence reduce current work?

| Response | Result |
| --- | --- |
| No—perform complete current inspection | Current approved template required |
| Yes—reference only | Prefill context but require current verification |
| Yes—approved reusable items | Only policy-approved, fresh, source-mapped items may carry forward with provenance |
| Prior evidence conflicts | Create reconciliation and require current observation |
| Prior evidence is stale/incomplete | Label limitation and require affected items |
| Unknown authority/template mapping | Do not reuse until resolved |

Critical safety and identity items require current verification unless an explicit policy defines a safe, authoritative reuse window.

## 8. Readiness and eligibility decisions

### `IT-DEC-010` — Is the vehicle eligible for normal inspection?

Evaluate:

- receipt gate and physical identity;
- secure location and custody;
- movement/start restrictions;
- active leak, fire, EV/high-voltage, biological, structural, or security hazards;
- keys/access and minimum energy/fuel state;
- required receipt evidence and known exceptions;
- vehicle stability and lift/jack eligibility where applicable.

Outputs:

- Eligible for full inspection;
- eligible with explicit restrictions;
- limited safety assessment only;
- specialist containment/assessment required;
- not eligible—identity/custody/location hard stop;
- readiness unknown—verification task required.

### `IT-DEC-011` — Is an eligible inspector assigned?

Eligibility considers active user status, role/capability, location, vehicle/powertrain/supplement qualifications, certification where required, conflict/separation rules, workload/availability facts, and current restrictions.

Responses: Named eligible inspector; qualified queue; specialist required; no eligible inspector available; inspector eligibility expired/unknown; manager assignment required.

The workflow may recommend among eligible staff with explanation. It cannot infer qualification from job title alone.

### `IT-DEC-012` — Are the required location and resources ready?

Resource classes:

- inspection lane/bay;
- lift/jack and approved lift points;
- diagnostic scan tool/software/subscription;
- measurement/calibration tools;
- battery support/charger;
- EV/high-voltage PPE/equipment and restricted area;
- road-test route/conditions;
- emissions/safety inspection equipment;
- safe media/evidence capture;
- specialist/vendor access.

Responses: Ready; reserved for later; partially ready; unavailable; unsafe/failed check; external resource required; requirement not applicable by template.

### `IT-DEC-013` — Can the vehicle be started, lifted, or road-tested?

Each operation is evaluated separately:

- `START_ALLOWED`, `START_RESTRICTED`, `START_PROHIBITED`, `START_UNKNOWN`;
- `LIFT_ALLOWED`, `LIFT_RESTRICTED`, `LIFT_PROHIBITED`, `LIFT_UNKNOWN`;
- `ROAD_TEST_ALLOWED`, `ROAD_TEST_RESTRICTED`, `ROAD_TEST_PROHIBITED`, `ROAD_TEST_UNKNOWN`.

Restrictions include reason, qualified operator/resource, conditions, evidence, expiry/review, and alternative inspection method. A prohibited road test must not be encoded as a passed road test or `NOT_APPLICABLE` if the template requires it.

### `IT-DEC-014` — Is minimum vehicle energy/access sufficient?

Capture keys/access, 12V state, propulsion battery/fuel state, charging/fueling eligibility, immobilizer/security condition, and safe support method.

Options: Sufficient; temporary support required; charge/fuel required; key/access resolution required; system fault prevents testing; unknown. Created work must distinguish preparation from diagnosis/repair authorization.

## 9. Inspection execution decisions

### `IT-DEC-020` — Start the inspection

Required snapshot:

- vehicle/unit/order and expected version;
- template and supplements;
- inspector and eligibility evidence;
- location/resources;
- start time;
- known restrictions/exceptions;
- planned sections, collaborators, and evidence requirements;
- reason and idempotency key.

Starting inspection does not advance the inventory stage or complete any item.

### `IT-DEC-021` — Record an inspection item result

Each item contains:

```text
itemKey and templateVersion
category and label
result: PASS | ADVISORY | FAIL | NOT_APPLICABLE
observation and measurement with unit/tolerance
evidence references
inspection method and resource
inspector and observedAt
severity and immediate restriction when applicable
comparison/prior evidence
notes and data-quality state
```

Rules:

- `PASS` requires applicable acceptance criteria to be satisfied, not absence of a note.
- `ADVISORY` records an applicable condition that does not currently fail the approved criterion but needs monitoring, disclosure, or planned action.
- `FAIL` records an observed failure of the approved criterion and requires triage.
- `NOT_APPLICABLE` requires a template-approved reason.
- Not inspected, unable, inaccessible, tool unavailable, unsafe, unknown, and evidence missing remain incomplete/blocking states outside those four completed results.
- Measurements use approved units/ranges and retain raw observation when corrected.

### `IT-DEC-022` — Record an immediate critical finding

Available at any time for:

- unsafe movement/operation;
- active leak, heat, smoke, fire, high-voltage, battery, or fuel hazard;
- severe tire/wheel/brake/steering concern;
- structural instability or unsafe lift condition;
- airbag/restraint/pyrotechnic concern;
- identity/security/tampering concern;
- hazardous contamination/property;
- other policy-defined time-to-harm condition.

Result:

1. preserve observation/evidence;
2. apply approved containment/movement restriction;
3. pause affected inspection work safely;
4. create one correlated critical exception;
5. route qualified response;
6. notify actionable authority;
7. never infer blame or diagnosis beyond evidence.

### `IT-DEC-023` — Pause, interrupt, or transfer inspection

Reasons:

- safety/containment;
- resource/tool failure;
- vehicle unavailable/moved;
- inspector unavailable;
- specialist required;
- evidence system failure;
- higher-priority emergency;
- end of shift/business-hours restriction;
- data/identity conflict;
- other approved reason.

The workflow records completed items, open items, vehicle condition/location, safe handoff, clock behavior, next owner/action, review time, and whether prior observations need revalidation. A pause does not complete missing items or reset inspection age.

## 10. Inspection-area decision groups

Exact items, measurements, tolerances, evidence, and qualifications belong to approved versioned templates. The catalog requires the following coverage families when applicable.

### `IT-DEC-030` — Identity, history, and baseline

- physical VIN/identity consistency;
- mileage/odometer observation and discrepancy;
- warning/indicator baseline;
- prior damage/repair/modification signals;
- recall/campaign/history source and freshness;
- receipt exceptions and expected equipment.

External history and recall data are inputs with authority/freshness, not self-executing legal or safety conclusions.

### `IT-DEC-031` — Tires, wheels, brakes, steering, and suspension

Template may require measurements and evidence for tread, age/date code, pressure, damage, matching policy, wheel condition, friction material, rotor/drum, hydraulic condition, parking brake, steering play/components, suspension, alignment signals, and road-test behavior.

### `IT-DEC-032` — Powertrain, fluids, leaks, and cooling

Cover engine/propulsion, transmission/driveline, mounts, belts/hoses, fluid levels/condition, leaks, cooling, exhaust, starting/charging, abnormal noise/vibration, and applicable emissions after-treatment. Observation does not become a cause/repair conclusion without diagnosis.

### `IT-DEC-033` — Electrical, diagnostics, warning systems, and ADAS

Cover warning lights, scan results, monitors/readiness, battery/charging, lighting, controls, communications, cameras/sensors, calibrations/aiming status where required, and aftermarket modifications. Store diagnostic codes with timestamp/context; a cleared code is not proof of repair.

### `IT-DEC-034` — Body, structure, glass, exterior, and water intrusion

Cover visible structure/collision indicators, panels, paint, corrosion, glass, mirrors, lighting, closures, seals, water intrusion, roof/convertible equipment, underbody where safe, and prior repair indicators. Qualified structural diagnosis is separate when required.

### `IT-DEC-035` — Interior, restraints, climate, and convenience

Cover seats/anchorage, belts/restraints/airbags indicators, controls, windows/locks, HVAC, infotainment, interior condition, odor/contamination, headliner, trim, safety equipment, and required accessories.

### `IT-DEC-036` — EV, hybrid, alternative powertrain, and charging supplement

Only qualified staff perform applicable high-voltage work. Cover visible HV condition, warning/status data, charging inlet/cable, low-voltage system, cooling, isolation/diagnostic results where authorized, battery-state evidence limits, damage/thermal/water exposure, and required specialist escalation. The workflow must not infer battery health from a single unsupported display value.

### `IT-DEC-037` — Road-test or dynamic evaluation

Before a road test, re-evaluate eligibility, driver qualification, plate/insurance/policy, route/weather, fuel/charge, critical findings, and evidence plan.

Outcomes:

- Completed and passed defined checks;
- completed with findings;
- aborted safely with reason;
- prohibited due to restriction;
- unavailable due to external/resource condition;
- specialist dynamic test required.

A required but prohibited/unavailable road test prevents a complete result unless policy defines an approved alternate verification.

### `IT-DEC-038` — Cosmetic, detail, and merchandising condition

Record exterior/interior cosmetic, odor, stain, trim, wheel, paint, glass, accessory, detail, photo-readiness, and disclosure-relevant observations. These findings cannot dilute safety or legal failures and should not automatically create repair spending.

## 11. Finding classification and triage

### `IT-DEC-040` — Classify each finding

One or more controlled classifications:

- `CRITICAL_SAFETY`;
- `LEGAL_OR_COMPLIANCE_REVIEW`;
- `IDENTITY_OR_CUSTODY_REVIEW`;
- `DIAGNOSIS_REQUIRED`;
- `REQUIRED_RELIABILITY`;
- `REQUIRED_RETAIL_STANDARD`;
- `COSMETIC_OR_MERCHANDISING`;
- `ACCESSORY_OR_PROPERTY`;
- `MONITOR_OR_ADVISORY`;
- `NO_DEFECT_FOUND`;
- `UNABLE_TO_COMPLETE`;
- `SPECIALIST_REQUIRED`;
- `DISPOSITION_ECONOMICS_REVIEW`.

Classification records policy/rule version, evidence, uncertainty/data sufficiency, classifier/authority, immediate restriction, and whether manager review is required.

### `IT-DEC-041` — Does the finding require diagnosis?

Diagnosis is required when the inspection shows a symptom/failure but evidence does not establish a defensible cause or correction. Options:

- No—finding and correction are sufficiently defined under approved procedure;
- yes—internal qualified diagnosis;
- yes—external/specialist diagnosis;
- additional test/evidence required first;
- cause remains uncertain; contain and route;
- diagnosis not economically appropriate; disposition review proposed.

Inspection observations must not be rewritten as low-uncertainty diagnosis merely to create an estimate.

### `IT-DEC-042` — Choose finding disposition

Eligible dispositions:

- immediate safety containment;
- create qualified diagnosis work;
- add required item to recon planning;
- add optional/cosmetic item for manager decision;
- title/document/compliance follow-up;
- acquisition/transport/receipt discrepancy recovery;
- specialist/sublet evaluation;
- monitor/advisory with review condition;
- accepted no-action under explicit policy;
- disposition/wholesale/return review;
- reinspection/retest required;
- duplicate/correlated with existing finding.

Each nonclosed finding has one owner, next action, due/review time, dependency, evidence requirement, and downstream gate effect.

### `IT-DEC-043` — Is an accepted no-action disposition allowed?

Requirements:

- finding is not a non-waivable safety, identity, legal, or mandatory-evidence failure;
- approved policy explicitly permits no action for the exact condition/scope;
- decision authority is sufficient;
- rationale, evidence, residual risk, disclosure/monitoring need, and expiry/review are recorded;
- no-action does not falsely change the inspection item from `FAIL` to `PASS`.

## 12. Evidence review and completion

### `IT-DEC-050` — Is inspection evidence complete and acceptable?

Evaluate:

- selected template and supplements match applicability;
- inspector eligibility and attribution;
- start/completion timing and interruptions;
- every required section/item result or explicit incomplete state;
- required measurements, units, tolerances, notes, and media;
- scan/test evidence and source/freshness;
- road-test requirement/outcome;
- critical-finding containment;
- contradictions, duplicates, rejected/quarantined evidence;
- summary consistency with item facts;
- supersession/reinspection relationships.

Outputs: Accepted; accepted with explicitly permitted incomplete noncritical follow-up; incomplete; rejected; conflicting; specialist review required; superseded.

### `IT-DEC-051` — Review inspection summary

The summary must state:

- template/scope and limitations;
- overall observed condition without unsupported universal “safe” claims;
- critical restrictions;
- failed/advisory counts by meaningful class;
- required diagnosis/recon/title/specialist/disposition routes;
- incomplete items and reasons;
- evidence/data-quality limitations;
- responsible owner and next milestone.

Summary text cannot override structured findings or gates.

### `IT-DEC-052` — Complete or hold the inspection

Possible results:

- `COMPLETE_ACCEPTED`;
- `COMPLETE_WITH_PERMITTED_OWNED_FOLLOWUP`;
- `INCOMPLETE_RESOURCE_BLOCKED`;
- `INCOMPLETE_SAFETY_BLOCKED`;
- `INCOMPLETE_SPECIALIST_REQUIRED`;
- `REJECTED_EVIDENCE_OR_TEMPLATE`;
- `CONFLICTING_REVIEW_REQUIRED`;
- `SUPERSEDED_BY_REINSPECTION`.

Only accepted outcomes may proceed to the triage exit gate.

## 13. Triage route and exit gate

### `IT-DEC-060` — Select primary route

Routes may run in parallel where dependencies allow:

- `RECON_PLAN_AND_APPROVAL`;
- `QUALIFIED_DIAGNOSIS`;
- `SAFETY_OR_HAZARD_CONTAINMENT`;
- `TITLE_DOCUMENT_FOLLOWUP`;
- `SPECIALIST_OR_SUBLET_EVALUATION`;
- `DISPOSITION_REVIEW`;
- `RETURN_OR_ACQUISITION_REVIEW`;
- `NO_RECON_MERCHANDISING_PREPARATION`;
- `WAITING_FOR_RESOURCE_OR_EVIDENCE`.

No-recon eligibility requires a fully accepted applicable inspection, no unresolved critical/legal/identity gates, no required diagnosis/recon item, and named authority. It does not mean frontline ready.

### `IT-DEC-061` — Is Inspection and Triage complete?

The gate requires:

- Receipt and Custody handoff is valid for the inspection scope;
- effective template and supplements are selected and snapshotted;
- inspector and collaborators are eligible and attributable;
- required resources/methods and restrictions are recorded;
- every required item has a valid result or approved owned incomplete path;
- `NOT_APPLICABLE` reasons are valid;
- required measurements/evidence are accepted;
- findings are classified with uncertainty/data sufficiency;
- critical conditions are contained and cannot be averaged away;
- every finding has a permitted disposition, owner, next action, target, and dependency;
- inspection version, workflow event, audit, exceptions, tasks, and handoff can commit consistently;
- no conflicting latest inspection/reinspection/concurrency state exists.

Gate outputs:

- `PASS_TO_RECON_PLANNING`;
- `PASS_TO_DIAGNOSIS_AND_RECON_PREPARATION`;
- `PASS_TO_SPECIALIST_REVIEW`;
- `PASS_TO_DISPOSITION_REVIEW`;
- `PASS_NO_RECON_PATH_WITH_AUTHORITY`;
- `FAIL_TEMPLATE_OR_SCOPE`;
- `FAIL_INSPECTOR_ELIGIBILITY`;
- `FAIL_REQUIRED_ITEM_OR_EVIDENCE`;
- `FAIL_CRITICAL_CONTAINMENT`;
- `FAIL_UNCLASSIFIED_FINDING`;
- `FAIL_UNOWNED_DISPOSITION`;
- `FAIL_DATA_CONFLICT`;
- `FAIL_PERMISSION_OR_CONCURRENCY`.

### `IT-DEC-062` — Create Recon or alternate handoff

The handoff snapshot includes:

- accepted inspection id/version and template snapshot;
- vehicle/unit/order/location;
- classified findings and exact evidence;
- diagnosis requirements and uncertainty;
- proposed required/optional work categories without financial authorization;
- safety/movement restrictions;
- title/document/specialist/disposition dependencies;
- carried exceptions and owners;
- target/class-of-service reasons;
- handoff owner/queue and next action;
- explicit statement that repair scope, cost, and authorization remain pending.

## 14. Reinspection, correction, and reopening

### `IT-DEC-070` — Correct an inspection fact

Corrections require prior/proposed values, reason, authority, superseding evidence, affected findings/routes, and immutable history. Completed inspection evidence is superseded by a new version; it is not edited in place.

### `IT-DEC-071` — Request reinspection or retest

Reasons:

- evidence rejected/incomplete;
- condition changed;
- repair/diagnosis affects finding;
- wrong template/scope;
- reviewer disagreement;
- instrument/tool problem;
- material new fact;
- quality/audit review;
- manager request with documented reason.

The workflow chooses scoped or complete reinspection, defines which prior items remain reference-only, and suspends affected downstream decisions until the new version is accepted.

### `IT-DEC-072` — Handle a finding discovered after completion

Record the new observation and time, protect immediate safety, identify affected prior item/gate/handoff, notify actionable downstream owners, suspend invalidated recommendations/approvals where policy requires, and create a superseding reinspection/diagnosis path. Historical accepted evidence remains visible as the prior-time decision.

## 15. Action catalog

| Action ID | Action | Completion evidence |
| --- | --- | --- |
| `IT-ACT-001` | Select inspection template/supplements | Versioned template snapshot and applicability reasons |
| `IT-ACT-002` | Verify inspection readiness | Identity/custody/safety/resource eligibility result |
| `IT-ACT-003` | Assign eligible inspector | Capability/location/qualification evidence and target |
| `IT-ACT-004` | Reserve required location/resources | Attributable eligible resource plan |
| `IT-ACT-005` | Start inspection | Versioned start snapshot and idempotent command |
| `IT-ACT-006` | Record inspection item | Result, measurement, evidence, method, actor, time |
| `IT-ACT-007` | Record critical finding/containment | Observation, restriction, evidence, owner, response |
| `IT-ACT-008` | Pause/transfer inspection | Safe handoff, completed/open scope, next action/review |
| `IT-ACT-009` | Capture diagnostic/scan/measurement evidence | Attributable source, result, unit/context, integrity |
| `IT-ACT-010` | Classify finding | Controlled class, policy, uncertainty, restriction |
| `IT-ACT-011` | Route finding | Disposition, owner, task/dependency, target, gate effect |
| `IT-ACT-012` | Review evidence and summary | Accepted/rejected/incomplete decision with exact reasons |
| `IT-ACT-013` | Complete inspection version | Versioned immutable evidence and completion outcome |
| `IT-ACT-014` | Evaluate triage exit gate | Exact pass/fail reasons and policy/catalog versions |
| `IT-ACT-015` | Create recon/alternate handoff | Accepted inspection version and owned route snapshot |
| `IT-ACT-016` | Correct/supersede inspection | New version with immutable lineage and impact |
| `IT-ACT-017` | Reinspect/retest scoped items | New attributable results and supersession relationship |

## 16. Evidence catalog

| Evidence ID | Evidence | Required when | Proposed criticality |
| --- | --- | --- | --- |
| `IT-EVD-001` | Receipt/Custody handoff snapshot | Every normal inspection | Mandatory hard gate |
| `IT-EVD-002` | Template/supplement snapshot | Every inspection | Mandatory hard gate |
| `IT-EVD-003` | Inspector eligibility/qualification | Every inspection and specialist supplement | Mandatory hard gate |
| `IT-EVD-004` | Location/resource readiness | Required by selected template/method | Mandatory where applicable |
| `IT-EVD-005` | Start, interruption, transfer, and completion attribution | Every inspection | Mandatory |
| `IT-EVD-006` | Item results and applicability reasons | Every required item | Mandatory hard gate |
| `IT-EVD-007` | Measurements/units/tolerances | Template-designated items | Mandatory where applicable |
| `IT-EVD-008` | Photo/media evidence | Template/risk-designated items/findings | Conditional mandatory |
| `IT-EVD-009` | Scan/diagnostic/test evidence | Applicable systems/findings | Conditional mandatory |
| `IT-EVD-010` | Start/lift/road-test eligibility and outcome | Operation required/attempted | Mandatory hard gate |
| `IT-EVD-011` | Critical finding containment | Any critical condition | Mandatory hard gate |
| `IT-EVD-012` | Finding classification/disposition | Every failed/advisory/incomplete item | Mandatory |
| `IT-EVD-013` | Evidence review/summary decision | Every completed version | Mandatory |
| `IT-EVD-014` | Triage exit-gate snapshot | Every accepted inspection | Mandatory immutable/versioned output |
| `IT-EVD-015` | Recon/alternate handoff | Every accepted routed outcome | Mandatory |
| `IT-EVD-016` | Correction/supersession evidence | Any corrected/reopened inspection | Mandatory |
| `IT-EVD-017` | Prior/imported inspection lineage | Prior evidence is referenced/reused | Mandatory provenance |

## 17. Exception reason catalog

| Reason code | Meaning | Default control class |
| --- | --- | --- |
| `IT_EX_RECEIPT_GATE_INVALID` | Receipt/Custody prerequisites are absent or invalid | State/custody hard gate |
| `IT_EX_TEMPLATE_UNDETERMINED` | Effective inspection template/scope cannot be established | Policy hard gate |
| `IT_EX_TEMPLATE_INCORRECT` | Selected template/supplement does not match applicability | Evidence/state hard gate |
| `IT_EX_NO_ELIGIBLE_INSPECTOR` | No currently eligible inspector is available | Skill/capacity |
| `IT_EX_RESOURCE_UNAVAILABLE` | Required bay/tool/system/resource is unavailable | Capacity/waiting |
| `IT_EX_RESOURCE_UNSAFE` | Required resource failed a safety/eligibility check | Safety hard gate |
| `IT_EX_UNSAFE_TO_START` | Vehicle cannot safely be started | Safety hard gate |
| `IT_EX_UNSAFE_TO_LIFT` | Vehicle cannot safely be lifted | Safety hard gate |
| `IT_EX_ROAD_TEST_PROHIBITED` | Required dynamic evaluation cannot safely/legally occur | Safety/evidence gate |
| `IT_EX_ENERGY_OR_ACCESS_INSUFFICIENT` | Keys, fuel/charge, 12V, or access prevents testing | Preparation dependency |
| `IT_EX_CRITICAL_SAFETY_FINDING` | Observed condition requires immediate containment | Critical hard gate |
| `IT_EX_HAZARD_CONTAINMENT` | Environmental/EV/fire/biohazard/security response is required | Critical hard gate |
| `IT_EX_REQUIRED_ITEM_INCOMPLETE` | Required item was not validly completed | Evidence hard gate |
| `IT_EX_MEASUREMENT_OR_EVIDENCE_MISSING` | Required measurement/media/test evidence is missing/rejected | Evidence gate |
| `IT_EX_FINDING_UNCLASSIFIED` | Finding lacks controlled classification | Workflow gate |
| `IT_EX_FINDING_UNOWNED` | Finding lacks permitted disposition/owner/target | Workflow gate |
| `IT_EX_DIAGNOSIS_REQUIRED` | Cause/correction cannot be established by inspection alone | Qualified dependency |
| `IT_EX_SPECIALIST_REQUIRED` | Qualified external/internal specialist is required | Skill/dependency |
| `IT_EX_PRIOR_EVIDENCE_CONFLICT` | Prior/imported and current observations conflict | Data/reconciliation |
| `IT_EX_INSPECTION_INTERRUPTED` | Inspection stopped before accepted completion | Operational/waiting |
| `IT_EX_INSPECTION_DUPLICATE` | Duplicate/concurrent inspection may exist | State/data hard gate |
| `IT_EX_CONDITION_CHANGED` | Material condition changed after observation/completion | Reinspection gate |
| `IT_EX_DISPOSITION_REVIEW` | Findings/economics may make retail preparation inappropriate | Financial/manager review |

Severity is derived from current evidence, time-to-harm, scope, and policy. An inspector reporting a condition is not presumed responsible for it.

## 18. Scenario catalog

| Scenario ID | Scenario | Expected controlled outcome |
| --- | --- | --- |
| `IT-SCN-001` | Normal complete retail inspection | Accepted version and owned Recon Planning handoff |
| `IT-SCN-002` | Receipt complete with missing spare-key exception | Inspection proceeds if policy permits; key exception remains visible/owned |
| `IT-SCN-003` | Receipt identity hard stop remains open | Normal inspection cannot start |
| `IT-SCN-004` | Wrong template initially selected | Stop/replace scope, preserve draft evidence, require correct version |
| `IT-SCN-005` | EV supplement required but no qualified inspector | Create specialist/qualified waiting path; do not mark supplement N/A |
| `IT-SCN-006` | Prior auction inspection is fresh but source-mapped only for reference | Prefill context; require current policy-defined verification |
| `IT-SCN-007` | Imported inspection conflicts with current physical observation | Current observation and prior evidence remain; open reconciliation |
| `IT-SCN-008` | Vehicle will not start | Record incomplete affected tests; create preparation/diagnosis route |
| `IT-SCN-009` | Low 12V prevents reliable scan | Support/charge task; avoid treating scan absence as pass |
| `IT-SCN-010` | Vehicle unsafe to lift | Suppress lift, contain, use qualified alternate/specialist path |
| `IT-SCN-011` | Vehicle unsafe to road-test | Prohibit road test; retain required-item limitation and route recovery |
| `IT-SCN-012` | Required scan tool/subscription unavailable | Create resource dependency; no fabricated code/readiness result |
| `IT-SCN-013` | Inspector certification expired mid-assignment | Prevent new consequential commands; controlled transfer/review prior work |
| `IT-SCN-014` | Inspection interrupted by shift end | Preserve completed/open items and safe handoff; clocks remain truthful |
| `IT-SCN-015` | Vehicle moved during inspection | Pause, verify custody/location/condition, revalidate affected observations |
| `IT-SCN-016` | Active fuel leak found | Immediate containment; one correlated critical exception |
| `IT-SCN-017` | EV battery heat/damage concern | Restricted qualified response; no normal start/lift/road-test |
| `IT-SCN-018` | Structural concern makes lift unsafe | Contain and route structural/specialist assessment |
| `IT-SCN-019` | Brake measurement fails threshold | Preserve measurement/evidence, classify criticality, route diagnosis/recon |
| `IT-SCN-020` | Warning light present with diagnostic code | Observation/scan recorded; diagnosis required before cause/correction claim |
| `IT-SCN-021` | Code was recently cleared; monitors not ready | Record readiness limitation; do not declare system passed |
| `IT-SCN-022` | Road test completed with abnormal behavior | Record finding and restriction; route diagnosis/recon |
| `IT-SCN-023` | Road test aborted safely | Preserve partial evidence/reason; required outcome remains incomplete |
| `IT-SCN-024` | Open recall/history signal from stale external source | Label freshness; create verification/follow-up under approved policy |
| `IT-SCN-025` | Suspected flood/fire damage | Contain as needed and route qualified evidence/manager disposition review |
| `IT-SCN-026` | Aftermarket modification affects inspection | Apply supplement/specialist route; do not assume acceptable/defective |
| `IT-SCN-027` | Required item genuinely not applicable | Require approved applicability reason and preserve template evidence |
| `IT-SCN-028` | Inspector cannot access an item | Keep incomplete; do not use N/A; assign dependency/retest |
| `IT-SCN-029` | Photo/evidence upload fails | Preserve draft/item work; gate remains incomplete until evidence accepted |
| `IT-SCN-030` | Inspection item entered twice/replayed | Idempotent result; no duplicate finding/tasks/events |
| `IT-SCN-031` | Two inspectors complete same scope concurrently | One expected version succeeds; conflict-safe merge/reinspection path |
| `IT-SCN-032` | Multiple eligible inspectors split approved sections | One coordinated template/version with attributable section work and final review |
| `IT-SCN-033` | Inspector and reviewer disagree | Preserve both evidence/reasons; controlled review or reinspection |
| `IT-SCN-034` | Finding corrected during inspection | Preserve initial observation, correction evidence, and retest before result change |
| `IT-SCN-035` | Manager requests no action on a safety failure | Server rejects general override; permitted containment/disposition options remain |
| `IT-SCN-036` | Cosmetic advisory only | Route optional/merchandising review without auto-authorizing spend |
| `IT-SCN-037` | No defects found under complete applicable template | Permit no-recon route only with exact gate and authority; not frontline ready |
| `IT-SCN-038` | Numerous findings make retail economics doubtful | Route manager disposition/economics review; preserve inspection facts |
| `IT-SCN-039` | Diagnosis needed before estimate | Create qualified diagnosis dependency; do not invent repair line/cost |
| `IT-SCN-040` | Specialist/sublet assessment required | Maintain internal owner, target, evidence, and external dependency |
| `IT-SCN-041` | Title/document concern observed during inspection | Route title follow-up without declaring title status |
| `IT-SCN-042` | Critical finding discovered after completion | Suspend affected handoff/readiness and create superseding inspection/recovery |
| `IT-SCN-043` | Reinspection supersedes prior accepted inspection | Preserve prior-time decision and route downstream impacts to latest version |
| `IT-SCN-044` | Existing historical inspection backfilled | Label recovery/confidence; do not claim contemporaneous observation |
| `IT-SCN-045` | External system unavailable during inspection | Approved degraded capture, visible reconciliation, retry-safe commit |
| `IT-SCN-046` | Unauthorized user attempts completion/classification | Server denial; entered observations recoverable to eligible inspector |
| `IT-SCN-047` | Evidence is quarantined/rejected after completion | Suspend affected gate and require replacement/review |
| `IT-SCN-048` | No recon work but detail/photos still required | Route no-recon merchandising preparation with receipt/inspection exceptions visible |
| `IT-SCN-049` | Vehicle intent changes to wholesale mid-inspection | Reevaluate scope/route with authority; preserve evidence and incomplete work |
| `IT-SCN-050` | Required inspection cannot finish before target | Escalate owned blocker; no automatic completion or age reset |

## 19. Catalog exit gate

This catalog is ready for code only when:

- policy owners approve the three-part performed/evidence-accepted/triage-assigned distinction;
- approved template families, supplements, applicability rules, versions, and change authority are defined;
- real inspector roles, skills, certifications, locations, and resource eligibility are mapped;
- start/lift/road-test, EV/high-voltage, hazard, structural, and containment boundaries are approved by qualified authority;
- item measurement, tolerance, evidence, `PASS`/`ADVISORY`/`FAIL`/`NOT_APPLICABLE`, and incomplete-state rules are approved;
- finding classifications, diagnosis boundary, no-action authority, disposition routes, and no-recon gate are approved;
- correction, reinspection, supersession, prior-evidence reuse, and downstream invalidation rules are approved;
- staff walk through at least fifteen representative cases including normal, incomplete, safety, EV, road-test, disagreement, duplicate, disposition, and degraded-system paths;
- acceptance scenarios map to planned automated/manual evidence;
- no workflow behavior is activated merely because this planning catalog exists.
