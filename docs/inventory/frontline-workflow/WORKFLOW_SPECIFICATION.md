# Inventory-to-Frontline Workflow Specification

**Status:** Proposed implementation specification  
**Workflow ID:** `INV-ITF`  
**Version:** `0.1.0`  
**Activation:** Not approved; documentation only

## 1. Intended outcome

Move each dealership-controlled retail inventory unit from authoritative acquisition to verified frontline readiness while protecting, in precedence order:

1. law, safety, privacy, and binding obligations;
2. vehicle identity, custody, and evidence integrity;
3. customer and dealership commitments;
4. capital and approved financial authority;
5. quality and first-pass completion;
6. flow time, waiting time, and staff usability;
7. market readiness and expected retail value.

Optimization means improving these disclosed outcomes within hard constraints. It does not mean maximizing speed, activity, utilization, or a universal score.

## 2. Scope

### In scope

- purchased, accepted trade, consigned, or authorized transferred vehicles that create a dealership-controlled inventory cycle;
- acquisition validation, transport planning, receipt, inspection, recon, parts, QC, title/document readiness, merchandising, pricing, frontline release, and early post-release verification;
- adaptive staff decisions, tasks, checklists, dependencies, evidence, approvals, exceptions, clocks, escalations, recommendations, and outcomes;
- alternative disposition review when continued retail preparation becomes unsafe, unlawful, infeasible, or uneconomic.

### Out of scope without a separate approved boundary

- appraisals or opportunities that have not crossed the financial acquisition boundary;
- customer-owned service vehicles unless an explicit ownership transition creates an inventory unit;
- accounting ledger, payment processing, tax calculation, public listing provider, title agency, carrier, or DMS replacement;
- autonomous purchase, financial approval, pricing, legal conclusion, safety release, or vehicle disposition;
- treating a task status, comment, elapsed timer, or inferred score as completion evidence.

## 3. Primary aggregate and uniqueness

The workflow operates on one canonical `InventoryUnit` linked to one canonical `Vehicle`. An inventory unit represents one acquisition/disposition cycle.

Invariants:

- exactly one open inventory unit per vehicle and organization;
- at most one active `INV-ITF` workflow instance per inventory unit and workflow version family;
- every start command has an idempotency key and authoritative source reference;
- a repeated event returns the existing workflow result rather than duplicating work;
- a reacquisition after closure creates a new inventory unit and workflow instance;
- stock number is an operating reference, not vehicle identity;
- corrections supersede prior evidence; they do not erase history.

## 4. Actors and ownership

Every workflow instance has:

- service owner;
- workflow owner;
- accountable case owner;
- current-stage owner;
- assigned work executors;
- approver when required;
- evidence custodian;
- exception resolver;
- policy version and workflow version.

One person may hold several roles where policy permits, but roles remain explicit. Every open task, decision request, approval, exception, and external dependency has exactly one accountable internal owner.

## 5. Lifecycle

```text
ACQUISITION_VALIDATION
  -> TRANSPORT_PLANNING
  -> IN_TRANSIT
  -> RECEIPT_AND_CUSTODY
  -> INSPECTION_AND_TRIAGE
  -> RECON_PLAN_AND_APPROVAL
  -> PARTS_AND_REPAIR_EXECUTION
  -> QUALITY_AND_SAFETY_VERIFICATION
  -> TITLE_DOCUMENT_READINESS
  -> MERCHANDISING_AND_PRICING
  -> FRONTLINE_RELEASE_REVIEW
  -> FRONTLINE_READY
  -> POST_RELEASE_VERIFICATION

Alternate controlled outcomes:
  -> HOLD
  -> DISPOSITION_REVIEW
  -> CANCELLED_BEFORE_CONTROL
  -> CLOSED_REVERSED
```

Stage labels map to existing domain lifecycle meanings; they are workflow coordination detail and must not create conflicting canonical lifecycle stages.

## 6. Cross-stage execution

The lifecycle is not a forced waterfall. A stage is the primary accountability context, while eligible tasks may run in parallel.

Examples:

- title follow-up may begin after acquisition evidence is sufficient;
- parts sourcing may begin after an approved inspection finding even while other inspection sections remain open, if policy permits;
- merchandising data preparation may begin before QC, but publication and frontline release remain gated;
- transport monitoring and receiving preparation may operate concurrently.

A task may become available only when its explicit predecessors, resource eligibility, authority, and evidence prerequisites pass. Parallel work must never bypass a hard release gate.

## 7. Stage contract

Every stage definition must declare:

```text
stageId and version
business outcome
authoritative entry event
entry prerequisites
accountable role
available decisions
work and dependencies
required evidence
active, waiting, blocked, and idle clocks
service objective and escalation
hard and reviewable exit gates
permitted transitions
correction, cancellation, reversal, and recovery
events, audit, metrics, and downstream handoff
```

## 8. Stage outcomes and gates

| Stage | Required outcome | Non-negotiable exit gate |
| --- | --- | --- |
| Acquisition Validation | Authorized, unique inventory cycle with known intent and responsibility | Identity, acquisition authority, retail applicability, organization, location plan, and accountable owner are verified |
| Transport Planning | Feasible, owned movement or a verified no-transport path | Need, method, responsibility, destination, target, release readiness, cost authority, and monitoring plan are resolved |
| In Transit | Vehicle movement is monitored to an attributable outcome | Delivery, failure, damage, loss, cancellation, or recovery outcome is recorded; elapsed ETA alone never completes transport |
| Receipt and Custody | Physical vehicle and received property match the authoritative record | VIN/identity, arrival, mileage, keys, documents, condition, damage, location, custody owner, and discrepancies are dispositioned |
| Inspection and Triage | Complete condition, safety, legality, retail-standard, and repair findings | Required template sections complete; critical findings classified; missing inspection evidence prevents completion |
| Recon Plan and Approval | Executable, authorized scope with cost, resources, dependencies, and target | Required work has disposition; estimate is approved within authority; uneconomic cases receive disposition review |
| Parts and Repair Execution | Approved work is completed with traceable labor, parts, sublet, and evidence | Every required operation is completed, explicitly deferred with authority, or returned for correction |
| Quality and Safety Verification | Independent evidence supports safe, policy-compliant release | Critical safety and legal gates pass; failed QC reopens source work; averages cannot cancel a critical failure |
| Title/Document Readiness | Applicable ownership and disclosure obligations are controlled | Each mandatory document gate passes or is in a policy-permitted constrained state; no general override bypasses law |
| Merchandising and Pricing | Complete, accurate, approved market presentation | Required media/data/price approvals pass and outbound publication is reconciled or visibly pending |
| Frontline Release Review | Authorized person evaluates one complete readiness package | All critical gates pass; exceptions and waivers are visible; release command records exact evidence and policy version |
| Frontline Ready | Vehicle is eligible for active retail offering under current evidence | Readiness remains revocable when a material fact changes |
| Post-Release Verification | Early listing, condition, and placement defects are detected and resolved | Defined reconciliation complete or owned exceptions remain visible |

## 9. Adaptive decision contract

The workflow asks only questions that cannot be answered authoritatively from current, sufficiently fresh data. It must show the source and freshness of prefilled facts and allow controlled correction.

Every decision definition contains:

```text
decisionId and version
question and plain-language purpose
appearance condition
eligible actor capabilities
prefilled authoritative facts
response options and eligibility
required evidence by response
validation and hard rules
commands, tasks, approvals, exceptions, and clocks created
next decision or gate effect
correction and reversal behavior
event, audit, explanation, and outcome contract
```

Standard response semantics:

- `VERIFIED_YES`
- `IN_PROGRESS`
- `ACTION_REQUIRED`
- `NOT_APPLICABLE_WITH_REASON`
- `UNKNOWN_INFORMATION_REQUIRED`
- `BLOCKED`
- `APPROVAL_REQUIRED`
- `PREVIOUSLY_COMPLETED_EVIDENCE_PRESENT`
- `PREVIOUSLY_COMPLETED_EVIDENCE_MISSING`
- `CONDITION_CHANGED`

Binary Yes/No is allowed only when both answers are complete and safe. “Other” never replaces a controlled reason code when policy or reporting depends on the answer; free text supplements structured meaning.

## 10. Work generation

Decisions release accountable work through the existing Tasks domain. A generated work item requires:

- workflow, stage, vehicle, and inventory-unit context;
- one accountable owner and, where applicable, executor;
- title, outcome-oriented instruction, next action, and due time;
- class of service and disclosed priority reasons;
- dependencies and required evidence;
- valid completion gate;
- blocker/waiting reason and follow-up requirements;
- workflow/catalog/policy versions;
- idempotent generation key and correlation identifiers.

Completing a task requests gate evaluation. It does not directly advance the lifecycle unless the domain command verifies all required conditions.

## 11. Time model

The workflow distinguishes:

- total acquisition age;
- stage age;
- active touch time;
- approved waiting time;
- blocked time;
- approval waiting time;
- vendor/carrier waiting time;
- idle or unexplained time;
- system processing time.

Only configured, evidenced pause reasons may pause a service-objective clock. Comments, reassignment, repeated saves, or changing an estimated completion time do not reset age. Every paused state has an owner, next action, review time, and maximum review interval.

## 12. Exception and recovery model

An exception follows the enterprise lifecycle:

```text
DETECTED -> VALIDATING -> CONFIRMED -> OWNED -> RESPONSE_IN_PROGRESS
-> CONTAINED -> RESOLVED -> VERIFIED -> CLOSED
```

Required exception output:

- affected vehicle, workflow, commitment, and outcome;
- hard-rule flag and risk band;
- reason code, evidence, confidence, and detected time;
- owner, response-by time, next action, and next escalation;
- containment and recovery options;
- authority and verification requirement;
- correlation to the root exception to prevent alert duplication.

Silence, elapsed time, a comment, or a dismissed notification cannot close an exception.

## 13. Authority and recommendation boundary

Recommendations must first filter for eligibility, safety, law, permission, skills, location, resource availability, evidence, and authority. Ranking occurs only among eligible alternatives.

The system may:

- explain missing facts and likely next actions;
- recommend assignment, sequencing, transport method, sourcing, or blocker recovery;
- estimate completion and exposure with disclosed inputs and uncertainty;
- draft notes or summarize evidence.

The system may not autonomously:

- approve acquisition, spend, price, disposition, or risk acceptance;
- declare legal, title, or safety readiness;
- waive mandatory evidence;
- conceal an exception through scoring;
- discipline staff or infer misconduct from an operational anomaly.

## 14. Material event contract

Material triggers, decisions, transitions, assignments, evidence changes, approvals, overrides, exceptions, cancellations, reversals, and releases emit immutable events containing organization, location, actor/source, subject, prior/next state, occurrence and recording time, correlation/causation, policy/catalog version, and evidence references.

Current projections may be rebuilt. Historical decisions and events must remain reconstructable.

## 15. Data quality and degraded operation

Every material input declares authority, source, effective time, freshness, completeness, consistency, and conflict state.

- Missing mandatory input stops the relevant gate and creates actionable work.
- Stale input reduces recommendation authority and is visibly labeled.
- Conflicting authoritative sources create reconciliation work; high-impact facts never use silent last-write-wins.
- External-system failure leaves accepted local commands durable and retryable.
- Cached, calculated, estimated, and predicted values are labeled distinctly.

## 16. Completion and reopening

Frontline readiness is an evidence-backed release state, not an irreversible historical claim. A material new fact—safety warning, title defect, listing mismatch, damage, recall-policy result, or QC reversal—may suspend current readiness through an authorized command, create recovery work, and preserve the original release evidence.

Historical metrics distinguish first readiness, current readiness, suspensions, rework, and final disposition.

## 17. Initial implementation boundary

The first approved vertical slice will implement only:

```text
Authoritative acquisition trigger
-> Acquisition validation
-> Transportation need and method decisions
-> Assignment, approval, evidence, monitoring, exception, and recovery work
-> Verified delivery/no-transport outcome
-> Receipt and Custody handoff
```

Later stages remain specified targets and cannot be presented as implemented until their own catalogs, controls, tests, and rollout gates pass.
