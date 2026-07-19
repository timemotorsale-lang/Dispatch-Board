# Inventory Start Workflow Orchestrator Product Specification

**Product:** Time Motor Sales Dispatch Board  
**Program:** Inventory Console Optimization  
**Capability:** Start Workflow / Inventory Workflow Orchestrator  
**Document version:** `0.9.0`  
**Status:** Proposed final product specification for review and approval  
**Date prepared:** July 19, 2026  
**Governing strategy:** [`INVENTORY_EXECUTION_OPERATING_SYSTEM.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM.md)  
**Existing launcher contract:** [`INVENTORY_CONSOLE_WORKFLOW_LAUNCHER_UX_CONTRACT.md`](INVENTORY_CONSOLE_WORKFLOW_LAUNCHER_UX_CONTRACT.md)  
**Algorithm catalog:** [`INVENTORY_OPTIMIZATION_ALGORITHMS.md`](INVENTORY_OPTIMIZATION_ALGORITHMS.md)  
**Official Vehicle Workbench:** [`INVENTORY_EXECUTION_VEHICLE_WORKBENCH_UI_SOURCE_OF_TRUTH.md`](INVENTORY_EXECUTION_VEHICLE_WORKBENCH_UI_SOURCE_OF_TRUTH.md)  
**Implementation claim:** None. This document defines a proposed product and operating contract. It does not authorize code, workflow activation, automatic vehicle movement, policy thresholds, financial authority, employee policy, integrations, pilot, or production rollout.

**Approved implemented exception:** The bounded Add Vehicle vertical slice is independently approved and governed by [`INVENTORY_START_WORKFLOW_ADD_VEHICLE_UI_SOURCE_OF_TRUTH.md`](INVENTORY_START_WORKFLOW_ADD_VEHICLE_UI_SOURCE_OF_TRUTH.md). That approval does not adopt or activate the complete Orchestrator specification.

---

## 1. Executive decision

`Start Workflow` will be designed as an intelligent, role-aware Inventory Workflow Orchestrator. It will convert an authorized human request or a verified operational trigger into the best eligible workflow, ask only unresolved stage-relevant questions, explain the recommendation and alternatives, preview exact consequences, and launch accountable work through authoritative domain and task commands.

The intended experience is:

```text
Human request or verified trigger
  -> resolve vehicle and lifecycle context
  -> evaluate data sufficiency and freshness
  -> apply eligibility and hard rules
  -> determine allowed lifecycle transitions
  -> rank valid workflow options
  -> ask only unresolved questions
  -> prepare work, owner, time, evidence, and approvals
  -> preview exact consequences
  -> confirm, request approval, or execute approved routine automation
  -> monitor time, dependencies, outcome, and next trigger
  -> reevaluate after every material event
```

The Orchestrator does not create a second task engine, duplicate domain records, or allow algorithm scores to override safety, law, authority, evidence, accounting, title, quality, or lifecycle gates.

## 2. Product placement and terminology

### 2.1 Official product label

The staff-facing control is `+ Start Workflow`. The full interaction surface is the `Start Workflow` launcher. The underlying capability is the `Inventory Workflow Orchestrator`.

Internal algorithm, event, model, state-machine, and command names must not replace staff-language workflow titles.

### 2.2 Placement decision

`+ Start Workflow` remains a prominent Inventory Console control and may open a full-screen workspace, modal, drawer, or mobile sheet according to device and task complexity. It is not a permanent global navigation destination or a catalog-style tab.

The launcher is available from:

- Inventory Console global action;
- selected Vehicle Lifecycle Card;
- Vehicle Execution Workbench;
- My Work or task detail;
- Inventory exception;
- work order, repair line, or Shop assignment;
- Parts requirement or allocation;
- approval or manager review;
- authorized search result;
- system-generated recommendation requiring confirmation.

When launched contextually, the vehicle and source record remain selected. Staff must not re-enter facts already available from authoritative sources.

## 3. Objectives

The Orchestrator must:

1. make the best eligible next workflow obvious;
2. reduce staff decisions to the smallest safe set;
3. use lifecycle state, readiness, constraint, time, capacity, Parts, capital, and evidence logic;
4. generate complete accountable work packets;
5. automate reversible routine coordination where explicitly approved;
6. preserve human control over consequential decisions;
7. prevent duplicate, premature, unauthorized, or context-free work;
8. control lifecycle movement through verified completion and handoff gates;
9. expose why a recommendation is made and why alternatives are unavailable;
10. continuously reevaluate after triggers, outcomes, delays, and exceptions.

## 4. Non-objectives

The Orchestrator is not:

- a generic form catalog;
- an unrestricted `Create Task` replacement;
- a manual lifecycle-stage editor;
- a drag-and-drop vehicle movement control;
- an autonomous purchasing, pricing, release, title, wholesale, or disposition authority;
- an opaque employee-ranking or discipline mechanism;
- a chat prompt that converts uncontrolled free text directly into consequential actions;
- proof that planned integrations or workflows are currently available.

## 5. Launcher experience

### 5.1 Context header

When vehicle context exists, the launcher displays:

- vehicle image and identity;
- stock/inventory number and VIN;
- current lifecycle stage and operating state;
- location and freshness;
- accountable owner and current executor;
- stage age and target;
- active work order or primary domain record;
- controlling blocker or dependency;
- source conflicts or missing authoritative context.

### 5.2 Recommended workflow

The primary recommendation displays:

- staff-language workflow title;
- expected outcome;
- why it is recommended now;
- eligibility and readiness state;
- confidence and missing inputs;
- expected intake and execution time;
- recommended owner or claim route;
- evidence and approval requirement;
- automation level;
- policy and algorithm versions in authorized details.

### 5.3 Alternatives

Only valid and operationally useful alternatives are shown. Each alternative explains its consequence, tradeoff, and authority requirement.

An unavailable action may remain visible when its explanation helps recovery. Example:

> `Start Quality Control — Unavailable`  
> Repair completion evidence and Parts disposition are not complete.

### 5.4 Progressive questions

The launcher asks only questions that cannot be answered safely from authoritative current data. It favors:

- confirm-known-fact controls;
- yes/no choices;
- single-select reason codes;
- multi-select work choices;
- structured quantities and dates;
- evidence capture;
- short explanations only when required by an exception or material decision.

Target interaction budgets are:

| Interaction | Target |
| --- | --- |
| Confirm a prepared eligible workflow | 5–15 seconds |
| Routine workflow intake | 20–45 seconds |
| Exception or approval routing | 1–2 minutes |
| Complex acquisition or governed financial intake | Only the time genuinely required by policy and evidence |

These budgets are product-quality targets, not employee standards.

### 5.5 Consequence preview

Before a consequential command, `What will happen` displays:

- records created or changed;
- tasks created, updated, cancelled, or kept open;
- owner, executor, reviewer, and due time;
- evidence and acknowledgement required;
- approval created or consumed;
- Parts reservation, allocation, order, return, or reconciliation effect;
- lifecycle or operating-state effect;
- notifications and escalations;
- effects that remain pending;
- recovery or compensation path.

Final commands use workflow-specific verbs. Generic `Submit`, `Update Status`, and `Update Stage` are prohibited for consequential actions.

## 6. Trigger architecture

### 6.1 Trigger classes

| Trigger class | Examples |
| --- | --- |
| Human | Start Workflow, manager decision, technician exception, approval request |
| Lifecycle | acquired, received, inspection complete, repair complete, QC result, title cleared, merchandising complete, frontline release |
| Time | stage warning, target missed, approval overdue, missed Part ETA, inactivity, aging threshold |
| Operational | location change, bay available, qualified technician available, evidence received, Parts readiness changed, vendor response |
| Exception | VIN mismatch, safety finding, incomplete repair, further diagnosis, Parts discrepancy, authorization exceeded, source conflict |
| Integration | authoritative provider event, reconciliation result, outbox failure, stale or unavailable source |

### 6.2 Trigger envelope

Every trigger must include or resolve:

- trigger type and stable code;
- source and source event identifier;
- subject type and identifier;
- organization and location;
- occurred time and received time;
- actor or system identity;
- correlation identifier;
- source version and freshness;
- permitted before/after context;
- deduplication or idempotency key.

### 6.3 Trigger controls

The Orchestrator must:

- deduplicate equivalent active conditions;
- correlate related events to one workflow condition;
- suppress alert storms through cooldown and unchanged-state rules;
- resolve recommendations automatically when authoritative state clears the condition;
- prevent late or out-of-order events from silently reversing state;
- quarantine untrusted or contradictory triggers;
- show system-triggered work distinctly from human commands.

A trigger initiates evaluation. It does not itself prove authority or completion.

## 7. Standard decision architecture

Every workflow evaluation follows this order:

1. **Data sufficiency:** required facts exist and are current enough.
2. **Eligibility:** remove actions invalid for the subject, actor, stage, location, skill, or record state.
3. **Hard rules:** enforce safety, compliance, title, accounting, authorization, customer, and non-waivable controls.
4. **State machine:** identify allowed operating and lifecycle commands.
5. **Scoring or optimization:** rank the remaining valid actions.
6. **Human control:** confirm, modify, approve, return, reject, or override where policy permits.
7. **Execution:** issue authoritative commands and create linked work.
8. **Outcome capture:** retain actual results for calibration and governance.

A high score cannot override a hard rule.

## 8. Decision envelope and explainability

Every material recommendation retains:

```text
decisionType
algorithmVersion
policyVersion
subjectType and subjectId
evaluatedAt
eligible
score or recommended value
priority or risk band
recommendedActionCode
recommendedOwner or destination
dueAt or expectedCompletionRange
reasonCodes
humanExplanation
confidence
missingInputs
hardRuleCode
managerReviewRequired
inputFingerprint
```

Identical normalized inputs and versions must produce identical deterministic results. Explanations are assembled from approved factors and reason codes. Missing critical inputs lower confidence or stop the recommendation.

## 9. Optimization engines used by Start Workflow

The Orchestrator consumes governed outputs from:

- Data Confidence and Freshness Engine;
- Inventory Lifecycle Age Engine;
- Blocker Severity Engine;
- Inventory Next-Best-Action Engine;
- Ownership and Work Routing Engine;
- Task Generation Engine;
- SLA, Alert, and Escalation Engine;
- Expected Completion Engine;
- Carrying Cost and Capital Exposure Engine;
- Reconditioning Priority Engine;
- Critical Ratio Scheduling;
- Bay, Skill, and Work Assignment Optimizer;
- Frontline Readiness Score;
- Lot Location and Movement Control;
- Parts ETA and Repair-Risk Engine;
- Reservation and Allocation Engine;
- Core, Return, and Warranty Recovery Engine;
- Outcome and Calibration Engine.

The Orchestrator displays staff-language outcomes and explanations, not raw internal model names. Authorized technical details remain inspectable.

## 10. Next-best-workflow logic

Eligibility and hard rules run before planning priority. The initial planning model may consider:

- urgency;
- revenue or cost release;
- downstream work unlocked;
- customer or delivery impact;
- confidence of benefit;
- work readiness;
- effort efficiency;
- safety and compliance priority;
- stage age and critical ratio;
- capital exposure and margin at risk;
- Parts, bay, skill, evidence, and approval readiness.

Weights and thresholds are organization-scoped, versioned hypotheses until approved and calibrated. The system must show the principal reasons for the recommendation and capture accepted, rejected, expired, or overridden outcomes.

## 11. Stage-specific question model

| Lifecycle context | Questions asked only when unresolved |
| --- | --- |
| Acquisition | ownership condition, acquisition source, identity confidence, location, authority, evidence, purchase or appraisal exception |
| Receipt | physical presence, identity match, custody, keys, odometer, visible damage, safety, document receipt |
| Inspection | safety findings, condition, measurements, evidence, recon need, next owner |
| Recon planning | approved findings, scope, estimated time and cost, Shop readiness, Parts need, authorization |
| Diagnosis | tests performed, observation, additional time, operability, evidence, recommended next step |
| Repair | work performed, outcome, Parts used or disposition, additional finding, verification, QC readiness |
| Parts | demand, repair line, quantity, stock or order source, reservation, ETA, substitution, issue, install, return |
| QC | required checks, evidence, road-test rule, pass, rework, release restriction |
| Title | document completeness, identity match, lien or exception, responsible authority |
| Merchandising | media, description, pricing decision, disclosure, publication readiness |
| Frontline | physical, mechanical, title, merchandising, price, location, key, and release readiness |
| Aging/disposition | market position, lead activity, carrying exposure, alternatives, transfer, price review, wholesale or hold decision |

Free-text keywords do not decide ownership lane, lifecycle eligibility, safety condition, purchase authority, or vehicle movement.

## 12. Workflow catalog and availability

The detailed phase-one workflow catalog and purpose-built intake specifications remain in [`INVENTORY_CONSOLE_WORKFLOW_LAUNCHER_UX_CONTRACT.md`](INVENTORY_CONSOLE_WORKFLOW_LAUNCHER_UX_CONTRACT.md).

Workflow availability states are:

| State | Meaning |
| --- | --- |
| Available | Applicable command foundation and rollout may permit execution |
| Context required | Eligible only after a valid subject is selected |
| Approval gated | Proposal can be prepared but another authority must decide |
| Planned | Approved design direction without activation authority |
| Unavailable | Actor, state, source, policy, integration, or hard rule prevents execution |

Eligible recommendations appear before catalog browsing. Context-only commands do not become permanent global tiles.

## 13. Workflow launch packet

Every launched workflow produces or updates an accountable work packet containing:

- exact action and intended outcome;
- why it matters;
- vehicle and authoritative source record;
- owner, executor, reviewer, and collaborators;
- location, resource, bay, skill, or tool requirement;
- start target, due time, estimated duration, and checkpoint rules;
- readiness and dependencies;
- definition of done;
- required and optional evidence;
- Parts requirements and disposition rules;
- approval and separation-of-duties requirements;
- blocker, help, exception, and recovery route;
- expected downstream handoff;
- policy, template, and algorithm versions.

Tasks remain the shared execution-assignment backbone. Domain records remain authoritative for lifecycle, repair, Parts, approval, title, merchandising, release, and financial facts.

## 14. Inventory movement control

Vehicle lifecycle movement is permitted only when:

```text
eligible authoritative command
+ verified required work
+ required evidence
+ resolved or formally governed exceptions
+ identified downstream owner
+ accepted handoff when required
= permitted lifecycle transition
```

Dragging a card, editing a field, changing physical location, starting a task, or reaching a target time does not independently prove a lifecycle transition.

Physical movement and lifecycle movement are separate commands. Each records actor or system identity, previous and new state, location where relevant, evidence, reason, policy/version, timestamp, created work, and recovery route.

Approved reversible routine transitions may later execute automatically only at the authorized automation level. Consequential and non-waivable transitions remain human governed.

## 15. Task time model

### 15.1 Time dimensions

Every timed work-order operation or execution task distinguishes:

- planned or standard work time;
- authorized diagnostic time;
- scheduled window;
- assigned and accepted time;
- actual start and completion;
- active hands-on time;
- paused time;
- blocker or dependency waiting time;
- approved non-productive time;
- unclassified delay;
- total elapsed cycle time.

Active time, waiting time, and total elapsed time must never be presented as interchangeable.

### 15.2 Time session commands

The Vehicle Execution Workbench provides context-sensitive:

- `Accept Work`;
- `Start Work`;
- `Pause`;
- `Resume`;
- `Report Blocker`;
- `Request More Time`;
- outcome-specific completion or exception command.

The authoritative task or work-order operation owns the time session. The Workbench does not create a duplicate clock.

### 15.3 Pause classification

One-tap pause reasons include:

- waiting for Parts;
- waiting for approval;
- vehicle unavailable;
- bay or equipment unavailable;
- further diagnosis required;
- safety stop;
- manager-requested pause;
- assisting assigned work;
- break or approved non-productive time;
- other.

`Other` requires a brief explanation. A resolved dependency prompts or safely prepares resume; it does not fabricate active labor time.

## 16. Time checkpoints and overrun prevention

Initial configurable checkpoints may be:

| Time consumed | Behavior |
| --- | --- |
| 70% | Quiet approaching-time indicator |
| 90% | Ask whether work is on track, blocked, needs help, or needs more time |
| 100% | Require a brief outcome checkpoint before material continuation |
| 125% | Notify the Shop manager and recommend intervention or replanning |
| Extended unexplained inactivity | Ask whether work is active, paused, blocked, or complete |

These thresholds are proposed starting policies, not universal constants or employee quotas.

At the authorized-time checkpoint, the technician chooses:

- finishing now;
- additional time required;
- further diagnosis required;
- waiting for Parts;
- waiting for approval;
- assistance required;
- unable to complete.

Additional time requests capture requested duration, reason, expected outcome, operability, evidence when required, and authorization impact. The system must not auto-complete work, force an unsafe shortcut, or treat elapsed time alone as misconduct.

## 17. Manager time intervention

Managers receive an exception with context, not a punitive timer alert. The review includes:

- work performed;
- active versus waiting time;
- planned and authorized time;
- technician explanation;
- evidence and measurements;
- Parts and resource readiness;
- downstream schedule effect;
- recommended alternatives.

Manager decisions include:

- approve additional time;
- provide assistance;
- reassign;
- convert to further diagnosis;
- return for clarification;
- pause for authorization;
- send to vendor;
- replan downstream work.

The manager supplies staff-facing direction, confirms the structured Next Task Preview, and uses a precise command such as `Approve Time & Continue Work` or `Publish Plan & Launch Next Task`.

## 18. Automation ladder

| Level | Behavior | Start Workflow use |
| --- | --- | --- |
| A0 — Observe | Display authoritative state and gaps | Show trigger and missing facts |
| A1 — Explain | Explain risk, readiness, age, or delay | Explain why workflow is needed |
| A2 — Recommend | Propose eligible action and alternatives | Recommend one workflow |
| A3 — Prepare | Prefill packet, task, approval, owner, and time | One-action human confirmation |
| A4 — Execute reversible routine action | Execute approved low-risk coordination with receipt and recovery | Create task, notify owner, schedule check |
| A5 — Execute consequential action | Reserved for separately approved bounded authority | Not authorized by this specification |

Examples of candidate A4 actions after separate approval and validation include:

- create inspection work after a clean verified receipt;
- create an owned exception from a failed gate;
- recalculate priority after a blocker clears;
- prepare QC after repair completion evidence is accepted;
- notify Parts of an eligible demand;
- launch a manager-approved next task;
- schedule an escalation checkpoint.

Human authorization remains required for purchases and financial commitments, material recon scope, safety overrides, price or floor exceptions, public content claims, release, substitutions or adjustments where governed, title exceptions, transfer, wholesale, disposition, and policy exceptions.

## 19. Automation activation requirements

No workflow advances to a higher automation level until it proves:

- authoritative and sufficiently fresh inputs;
- deterministic policy and bounded scope;
- permission and authority enforcement;
- state-machine eligibility;
- concurrency and idempotency safety;
- consequence explanation;
- immutable command, event, audit, and outcome receipt;
- visible error, retry, pending, and conflict behavior;
- reversal, compensation, or recovery path;
- tabletop and scenario acceptance;
- shadow-mode results;
- pilot-owner and policy-owner approval;
- monitored activation and tested rollback.

Algorithm weights must not self-modify in production. Calibration changes require analysis, approval, versioning, simulation, test, and monitored rollout.

## 20. Role and authority model

The launcher is role-aware but the client never grants authority. Server-side commands reevaluate:

- actor capability and location scope;
- current subject state and version;
- workflow eligibility;
- amount and cumulative exposure;
- skill or qualification;
- separation of duties;
- evidence and policy requirements;
- rollout and automation level;
- idempotency and duplicate state.

Users may see why a workflow is unavailable without receiving restricted facts. Requesters cannot self-approve where independence is required.

## 21. Records, tasks, events, and receipts

Successful execution shows:

- plain-language result;
- created or changed record identifiers;
- tasks and owners;
- approval state;
- next action and target;
- lifecycle effect;
- pending effects;
- links to the record, created work, Vehicle 360, and event history.

Every material action records actor or system identity, subject, workflow and command, reason, correlation identifier, policy and algorithm version, occurred time, accepted time, outcome, and permitted before/after state.

Duplicate-safe retries return the original result rather than creating duplicate work.

## 22. States, failure, and recovery

The launcher and resulting workflows support:

- loading;
- no eligible workflow;
- live and fresh;
- draft saved;
- missing required information;
- stale, partial, conflicting, or unavailable source;
- insufficient confidence;
- unauthorized;
- approval required;
- hard rule failed;
- concurrent version conflict;
- accepted and projection pending;
- duplicate-safe success;
- partial downstream failure;
- integration unavailable;
- retry, resume, compensation, or manager recovery.

Drafts preserve entered work but do not reserve authority, move the vehicle, create authoritative tasks, or emit completion events.

## 23. Accountability and responsible use

The system makes work ownership and elapsed flow visible while avoiding surveillance-oriented design.

Required controls include:

- one accountable owner for each open action, blocker, dependency, approval, and handoff;
- one active and at most one verified-ready staged job per technician as a flow-control target;
- evidence-backed completion;
- reason capture for material overrides or declined recommendations;
- no opaque individual score, public ranking, automatic discipline, or inference of misconduct from time alone;
- comparison of like-for-like work classes when operational metrics are reviewed;
- distinction between staff-controlled active work and external waiting conditions;
- operational review and assistance before personnel conclusions.

## 24. Management configuration

Authorized configuration includes:

- workflow availability by role and location;
- trigger thresholds and cooldowns;
- workflow templates and versions;
- eligibility and evidence rules;
- default owner and claim routes;
- time standards, checkpoint thresholds, and grace rules;
- approval limits and independence;
- escalation paths;
- algorithm weights and reason codes;
- automation level by workflow;
- disabled, simulation, shadow, pilot, limited-active, and active modes;
- rollback and stop conditions.

Configuration changes are versioned, attributable, testable, and auditable.

## 25. Operating metrics

Measure whether the Orchestrator improves safe flow:

- eligible-workflow recommendation rate;
- recommendation acceptance, modification, override, and expiry;
- time from trigger to owned work;
- intake completion time and abandonment;
- duplicate work prevented;
- stage cycle and active versus waiting time;
- unclassified delay;
- first-pass completion and QC yield;
- blocker response and resolution time;
- approval response time;
- Parts readiness, ETA reliability, and return reconciliation;
- handoff acceptance time;
- overdue and overrun intervention rate;
- workflow recovery and rollback success;
- data-confidence distribution;
- outcome improvement by algorithm and policy version.

Metrics are operating and product signals. Employee-performance use requires separate policy, validation, context, access, and human review.

## 26. Accessibility and floor use

- Keyboard and assistive-technology completion is required.
- State uses text and iconography in addition to color.
- Touch targets support tablet and shop-floor use.
- Questions use plain language.
- Errors link to the exact unresolved requirement.
- Evidence shows uploading, failed, retrying, quarantined, and complete states.
- Drafts survive recoverable navigation and network interruption.
- Mobile prioritizes vehicle, current action, required questions, blocker/evidence, consequence, and final command.
- Voice-to-text may supplement optional or required explanations but does not bypass structured confirmation.

## 27. Acceptance scenarios

1. A selected received vehicle opens Start Workflow with `Start Inspection` recommended and identity already populated.
2. A VIN mismatch blocks the clean inspection workflow and prepares an owned receipt exception without advancing the vehicle.
3. A clean receipt creates one inspection task and does not duplicate it after a retry or repeated trigger.
4. An inspection finding recommends Inventory Recon and explains evidence, Parts, authorization, and Shop implications.
5. An ineligible QC workflow remains unavailable with the exact missing completion evidence.
6. A technician reaches the time checkpoint and records `Further diagnosis required` in less than one minute.
7. Waiting-for-Parts time is separated from active technician time and resolves through an owned Parts condition.
8. A material time extension routes to manager review with work, evidence, Parts, and downstream schedule context.
9. A manager publishes direction and a structured next task; the work order remains open and the technician must acknowledge it.
10. One bulk purchase order allocates Parts separately to each vehicle and repair line.
11. A high priority score cannot bypass a safety, title, authority, evidence, or lifecycle hard stop.
12. A stale or conflicting source stops or lowers confidence without losing staff-entered observations.
13. An approval request preserves the proposal and prevents requester self-approval where independence is required.
14. A system trigger and a human request for the same active condition resolve to one owned workflow.
15. An accepted command with delayed projection displays pending state and recovery rather than false completion.
16. A manager override records reason, decision version, actual task, and later outcome for calibration.
17. A planned or disabled workflow is visible as such and cannot execute.
18. Every successful launch shows exact records, tasks, owners, events, next action, and lifecycle effect.

## 28. Approval decisions requested

Approval of this document confirms:

1. `Start Workflow` is a prominent intelligent launcher, not a generic form catalog or permanent global tab.
2. The launcher may expand into a full execution workspace when complexity requires it.
3. Context and authoritative facts are prefilled; staff answer only unresolved questions.
4. Data sufficiency, eligibility, hard rules, and lifecycle state precede optimization.
5. The Orchestrator recommends one best eligible workflow and explains alternatives.
6. Triggers initiate evaluation but do not independently grant authority or prove completion.
7. Tasks remain the shared execution backbone and domain records remain authoritative.
8. Lifecycle movement occurs only through eligible commands, verified gates, evidence, ownership, and handoff.
9. The approved automation ladder and human-governed boundaries apply.
10. Task time distinguishes active, waiting, paused, unclassified, and total elapsed time.
11. Technician time checkpoints request brief operational updates rather than forcing unsafe completion.
12. Material extensions and incomplete work route through manager decision and structured next-task launch.
13. Timing and optimization metrics are not autonomous employee-discipline tools.
14. Detailed phase-one forms remain governed by the existing Workflow Launcher UX Contract.
15. No code, activation, policy threshold, financial authority, or rollout is authorized by document approval alone.

## 29. Proposed adoption effect

If approved, this document becomes the official product source of truth for Start Workflow orchestration, trigger evaluation, algorithm integration, progressive questioning, workflow launch packets, task-time controls, lifecycle-movement boundaries, automation levels, and manager intervention.

Approval would authorize:

- detailed no-code field and state contracts;
- formal mockup design and review;
- mapping current capabilities and gaps;
- implementation roadmap integration;
- simulation, test-case, and pilot planning under separate gates.

Approval would not authorize:

- application code or database changes;
- workflow, trigger, algorithm, or automation activation;
- automatic vehicle movement;
- external integrations or credentials;
- policy weights, time limits, financial thresholds, or employee policy;
- production pilot or enterprise rollout.

## 30. Change control

After adoption, material changes to placement, trigger classes, decision order, eligibility, workflow consequences, automation level, time classification, checkpoint behavior, movement gates, authority boundaries, employee-use constraints, or records/tasks/events effects require explicit product approval and a versioned update.
