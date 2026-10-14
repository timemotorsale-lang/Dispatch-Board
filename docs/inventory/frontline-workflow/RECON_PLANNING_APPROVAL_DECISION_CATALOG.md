# Recon Planning and Approval Decision and Scenario Catalog

**Status:** Proposed fourth vertical-slice catalog  
**Catalog ID:** `INV-ITF-RPA`  
**Version:** `0.1.0`  
**Activation:** Not approved; documentation only

## 1. Outcome and boundary

This catalog begins when Inspection and Triage produces an accepted inspection version and routes one or more findings to Recon Planning, qualified Diagnosis, specialist evaluation, or economics/disposition review. It ends when:

- inspection findings, diagnoses, title/document dependencies, and carried exceptions are reconciled into a versioned proposed scope;
- required, optional, deferred, no-action, specialist, and disposition-review items are explicitly distinguished;
- labor, parts, fees, sublet, dependencies, skills, certifications, bays, tools, procedures, duration, uncertainty, and evidence requirements are defined;
- a versioned estimate and forecast-at-completion basis are complete and distinguish estimates from commitments and actuals;
- all-in economics and viable alternatives are presented without hiding safety or legal constraints;
- an authorized person accepts, partially accepts, declines, defers, expires, revokes, or returns the exact plan/estimate version;
- accepted lines become traceable repair jobs with readiness prerequisites and dependencies;
- unapproved, changed, expired, revoked, or disputed work remains blocked from execution;
- the plan is handed to Parts and Repair Execution, qualified Diagnosis, specialist work, or an approved alternate disposition path.

Recon Planning does not perform repairs, reserve/issue parts, dispatch technicians, pass QC, post accounting costs, or declare frontline readiness.

## 2. Four distinct planning facts

The workflow must not collapse these into one “Approve Recon” checkbox:

1. **Proposed scope:** What work may be appropriate and why.
2. **Presented estimate:** The exact priced version, assumptions, alternatives, expiry, and uncertainty offered for decision.
3. **Authorized scope:** The exact lines and amount accepted by an attributable person with sufficient authority.
4. **Executable plan:** Authorized jobs whose parts, procedure, skills, tools, bay, dependencies, and other prerequisites are sufficiently defined for downstream readiness evaluation.

An estimate is not an authorization. An authorization is not an incurred cost. An authorized job is not automatically ready to dispatch.

## 3. Relationship to existing records

- The canonical `Vehicle`, open `InventoryUnit`, and inventory lifecycle remain authoritative.
- The inventory recon `RepairOrder` coordinates planning and execution; the workflow must not create a second work-order system.
- `VehicleInspectionVersion` supplies accepted findings and evidence.
- `RepairDiagnosisVersion` supplies versioned cause, tests, uncertainty, recommendation, and proposed correction where diagnosis is required.
- `RepairEstimateVersion` supplies immutable line items, labor/parts/fees/tax/discount totals, option groups, assumptions, presentation context, expiry, and supersession.
- `RepairAuthorization` records exact-version acceptance, partial acceptance, decline, deferral, expiry, or revocation and authorized line keys/amount.
- `RepairJob` represents an authorized executable work unit linked to its diagnosis, estimate, authorization, requirements, dependencies, and parts demand.
- `InventoryReconHandoff` links the accepted inspection version to the recon repair order/plan without duplicating work.
- `InventoryUnitCost` and governed financial projections distinguish estimated, committed, incurred, disputed, and recovered amounts.
- `WorkProcedureVersion`, knowledge links, technician qualifications, schedulable resources, and parts-demand records define downstream eligibility.

Current application behavior is not proof that every catalog gate, authority limit, alternative, or economics review is implemented.

## 4. Entry trigger catalog

| Trigger ID | Claimed event | Required correlation | Initial response |
| --- | --- | --- | --- |
| `RPA-TRG-001` | Inspection/Triage passes to recon | Accepted inspection version, routed findings, vehicle/unit/order, owners | Validate planning intake |
| `RPA-TRG-002` | Diagnosis completes for routed finding | Diagnosis version, source finding, evidence, uncertainty | Update/supersede proposed scope |
| `RPA-TRG-003` | Specialist/sublet evaluation returns | Request/reference, result, quote, evidence, validity | Reconcile into scope/estimate |
| `RPA-TRG-004` | Parts/labor/vendor quote arrives | Demand/line reference, source, amount, availability, expiry | Update estimate inputs, not authorization |
| `RPA-TRG-005` | Material plan input changes | New finding, diagnosis, quote, title dependency, market/economics fact | Evaluate supersession/reapproval |
| `RPA-TRG-006` | Authorized scope is revoked/expired | Exact authorization/version and authority | Block affected execution and recover safely |
| `RPA-TRG-007` | Existing recon plan recovery/backfill | Canonical unit/order, historical evidence, reason, recovery authority | Create labeled recovery planning version |

### Entry and duplicate rules

| Rule ID | Condition | Required result |
| --- | --- | --- |
| `RPA-RULE-001` | No accepted inspection/approved limited route | Block normal planning; do not invent findings |
| `RPA-RULE-002` | Same trigger/idempotency key repeats | Return existing result without duplicate estimates/jobs/events |
| `RPA-RULE-003` | Active recon repair order exists for inventory cycle | Reuse/correlate it; do not open a duplicate order |
| `RPA-RULE-004` | Finding requires unresolved diagnosis | Keep affected correction/cost provisional; create diagnosis dependency |
| `RPA-RULE-005` | Latest inspection/diagnosis is superseded or conflicting | Suspend affected plan lines and re-evaluate |
| `RPA-RULE-006` | Estimate input is stale, incomplete, conflicting, or unauthoritative | Label uncertainty and block exact decisions where policy requires |
| `RPA-RULE-007` | Vehicle intent changes or economics review is active | Re-evaluate scope/alternatives with authority; preserve historical plan |

## 5. Coordination states

```text
PLANNING_INTAKE
  -> FINDING_RECONCILIATION
  -> DIAGNOSIS_AND_REQUIREMENTS
  -> SCOPE_DEVELOPMENT
  -> COST_AND_DURATION_ESTIMATE
  -> ECONOMICS_AND_ALTERNATIVES_REVIEW
  -> ESTIMATE_PRESENTED
  -> AUTHORIZATION_DECISION
  -> AUTHORIZED_JOB_CREATION
  -> PLAN_READINESS_REVIEW
  -> PARTS_AND_REPAIR_HANDOFF

Alternate:
  -> WAITING_DIAGNOSIS
  -> WAITING_QUOTE_OR_PARTS_SOURCE
  -> WAITING_APPROVAL
  -> PARTIALLY_AUTHORIZED
  -> DECLINED_OR_DEFERRED
  -> EXPIRED_OR_REVOKED
  -> DISPOSITION_REVIEW
  -> SUPERSEDED_OR_REPLAN_REQUIRED
```

## 6. Decision-entry contract

Before a planning decision, show:

- vehicle/unit/order, location, lifecycle age, target, and accountable owners;
- accepted inspection version, findings, evidence, limitations, and restrictions;
- latest diagnosis versions and uncertainty;
- carried receipt, title/document, safety, specialist, or disposition dependencies;
- existing estimates, authorizations, jobs, parts demands, costs, and supersession state;
- authoritative facts versus estimates, calculated values, forecasts, and recommendations;
- exact authority, policy, and consequence of the proposed response.

Staff can report missing/conflicting information and cannot be forced to price or authorize unsupported work.

## 7. Planning intake and finding reconciliation

### `RPA-DEC-001` — Is the Inspection/Triage handoff valid and current?

Responses: Valid/current; valid with permitted carried exceptions; superseded; incomplete; conflicting; wrong vehicle/order; affected by new critical fact.

Only current accepted findings may drive the plan. Superseded evidence remains historical and cannot silently support new authorization.

### `RPA-DEC-002` — Does the recon repair order correctly represent this inventory cycle?

Verify vehicle, inventory unit, `INVENTORY_RECON` origin, location, owner, current stage/version, open/closed status, and existing handoff. A duplicate or wrong-cycle order creates reconciliation rather than a new parallel order.

### `RPA-DEC-003` — Reconcile duplicate or related findings

Options:

- One finding, one proposed correction;
- multiple findings share one diagnosis/correction;
- one finding requires multiple independent corrections;
- finding duplicates an existing active job/plan line;
- finding is superseded/resolved by newer evidence;
- relationship uncertain—review required.

Consolidation preserves every source finding/evidence reference and must not hide severity or required work.

### `RPA-DEC-004` — What planning class applies to the finding?

- `NON_WAIVABLE_SAFETY`;
- `NON_WAIVABLE_LEGAL_OR_IDENTITY`;
- `REQUIRED_RELIABILITY`;
- `REQUIRED_RETAIL_STANDARD`;
- `DIAGNOSIS_REQUIRED`;
- `SPECIALIST_OR_SUBLET`;
- `COSMETIC_OR_MERCHANDISING_OPTION`;
- `MONITOR_OR_ADVISORY`;
- `TITLE_DOCUMENT_DEPENDENCY`;
- `DISPOSITION_ECONOMICS_REVIEW`;
- `NO_ACTION_ALLOWED_BY_POLICY`;
- `DUPLICATE_OR_SUPERSEDED`.

Class records policy/version, evidence, uncertainty, classifier, review requirement, and downstream gate effect.

## 8. Diagnosis and correction decisions

### `RPA-DEC-010` — Is diagnosis sufficient to propose a correction?

Evaluate source finding, tests, evidence, cause, uncertainty, recommendation, proposed correction, technician eligibility, effective time, and conflicts.

Responses:

- Sufficient low/approved uncertainty;
- sufficient with disclosed assumption and manager review;
- more internal tests required;
- specialist/sublet diagnosis required;
- diagnosis conflicts with inspection/prior diagnosis;
- cause unknown—contain/defer/disposition review;
- diagnosis not required under approved direct procedure.

### `RPA-DEC-011` — Select proposed correction or option group

Each alternative states:

- intended outcome and source findings;
- procedure/work type;
- included/excluded work;
- safety/legal/retail effect;
- labor, parts, sublet, fees, duration, dependencies, and uncertainty;
- evidence and QC requirements;
- whether the option is eligible, recommended, or prohibited.

“Cheapest” is not eligible when it fails a hard requirement.

### `RPA-DEC-012` — Is an approved work procedure available?

Responses: Active applicable procedure; procedure plus approved supplement; specialist/vendor procedure required; reference-only knowledge available; procedure missing/expired/conflicting; custom plan review required.

Reference-only bulletins or external instructions do not become approved procedures automatically.

## 9. Work-requirement decisions

### `RPA-DEC-020` — Define labor and skill requirements

Capture work type, standard/guide minutes, uncertainty range, required skills/certifications, crew needs, continuity constraints, and eligible internal/external execution types. Duration is an estimate with source/version, not a performance promise.

### `RPA-DEC-021` — Define parts and material demand

For each planned correction:

- part/interchange/specification requirement;
- quantity and unit;
- required versus optional;
- source finding/job candidate;
- known stock/reservation state and freshness;
- approved substitute rules;
- expected cost/availability and confidence;
- return/core/warranty implications;
- hazardous/special handling;
- unresolved fitment/source dependency.

Creating demand does not reserve, issue, order, or install a part.

### `RPA-DEC-022` — Define bay, tool, equipment, and external-resource requirements

Capture eligible bay/lift/environment, tools/calibration/software, diagnostic or ADAS resources, EV/high-voltage controls, sublet/vendor capability, transport between locations, and required time windows.

### `RPA-DEC-023` — Define dependencies and sequencing

Dependency types:

- diagnosis before correction;
- authorization before commitment/execution;
- part/material availability;
- procedure/safety prerequisite;
- title/document/disposition decision;
- predecessor repair job;
- sublet/vendor completion;
- movement/location readiness;
- QC/retest evidence;
- other explicitly typed dependency.

Every dependency has state, owner/resolver, evidence, target, and unlock effect. Circular dependencies are rejected.

## 10. Estimate development

### `RPA-DEC-030` — Are estimate inputs sufficient?

Required by applicable line:

- accepted finding/diagnosis/correction;
- quantity and defined scope;
- labor duration/rate source;
- parts/sublet/fee source and freshness;
- assumptions/exclusions;
- tax/accounting boundary statement;
- expected availability/duration;
- uncertainty and missing inputs;
- estimate expiry and author.

Outputs: Ready to price; provisional/not presentable; quote required; diagnosis required; policy/financial input missing; conflicting input.

### `RPA-DEC-031` — Classify each financial value

Values are labeled:

- authoritative acquisition/incurred fact;
- observed quote;
- calculated amount;
- estimate;
- authorized commitment;
- incurred cost;
- disputed cost;
- forecast remaining;
- recovered/credited amount;
- prediction/recommendation.

The UI and audit cannot present an estimate or forecast as actual cost.

### `RPA-DEC-032` — Select cost source and validity

Options: Approved internal labor/rate policy; effective parts price; current vendor/sublet quote; historical reference only; manager-entered estimate with reason; unavailable/conflicting.

Record source, effective/observed time, currency, tax/fee assumptions, expiry, confidence, and substitution/variance risk.

### `RPA-DEC-033` — Build exact estimate lines and option groups

Every line has a stable key, type, description, quantity, unit amount, work type, planned correction, applicable labor minutes, source findings/diagnosis, assumptions, exclusions, and dependencies. Required and optional alternatives remain separate; mutually exclusive options cannot be authorized together.

### `RPA-DEC-034` — Calculate estimate totals and uncertainty

Show labor, parts, sublet, fees, tax-boundary treatment, discounts, total, uncertainty range, confidence/data sufficiency, quote expiry, and excluded/unknown exposure. A single precise total cannot conceal material uncertainty or omitted dependencies.

### `RPA-DEC-035` — Calculate forecast at completion and all-in exposure

Disclose:

```text
authoritative acquisition cost
+ acquisition/transport/receipt costs by status
+ incurred recon cost
+ current authorized commitments
+ estimated remaining approved/proposed scope
+ governed carrying/title/merchandising assumptions
+ risk/uncertainty reserve where approved
= forecast all-in cost range
```

Projected retail proceeds and margin remain estimates, not guarantees or sale/accounting facts.

## 11. Alternatives and economics review

### `RPA-DEC-040` — Which viable plan alternatives should be compared?

Possible eligible alternatives:

- full retail-standard recon;
- required safety/reliability work plus reduced optional cosmetic scope;
- staged diagnosis before final estimate;
- approved internal versus sublet execution;
- approved alternative part/correction;
- return/rejection where rights and authority exist;
- wholesale/other disposition review;
- hold pending missing information;
- no-recon route when no required work exists.

Each option displays exact inclusions/exclusions, hard-gate effect, cost range, duration range, uncertainty, dependencies, expected retail/economic effect, reversibility, and required authority.

### `RPA-DEC-041` — Does proposed recon remain economically viable?

Inputs may include acquisition exposure, proposed/authorized/incurred recon, carrying assumptions, time-to-frontline range, market/proceeds estimate and freshness, risk reserve, disposition alternatives, and hard requirements.

Outputs:

- Viable within approved policy;
- viable but above review threshold;
- additional diagnosis/quote needed;
- marginal—manager alternatives review;
- projected economics support disposition review;
- cannot determine from current data.

Economics cannot waive safety, law, identity, custody, or mandatory evidence. A recommendation cannot autonomously wholesale, return, or dispose of a vehicle.

### `RPA-DEC-042` — Select recommended plan

Recommendation output includes eligible alternatives, excluded options/reasons, objectives, exact inputs/freshness, expected cost/duration ranges, uncertainty, hard constraints, downstream impact, authority, and explanation. Managers may choose another eligible alternative with a structured reason.

### `RPA-DEC-043` — Route disposition/economics review

Triggers may include approved threshold, high uncertainty, repeated scope growth, unavailable critical parts/resources, structural/safety concern, market change, title dependency, or explicit manager request. The review preserves the recon plan and blocks unapproved commitments; it does not itself execute disposition.

## 12. Estimate presentation and authority

### `RPA-DEC-050` — Is the estimate ready to present for internal authorization?

Gate:

- current inspection/diagnosis versions;
- stable line keys and complete scope/option rules;
- source/freshness and currency;
- assumptions, exclusions, uncertainty, duration, and dependencies;
- exact totals and all-in impact;
- hard requirements clearly identified;
- author capability and separation rules;
- effective expiry;
- no unresolved conflicting supersession.

### `RPA-DEC-051` — Who has authority for this decision?

Evaluate exact requested amount/scope, cumulative current-cycle exposure, related/split requests, vehicle/location/acquisition class, prior approvals, emergency containment authority, and effective delegation.

Responses: Within named authority; higher authority required; independent/four-eyes approval required; authority expired/unknown; prohibited decision; policy owner review.

### `RPA-DEC-052` — Present the exact estimate version

Presentation records version, channel (`INTERNAL` for inventory recon unless approved otherwise), presenter, recipient/decision actor, time, expiry, complete line/option snapshot, explanations, evidence links, and acknowledgement. Changing a material input requires supersession, not editing the presented version.

### `RPA-DEC-053` — Decide authorization

| Disposition | Required result |
| --- | --- |
| Accepted | Every eligible line in exact version accepted within authority |
| Partially accepted | Exact selected lines accepted; remaining lines explicitly declined/deferred/reviewed; hard-gate effect shown |
| Declined | No affected execution/commitment; route alternate/disposition/replan |
| Deferred | Named missing condition, owner, review time, and expiry |
| Expired | No new execution; refresh/supersede estimate |
| Revoked | Reference prior accepted authorization; stop unstarted affected work and reconcile started/committed effects |
| Returned for information | Preserve proposal; create exact evidence/quote/diagnosis work |

Authorization records decision actor type/name/reference, deciding user, exact line keys, authorized amount, authority/policy version, reason, time, and previous authorization lineage.

### `RPA-DEC-054` — Is partial authorization operationally valid?

Check dependencies, hard requirements, option compatibility, safety/quality effect, stranded work, duplicate/shared labor/parts, and downstream gate impact. Partial acceptance that produces an unsafe, incoherent, or prohibited plan is rejected or routed for alternatives review.

### `RPA-DEC-055` — Handle changed scope, price, or availability after authorization

Material changes include new finding/diagnosis, quantity, correction, part/substitute, labor, vendor, cost, duration, dependency, safety requirement, or expired quote. The workflow:

1. identifies affected estimate lines/jobs/commitments;
2. preserves original estimate and authorization;
3. classifies change as within approved tolerance or requiring re-estimate/reapproval;
4. blocks unauthorized incremental work;
5. presents impact and recovery options;
6. creates a superseding version/decision where required.

## 13. Authorized jobs and plan readiness

### `RPA-DEC-060` — Convert authorized lines into repair jobs

Each job must link exact authorized line, estimate, authorization, source finding, diagnosis if required, work type, planned correction, labor estimate, skills/certifications, bay/tools, dependencies, parts demand, priority reasons, procedure/QC requirements, evidence, and creator.

One authorized line may require controlled decomposition only when the authorization and total scope remain traceable. Jobs cannot exceed or substitute unauthorized scope.

### `RPA-DEC-061` — Are parts demands defined and sourced enough for handoff?

Outputs:

- No parts required;
- demand defined, stock/availability pending;
- demand defined and source candidate known;
- reservation/order authority required downstream;
- fitment/substitution unresolved;
- unavailable/backorder risk;
- part demand missing/incomplete.

Planning readiness does not claim parts are reserved merely because a quote or inventory signal exists.

### `RPA-DEC-062` — Are job requirements and dependencies complete?

Verify procedure, skills/certifications, bay/tools, duration range, parts/materials, predecessors, location/movement, safety, specialist/sublet, evidence, and QC. Missing requirements produce resolution work rather than an apparently ready job.

### `RPA-DEC-063` — Sequence and classify authorized work

Eligibility first; then explainable priority may consider safety containment, lifecycle delay, customer/delivery commitment, downstream unlock, parts readiness, duration/critical ratio, resource fit, continuity, and carrying exposure. Priority cannot make an unready job dispatchable or become an employee quota.

### `RPA-DEC-064` — Is Recon Planning and Approval complete?

Gate requires:

- current inspection and required diagnosis versions;
- every routed finding is reconciled;
- proposed corrections and alternatives are evidence-backed;
- estimate inputs, lines, totals, assumptions, expiry, and uncertainty are complete;
- all-in/economics review is complete where required;
- exact authorization disposition and authority are recorded;
- each accepted line maps to traceable job(s);
- job requirements, dependencies, parts demands, procedure/QC/evidence needs are defined;
- unaccepted lines have explicit safe dispositions and gate effects;
- no expired/revoked/conflicting authorization supports execution;
- estimate, authorization, jobs, tasks, events, audit, and handoff commit consistently.

Gate outputs:

- `PASS_AUTHORIZED_PLAN_TO_PARTS_AND_REPAIR`;
- `PASS_AUTHORIZED_PLAN_WITH_WAITING_PREREQUISITES`;
- `PASS_TO_DIAGNOSIS_OR_SPECIALIST`;
- `PASS_TO_DISPOSITION_REVIEW`;
- `FAIL_INSPECTION_OR_DIAGNOSIS_VERSION`;
- `FAIL_UNRECONCILED_FINDING`;
- `FAIL_ESTIMATE_INPUT_OR_UNCERTAINTY`;
- `FAIL_AUTHORITY_OR_AUTHORIZATION`;
- `FAIL_PARTIAL_SCOPE_INCOHERENT`;
- `FAIL_JOB_REQUIREMENTS_OR_DEPENDENCIES`;
- `FAIL_EXPIRED_REVOKED_OR_CHANGED_SCOPE`;
- `FAIL_DATA_CONFLICT`;
- `FAIL_PERMISSION_OR_CONCURRENCY`.

### `RPA-DEC-065` — Create Parts and Repair Execution handoff

Snapshot:

- vehicle/unit/order and lifecycle target;
- current inspection/diagnosis/estimate/authorization versions;
- authorized jobs and exact amounts;
- safety/movement restrictions;
- parts demands and current truth/freshness;
- skills, certifications, bays, tools, procedures, duration ranges, dependencies, and QC/evidence rules;
- waiting/blocking items and owners;
- priority/class-of-service reasons;
- forecast cost/time range and uncertainty;
- next action/owner/queue;
- explicit statement that authorization does not prove dispatch or execution readiness.

## 14. Correction, supersession, cancellation, and recovery

### `RPA-DEC-070` — Correct or supersede planning evidence

Corrections preserve prior/proposed value, reason, authority, new evidence, affected lines/authorizations/jobs/commitments, and immutable lineage. Presented estimates and accepted authorizations are never edited in place.

### `RPA-DEC-071` — Cancel an unstarted authorized job

Require exact job/scope, authority, reason, dependencies, parts/vendor commitments, downstream gate impact, and recovery plan. Cancellation does not automatically revoke the entire authorization or erase committed/incurred cost.

### `RPA-DEC-072` — Recover from revocation after work/commitment starts

Classify each affected job/part/vendor action as unstarted, committed, in progress, safely stoppable, unsafe to stop, completed, disputed, or reversible. Create containment, cost reconciliation, evidence preservation, new authorization/replan, and manager review as required.

## 15. Action catalog

| Action ID | Action | Completion evidence |
| --- | --- | --- |
| `RPA-ACT-001` | Validate planning handoff/order | Current inspection/unit/order correlation |
| `RPA-ACT-002` | Reconcile findings | Source-to-plan mapping and duplicate/supersession decisions |
| `RPA-ACT-003` | Request/record diagnosis | Versioned tests, cause, uncertainty, recommendation, correction |
| `RPA-ACT-004` | Define correction/options | Outcome, scope, requirements, evidence, gate effect |
| `RPA-ACT-005` | Define work/parts/resource dependencies | Typed requirements with owners and targets |
| `RPA-ACT-006` | Request/record quote | Source, amount, currency, validity, availability, scope |
| `RPA-ACT-007` | Build estimate version | Stable lines, totals, assumptions, options, expiry, uncertainty |
| `RPA-ACT-008` | Calculate all-in/forecast impact | Versioned inputs, range, confidence, classifications |
| `RPA-ACT-009` | Compare alternatives/economics | Eligible options, hard constraints, cost/time/risk ranges |
| `RPA-ACT-010` | Present exact estimate | Version/channel/actor/time/recipient acknowledgement |
| `RPA-ACT-011` | Decide exact authorization | Disposition, lines, amount, authority, reason, time |
| `RPA-ACT-012` | Supersede/reapprove changed scope | Impact, new version, old/new lineage, blocked increments |
| `RPA-ACT-013` | Create authorized jobs | Exact source/estimate/authorization/requirements links |
| `RPA-ACT-014` | Evaluate plan readiness | Exact pass/fail reasons and missing prerequisites |
| `RPA-ACT-015` | Route disposition/specialist/diagnosis | Owned alternate decision/dependency |
| `RPA-ACT-016` | Create execution handoff | Versioned authorized-plan snapshot |
| `RPA-ACT-017` | Cancel/recover authorized work | Authority, commitments, containment, reconciliation |

## 16. Evidence catalog

| Evidence ID | Evidence | Required when | Proposed criticality |
| --- | --- | --- | --- |
| `RPA-EVD-001` | Accepted Inspection/Triage handoff | Every recon plan | Mandatory hard gate |
| `RPA-EVD-002` | Finding-to-scope mapping | Every routed finding | Mandatory |
| `RPA-EVD-003` | Diagnosis version/evidence/uncertainty | Diagnosis-required lines | Mandatory hard gate |
| `RPA-EVD-004` | Procedure/correction basis | Every planned correction | Mandatory |
| `RPA-EVD-005` | Labor/duration/skill requirements | Every labor line/job | Mandatory |
| `RPA-EVD-006` | Part/material demand and source basis | Parts-required lines | Mandatory |
| `RPA-EVD-007` | Bay/tool/sublet/dependency requirements | Applicable jobs | Mandatory |
| `RPA-EVD-008` | Quote/rate/cost-source validity | Every priced line | Mandatory |
| `RPA-EVD-009` | Estimate line/option/total snapshot | Every presented estimate | Mandatory immutable version |
| `RPA-EVD-010` | Assumptions/exclusions/uncertainty/expiry | Every presented estimate | Mandatory |
| `RPA-EVD-011` | All-in/economics comparison | Threshold/manager review applies | Conditional mandatory |
| `RPA-EVD-012` | Presentation acknowledgement | Every authorization request | Mandatory |
| `RPA-EVD-013` | Authority/delegation evidence | Every authorization | Mandatory hard gate |
| `RPA-EVD-014` | Exact authorization disposition/lineage | Every decision | Mandatory immutable output |
| `RPA-EVD-015` | Authorized job/source lineage | Every accepted line | Mandatory |
| `RPA-EVD-016` | Changed-scope/reapproval impact | Material post-presentation change | Mandatory |
| `RPA-EVD-017` | Planning completion gate | Every handoff | Mandatory immutable output |
| `RPA-EVD-018` | Execution/alternate handoff | Every terminal planning route | Mandatory |
| `RPA-EVD-019` | Cancellation/revocation recovery | Affected job/commitment exists | Mandatory |

## 17. Exception reason catalog

| Reason code | Meaning | Default control class |
| --- | --- | --- |
| `RPA_EX_HANDOFF_INVALID` | Inspection/Triage handoff is absent, stale, or conflicting | State/evidence hard gate |
| `RPA_EX_DUPLICATE_RECON_ORDER` | Another active recon order/plan may represent the same work | State/data hard gate |
| `RPA_EX_FINDING_UNRECONCILED` | Finding lacks a controlled scope/disposition | Workflow gate |
| `RPA_EX_DIAGNOSIS_INSUFFICIENT` | Cause/correction evidence is inadequate or too uncertain | Diagnosis gate |
| `RPA_EX_PROCEDURE_MISSING` | No applicable approved procedure/correction basis exists | Safety/quality gate |
| `RPA_EX_PART_REQUIREMENT_UNKNOWN` | Required part/fitment/quantity/substitution is unresolved | Parts dependency |
| `RPA_EX_LABOR_RESOURCE_UNKNOWN` | Duration/skill/bay/tool/vendor requirement is unresolved | Planning dependency |
| `RPA_EX_CIRCULAR_DEPENDENCY` | Proposed job dependencies contain a cycle | State hard gate |
| `RPA_EX_QUOTE_REQUIRED` | Valid cost/availability source is absent | Financial/evidence gate |
| `RPA_EX_QUOTE_EXPIRED` | Estimate input is no longer valid | Financial/evidence gate |
| `RPA_EX_ESTIMATE_INCOMPLETE` | Lines/totals/assumptions/options/uncertainty are incomplete | Financial gate |
| `RPA_EX_ECONOMICS_REVIEW` | Proposed all-in exposure requires manager/disposition review | Financial/manager review |
| `RPA_EX_AUTHORITY_INSUFFICIENT` | Respondent lacks exact scope/amount authority | Permission hard gate |
| `RPA_EX_SEPARATION_OF_DUTIES` | Independent approval is required | Governance hard gate |
| `RPA_EX_AUTHORIZATION_PARTIAL_INCOHERENT` | Selected lines create unsafe/incomplete/prohibited plan | Safety/workflow hard gate |
| `RPA_EX_AUTHORIZATION_DECLINED` | Exact scope was declined | Waiting/alternate route |
| `RPA_EX_AUTHORIZATION_DEFERRED` | Exact decision awaits named condition | Waiting/approval |
| `RPA_EX_AUTHORIZATION_EXPIRED` | Presented estimate/decision validity expired | Financial hard gate |
| `RPA_EX_AUTHORIZATION_REVOKED` | Prior accepted scope was revoked | Execution/recovery hard gate |
| `RPA_EX_SCOPE_OR_COST_CHANGED` | Material authorized input changed | Reapproval gate |
| `RPA_EX_JOB_REQUIREMENTS_INCOMPLETE` | Authorized job lacks executable requirements | Readiness gate |
| `RPA_EX_PARTS_NOT_READY` | Job requires parts not yet fully ready | Waiting/parts |
| `RPA_EX_DISPOSITION_REVIEW` | Retail recon may be infeasible or uneconomic | Manager decision |
| `RPA_EX_DATA_CONFLICT` | Inspection, diagnosis, quote, cost, or market inputs conflict | Data/reconciliation |

## 18. Scenario catalog

| Scenario ID | Scenario | Expected controlled outcome |
| --- | --- | --- |
| `RPA-SCN-001` | Normal inspection findings, complete diagnosis, estimate accepted | Traceable authorized jobs and execution handoff |
| `RPA-SCN-002` | Safety repair plus optional cosmetic work | Hard-required and optional lines remain separate; optional decline cannot waive safety |
| `RPA-SCN-003` | Multiple findings share one correction | Consolidate without losing source finding/evidence lineage |
| `RPA-SCN-004` | One finding requires multiple jobs | Decompose with dependency and authorization traceability |
| `RPA-SCN-005` | Finding duplicates existing active job | Correlate; no duplicate scope/cost/job |
| `RPA-SCN-006` | Inspection superseded after plan starts | Suspend affected lines and re-evaluate; preserve prior plan |
| `RPA-SCN-007` | Diagnosis required but missing | Block exact correction/estimate; create qualified diagnosis work |
| `RPA-SCN-008` | Diagnosis has high uncertainty | Present assumptions/alternatives or further-test route; no false certainty |
| `RPA-SCN-009` | Specialist diagnosis/quote pending | Maintain internal owner, target, and waiting clock |
| `RPA-SCN-010` | Approved procedure missing/expired | Prevent executable plan; route procedure/specialist review |
| `RPA-SCN-011` | Required part fitment unresolved | Keep demand/estimate provisional and block readiness |
| `RPA-SCN-012` | Substitute part proposed | Apply approved interchange/quality/fitment rules and exact option impact |
| `RPA-SCN-013` | Part price/availability signal is stale | Label stale; require refresh before applicable commitment |
| `RPA-SCN-014` | Labor duration is uncertain | Show range/source/confidence; do not present false precision |
| `RPA-SCN-015` | Sublet quote expires before approval | Estimate expires/refreshes; cannot authorize stale quote |
| `RPA-SCN-016` | Estimate omits required fee/known dependency | Gate fails until included or explicitly disclosed/owned |
| `RPA-SCN-017` | Two mutually exclusive corrections | Option group prevents simultaneous authorization |
| `RPA-SCN-018` | Internal and sublet alternatives | Compare eligibility, time, cost, risk, resources, and evidence |
| `RPA-SCN-019` | Estimated total exceeds staff authority | Preserve exact request and route higher approval |
| `RPA-SCN-020` | Related requests split below approval limit | Aggregate correlated exposure and enforce correct authority |
| `RPA-SCN-021` | Approver authored estimate where independence required | Enforce separation-of-duties review |
| `RPA-SCN-022` | Estimate fully accepted | Exact lines/amount/version create authorized jobs once |
| `RPA-SCN-023` | Estimate partially accepted coherently | Only selected compatible lines create jobs; remaining gate effects visible |
| `RPA-SCN-024` | Partial acceptance omits required safety dependency | Reject incoherent partial plan or route safe alternative |
| `RPA-SCN-025` | Estimate declined | No execution; route replan/disposition/return options |
| `RPA-SCN-026` | Decision deferred pending quote/title fact | Owned condition/review time; no indefinite waiting |
| `RPA-SCN-027` | Estimate/quote expires without decision | Prevent authorization; create refresh/supersession |
| `RPA-SCN-028` | Authorization revoked before work starts | Block/cancel unstarted affected jobs and reconcile commitments |
| `RPA-SCN-029` | Authorization revoked after part order/work starts | Classify effects and create controlled stop/recovery/reapproval |
| `RPA-SCN-030` | New finding raises cost after approval | Block incremental scope; present impact and reapproval |
| `RPA-SCN-031` | Part price changes within approved tolerance | Apply only explicit policy; preserve variance and version evidence |
| `RPA-SCN-032` | Correction method changes materially | Require new estimate/authorization even if total is similar |
| `RPA-SCN-033` | Numerous repairs make economics marginal | Manager alternatives/disposition review; no autonomous disposal |
| `RPA-SCN-034` | Market/proceeds data is stale | Reduce recommendation authority; cannot manufacture margin confidence |
| `RPA-SCN-035` | Mandatory safety work makes retail economics poor | Safety cannot be waived; authorized disposition review remains available |
| `RPA-SCN-036` | No recon findings | Permit no-recon route only with inspection gate/authority; not frontline ready |
| `RPA-SCN-037` | Cosmetic-only scope declined | Route merchandising/detail decision without creating repair authorization fiction |
| `RPA-SCN-038` | Authorized job lacks procedure/skill/bay/tool requirement | Plan readiness fails; resolution work created |
| `RPA-SCN-039` | Authorized job needs parts not reserved | Valid waiting-parts handoff; never presented as ready to repair |
| `RPA-SCN-040` | Circular job dependency proposed | Reject plan structure with actionable cycle explanation |
| `RPA-SCN-041` | Duplicate estimate/authorization/job command replay | Idempotent same result; no duplicate cost/work/events |
| `RPA-SCN-042` | Concurrent managers decide same estimate | One expected-version decision succeeds; conflict-safe latest state |
| `RPA-SCN-043` | Unauthorized user attempts approval/job creation | Server denial; proposal remains recoverable to authorized role |
| `RPA-SCN-044` | Evidence/quote upload fails | Preserve draft; presentation/authorization gate remains incomplete |
| `RPA-SCN-045` | External vendor/parts system unavailable | Approved degraded capture, visible staleness/reconciliation, no invented availability |
| `RPA-SCN-046` | Historical recon plan backfilled | Label historical confidence; do not imply contemporaneous quote/authorization |
| `RPA-SCN-047` | Title dependency blocks viable repair sequence | Keep explicit dependency/owner; allow only policy-eligible parallel work |
| `RPA-SCN-048` | Vehicle location changes before execution | Re-evaluate resource/sublet/transport plan and affected estimate |
| `RPA-SCN-049` | Manager changes retail intent to wholesale | Preserve plan/evidence; route authorized scope/cost cancellation/recovery |
| `RPA-SCN-050` | Approval target missed | Escalate owned decision; no automatic approval or clock reset |

## 19. Catalog exit gate

This catalog is ready for code only when:

- policy owners approve proposed/presented/authorized/executable distinctions;
- recon planning roles, financial authority, separation of duties, cumulative exposure, tolerances, and emergency boundaries are approved;
- finding classes, diagnosis requirements, procedures, correction options, and no-action rules are approved;
- labor/rate, parts, sublet, fees, tax-boundary, quote, currency, expiry, uncertainty, and forecast policies are approved;
- economics/disposition thresholds and human authority are approved without weakening hard gates;
- job decomposition, dependencies, parts demand, skill/certification, bay/tool, procedure, QC, and evidence requirements are approved;
- partial approval, decline, deferral, expiry, revocation, changed scope, cancellation, and recovery behavior are approved;
- staff walk through at least fifteen representative cases including safety/optional scope, diagnosis uncertainty, partial approval, price change, revocation, economics, duplicate, and degraded-system paths;
- acceptance scenarios map to planned automated/manual evidence;
- no workflow behavior is activated merely because this planning catalog exists.
