# Inventory Execution Operating System Implementation Roadmap

**Product:** Time Motor Sales Dispatch Board  
**Program:** Inventory Console Optimization  
**Governing strategy:** [`INVENTORY_EXECUTION_OPERATING_SYSTEM.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM.md)  
**Immediate MVP adoption:** [`INVENTORY_EXECUTION_OPERATING_SYSTEM_MVP_ADOPTION.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM_MVP_ADOPTION.md)  
**Roadmap version:** `1.0.0`  
**Status:** Approved official Inventory EOS implementation roadmap  
**Date adopted:** July 19, 2026  
**Implementation claim:** None. Every milestone in this document is planned unless separate repository and operational evidence proves otherwise.  
**Official adoption record:** [`INVENTORY_EXECUTION_OPERATING_SYSTEM_OFFICIAL_ADOPTION.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM_OFFICIAL_ADOPTION.md)  
**Official vehicle cards:** [`INVENTORY_EXECUTION_VEHICLE_CARD_UI_SOURCE_OF_TRUTH.md`](INVENTORY_EXECUTION_VEHICLE_CARD_UI_SOURCE_OF_TRUTH.md)  
**Official Vehicle Execution Workbench:** [`INVENTORY_EXECUTION_VEHICLE_WORKBENCH_UI_SOURCE_OF_TRUTH.md`](INVENTORY_EXECUTION_VEHICLE_WORKBENCH_UI_SOURCE_OF_TRUTH.md)  
**Primary objective:** Implement the Inventory Execution Operating System as a safe, measurable, staff-simple, enterprise operating model without creating another task engine or navigation layer.

---

## 1. Roadmap authority

This document translates the Inventory Execution Operating System strategy into a formal sequence of releases, milestones, dependencies, deliverables, decision gates, pilots, and enterprise acceptance criteria.

It does not authorize application code, database changes, integrations, production activation, policy publication, physical-tool purchases, or employee-performance use.

Implementation may begin only after the applicable entry gate in this roadmap is approved by the named business and technical owners.

If this roadmap conflicts with an approved Inventory, Tasks, Shop, Parts, Vehicle, governance, or UI source of truth, the conflict must be recorded and resolved through versioned change control before implementation.

## 2. Program outcome

The program is complete only when Inventory EOS operates as one closed execution loop:

```text
Authoritative operational facts
  -> eligible and ready work
  -> clear accountable ownership
  -> current and staged execution
  -> blocker and approval resolution
  -> evidence-backed verification
  -> handoff or authoritative domain transition
  -> outcome measurement and recalibration
```

At completion:

- every supported action, dependency, blocker, approval, exception, and handoff has one accountable internal owner;
- Tasks and My Work provide the shared frontline execution backbone;
- Inventory, Shop, Parts, title, merchandising, pricing, quality, frontline, and disposition domains retain authority over their facts and commands;
- staff normally receive one current assignment and at most one verified-ready staged assignment;
- managers operate primarily from exceptions, capacity constraints, reviews, and approvals;
- completion invokes applicable domain evidence and release gates;
- the Next-Best-Work Sequencer uses approved, deterministic, explainable, versioned policies;
- approved low-risk automation is observable, idempotent, authorized, retryable, and recoverable;
- pilot, production, security, accessibility, performance, recovery, and operating-adoption evidence is accepted;
- expansion beyond the pilot location is explicitly approved and proven.

## 3. Delivery rules

1. **Policy before automation.** Undecided authority, timing, evidence, or separation-of-duties rules block activation.
2. **Consolidate before adding.** Existing Tasks, Inventory, Shop, Parts, approval, evidence, and event capabilities are reused before new foundations are proposed.
3. **One vertical outcome at a time.** Each implementation slice connects authoritative facts, policies, service behavior, staff experience, manager experience, events, tests, recovery, and measurement.
4. **Eligibility before scoring.** Hard gates and readiness are implemented and validated before priority ranking is activated.
5. **Shadow before control.** Sequencing recommendations run in observation or shadow mode before affecting live assignments.
6. **Manual before automated.** A workflow and its recovery path must work manually before automation is considered.
7. **Evidence before completion.** Repository code, operational policy, staff validation, provider evidence, and production proof are classified separately.
8. **One location before enterprise scale.** Multi-location behavior is not inferred from a successful single-location pilot.
9. **No surveillance.** Material work events are auditable; hidden activity monitoring and automatic employee discipline remain prohibited.
10. **Fail honestly.** Missing, stale, conflicting, estimated, predicted, unauthorized, or unavailable states remain visible.

## 4. Status and evidence model

### 4.1 Milestone status

| Marker | Meaning |
| --- | --- |
| `PLANNED` | Defined in this roadmap but not authorized or started |
| `AUTHORIZED` | Entry gate approved for a bounded milestone or slice |
| `IN PROGRESS` | Authorized work is actively being completed |
| `REPOSITORY COMPLETE` | Required repository behavior and automated evidence pass |
| `OPERATIONAL EVIDENCE PENDING` | Repository work passes, but policy, staff, provider, deployment, recovery, or pilot evidence remains |
| `ACCEPTED` | All required evidence for the milestone is approved |
| `PAUSED` | Work is intentionally stopped with preserved state and an approved reason |
| `BLOCKED` | A named dependency or decision prevents progress |
| `RETIRED` | A superseding decision removed the milestone from the active program |

All milestones in version `0.1.0` begin as `PLANNED`.

### 4.2 Evidence classes

Each milestone may require multiple evidence classes:

- `POLICY`: approved ownership, authority, timing, evidence, privacy, and operating rules;
- `REPOSITORY`: schema, services, commands, read models, interfaces, events, tests, and documentation;
- `STAFF`: operator comprehension, usability, workload, and recovery validation;
- `MANAGER`: control-loop, approval, exception, and rebalancing validation;
- `PROVIDER`: external adapter, acknowledgement, freshness, retry, and reconciliation evidence;
- `DEPLOYMENT`: configuration, security, performance, accessibility, observability, and release evidence;
- `RECOVERY`: rollback, retry, compensation, restore, and business-continuity evidence;
- `OUTCOME`: baseline comparison and measured operating result.

A milestone cannot be marked `ACCEPTED` merely because repository tests pass when other evidence classes apply.

## 5. Program releases

| Release | Name | Milestones | Primary outcome |
| --- | --- | --- | --- |
| R0 | Authorization and Baseline | M0–M2 | Approved ownership, current-state evidence, and measurable baseline |
| R1 | Operating Foundation | M3–M5 | Shared policy, work contract, states, clocks, and service rules |
| R2 | Frontline Execution Simplicity | M6–M9 | Start Day, Current Work, blocker recovery, verified completion, and handoff |
| R3 | Manager Exception Operations | M10–M11 | Unified manager control loop and reliable capacity/WIP control |
| R4 | Deterministic Optimization | M12–M15 | Hard gates, readiness, sequencing, explanation, and shadow validation |
| R5 | Domain Rollout | M16–M23 | End-to-end Inventory lifecycle activation in bounded vertical slices |
| R6 | Bounded Automation | M24–M26 | Proven low-risk automation and governance of consequential automation |
| R7 | Enterprise Readiness | M27–M31 | Accessibility, security, resilience, adapters, and multi-location proof |
| R8 | Operational Acceptance | M32–M35 | Controlled pilots, end-to-end acceptance, and enterprise release decision |

## 6. Critical dependency path

```text
M0 Program Authorization
  -> M1 Current-State Audit
  -> M2 Operational Baseline
  -> M3 Responsibility and Policy
  -> M4 Shared Work Contract
  -> M5 States, Clocks, and Service Classes
  -> M6–M9 Frontline Execution Loop
  -> M10–M11 Manager and Capacity Loop
  -> M12–M13 Hard Gates and Readiness
  -> M14 Next-Best-Work Sequencer
  -> M15 Shadow Evaluation
  -> M16–M23 Domain Activation
  -> M24–M26 Bounded Automation
  -> M27–M31 Enterprise Readiness
  -> M32–M35 Operational Acceptance
```

Some research, policy workshops, accessibility preparation, data-quality work, and physical-tool assessment may proceed in parallel. Live sequencing, automation, and rollout may not bypass their dependency gates.

---

## 7. R0 — Authorization and Baseline

### M0 — Program authorization

**Status:** `PLANNED`  
**Purpose:** Establish accountable ownership, scope, decision authority, and change control before implementation.

Required outputs:

- executive sponsor;
- Inventory EOS policy owner;
- product owner;
- technical owner;
- pilot manager;
- operator advisory group;
- security/privacy and financial-control advisors where applicable;
- program charter;
- decision and approval register;
- change-control procedure;
- explicit scope and non-goals;
- initial pilot candidate;
- implementation authorization template.

Dependencies:

- Inventory EOS strategy review;
- leadership willingness to assign decision owners.

Done when:

- leadership accepts Inventory EOS as the governing optimization strategy;
- named owners accept their responsibilities;
- no unapproved numeric policy, limit, target, or algorithm weight is active;
- the first planning boundary is explicitly authorized.

Required evidence: `POLICY`.

### M1 — Current-state conformance audit

**Status:** `PLANNED`  
**Purpose:** Determine what already exists, what should be consolidated, and what is genuinely missing.

Audit scope:

- Tasks Console and My Tasks;
- Staff Day, Available Work, and handoffs;
- Manager Review and approvals;
- Inventory Home, Lifecycle, and Control Tower;
- Vehicle 360 and evidence;
- acquisition, receipt, inspection, frontline, retail completion, and disposition;
- Shop, repair order, job execution, and QC;
- Parts demand, procurement, receipt, reservation, issue, return, and reconciliation;
- title, merchandising, pricing, publication, and release;
- roles, duties, capabilities, location, authority, delegation, and separation of duties;
- events, audit, notifications, and integrations;
- algorithms, data confidence, mobile, accessibility, performance, deployment, and recovery.

Required outputs:

- requirement-to-source traceability matrix;
- implementation-evidence register;
- complete/partial/missing/policy-blocked/external-evidence classification;
- duplicate queue, ownership, task, and navigation register;
- retain/consolidate/defer/retire recommendation;
- prioritized gap register;
- candidate first vertical slice.

Dependencies:

- M0 authorization;
- access to repository and current operating stakeholders.

Done when:

- every major Inventory EOS requirement is classified exactly once;
- implemented and proposed behavior are separated;
- no existing capability is scheduled for replacement without a documented reason;
- gaps have named decision or execution owners.

Required evidence: `POLICY`, `REPOSITORY`.

### M2 — Operational baseline

**Status:** `PLANNED`  
**Purpose:** Establish the pre-optimization operating baseline and data-confidence limits.

Baseline measures:

- acquisition-to-frontline time;
- time in each lifecycle stage;
- ready-to-start delay;
- active, approved-waiting, blocked, review, and unexplained-idle time;
- assignment acknowledgement;
- approval response;
- blocker acknowledgement and resolution;
- Parts readiness at planned start;
- work in progress by role, bay, and stage;
- first-pass yield, QC failure, rework, and comeback;
- capital-days and carrying exposure where authoritative;
- work missing an owner, next action, due time, or definition of done;
- manager time spent assigning, chasing, and reconciling;
- staff time spent searching for vehicles, Parts, instructions, evidence, or authority;
- data completeness, freshness, conflict, and unavailable rates.

Required outputs:

- metric catalog and formulas;
- reporting windows and comparable work classes;
- data-source and confidence matrix;
- unsupported-data register;
- baseline report;
- proposed pilot scorecard without unapproved targets.

Dependencies:

- M0 authorization;
- M1 may proceed in parallel but must reconcile its source findings.

Done when:

- each reported metric has a definition, source, owner, confidence, and limitation;
- estimates and observations are distinguished;
- staff and managers validate that the baseline reflects actual work;
- pilot improvement can be compared with a defensible starting point.

Required evidence: `POLICY`, `STAFF`, `MANAGER`, `OUTCOME`.

R0 release gate:

- M0–M2 are `ACCEPTED`;
- the proposed R1 scope has a named business owner;
- unresolved decisions are visible and assigned;
- implementation remains unauthorized until the R1 entry package is approved.

---

## 8. R1 — Operating Foundation

### M3 — Responsibility and policy model

**Status:** `PLANNED`  
**Purpose:** Define who may own, perform, approve, verify, override, escalate, and publish each pilot action.

Required outputs:

- role and duty catalog;
- skill and certification matrix;
- capability and location scope;
- financial authority and related-exposure policy;
- responsibility assignment matrix;
- independent-review and separation-of-duties matrix;
- blocker, dependency, approval, and escalation owners;
- delegation and expiry rules;
- override boundaries;
- evidence visibility and privacy rules;
- policy author and publisher responsibilities.

Dependencies:

- R0 acceptance.

Done when:

- every pilot action has one accountable owner and an executable authority route;
- mandatory independence is explicit;
- external responsibility retains an internal monitoring owner;
- non-waivable controls are approved;
- unresolved authority prevents activation rather than defaulting to permissive behavior.

Required evidence: `POLICY`.

### M4 — Shared Inventory Work Contract

**Status:** `PLANNED`  
**Purpose:** Establish one execution contract across all selected Inventory domains.

Required contract sections:

- stable identity and authoritative references;
- organization and location;
- workflow domain, stage, and operating state;
- accountable owner, executor, collaborators, dependency owner, approver, and escalation owner;
- role, duty, skill, capability, certification, and independence requirements;
- created, ready, accepted, started, updated, warning, due, escalation, next-check, completion, verification, and closure times;
- current next action and intended outcome;
- prerequisites, tools, Parts, bay, vehicle, documents, evidence, and authority;
- readiness dimensions;
- definition of done and evidence packet;
- blocker, waiting, and recovery contract;
- urgency, reasons, confidence, alternatives, and required approval;
- handoff, completion, review, and domain-command references;
- policy, algorithm, version, and event references.

Required outputs:

- canonical contract definition;
- domain-to-contract mapping;
- Tasks-versus-domain source-authority map;
- duplicate-prevention rules;
- supersession and reconciliation rules;
- representative work packets for each pilot role.

Dependencies:

- M3 responsibility model;
- M1 source-authority findings.

Done when:

- representative work from every pilot domain maps without duplicating authoritative facts;
- Tasks remains the execution backbone;
- a task state cannot independently change a domain fact;
- every work packet answers who, what, why, when, readiness, done, evidence, and recovery;
- cross-domain joins and event traceability are defined.

Required evidence: `POLICY`, `REPOSITORY`, `STAFF`, `MANAGER`.

### M5 — Standard states, clocks, and service classes

**Status:** `PLANNED`  
**Purpose:** Make work state and time consumption consistently interpretable.

Required outputs:

- standard staff-facing states;
- domain-to-work-state mapping;
- entry, exit, and recovery rules;
- active, approved-waiting, blocked, review, and idle clock classification;
- service-class framework;
- warning, due, overdue, escalation, and next-check rules;
- pause and wait reasons;
- calendar, timezone, and business-hour rules;
- carryover, supersession, reopening, and handoff rules.

Dependencies:

- M3 and M4.

Done when:

- each state has an owner, permitted commands, evidence, and recovery path;
- waiting cannot remain ownerless or indefinitely unchecked;
- blocked work requires impact, resolution owner, and escalation;
- carryover preserves work identity and context without duplication;
- numeric timing rules remain inactive until approved.

Required evidence: `POLICY`, `STAFF`, `MANAGER`.

R1 release gate:

- M3–M5 are `ACCEPTED`;
- representative staff and managers understand the contract and state model;
- source authority and duplicate-prevention rules are approved;
- the first R2 vertical slice satisfies the implementation entry gate.

---

## 9. R2 — Frontline Execution Simplicity

### M6 — Start Day and daily plan

**Status:** `PLANNED`  
**Purpose:** Give each staff member a clear, role-aware plan without requiring navigation across Inventory landing pages.

Staff outcomes:

- responsibility checklist;
- carryover requiring attention;
- proposed current assignment;
- at most one verified-ready staged assignment;
- expected outcome and target;
- known constraints;
- starting blocker and acknowledgement.

Manager outcomes:

- unacknowledged plans;
- absences and capability gaps;
- unowned P0/P1 work;
- overload and undercoverage;
- work missing Parts, approval, bay, evidence, or vehicle readiness;
- recommended plan adjustment.

Dependencies:

- R1 acceptance;
- selected pilot roles and work classes.

Done when:

- staff can identify their expected start without searching multiple workspaces;
- managers can resolve ownership and coverage gaps from authoritative facts;
- acknowledgement is attributable without becoming surveillance;
- retry and duplicate prevention are proven.

Required evidence: `REPOSITORY`, `STAFF`, `MANAGER`, `RECOVERY`.

### M7 — Current Work execution packet

**Status:** `PLANNED`  
**Purpose:** Make the current assignment executable with minimal navigation and duplicate entry.

Required capabilities:

- exact next action;
- vehicle/work identity and location;
- urgency reason and due time;
- concise applicable procedure or checklist;
- Parts, bay, tool, approval, skill, evidence, and vehicle readiness;
- definition of done;
- downstream consequence;
- Start, Pause, Block, Waiting, Complete, Request Help, and Information Is Wrong actions;
- direct Vehicle 360 context;
- responsive desktop, tablet, and mobile behavior;
- pending, stale, conflict, rejected, unauthorized, and recovery states.

Dependencies:

- M6;
- work contract and policy enforcement.

Done when:

- representative staff can execute assigned work without unnecessary page hunting;
- required data is prefilled from authoritative sources;
- conflicting facts create resolution rather than unsafe overwrite;
- progress commands are permission checked, version safe, and event backed;
- staff validation finds the update burden acceptable.

Required evidence: `REPOSITORY`, `STAFF`, `DEPLOYMENT`, `RECOVERY`.

### M8 — Blocker and dependency resolution

**Status:** `PLANNED`  
**Purpose:** Convert obstruction into owned, time-bound resolution work.

Required capabilities:

- approved blocker families;
- resolution and dependency ownership;
- affected work and promise impact;
- acknowledgement, resolution, escalation, and next-check times;
- resolution work creation or linking without duplication;
- substitute eligible work for the original executor;
- resume and resequencing after clearance;
- immutable reason and escalation history;
- notification digest and noise controls.

Dependencies:

- M5 timing model;
- M7 work execution.

Done when:

- every pilot blocker has one resolution owner and next check;
- staff no longer need to manually chase ordinary dependencies;
- blocked work preserves its original owner and context;
- escalation reaches the correct authority;
- reporting a blocker is not treated as employee fault.

Required evidence: `POLICY`, `REPOSITORY`, `STAFF`, `MANAGER`, `OUTCOME`.

### M9 — Evidence-backed completion and handoff

**Status:** `PLANNED`  
**Purpose:** Verify real operational outcomes and preserve continuity across people and days.

Required capabilities:

- completion-readiness evaluation;
- required checklist, fields, photos, documents, scans, measurements, or signatures;
- independent review where policy requires it;
- return for information, correction, or rework;
- applicable domain command or transition;
- verified completion distinct from status change;
- handoff proposal and acceptance;
- day-end draft;
- duplicate-safe carryover;
- completion override with authority, reason, scope, and evidence.

Dependencies:

- M7 and M8;
- domain completion gates for the selected slice.

Done when:

- status-only completion is impossible for governed work;
- hard-gate failure cannot be averaged away;
- completion, quality verification, financial approval, operational release, and frontline release remain distinct;
- carryover retains identity, owner, blocker, evidence, and next action exactly once.

Required evidence: `POLICY`, `REPOSITORY`, `STAFF`, `MANAGER`, `RECOVERY`.

R2 release gate:

- M6–M9 pass their repository evidence;
- representative staff complete tabletop and live-pilot scenarios;
- no unresolved ownership, duplicate, authorization, evidence, or recovery defect exists;
- manager and staff workload remains acceptable;
- R3 is authorized only for the proven pilot scope.

---

## 10. R3 — Manager Exception Operations

### M10 — Unified Manager Control Loop

**Status:** `PLANNED`  
**Purpose:** Replace scattered queues and manual status chasing with one governed attention and decision loop.

Required populations:

- P0 containment;
- P1 recovery;
- unowned and unacknowledged work;
- blocked and waiting work;
- missing dependency owner;
- approval and independent review;
- at-risk promise;
- missing evidence;
- conflicting or stale data;
- failed command or automation;
- handoff pending;
- carryover without ownership or next action.

Required operating modes:

- start-of-day readiness and coverage;
- continuous actionable exceptions;
- midday forecast and rebalancing;
- day-end handoff and carryover control.

Dependencies:

- R2 evidence;
- approved manager authority and escalation rules.

Done when:

- duplicate manager queues are consolidated or explicitly scoped;
- each item states affected outcome, owner, age, evidence, available commands, authority, and consequence;
- managers can complete the agreed operating cadence from consistent facts;
- action and response times are measurable.

Required evidence: `REPOSITORY`, `MANAGER`, `OUTCOME`.

### M11 — Capacity and work-in-process control

**Status:** `PLANNED`  
**Purpose:** Protect flow by matching ready work to real capability and constrained resources.

Required capabilities:

- staff availability and validated capacity;
- skill and certification eligibility;
- bay, tool, and equipment compatibility;
- Parts and approval readiness;
- estimated duration with confidence;
- one-active and one-staged guidance;
- workload and continuity analysis;
- capability shortage visibility;
- rebalancing recommendation;
- manager override with reason.

Dependencies:

- M2 baseline;
- M10 manager loop;
- sufficiently reliable capacity and duration facts.

Done when:

- unavailable or unready work is not dispatched prematurely;
- placeholder capacity is not presented as operational fact;
- excess WIP generates a clear rebalancing recommendation;
- like-for-like work classes and approved nonproductive time are preserved;
- utilization pressure cannot override safety or quality.

Required evidence: `POLICY`, `REPOSITORY`, `STAFF`, `MANAGER`, `OUTCOME`.

R3 release gate:

- M10 and M11 are accepted for the pilot scope;
- managers demonstrate reduced manual assignment and chasing effort;
- capacity data is either reliable or explicitly unavailable;
- R4 optimization cannot use unreliable inputs as facts.

---

## 11. R4 — Deterministic Optimization

### M12 — Eligibility and hard-gate engine

**Status:** `PLANNED`  
**Purpose:** Ensure only safe, permitted, state-valid, and executable work reaches ranking.

Gate families:

- safety and roadworthiness;
- identity and VIN;
- custody and physical location;
- title, lien, document, disclosure, and legal;
- financial authority and related exposure;
- separation of duties;
- skill and certification;
- Parts, bay, tool, equipment, and vehicle availability;
- mandatory evidence;
- workflow state, version, and concurrency;
- privacy and field access;
- data freshness, sufficiency, and conflict.

Dependencies:

- R1 policy;
- R2 execution contract;
- domain-specific gate definitions.

Done when:

- every candidate action is allowed or excluded with stable reasons;
- recoverable exclusions create or link resolution work;
- a score cannot override a hard gate;
- enforcement occurs at the authoritative command boundary;
- negative, stale, unauthorized, and concurrency scenarios pass.

Required evidence: `POLICY`, `REPOSITORY`, `DEPLOYMENT`, `RECOVERY`.

### M13 — Readiness engine

**Status:** `PLANNED`  
**Purpose:** Determine whether work can begin successfully now.

Required readiness dimensions:

- work prerequisites;
- Parts;
- authority;
- resources;
- vehicle presence, identity, access, and safety;
- evidence and source sufficiency;
- upstream handoff.

Dependencies:

- M12 hard gates;
- authoritative readiness inputs.

Done when:

- mandatory readiness failures remain visible and cannot be hidden by an average;
- the system distinguishes ready, conditionally ready, not ready, stale, and unknown;
- missing readiness produces an owned recovery action;
- staff and managers can understand why work is or is not ready.

Required evidence: `POLICY`, `REPOSITORY`, `STAFF`, `MANAGER`.

### M14 — Next-Best-Work Sequencer

**Status:** `PLANNED`  
**Purpose:** Recommend the best eligible action for a staff member or constrained resource at a point in time.

Required sequence:

1. normalize facts;
2. validate freshness and sufficiency;
3. apply hard gates;
4. evaluate readiness;
5. resolve eligible executors and resources;
6. classify urgency;
7. rank within class;
8. enforce WIP and continuity controls;
9. assemble explanation and alternatives;
10. revalidate on assignment or claim.

Urgency classes:

- P0 Contain;
- P1 Recover;
- P2 Unlock;
- P3 Protect;
- P4 Advance.

Candidate ranking inputs:

- critical ratio where duration data is reliable;
- stage target and unexplained idle time;
- downstream dependency-unlock value;
- customer, frontline, sale, or delivery commitment;
- capital-days and carrying exposure;
- Parts ETA and repair completion risk;
- skill, resource, and location fit;
- workload balance;
- continuity and context-switch avoidance;
- movement and setup cost;
- expected duration and available window;
- data confidence and expected verifiable outcome.

Dependencies:

- M11 capacity controls;
- M12 and M13;
- approved urgency, factor, and explanation policies.

Done when:

- identical normalized inputs and versions produce identical output;
- every recommendation includes action, owner, reasons, freshness, confidence, alternatives, and authority;
- material events invalidate or recalculate recommendations;
- declines and overrides retain reason and outcome without employee scoring;
- no predictive input is presented as an observed fact.

Required evidence: `POLICY`, `REPOSITORY`, `STAFF`, `MANAGER`, `OUTCOME`.

### M15 — Shadow-mode evaluation

**Status:** `PLANNED`  
**Purpose:** Validate recommendations without controlling live assignments.

Required activities:

- run recommendations alongside manager decisions;
- compare eligibility, order, assignment, and outcome;
- record acceptance, decline, override, and correction reasons;
- examine stability after material changes;
- tabletop unsafe, insufficient-data, and edge scenarios;
- calibrate policy and weights;
- reject inputs that lack sufficient quality;
- review fairness and workload effects.

Dependencies:

- M14 repository behavior;
- sufficient representative operating volume.

Done when:

- no unresolved unsafe recommendation class remains;
- staff and managers understand explanations;
- recommendation quality improves agreed outcomes or provides a justified operational advantage;
- policy owners approve a bounded live pilot;
- rollback to manual dispatch remains immediate.

Required evidence: `STAFF`, `MANAGER`, `OUTCOME`, `RECOVERY`.

Recommended minimum shadow window: three to six representative operating weeks. Actual duration is determined by case coverage, not calendar passage alone.

R4 release gate:

- M12–M15 are accepted for the authorized slice;
- the sequencer remains advisory unless a separate activation decision is approved;
- insufficient data blocks affected recommendations;
- live activation includes monitoring and rollback.

---

## 12. R5 — Domain Rollout

Domain rollout uses the shared foundation in bounded vertical slices. Each milestone must include authoritative facts, work contract, hard gates, readiness, staff commands, manager exceptions, evidence, audit, recovery, tests, and outcome measurement.

### M16 — Receipt, identity, custody, and inspection

**Status:** `PLANNED`  
**Purpose:** Establish the authoritative facts required by all downstream optimization.

Scope:

- arrival and source reference;
- VIN/identity match;
- vehicle number and inventory number;
- physical location and custody;
- keys, accessories, mileage, condition, and damage evidence;
- restrictions and containment;
- inspection template and assignment;
- inspection findings and triage;
- next route and recon handoff.

Done when:

- every received pilot vehicle is identifiable, locatable, owned, evidence backed, and routed;
- identity, custody, and critical-condition conflicts fail closed;
- downstream work receives an accepted handoff.

Required evidence: `POLICY`, `REPOSITORY`, `STAFF`, `MANAGER`, `RECOVERY`, `OUTCOME`.

### M17 — Recon planning and Shop execution

**Status:** `PLANNED`  
**Purpose:** Convert inspection findings into authorized, ready, controlled repair execution.

Scope:

- diagnosis and findings;
- scope and estimate;
- alternatives and economics review;
- approval and financial authority;
- repair-order and job linkage;
- skill, bay, tool, Parts, and authorization readiness;
- start, pause, resume, finish, and evidence;
- material scope change and reapproval;
- cancellation and recovery;
- QC handoff.

Done when:

- no governed Shop work begins without required readiness and authority;
- material scope and cost changes cannot silently overwrite prior approvals;
- execution and Inventory ownership remain traceable.

### M18 — Parts readiness and execution

**Status:** `PLANNED`  
**Purpose:** Connect Parts demand and custody to affected Shop and Inventory outcomes.

Scope:

- demand and compatibility;
- source and vendor comparison;
- transfer-before-purchase;
- purchase authority;
- purchase order and ETA;
- receipt, inspection, and discrepancy;
- bin, reserve, issue, install, return, core, warranty, credit, and reconciliation;
- affected-work and promise visibility.

Done when:

- Parts readiness is authoritative and locatable;
- purchase, substitution, transfer, adjustment, and custody actions enforce authority;
- delays create owned recovery work and resequencing.

### M19 — Quality and Inventory handoff

**Status:** `PLANNED`  
**Purpose:** Prove repair quality and return successful inventory recon to Inventory control.

Scope:

- applicable QC template;
- qualified and independent reviewer;
- measurements, checks, peer verification, and road test where required;
- pass, fail, rework, containment, and supersession;
- operational repair release;
- accepted Inventory handoff.

Done when:

- failed critical checks cannot proceed downstream;
- aggregate completion cannot hide failed mandatory evidence;
- rework retains prior history and current ownership.

### M20 — Title and document readiness

**Status:** `PLANNED`  
**Purpose:** Establish evidence-backed title and document readiness without providing unauthorized legal conclusions.

Scope:

- context-specific requirements;
- original-document custody;
- receipt, verification, acceptance, rejection, and correction;
- external filing and dependencies;
- lien, disclosure, and mandatory stops;
- review packet and independent readiness approval;
- suspension and recovery.

Done when:

- mandatory title/document controls cannot be bypassed;
- external responsibility retains an internal monitoring owner;
- readiness and legal qualification remain distinct.

### M21 — Merchandising, pricing, and publication

**Status:** `PLANNED`  
**Purpose:** Produce an approved, reconciled retail presentation from verified facts.

Scope:

- verified vehicle facts;
- media plan and capture;
- content drafting and approval;
- pricing analysis, proposal, approval, and floor exception;
- channel payload, publication, observation, and reconciliation;
- provider failure, retry, pause, and removal;
- package readiness.

Done when:

- public claims, media, price, publication, and reconciliation are separately attributable;
- provider acceptance is not treated as observed publication;
- stale or conflicting facts stop affected consequential actions.

### M22 — Frontline release and post-release verification

**Status:** `PLANNED`  
**Purpose:** Make frontline readiness provable across physical, operational, title, quality, merchandising, and digital dimensions.

Scope:

- frozen release packet;
- independent release review;
- exception approval where legally and operationally permitted;
- lifecycle transition;
- physical placement;
- digital availability;
- sales handoff;
- post-release verification;
- suspension, correction, and reinstatement.

Done when:

- a score, task completion, provider response, or appointment cannot authorize release;
- suspension and reinstatement preserve full history and authority;
- physical and digital availability are observed separately.

### M23 — Aging, transfer, wholesale, and disposition

**Status:** `PLANNED`  
**Purpose:** Protect capital and space with explainable, authorized disposition decisions.

Scope:

- lifecycle age and delay classification;
- market fit and merchandising/pricing correction;
- capital and carrying exposure;
- transfer recommendation;
- wholesale/disposition recommendation;
- alternatives, uncertainty, and approval;
- settlement, mismatch, unwind, and recovery;
- measured retail-versus-disposition outcome.

Done when:

- consequential decisions remain human authorized;
- recommendation inputs, assumptions, alternatives, and confidence are visible;
- price, transfer, channel, release, settlement, and disposition commands remain separately controlled.

M17–M23 required evidence: `POLICY`, `REPOSITORY`, `STAFF`, `MANAGER`, `RECOVERY`, `OUTCOME`; `PROVIDER` where external systems participate.

R5 release gate:

- each activated domain milestone passes independently;
- cross-domain handoffs preserve one owner and authoritative state;
- end-to-end lineage from source fact through work, evidence, command, event, and outcome is demonstrable;
- inactive domains remain honestly labeled.

---

## 13. R6 — Bounded Automation

### M24 — Low-risk coordination automation

**Status:** `PLANNED`  
**Purpose:** Automate repetitive coordination after the manual workflow and recovery path are proven.

Candidate scope:

- work-packet preparation;
- eligible assignment recommendation;
- blocker-resolution routing;
- next-check scheduling;
- warnings and escalation;
- notification digesting;
- handoff drafts;
- readiness reevaluation;
- recovery-work preparation.

Done when:

- each action is deterministic, scoped, authorized, idempotent, event backed, observable, retryable, and recoverable;
- staff and managers can understand and correct the result;
- automation can be paused without losing ownership or history.

### M25 — Reversible routine execution

**Status:** `PLANNED`  
**Purpose:** Permit explicitly approved low-risk commands to execute automatically within bounded policy.

Potential scope:

- create approved follow-up work;
- schedule reevaluation;
- close expired recommendations;
- prepare and route approval packets;
- perform provider retry and reconciliation;
- advance a routine state only where complete policy and recovery evidence supports it.

Done when:

- every automated command produces an authoritative receipt;
- concurrency and duplicate prevention pass;
- rollback, compensation, and reconciliation are exercised;
- consequential decisions remain outside scope unless separately approved.

### M26 — Consequential automation governance review

**Status:** `PLANNED`  
**Purpose:** Decide whether any consequential action should advance beyond advisory or prepared status.

Actions requiring explicit review include:

- purchases and financial commitments;
- recon scope and material changes;
- substitutions, transfers, adjustments, and write-downs;
- pricing, floor exceptions, public claims, and publication;
- disposition and wholesale;
- critical exception acceptance;
- operational, quality, and frontline release;
- reinstatement after suspension;
- policy publication and authority changes.

Done when:

- each action is explicitly retained as human-governed or authorized through a separately approved, bounded policy;
- no non-waivable control is automated away;
- legal, financial, privacy, security, and operational owners sign the decision.

Required evidence for R6: `POLICY`, `REPOSITORY`, `STAFF`, `MANAGER`, `DEPLOYMENT`, `RECOVERY`, `OUTCOME`.

R6 release gate:

- no automation advances beyond its approved level;
- pause, rollback, and recovery have been exercised;
- automation defects cannot silently alter authoritative facts;
- staff and managers retain clear control.

---

## 14. R7 — Enterprise Readiness

### M27 — Mobile, accessibility, and workplace validation

**Status:** `PLANNED`  
**Purpose:** Prove that execution works in actual office, Shop, lot, and field conditions.

Validation scope:

- desktop, tablet, and mobile;
- keyboard and assistive technology;
- touch targets, contrast, non-color status, focus, and announcements;
- slow or unreliable connectivity;
- pending and failed evidence capture;
- barcode, QR, VIN, stock, RO, and part scanning;
- camera and document capture;
- approved dealership terminology;
- glove, lighting, noise, movement, and shared-device conditions where applicable.

Done when:

- representative users complete critical workflows without inaccessible or impractical barriers;
- failures preserve drafts and recovery;
- required defects are closed or explicitly accepted by authority.

### M28 — Security, privacy, authority, and audit hardening

**Status:** `PLANNED`  
**Purpose:** Prove enterprise control of consequential work and evidence.

Validation scope:

- server-side permissions;
- location and field access;
- delegation and expiry;
- amount limits and anti-splitting;
- separation of duties;
- evidence privacy, malware scanning, retention, and legal hold;
- audit immutability and access;
- override controls;
- sensitive-data redaction;
- threat and abuse cases.

Done when:

- no UI-only permission boundary exists;
- consequential commands fail closed;
- audit lineage is complete and authorized;
- privacy and retention policy is approved.

### M29 — Performance, resilience, and recovery

**Status:** `PLANNED`  
**Purpose:** Prove reliable operation during concurrency, failure, retry, and restore.

Validation scope:

- peak queue and projection volume;
- concurrent assignments and commands;
- idempotency and optimistic concurrency;
- projection delay and stale-read behavior;
- provider and network failure;
- pending evidence and background retry;
- scheduler and automation failure;
- backup, restore, compensation, and reconciliation;
- business continuity and manual fallback;
- observability and alert routing.

Done when:

- defined performance and recovery objectives pass;
- failure does not silently lose ownership, evidence, or commands;
- rollback and restore evidence is accepted.

### M30 — External adapter activation

**Status:** `PLANNED`  
**Purpose:** Activate only those integrations that materially improve execution and have explicit source authority.

Potential adapters:

- DMS;
- VIN and vehicle history;
- market and pricing;
- Parts vendors;
- title providers;
- listing channels;
- accounting;
- scanning or other approved hardware.

Adapter requirements:

- source-authority mapping;
- authentication and security review;
- freshness and expiry;
- normalization and confidence;
- acknowledgement versus observed outcome;
- retry, reconciliation, and dead-letter handling;
- provider outage and partial-data behavior;
- support and ownership;
- contract and acceptance evidence.

Done when:

- an adapter cannot silently become authoritative beyond its approved scope;
- stale or failed provider data is visible;
- reconciliation and provider evidence pass.

### M31 — Multi-location scaling

**Status:** `PLANNED`  
**Purpose:** Expand operating policy and execution safely across locations.

Required capabilities:

- location-specific policy, calendar, authority, skill, and capacity;
- cross-location visibility and field access;
- vehicle, Parts, document, and key custody during transfer;
- cross-location recommendation and acceptance;
- local and enterprise escalation;
- data ownership and reporting scope;
- deployment, support, and rollback by location.

Done when:

- single-location assumptions are removed or explicitly constrained;
- cross-location authority and custody are enforced;
- a new location can be activated and rolled back independently;
- outcome and support evidence is accepted.

Required evidence for R7: `POLICY`, `REPOSITORY`, `STAFF`, `MANAGER`, `PROVIDER`, `DEPLOYMENT`, `RECOVERY`, `OUTCOME` as applicable.

R7 release gate:

- M27–M31 required evidence is accepted for the intended enterprise scope;
- external or multi-location capabilities not yet proven remain inactive and honestly labeled;
- operational support and recovery ownership are active.

---

## 15. R8 — Operational Acceptance

### M32 — Controlled production pilot

**Status:** `PLANNED`  
**Recommended boundary:** Receipt, identity, custody, inspection, and recon handoff at one location.

Required preparation:

- named pilot staff and managers;
- approved policies and targets;
- role and authority configuration;
- representative scenarios;
- training and quick reference;
- support and defect triage;
- baseline and scorecard;
- monitoring;
- daily review rhythm;
- rollback procedure.

Done when:

- each received pilot vehicle is identifiable, locatable, owned, evidence backed, and routed;
- staff and manager usability is accepted;
- no unresolved P0 workflow, authorization, ownership, duplicate, evidence, or recovery defect remains;
- rollback remains available.

### M33 — Expanded cross-functional pilot

**Status:** `PLANNED`  
**Recommended boundary:** Receipt through recon, Parts, QC, and accepted Inventory handoff.

Done when:

- cross-functional ownership and handoffs remain intact;
- Parts and Shop readiness reduce premature starts;
- manager exception operations reduce manual chasing;
- quality and safety outcomes do not degrade;
- carryover and recovery pass representative cases.

### M34 — Full Inventory lifecycle pilot

**Status:** `PLANNED`  
**Recommended boundary:** Acquisition through frontline, retail completion, transfer, wholesale, or disposition.

Done when:

- end-to-end lineage is demonstrable;
- all applicable consequential decisions remain authorized;
- sequencer and automation outcomes meet the approved scorecard;
- provider and production failure cases are exercised;
- leadership accepts the operating model.

### M35 — Enterprise release acceptance

**Status:** `PLANNED`  
**Purpose:** Make the final decision on enterprise operational adoption.

Acceptance requires:

- no unresolved P0 safety, authority, ownership, evidence, audit, privacy, or recovery defect;
- all activated workflow and domain gates pass;
- staff training, support, and escalation ownership are operational;
- production monitoring and event lineage are active;
- accessibility and performance evidence is accepted;
- recovery and rollback exercises pass;
- policies, algorithms, and automation levels are approved and versioned;
- outcome scorecard demonstrates acceptable results;
- unsupported capabilities remain inactive and honestly labeled;
- multi-location scope is separately proven where included.

Required evidence: all applicable evidence classes.

R8 and program exit gate:

- M32–M35 are `ACCEPTED`;
- leadership signs the enterprise release record;
- continuous calibration and policy governance transition to named operational owners.

---

## 16. Recommended first vertical slice

The first implementation slice, after R0 and R1 approval, should be:

> Receipt, identity, custody, inspection, and recon handoff for one location.

This boundary establishes the downstream foundation:

- correct vehicle identity;
- correct physical location;
- explicit custody and keys;
- observed condition and evidence;
- accountable owner;
- safety and condition restrictions;
- inspection assignment and findings;
- clear next route;
- accepted recon handoff.

The first slice must include the shared work contract, staff execution packet, manager exceptions, blocker recovery, completion/handoff gates, audit events, tests, operational measurement, training, and rollback. It must not be implemented as an isolated screen.

## 17. Vertical-slice delivery template

Every future implementation authorization must define:

1. user and operating outcome;
2. bounded workflow start and end;
3. authoritative source facts;
4. accountable owner and participating roles;
5. capabilities, skills, authority, and separation of duties;
6. work contract fields;
7. hard gates and readiness;
8. staff commands and evidence;
9. manager decisions and exceptions;
10. domain commands and transitions;
11. events, audit, projections, and notifications;
12. concurrency, duplicate, and idempotency controls;
13. loading, empty, stale, conflict, unauthorized, rejected, retry, and recovery states;
14. automated tests;
15. staff and manager validation;
16. baseline and outcome measures;
17. activation, monitoring, pause, rollback, and support plan;
18. documentation and traceability updates.

A slice is not complete when only its interface, schema, API, or algorithm exists.

## 18. Program workstreams

The release sequence is supported by these continuing workstreams:

| Workstream | Responsibilities |
| --- | --- |
| Operating policy | Roles, authority, service, evidence, WIP, escalation, overrides, automation levels |
| Source authority and data | Domain ownership, freshness, confidence, reconciliation, baseline, metrics |
| Staff execution | Start Day, Current Work, Next Work, evidence, recovery, handoff, mobile usability |
| Manager control | Attention, approvals, blockers, capacity, rebalancing, day cadence |
| Domain workflows | Inventory, Shop, Parts, title, merchandising, quality, frontline, disposition |
| Optimization | Hard gates, readiness, urgency, sequencing, explanations, calibration |
| Governance and audit | Permissions, separation of duties, privacy, event history, overrides, policy publishing |
| Reliability and integration | Idempotency, concurrency, adapters, retry, recovery, deployment, observability |
| Adoption and outcomes | Training, pilot, staff validation, manager validation, scorecard, continuous improvement |

Workstreams may prepare in parallel, but activation follows the milestone dependency path.

## 19. Program scorecard

### 19.1 Staff simplicity

- time to identify current and next work;
- navigation and search burden;
- duplicate entry;
- update and evidence-capture time;
- clarity of owner, next action, due time, readiness, and done;
- mobile and workplace failure rate.

### 19.2 Flow

- ready-to-start delay;
- stage and end-to-end cycle time;
- active, waiting, blocked, and unexplained-idle time;
- WIP by person, bay, and stage;
- stage-target and promise attainment;
- first-pass handoff acceptance.

### 19.3 Accountability

- work with one accountable owner;
- acknowledgement time;
- work with a current next action and due time;
- blocker and approval response;
- handoff acceptance;
- carryover completeness;
- override frequency and reasons.

### 19.4 Quality

- evidence completeness;
- first-pass yield;
- QC failure;
- rework and comeback;
- Parts discrepancy and reconciliation;
- post-release suspension and correction.

### 19.5 Capital and operating outcome

- capital-days and carrying exposure;
- days to frontline;
- recon estimate variance;
- Parts expedite and emergency purchase exposure;
- aging and disposition-review population;
- outcome by comparable inventory class where authoritative.

### 19.6 Recommendation and automation quality

- eligibility accuracy;
- recommendation acceptance, decline, and override;
- recommendation stability;
- predicted versus actual completion, ETA, and cost where supported;
- downstream work unlocked;
- automation success, retry, failure, recovery, and correction;
- data-confidence coverage.

No individual composite productivity score, hidden monitoring measure, or autonomous disciplinary conclusion is permitted.

## 20. Pilot stop and rollback conditions

Pause the affected slice or automation when:

- a hard gate can be bypassed;
- work loses or duplicates ownership;
- authoritative facts are overwritten incorrectly;
- carryover duplicates or loses context;
- permission, location, amount, or separation-of-duties enforcement fails;
- unsafe or unauthorized recommendations reach execution;
- evidence or audit history is missing;
- staff cannot recover from a common error;
- provider failure is presented as success;
- the workflow creates material ambiguity or burden beyond baseline;
- privacy, security, or fairness guardrails are violated;
- rollback or manual fallback is unavailable.

Rollback must preserve all committed facts, events, evidence, and decisions. It must not delete or rewrite history to simulate a clean outcome.

## 21. Program risks and mitigations

| Risk | Consequence | Primary mitigation |
| --- | --- | --- |
| Building another task engine | Duplicate ownership and inconsistent status | M4 source-authority contract and reuse rule |
| Adding more navigation instead of execution | Staff searching and low adoption | My Work as primary frontline surface |
| Unapproved policy encoded as fact | Unsafe or unauthorized behavior | M0/M3 policy gates and fail-closed activation |
| Poor duration or capacity data | Incorrect scheduling | M2 baseline, confidence labels, shadow evaluation |
| Excess WIP | Congestion and slow completion | M11 one-active/one-staged control |
| Black-box prioritization | Low trust and unsafe decisions | Deterministic reasons, versions, alternatives, audit |
| Status-only completion | False readiness and downstream failure | M9 evidence and authoritative domain gates |
| Alert overload | Ignored exceptions | Actionable routing, digesting, acknowledgement targets |
| Manager bottleneck | Delayed approvals and staff waiting | Manager response metrics and authority design |
| Staff surveillance perception | Low trust and harmful use | Fairness rules and event-versus-monitoring boundary |
| Integration overreach | Stale or conflicting facts | M30 source authority, freshness, reconciliation |
| Premature enterprise rollout | Location-specific failure | M31 independent location proof |
| Automation without recovery | Silent state corruption | M24–M29 idempotency, compensation, rollback, restore |

## 22. Planning horizon

The roadmap is gate driven. Calendar estimates must be refined after M1 and M2 establish actual gaps, staffing, data quality, and pilot availability.

An initial planning range for a focused team is:

| Program segment | Planning range |
| --- | --- |
| R0–R1 policy, audit, baseline, and detailed design | 6–10 weeks |
| R2–R3 shared execution and first manager operating loop | 12–20 weeks |
| R4 optimization and shadow evaluation | 8–14 weeks plus representative shadow volume |
| R5 domain expansion | 4–8 months depending on approved breadth and external dependencies |
| R6 bounded automation | 2–4 months, overlapping stabilized domain rollout where safe |
| R7–R8 enterprise hardening and acceptance | 2–4 months |

The full program should be planned as approximately nine to fifteen months for a focused, adequately staffed effort, subject to M1/M2 recalibration. Initial operational value should arrive through the first vertical pilot substantially earlier.

These ranges are not delivery commitments.

## 23. Decisions required before implementation

1. Executive sponsor and Inventory EOS policy owner.
2. First pilot location, roles, workflow boundary, and operating calendar.
3. Role, duty, skill, certification, capability, and location model.
4. Financial authority, aggregation, delegation, and approval limits.
5. Mandatory separation-of-duties and independent-review points.
6. Service classes, warning, due, escalation, and next-check policies.
7. Blocker families and resolution owners.
8. Definitions of done and required evidence by pilot work type.
9. Authoritative sources, freshness, confidence, and conflict rules.
10. Reliable capacity and duration inputs.
11. WIP policy and permitted manager override.
12. Recommendation factors, urgency classes, and shadow acceptance criteria.
13. Allowed automation levels by action.
14. Pilot baseline, success, stop, and rollback criteria.
15. Mobile, scanning, camera, label, connectivity, key-control, and photo tools.
16. Evidence privacy, access, retention, and legal-hold policy.
17. Training, support, defect triage, deployment, and recovery ownership.

## 24. Implementation entry gate

No milestone or vertical slice may enter code implementation until it has:

- a named business owner and technical owner;
- an approved user and operating outcome;
- a bounded start and end state;
- authoritative source mapping;
- responsibility, authority, and separation-of-duties decisions;
- shared work contract mapping;
- hard gates and recovery behavior;
- definition of done and evidence requirements;
- event, audit, and notification requirements;
- honest failure and data-confidence states;
- test and operational-evidence plan;
- baseline and acceptance criteria;
- activation, monitoring, pause, rollback, and support plan;
- confirmation that the slice reuses Tasks and does not duplicate operational ownership;
- explicit implementation authorization recorded by the designated owners.

## 25. Program definition of done

Inventory EOS is completely implemented only when all of the following are true:

- R0–R8 applicable milestones are `ACCEPTED`;
- every activated workflow uses the shared work contract;
- every open action and dependency has one accountable owner;
- staff can execute from one simple daily loop;
- managers operate from a unified exception and approval loop;
- domain source authority and completion gates are enforced;
- hard gates and readiness precede sequencing;
- sequencing is deterministic, explained, versioned, measured, and reversible to manual operation;
- automation remains within approved authority and has tested recovery;
- accessibility, security, privacy, performance, deployment, and business-continuity evidence passes;
- end-to-end domain, task, evidence, command, event, handoff, and outcome lineage is demonstrable;
- pilot scorecards show acceptable results without degraded quality, safety, privacy, or staff usability;
- unsupported provider, hardware, policy, or location capabilities remain inactive and honestly labeled;
- training, support, monitoring, policy governance, and continuous calibration have named operational owners.

## 26. Relationship to existing program documents

This roadmap must be used with:

- [`INVENTORY_EXECUTION_OPERATING_SYSTEM.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM.md);
- [`INVENTORY_EXECUTION_OPERATING_SYSTEM_MVP_ADOPTION.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM_MVP_ADOPTION.md);
- [`INVENTORY_EXECUTION_VEHICLE_CARD_UI_SOURCE_OF_TRUTH.md`](INVENTORY_EXECUTION_VEHICLE_CARD_UI_SOURCE_OF_TRUTH.md);
- [`INVENTORY_OPTIMIZATION_ALGORITHMS.md`](INVENTORY_OPTIMIZATION_ALGORITHMS.md);
- [`INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md`](INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md);
- [`INVENTORY_CONSOLE_UI_SOURCE_OF_TRUTH.md`](INVENTORY_CONSOLE_UI_SOURCE_OF_TRUTH.md);
- [`INVENTORY_ENTERPRISE_ARCHITECTURE.md`](INVENTORY_ENTERPRISE_ARCHITECTURE.md);
- [`INVENTORY_ENTERPRISE_ROADMAP.md`](INVENTORY_ENTERPRISE_ROADMAP.md);
- [`frontline-workflow/STAFF_EXPERIENCE.md`](frontline-workflow/STAFF_EXPERIENCE.md);
- [`frontline-workflow/OPERATING_CONTROLS.md`](frontline-workflow/OPERATING_CONTROLS.md);
- [`../STAFF_EXECUTION_HANDOFF_ENGINE.md`](../STAFF_EXECUTION_HANDOFF_ENGINE.md);
- [`../TASKS_CONSOLE_UI_SOURCE_OF_TRUTH.md`](../TASKS_CONSOLE_UI_SOURCE_OF_TRUTH.md).

This roadmap governs Inventory EOS sequencing. Existing approved visual, authority, architecture, workflow, and implementation sources retain their scope unless explicitly superseded through approved versioned change control.

## 27. Roadmap approval

This roadmap was officially adopted on July 19, 2026. Its adoption authorizes detailed Phase 0 ownership, policy, audit, baseline, and immediate MVP preparation work only unless a later approval record explicitly states otherwise.

It does not authorize:

- application code;
- database or integration changes;
- production activation;
- policy limits or algorithm weights;
- autonomous consequential commands;
- employee-performance policy;
- physical-tool procurement;
- multi-location rollout.

Each requires its applicable milestone entry gate and accountable approval.
