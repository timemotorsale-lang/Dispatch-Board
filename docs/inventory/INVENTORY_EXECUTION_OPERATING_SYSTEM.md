# Inventory Execution Operating System

**Product:** Time Motor Sales Dispatch Board  
**Module:** Inventory Console Optimization  
**Strategy version:** `1.0.0`  
**Status:** Approved official Inventory Console optimization strategy  
**Date adopted:** July 19, 2026  
**Primary objective:** Maximize safe, accountable inventory flow by making the best eligible next action obvious and executable for every staff member  
**Implementation claim:** None. This document defines target operating behavior and sequencing for future implementation.  
**Official adoption record:** [`INVENTORY_EXECUTION_OPERATING_SYSTEM_OFFICIAL_ADOPTION.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM_OFFICIAL_ADOPTION.md)  
**Official vehicle cards:** [`INVENTORY_EXECUTION_VEHICLE_CARD_UI_SOURCE_OF_TRUTH.md`](INVENTORY_EXECUTION_VEHICLE_CARD_UI_SOURCE_OF_TRUTH.md)  
**Official Vehicle Execution Workbench:** [`INVENTORY_EXECUTION_VEHICLE_WORKBENCH_UI_SOURCE_OF_TRUTH.md`](INVENTORY_EXECUTION_VEHICLE_WORKBENCH_UI_SOURCE_OF_TRUTH.md)  
**Formal implementation roadmap:** [`INVENTORY_EXECUTION_OPERATING_SYSTEM_IMPLEMENTATION_ROADMAP.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM_IMPLEMENTATION_ROADMAP.md)  
**Immediate MVP adoption:** [`INVENTORY_EXECUTION_OPERATING_SYSTEM_MVP_ADOPTION.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM_MVP_ADOPTION.md)

---

## 1. Executive decision

The next phase of Inventory Console optimization will focus on execution simplicity rather than additional landing pages, navigation destinations, dashboards, or isolated task lists.

The Inventory Execution Operating System, abbreviated **Inventory EOS**, is the shared operating model that connects:

- authoritative inventory, Shop, Parts, title, merchandising, and disposition facts;
- deterministic and explainable inventory algorithms;
- the existing Tasks Console and My Tasks execution engine;
- role, duty, skill, location, capacity, authority, and separation-of-duties rules;
- evidence-backed completion and release gates;
- manager exception, approval, and rebalancing workflows;
- immutable events, handoffs, outcome measurement, and continuous calibration.

The intended staff experience is:

> Tell me what to do next, why it matters, when it is due, what I need, what done means, and who will help if I cannot proceed.

The intended manager experience is:

> Show me only the decisions, constraints, ownership gaps, capacity risks, and exceptions that require intervention.

Inventory EOS does not replace the Inventory Console, Tasks, Vehicle 360, Manager Review, Parts Operations, Shop execution, or governed lifecycle workspaces. It coordinates them into one operating loop.

## 2. Strategic outcomes

Inventory EOS is successful when it consistently produces these outcomes:

1. Every open unit of work has one accountable internal owner.
2. Staff spend less time searching for work, context, vehicles, parts, approvals, and instructions.
3. Ready work starts sooner and partially started work decreases.
4. Blockers reach the person able to resolve them without manual chasing.
5. Inventory, Shop, Parts, title, merchandising, and management operate from the same current facts.
6. Completion means the required operational outcome was verified, not merely that a status was changed.
7. Managers direct exceptions and capacity instead of manually redispatching ordinary work.
8. Inventory reaches frontline, sale, delivery, transfer, or disposition with less idle time and capital exposure.
9. Recommendations remain deterministic, explainable, auditable, and human-governed.
10. Productivity improves without surveillance, opaque employee scoring, or automatic discipline.

No software strategy can guarantee maximum productivity. Inventory EOS instead establishes the controls, feedback loops, and evidence required to pursue and verify continuous improvement safely.

## 3. Product boundaries

### 3.1 Inventory EOS is

- an execution and decision-coordination layer;
- a shared work contract across Inventory domains;
- a deterministic next-best-work sequencer;
- a manager exception and capacity operating model;
- an accountability and evidence framework;
- a measurement and calibration system;
- a progressive-automation framework with explicit authority limits.

### 3.2 Inventory EOS is not

- another primary navigation module;
- a second task engine;
- a replacement DMS, accounting system, CRM, or payroll system;
- an employee-surveillance or disciplinary system;
- a black-box AI dispatcher;
- a static KPI dashboard;
- a promise that unavailable external facts are live;
- authority to bypass safety, identity, custody, title, legal, financial, privacy, or quality controls.

### 3.3 Optimization freeze

Until the core execution loop is piloted and measured, the optimization program should not prioritize:

- additional landing pages or primary navigation items;
- duplicate work, review, approval, blocker, or exception queues;
- static KPI cards without an executable population behind them;
- additional saved-view variants that do not change an operating decision;
- individual task-count leaderboards;
- composite employee productivity scores;
- predictive or generative automation where deterministic rules are sufficient;
- automatic high-impact commitments, releases, purchases, pricing changes, or dispositions.

## 4. Governing principles

1. **One execution backbone.** Inventory-generated work uses the existing Tasks execution engine. Domain records remain authoritative for domain state.
2. **One accountable owner.** Every open action, dependency, blocker, approval, exception, and handoff has exactly one accountable internal owner.
3. **One clear next action.** A work item cannot be operationally healthy without a current next action and target.
4. **Eligibility before priority.** Safety, law, authority, skill, evidence, parts, bay, location, and dependency constraints decide whether work can proceed before scoring decides its order.
5. **Ready work over excess work-in-process.** The system should finish and unblock work before encouraging more starts.
6. **One active and one staged assignment.** Execution-heavy roles should normally have one active assignment and at most one verified-ready next assignment.
7. **Evidence over declaration.** Completion, quality, custody, release, and readiness require their applicable evidence and gates.
8. **Exceptions travel to authority.** Staff should not repeatedly chase managers or other departments for resolution.
9. **Explain every recommendation.** Staff and managers can see the facts, rules, reasons, confidence, alternatives, and required authority.
10. **Human authority remains explicit.** Consequential recommendations remain advisory until an authorized person issues a command.
11. **Report facts honestly.** Live, stale, missing, conflicting, estimated, calculated, and predicted values remain visibly distinct.
12. **Optimize flow, quality, and outcomes together.** Speed never averages away safety, legal, identity, title, custody, quality, or customer commitments.
13. **No blame automation.** A blocker, anomaly, low output, or declined recommendation creates operational review—not a character judgment.
14. **Audit without surveillance.** Record material work events and decisions, not keystrokes, screen activity, hidden inactivity, or continuous employee location.
15. **Calibrate with real operations.** Policy thresholds and algorithm weights remain versioned hypotheses until validated with dealership data and staff observation.

## 5. Operating architecture

```text
Authoritative domain facts
  InventoryUnit / Vehicle / Acquisition / Frontline / Retail Completion
  RepairOrder / RepairJob / QC
  Parts Demand / Stock / PO / Receipt / Reservation / Issue / Return
  Title / Merchandising / Pricing / Disposition / Integration facts
                         |
                         v
Eligibility and hard-gate evaluation
                         |
                         v
Urgency classification and next-best-work sequencing
                         |
                         v
Shared Inventory Work Contract
                         |
          +--------------+--------------+
          |                             |
          v                             v
Staff My Work                    Manager Control Loop
Current + staged work            Exceptions + approvals + capacity
          |                             |
          +--------------+--------------+
                         v
Evidence-backed command, completion, review, or handoff
                         |
                         v
Immutable events, projections, outcomes, and recalibration
```

### 5.1 Source-of-truth rule

- Domain records own vehicle, lifecycle, Shop, Parts, title, merchandising, financial, quality, and disposition facts.
- Tasks own assigned execution, checklist, updates, evidence requests, blocker context, due state, and review handoff.
- The event and audit layers own attributable decision history.
- Read models join these sources for staff and manager experiences.
- A task status alone never changes an authoritative domain fact.
- A domain transition may complete or supersede linked work only through an explicit, traceable rule.

### 5.2 Primary surfaces

| Surface | Inventory EOS purpose |
| --- | --- |
| Inventory Home | Manager start-of-day readiness, critical exceptions, approvals, flow, and routing |
| Inventory Lifecycle | Portfolio flow, stage constraints, aging, capital exposure, and intervention |
| Shop & Recon | Daily production, readiness, capacity, assignment, blockers, and completion risk |
| My Tasks / My Work | Primary frontline daily execution surface |
| Vehicle 360 / workbench | Complete asset context, evidence, linked work, history, and contextual commands |
| Manager Review | Unified consequential review and approval inbox |
| Parts Operations | Parts demand, source, receipt, reservation, issue, return, and exception execution |
| Control Tower | Detailed cross-domain lifecycle analysis and manager intervention |
| Activity / audit | Attributable material event and decision history |

Landing pages remain attention and routing surfaces. They must not become the staff member's required path for discovering ordinary daily work.

## 6. Shared Inventory Work Contract

Every Inventory EOS work item must satisfy a standard contract, regardless of originating domain.

### 6.1 Identity and context

- stable work identifier;
- work type and workflow domain;
- organization and location;
- inventory unit, vehicle, repair order, repair job, part demand, purchase order, customer, or other applicable subject;
- authoritative source references and freshness;
- current lifecycle stage and operating state;
- policy and algorithm versions used.

### 6.2 Responsibility

- one accountable owner;
- assigned executor, when different from the accountable owner;
- permitted collaborators;
- dependency owner;
- approval owner;
- escalation owner;
- required role, duty, capability, skill, certification, or independence.

An external provider, seller, carrier, vendor, title agency, or customer may be responsible for an external response, but an internal monitoring owner remains required.

### 6.3 Timing and service

- created time;
- ready-for-work time;
- accepted time;
- started time;
- last meaningful update;
- target time;
- warning time;
- escalation time;
- next-check time for waiting work;
- completed, verified, and closed times;
- clock class: active, approved waiting, blocked, review, or idle;
- service class and applicable calendar/timezone.

### 6.4 Execution direction

- outcome-oriented title;
- short purpose;
- exact next action;
- ordered steps or checklist only when necessary;
- required inputs, tools, parts, bay, documents, or vehicle access;
- eligibility and readiness state;
- definition of done;
- required evidence;
- downstream result that completion will unlock;
- recovery route if the action fails or facts conflict.

### 6.5 Priority and explanation

- urgency class;
- recommendation score or ordering factors where applicable;
- stable reason codes;
- plain-language explanation;
- expected time, cost, risk, or flow effect where supported;
- data confidence and missing inputs;
- eligible alternatives;
- excluded alternatives and reasons when useful;
- required approval or authority boundary.

### 6.6 Blocker and waiting contract

Blocked or waiting work requires:

- structured reason code;
- concise staff explanation;
- dependency or resolution owner;
- requested resolution action;
- affected promise, vehicle, work, or value;
- next-check time;
- escalation time;
- permitted substitute work for the executor;
- resume condition.

### 6.7 Completion and handoff

- completion evidence;
- completion gate result;
- review or approval state;
- verifier identity where required;
- unresolved exceptions;
- final domain command or transition;
- next accountable owner and action if work continues;
- immutable event references.

## 7. Standard work states

Inventory EOS uses a simple staff-facing state model while preserving richer domain states behind it.

```text
Planned
  -> Assigned
  -> Accepted
  -> In Progress
  -> Waiting | Blocked | Ready for Review
  -> Verified Complete
  -> Closed or Handed Off
```

### 7.1 State definitions

| State | Meaning | Required control |
| --- | --- | --- |
| Planned | Work is known but not yet released for assignment | Future readiness and dependency visibility |
| Assigned | One accountable owner has received eligible work | Owner, due time, next action, definition of done |
| Accepted | Owner acknowledges the work and its expectations | Accepted actor and timestamp |
| In Progress | Productive execution has begun | Start event and current executor |
| Waiting | Work cannot proceed until a named expected dependency occurs | Reason, dependency owner, next check, escalation |
| Blocked | An abnormal condition prevents safe or valid progress | Reason, impact, resolution owner, escalation |
| Ready for Review | Executor believes evidence and outcome satisfy the gate | Evidence packet and reviewer |
| Verified Complete | Applicable completion gate has passed | Verifier or deterministic gate evidence |
| Handed Off | Accountability moved to a named next owner | Handoff context, acceptance target, next action |
| Closed | No further operational action remains | Final outcome and immutable history |

Changing a task to Completed cannot by itself satisfy an Inventory, Shop, Parts, title, quality, merchandising, pricing, release, or disposition gate.

## 8. Daily execution loop

### 8.1 Start Day

The system prepares a role-aware plan before staff begin execution.

Staff see:

- their current responsibility checklist;
- carryover requiring attention;
- one proposed current assignment;
- one staged next assignment when fully ready;
- known blockers, approvals, parts, tools, bay, or access constraints;
- expected outcomes and due times;
- a simple acknowledgement and starting-blocker action.

Managers see:

- staff not yet acknowledged;
- absent or unavailable capability;
- unowned P0/P1 work;
- overloaded or under-covered roles;
- work without parts, approval, bay, or evidence readiness;
- recommended rebalancing requiring approval.

### 8.2 Execute Current Work

The Current Work card is the frontline focal point. It provides:

- subject identity and location;
- exact next action;
- reason and urgency;
- applicable procedure or checklist;
- required parts, tools, bay, authority, and evidence;
- due time and expected duration range;
- what completion unlocks;
- Start, Pause, Block, Waiting, Complete, and Request Help actions.

### 8.3 Record Progress

Staff should update through short structured commands, not narrative status reporting.

Permitted progress events include:

- accepted;
- started;
- checkpoint completed;
- evidence captured;
- paused with reason;
- waiting on named dependency;
- blocked;
- scope conflict reported;
- manager direction requested;
- ready for review;
- handoff proposed;
- completion submitted.

Free text supplements structured facts; it does not replace essential ownership, timing, reason, or evidence fields.

### 8.4 Receive Next Work

When current work completes or becomes legitimately unavailable, staff can request or receive Recommended Next Work.

The system must:

1. reevaluate current facts and permissions;
2. exclude ineligible or unready work;
3. protect the current assignment and its blocker context;
4. rank eligible work using the approved sequencer;
5. explain the recommendation;
6. allow claim, manager assignment, or reason-coded decline according to policy;
7. revalidate eligibility and version at acceptance time.

A declined recommendation is operating feedback, not a performance score.

### 8.5 Verify and Release

Completion invokes the applicable domain gate. Possible results are:

- verified complete;
- ready for independent review;
- returned for missing evidence;
- returned for correction or rework;
- held for approval;
- held for conflicting facts;
- contained for safety, identity, custody, title, or other hard-rule failure.

### 8.6 End-of-Day Handoff

The system drafts the handoff from current events and facts. Staff confirm or correct:

- what was completed;
- what remains active;
- blockers and waiting dependencies;
- current evidence;
- next action;
- next check or due time;
- tomorrow's accountable owner;
- items requiring manager action.

Carryover must preserve the same work identity, source references, owner, blocker, evidence, and next step without duplication.

## 9. Next-Best-Work Sequencer

The sequencer recommends the best eligible action at a point in time. It does not make irreversible business decisions.

### 9.1 Decision sequence

```text
Normalize facts
  -> validate freshness and sufficiency
  -> apply hard gates
  -> calculate readiness
  -> resolve eligible executors/resources
  -> classify urgency
  -> rank within class
  -> apply flow and WIP controls
  -> build explanation and alternatives
  -> require authority where applicable
  -> publish recommendation
```

### 9.2 Hard gates

The following conditions are eligibility controls and cannot be overcome by a high score:

- critical safety or roadworthiness restriction;
- identity or VIN conflict;
- invalid custody or vehicle-location confidence below policy;
- title, lien, required-original, disclosure, or legal stop;
- missing mandatory evidence;
- missing authorization or financial authority;
- prohibited separation-of-duties combination;
- missing required qualification or certification;
- unavailable required part, tool, bay, equipment, or vehicle;
- invalid workflow state or version conflict;
- privacy or field-access restriction;
- external facts too stale or insufficient for the proposed consequential action.

Hard-gated items produce resolution work for the correct owner rather than disappearing from the operating system.

### 9.3 Readiness model

Readiness is multidimensional:

- **work readiness:** prerequisite steps complete;
- **parts readiness:** required parts usable, reserved, and locatable;
- **authority readiness:** approvals and financial authority present;
- **resource readiness:** eligible person, bay, tool, equipment, and time available;
- **vehicle readiness:** vehicle present, accessible, correctly identified, and safe for the action;
- **evidence readiness:** required documents, observations, and source facts available;
- **handoff readiness:** upstream outcome and context accepted by the downstream owner.

An aggregate readiness percentage must not hide a failed mandatory dimension.

### 9.4 Urgency classes

| Class | Operational meaning | Examples |
| --- | --- | --- |
| P0 — Contain | Immediate hard-rule, safety, identity, custody, legal, or severe customer-impact condition | Safety hold, VIN conflict, lost custody, prohibited release |
| P1 — Recover | Overdue or imminent critical-path, promise, approval, quality, or flow failure | Failed QC, overdue title resolution, blocked customer promise |
| P2 — Unlock | Ready action with high downstream dependency-unlock value | Receive critical part, approve recon scope, perform gate inspection |
| P3 — Protect | Work that reduces capital, aging, margin, space, or market-position exposure | Aged inventory review, transfer evaluation, merchandising correction |
| P4 — Advance | Ready routine work that advances flow and uses available capacity well | Standard inspection, prepared detail, scheduled photo work |

### 9.5 Ranking factors

Weights must remain configurable, versioned, and unactivated until approved. Candidate factors include:

- critical ratio and remaining schedule buffer;
- stage-target breach and unexplained idle time;
- downstream work or vehicles unlocked;
- customer, frontline, sale, or delivery commitment risk;
- safety or quality recovery urgency after containment;
- capital-days and carrying-cost exposure;
- expected retail or wholesale opportunity cost;
- parts ETA and repair completion risk;
- data confidence and recommendation stability;
- skill and resource fit;
- workload balance;
- work continuity and context-switch avoidance;
- physical movement and setup cost;
- expected duration and available window;
- location bottleneck and bay congestion;
- likelihood that the action produces a verifiable outcome.

### 9.6 Critical-ratio scheduling

Where remaining duration and target time are sufficiently reliable:

```text
Critical Ratio = Working Time Remaining Until Target / Estimated Work Time Remaining
```

- below `1.0`: completion is at risk or late;
- near `1.0`: useful schedule buffer is exhausted;
- above `1.0`: schedule buffer remains.

Critical ratio is one ordering input. It never overrides hard gates, readiness, skill, Parts, safety, quality, or authority.

### 9.7 Work-in-process control

For execution-heavy roles and constrained resources:

- normally one active job per person or bay;
- at most one staged next job;
- a staged job requires verified prerequisites;
- excess active or staged work generates a rebalancing recommendation;
- missing prerequisites create resolution work rather than premature dispatch;
- managers may override WIP guidance with an attributable operational reason.

### 9.8 Recommendation envelope

Every material recommendation contains:

```text
recommendationId
subject and action
recommended owner/resource
urgency class
rank and major factors
reason codes and explanation
source facts and freshness
confidence and missing inputs
expected operational effect
eligible alternatives
excluded alternatives with reasons
required approval or authority
policy and algorithm versions
generatedAt and expiresAt
```

Recommendations must be recalculated after material state, ownership, availability, Parts, approval, evidence, or timing changes.

## 10. Blocker Resolution System

The Blocker Resolution System converts visible obstruction into owned resolution work.

### 10.1 Standard blocker families

- safety or condition concern;
- identity, VIN, or custody conflict;
- vehicle unavailable or location unknown;
- missing information or evidence;
- missing skill, staff, bay, tool, or equipment;
- waiting on Parts or vendor;
- waiting on manager or financial approval;
- title, document, lien, disclosure, or external authority;
- scope, cost, estimate, or authorization conflict;
- quality failure or rework;
- system, integration, or data problem;
- customer or external-party response;
- other documented operational condition.

### 10.2 Resolution behavior

When a blocker is recorded, Inventory EOS should:

1. preserve the blocked work and its accountable owner;
2. validate the blocker details;
3. identify the resolution owner and applicable SLA;
4. create or link resolution work without duplication;
5. calculate downstream impact;
6. recommend substitute ready work for the executor;
7. schedule a next check;
8. escalate when acknowledgement or resolution targets are missed;
9. resume or re-sequence affected work when the blocker clears;
10. retain complete event and reason history.

### 10.3 Escalation ladder

The standard escalation ladder is:

```text
Owner notification
  -> acknowledgement warning
  -> response target breached
  -> accountable manager
  -> cross-functional or financial authority
  -> executive / compliance / safety authority where applicable
```

Escalation follows the work condition and required authority. It is not public employee shaming.

## 11. Accountability and responsibility model

### 11.1 Responsibility types

| Responsibility | Definition |
| --- | --- |
| Accountable owner | Owns the operational outcome and ensures a next action always exists |
| Executor | Performs the current eligible action |
| Dependency owner | Supplies the prerequisite or resolves the wait |
| Reviewer | Evaluates evidence or quality independently where required |
| Approver | Exercises configured authority for the consequential decision |
| Escalation owner | Intervenes when service or risk boundaries are breached |
| Policy owner | Owns effective workflow, timing, evidence, and authority rules |

One person may hold multiple roles only where policy and separation-of-duties controls allow it.

### 11.2 Staff accountability

Staff are accountable for:

- acknowledging assigned work;
- following the current authorized instruction;
- maintaining truthful status;
- recording blockers and conflicts promptly;
- capturing required evidence;
- protecting vehicle, keys, Parts, documents, and customer information;
- requesting approval or help before exceeding authority;
- confirming handoff context.

Staff are not accountable for:

- delays owned by an unresponsive manager, vendor, provider, customer, or other dependency after correct escalation;
- work for which prerequisites, authority, skills, tools, or safe conditions are absent;
- inaccurate system facts they reported through the approved conflict process.

### 11.3 Manager accountability

Managers are accountable for:

- ensuring P0/P1 work and dependencies have owners;
- responding within approval and escalation targets;
- correcting workload and capability imbalances;
- maintaining clear priorities and definitions of done;
- resolving policy ambiguity;
- preventing excessive WIP and premature dispatch;
- reviewing evidence and overrides responsibly;
- confirming day-end ownership and carryover;
- using metrics to improve the system rather than automate blame.

### 11.4 Override controls

Every override records:

- actor and authority;
- time and scope;
- prior rule or recommendation;
- final action;
- operational reason;
- evidence;
- expiration or review time where applicable;
- downstream effects.

Overrides cannot bypass non-waivable safety, identity, custody, legal, mandatory title/document, privacy, or critical quality controls.

## 12. Role-based toolkits

### 12.1 Tools for every frontline role

- mobile-first My Work;
- one Current Work card and one staged next item;
- fast structured progress commands;
- exact definition of done;
- concise stage-specific checklist;
- required evidence capture;
- camera, document, barcode, VIN, stock, RO, and part scanning support;
- voice-to-note where operationally appropriate;
- resilient upload with pending and failed states;
- direct Vehicle 360 context;
- visible dependency, Parts, approval, and readiness state;
- `Information is wrong`, `Need help`, and `Need manager direction` recovery actions;
- automatic handoff draft.

### 12.2 Inventory and lot staff

- receipt, identity, condition, keys, accessory, and custody capture;
- vehicle movement and destination instructions;
- physical-location verification;
- inspection and next-stage routing;
- title/document request visibility;
- photo, detail, merchandising, and frontline placement readiness;
- exception containment and evidence capture.

### 12.3 Shop and recon staff

- eligible assignment and bay context;
- procedure, inspection, and repair checklist;
- Parts-kitted and authorization visibility;
- scope and estimate context;
- measurement, photo, and completion evidence;
- pause, scope-change, safety, and rework actions;
- QC routing and repair-history context.

### 12.4 Parts staff

- demand queue ranked by downstream impact;
- barcode-supported source, receive, inspect, bin, reserve, issue, install, return, and reconcile actions;
- affected vehicles, repair jobs, and promise times;
- substitute, transfer-before-purchase, and vendor alternatives;
- ETA and reliability context;
- discrepancy, core, warranty, return, and credit recovery queues;
- purchase authority and approval visibility.

### 12.5 Title, office, and document staff

- context-specific requirement packet;
- original-document custody controls;
- source, receipt, verification, acceptance, rejection, and correction history;
- external filing and dependency tracking;
- missing/conflicting document queue;
- final readiness review with independent authority where required.

### 12.6 Merchandising and pricing staff

- verified vehicle facts;
- approved photo and content requirements;
- media capture and review state;
- pricing recommendation with evidence and authority limits;
- channel publication and reconciliation state;
- listing exception and correction queue;
- frontline package readiness preview.

### 12.7 Quality and release staff

- applicable quality template and measurements;
- independence and qualification validation;
- safety, peer-verification, and road-test requirements;
- pass, fail, rework, containment, and supersession commands;
- complete evidence packet;
- operational release separate from final frontline release.

### 12.8 Manager toolkit

- start-of-day readiness and coverage view;
- unowned and unacknowledged work;
- unified approval and review inbox;
- blocker acknowledgement and aging;
- capacity, skill, bay, and Parts constraints;
- recommended assignment and rebalancing;
- WIP limit exceptions;
- stage bottleneck and forecast risk;
- capital, carrying-cost, and aging exposure;
- quality, rework, and comeback signals;
- data freshness and integration exceptions;
- reason-coded override and policy controls;
- end-of-day handoff and carryover review.

### 12.9 Physical enablement

Operational deployment should assess:

- durable mobile devices or shared scanning stations;
- barcode and QR scanners;
- label printers;
- controlled key tagging and storage;
- reliable Shop, office, and lot connectivity;
- standard photo area, lighting, and background;
- charging locations and protective equipment;
- bay or team status displays only where they reduce coordination effort.

Physical-tool acquisition remains a dealership decision and must be validated during pilot planning.

## 13. Manager Control Loop

### 13.1 Start-of-day review

The manager should be able to complete the operating review in approximately ten minutes once policy and data are mature:

1. review P0/P1 exceptions;
2. confirm absences and capability gaps;
3. review proposed current and staged assignments;
4. resolve unowned work;
5. confirm constrained bays, tools, Parts, approvals, and vehicles;
6. approve or adjust the plan;
7. release staff plans for acknowledgement.

### 13.2 Continuous exception management

Managers should be interrupted only for actionable conditions such as:

- P0 containment;
- work not acknowledged within target;
- predicted critical-ratio breach;
- blocker without resolution ownership;
- approval nearing or exceeding target;
- Parts ETA threatening a promise;
- scope, cost, identity, evidence, or source conflict;
- failed quality or release gate;
- excess active/staged WIP;
- capability, bay, or capacity shortage;
- stale data that makes a consequential recommendation unsafe.

### 13.3 Midday recalibration

At a configured operating checkpoint, Inventory EOS should refresh:

- expected completion;
- current bottlenecks;
- Parts and approval readiness;
- staffing and bay availability;
- P1 recovery plan;
- rebalancing recommendations;
- work likely to carry over.

### 13.4 Day-end control

Managers review:

- unresolved P0/P1 work;
- handoffs awaiting acceptance;
- carryover without a next owner or action;
- incomplete evidence or review;
- tomorrow's capability, Parts, bay, and appointment constraints;
- operating exceptions requiring policy or leadership follow-up.

## 14. Automation ladder

Inventory EOS introduces automation progressively according to risk, data confidence, and authority.

| Level | Behavior | Examples |
| --- | --- | --- |
| A0 — Observe | Display authoritative facts and explicit gaps | Current stage, owner, age, Parts readiness |
| A1 — Explain | Calculate and explain risk or readiness | Stage delay, critical ratio, missing gate |
| A2 — Recommend | Propose an eligible action, owner, or alternative | Next work, transfer-before-purchase, rebalancing |
| A3 — Prepare | Assemble a draft task, packet, command, or approval | Draft recon approval packet, handoff, PO request |
| A4 — Execute reversible routine action | Perform approved low-risk action with receipt and recovery | Create task, notify owner, schedule next check |
| A5 — Execute consequential action | Reserved for explicitly approved, bounded authority | Future only; still prohibited for non-waivable and human-decision controls |

### 14.1 Automation requirements

Before advancing an action to a higher automation level, the program must prove:

- authoritative and sufficiently fresh inputs;
- deterministic policy and bounded scope;
- valid permission and authority;
- idempotency and concurrency safety;
- preview or consequence explanation where appropriate;
- immutable event and outcome receipt;
- error visibility and retry behavior;
- recovery, reversal, or compensation path;
- pilot acceptance and policy-owner approval.

### 14.2 Actions that remain human-governed

At minimum, human authorization remains required for:

- purchases and financial commitments;
- recon scope and material scope changes;
- price and floor exceptions;
- public content claims and channel activation;
- substitutions, transfers, adjustments, and inventory write-downs;
- disposition and wholesale decisions;
- critical exception acceptance where legally permitted;
- quality, operational release, and frontline release where policy requires independence;
- suspension reversal and reinstatement;
- policy publication and consequential authority changes.

## 15. Measurement system

Metrics evaluate system flow and operating outcomes. They do not independently determine employee discipline.

### 15.1 Flow and speed

- days from acquisition to frontline;
- stage cycle time by comparable work class;
- ready-to-start time;
- active, approved-waiting, blocked, and unexplained-idle time;
- work-in-process by role, bay, and stage;
- throughput by verified lifecycle outcome;
- first-pass handoff acceptance;
- percentage within stage and promise target.

### 15.2 Ownership and accountability

- percentage of work with one accountable owner;
- assignment acknowledgement time;
- percentage with current next action and due time;
- blocker acknowledgement and resolution time;
- approval response time;
- carryover with owner, blocker context, and next action;
- handoff acceptance time;
- override count and reason distribution.

### 15.3 Quality and completion

- completion rejected for missing evidence;
- first-pass yield;
- QC failure and rework rate;
- comeback rate under an approved definition;
- Parts discrepancy and reconciliation rate;
- post-release suspension and correction rate;
- completion-to-verification time.

### 15.4 Inventory and financial outcomes

- capital-days exposed;
- carrying-cost exposure;
- recon estimate variance;
- Parts expedite and emergency purchase cost;
- aging distribution and disposition-review population;
- gross and turn outcomes by comparable inventory class where authoritative;
- avoidable movement, transfer, and setup time.

### 15.5 Recommendation quality

- recommendation acceptance, decline, and override rates;
- decline and override reason distribution;
- recommendation stability after material updates;
- predicted versus actual completion;
- predicted versus actual cost or ETA where supported;
- downstream work unlocked;
- outcome improvement compared with the pre-pilot baseline;
- data-confidence coverage.

### 15.6 Staff usability

- time required to identify the next action;
- update and evidence-capture time;
- unnecessary questions or duplicate entry reported;
- percentage of authoritative facts prefilled;
- staff-reported clarity of expected outcome and definition of done;
- mobile, connectivity, scanning, and evidence failure rates;
- manager time spent manually chasing status.

### 15.7 Technician metrics guardrail

Where reliable time and labor-guide data exist, productivity, efficiency, proficiency, and quality-adjusted proficiency must remain distinct. Like-for-like work classes, approved non-productive time, data confidence, and quality outcomes are required context. No single metric may autonomously rank or discipline staff.

## 16. Data and confidence requirements

Inventory EOS must report for every material fact or recommendation:

- source system or user observation;
- authoritative, calculated, estimated, predicted, or proposed classification;
- observed or calculated time;
- freshness threshold;
- confidence or sufficiency state;
- missing or conflicting inputs;
- applicable policy and algorithm version.

### 16.1 Fail-honest behavior

- Missing data produces a visible missing-input action.
- Stale data may reduce confidence, narrow options, or stop consequential recommendations.
- Conflicting data produces resolution work.
- Provider unavailability does not silently reuse expired facts.
- Estimated duration, capacity, cost, ETA, or market values are never labeled as observed facts.
- A mockup or fixture value is never presented as operational data.

## 17. Notification and attention policy

Notifications must be actionable and routed to a responsible person.

### 17.1 Notify when

- a person receives accountable work;
- acknowledgement or response is required;
- a warning, due, escalation, or hard gate occurs;
- an approval or independent review is ready;
- a blocker or dependency is assigned;
- facts materially change a current recommendation;
- work becomes ready to resume;
- a handoff requires acceptance;
- an automated action fails or requires recovery.

### 17.2 Do not notify when

- no action is available to the recipient;
- the event is already represented by a higher-priority active exception;
- a dashboard refresh alone is sufficient;
- the message merely repeats an unchanged state;
- the notification would expose unauthorized facts.

Use digesting and escalation rather than repeated alerts for the same unresolved condition.

## 18. Governance and fairness

### 18.1 Policy governance

The following are organization-scoped, versioned, effective-dated, and auditable:

- service classes and timing rules;
- evidence and completion gates;
- role, capability, skill, and independence requirements;
- financial limits and approval paths;
- blocker and escalation rules;
- algorithm factors and weights;
- readiness thresholds;
- WIP limits;
- notification rules;
- automation levels;
- override boundaries;
- metric definitions and reporting windows.

Consequential changes require a named policy owner and four-eyes publication where appropriate.

### 18.2 Fairness and privacy rules

- Do not use protected traits or irrelevant private information.
- Do not infer misconduct from an anomaly.
- Do not infer employee inactivity from browser, keyboard, or screen behavior.
- Do not penalize accurate blocker reporting.
- Allow correction of missing or misleading operational context.
- Compare performance only across appropriately comparable work classes and conditions.
- Provide human review for material personnel conclusions outside Inventory EOS.
- Retain only the evidence required for operating, safety, legal, quality, financial, or audit purposes.

## 19. Adoption strategy

### Phase 0 — Policy and baseline

**Goal:** Establish the approved operating rules before implementation.

Required outputs:

- named service and policy owners;
- role/capability/skill/authority matrix;
- one-owner and separation-of-duties rules;
- work-state and handoff definitions;
- initial service classes and escalation ladder;
- representative definitions of done and evidence packets;
- baseline workflow, cycle-time, blocker, approval, quality, and data-confidence measurements;
- pilot location, roles, work classes, and success criteria.

**Exit gate:** Dealership leadership approves a bounded pilot operating policy. Unapproved numeric thresholds remain inactive.

### Phase 1 — Unified work contract

**Goal:** Make all selected pilot work understandable and executable through one contract.

Required outcomes:

- domain-to-task source authority is defined;
- every pilot work item has owner, due time, next action, readiness, definition of done, and evidence;
- blocker and waiting states create owned resolution paths;
- completion invokes the correct domain gate;
- no duplicate task engine or parallel ownership record is introduced.

**Exit gate:** Representative end-to-end cases remain traceable from domain fact through task, evidence, command, event, and projection.

### Phase 2 — Staff execution loop

**Goal:** Prove Start Day, Current Work, Next Work, recovery, verification, and handoff with pilot staff.

Required outcomes:

- role-aware daily plan;
- one current and one staged ready assignment;
- fast mobile progress and blocker capture;
- Recommended Next Work with explanation;
- verified completion and manager review;
- duplicate-safe carryover.

**Exit gate:** Staff confirm the loop reduces searching and ambiguity without adding unreasonable reporting burden.

### Phase 3 — Manager exception loop

**Goal:** Replace manual status chasing with owned attention and decision queues.

Required outcomes:

- unowned, unacknowledged, blocked, waiting, at-risk, approval, and handoff populations;
- capacity, skill, bay, Parts, and authority constraints;
- escalation acknowledgement and resolution tracking;
- safe rebalancing recommendations;
- start, midday, and end-of-day operating cadence.

**Exit gate:** Managers confirm that exception management reduces manual redispatch and follow-up effort.

### Phase 4 — Deterministic optimization

**Goal:** Introduce the governed eligibility, readiness, urgency, ranking, and explanation sequencer.

Required outcomes:

- approved hard gates;
- versioned readiness model;
- urgency classes;
- ranked eligible work;
- critical-ratio support only where duration data is reliable;
- recommendation receipt, decline, override, and outcome measurement;
- recalculation on material events.

**Exit gate:** Offline and shadow evaluation demonstrates safe, stable recommendations that improve agreed operating outcomes.

### Phase 5 — Bounded automation

**Goal:** Automate repetitive low-risk coordination after deterministic behavior is proven.

Candidate automation:

- task preparation and assignment within approved rules;
- blocker resolution task routing;
- next-check scheduling;
- safe notifications and escalation;
- handoff drafts;
- readiness reevaluation;
- low-risk recovery preparation.

**Exit gate:** Every automation has idempotency, authorization, event receipt, failure visibility, and tested recovery.

### Phase 6 — Enterprise expansion

**Goal:** Expand only after pilot evidence supports scale.

Expansion considerations:

- additional locations and calendars;
- cross-location capacity and transfer recommendations;
- validated external adapters;
- advanced forecasting or mathematical scheduling;
- enterprise reporting and policy administration;
- physical-tool deployment at scale.

**Exit gate:** Multi-location authority, data ownership, privacy, support, deployment, and recovery evidence is approved.

## 20. Pilot design

### 20.1 Recommended scope

Start with one location and a bounded cross-functional flow that is valuable but observable:

- Inventory receipt and inspection;
- inventory recon planning and execution;
- Parts demand and readiness;
- QC and Inventory handoff;
- merchandising/frontline readiness;
- manager approvals and blocker resolution.

### 20.2 Representative pilot roles

- Inventory Manager;
- inventory/lot executor;
- Shop Manager;
- technician or recon executor;
- Parts Manager or counter executor;
- quality reviewer;
- title/office or merchandising participant where included;
- General/Operations Manager as escalation and policy owner.

### 20.3 Pilot evidence

Collect:

- pre-pilot baseline;
- task and domain event history;
- recommendation and override outcomes;
- cycle, wait, blocker, approval, and verification timing;
- missing, stale, and conflicting data;
- staff comprehension and burden feedback;
- manager intervention time;
- quality, rework, and missed-promise outcomes;
- daily defects and recovery actions.

### 20.4 Pilot stop conditions

Pause or roll back when:

- a hard gate can be bypassed;
- work loses or duplicates ownership;
- authoritative facts are overwritten incorrectly;
- carryover duplicates or loses context;
- permission or separation-of-duties enforcement fails;
- unsafe recommendations reach execution;
- evidence or audit history is missing;
- staff cannot recover from common mistakes;
- the workflow creates greater ambiguity or material burden than the baseline;
- privacy or fairness guardrails are violated.

## 21. Strategy scorecard

Inventory EOS should be evaluated as a balanced system.

| Dimension | Desired movement | Guardrail |
| --- | --- | --- |
| Staff simplicity | Fewer decisions, searches, duplicate entries, and status-chasing steps | Do not hide recovery or necessary alternatives |
| Flow | Shorter ready-to-start, stage, and end-to-end cycle time | Do not increase unsafe WIP |
| Accountability | More work with one owner, current next action, and timely handoff | Do not convert audit into surveillance |
| Quality | Higher first-pass yield and evidence completeness | Do not reward speed that increases rework |
| Customer/frontline promises | Higher on-time completion and availability | Do not bypass safety, title, or quality gates |
| Capital | Lower capital-days and avoidable carrying exposure | Do not force uneconomic or unauthorized decisions |
| Management effort | Less manual assignment, chasing, and reconciliation | Preserve explicit human authority |
| Recommendation quality | Higher useful acceptance and outcome improvement | Keep confidence, reasons, and alternatives visible |
| Data integrity | Higher authoritative coverage and freshness | Fail honestly when data is missing or stale |

## 22. Required decisions before implementation planning

The following decisions must be approved or explicitly assigned before code work begins:

1. Who is the Inventory EOS policy owner?
2. Which location and roles form the first pilot?
3. Which workflow slice will be the first implementation boundary?
4. What is the approved role, capability, skill, and financial-authority matrix?
5. Where is independent review mandatory?
6. What are the initial service classes, calendars, warning times, due targets, and escalation paths?
7. Which blocker reasons and resolution owners apply to the pilot?
8. What evidence proves completion for each pilot work type?
9. Which data sources are authoritative, and what freshness makes them safe to use?
10. Which current capacity and duration facts are reliable enough for scheduling?
11. Which actions may be recommended, prepared, or automatically executed in the pilot?
12. What baseline and pilot measures determine success, correction, or rollback?
13. What mobile, scanning, connectivity, label, key-control, and photo tools are available?
14. What retention, privacy, and field-access policy applies to captured evidence?

## 23. Implementation entry gate

No Inventory EOS implementation slice is authorized merely by this strategy document.

A proposed slice is ready for implementation planning only when it has:

- a named business owner;
- a bounded user and workflow outcome;
- authoritative source mapping;
- approved responsibility and authority rules;
- work contract fields;
- hard gates and recovery behavior;
- definition of done and evidence requirements;
- event and audit requirements;
- honest loading, empty, stale, conflict, unavailable, unauthorized, and retry states;
- measurable baseline and acceptance criteria;
- pilot and rollback plan;
- confirmation that it reuses the existing Tasks engine and does not create duplicate operational ownership.

## 24. Relationship to existing source material

Inventory EOS coordinates and does not silently supersede the following approved or proposed sources:

- [`INVENTORY_EXECUTION_VEHICLE_CARD_UI_SOURCE_OF_TRUTH.md`](INVENTORY_EXECUTION_VEHICLE_CARD_UI_SOURCE_OF_TRUTH.md) governs the approved compact and expanded Vehicle Lifecycle Card family.
- [`INVENTORY_EXECUTION_OPERATING_SYSTEM_MVP_ADOPTION.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM_MVP_ADOPTION.md) defines the bounded no-code operating model that may be adopted before the full enterprise implementation.
- [`INVENTORY_EXECUTION_OPERATING_SYSTEM_IMPLEMENTATION_ROADMAP.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM_IMPLEMENTATION_ROADMAP.md) defines the formal gated implementation sequence, evidence model, pilots, and enterprise acceptance criteria for this strategy.
- [`INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md`](INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md) governs approved Inventory landing-page composition and routing.
- [`INVENTORY_CONSOLE_UI_SOURCE_OF_TRUTH.md`](INVENTORY_CONSOLE_UI_SOURCE_OF_TRUTH.md) governs the detailed Control Tower operating model.
- [`INVENTORY_OPTIMIZATION_ALGORITHMS.md`](INVENTORY_OPTIMIZATION_ALGORITHMS.md) defines the broader deterministic inventory algorithm catalog.
- [`frontline-workflow/STAFF_EXPERIENCE.md`](frontline-workflow/STAFF_EXPERIENCE.md) defines staff decision and task experience principles.
- [`frontline-workflow/OPERATING_CONTROLS.md`](frontline-workflow/OPERATING_CONTROLS.md) defines proposed authority, evidence, timing, and separation-of-duties controls pending dealership approval.
- [`../STAFF_EXECUTION_HANDOFF_ENGINE.md`](../STAFF_EXECUTION_HANDOFF_ENGINE.md) defines the existing cross-domain staff execution and handoff architecture that Inventory EOS reuses.
- [`../TASKS_CONSOLE_UI_SOURCE_OF_TRUTH.md`](../TASKS_CONSOLE_UI_SOURCE_OF_TRUTH.md) governs Tasks Console presentation where applicable.
- [`INVENTORY_ENTERPRISE_ARCHITECTURE.md`](INVENTORY_ENTERPRISE_ARCHITECTURE.md) and [`INVENTORY_ENTERPRISE_ROADMAP.md`](INVENTORY_ENTERPRISE_ROADMAP.md) govern the broader Inventory enterprise program.

If a future Inventory EOS decision conflicts with an approved source of truth, the conflict must be recorded, approved, and resolved through versioned change control before implementation.

## 25. Strategy adoption and continuing authorization boundary

This strategy was officially adopted on July 19, 2026 as the governing basis for Inventory Console optimization. Its adoption authorizes Phase 0 ownership, audit, baseline, policy-planning, and immediate MVP preparation under the official adoption record.

Strategy adoption does not approve:

- code implementation;
- production activation;
- numeric service targets;
- financial authority limits;
- algorithm weights;
- autonomous consequential actions;
- employee performance policy;
- external integrations or physical-tool purchases.

Those decisions require their own accountable approvals and evidence.
