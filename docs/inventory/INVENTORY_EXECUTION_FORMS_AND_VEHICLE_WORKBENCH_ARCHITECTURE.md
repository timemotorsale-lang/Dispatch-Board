# Inventory Execution Forms and Vehicle Workbench Architecture

**Product:** Time Motor Sales Dispatch Board  
**Program:** Inventory Console Optimization  
**Document version:** `1.0.0`  
**Status:** Partially adopted architecture; Vehicle Lifecycle Card and Vehicle Execution Workbench are official, remaining form catalog awaits separate adoption  
**Date prepared:** July 19, 2026  
**Governing strategy:** [`INVENTORY_EXECUTION_OPERATING_SYSTEM.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM.md)  
**Immediate MVP:** [`INVENTORY_EXECUTION_OPERATING_SYSTEM_MVP_ADOPTION.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM_MVP_ADOPTION.md)  
**Implementation claim:** None. This document records the adopted card and Workbench architecture plus proposed remaining form, evidence, task, and tool details; it does not claim implementation.
**Approved vehicle-card source:** [`INVENTORY_EXECUTION_VEHICLE_CARD_UI_SOURCE_OF_TRUTH.md`](INVENTORY_EXECUTION_VEHICLE_CARD_UI_SOURCE_OF_TRUTH.md). The vehicle-card family is official; form definitions not expressly adopted remain proposed.
**Approved Workbench source:** [`INVENTORY_EXECUTION_VEHICLE_WORKBENCH_UI_SOURCE_OF_TRUTH.md`](INVENTORY_EXECUTION_VEHICLE_WORKBENCH_UI_SOURCE_OF_TRUTH.md). The Workbench visual and execution contract is official; form definitions not expressly adopted remain proposed.

---

## 1. Architecture decision

Inventory execution will use one connected experience:

```text
My Work or Inventory operating queue
  -> canonical Vehicle Lifecycle Card
  -> Vehicle 360 in Execution Workbench mode
  -> one eligible Current Action
  -> contextual digital form and tools
  -> authoritative domain command
  -> evidence, task, event, and handoff effects
  -> refreshed vehicle projection and next action
```

The core decisions are:

1. The Vehicle Lifecycle Card is the compact, persistent operating projection for one InventoryUnit/Vehicle.
2. Vehicle 360 remains the canonical full vehicle record, evidence, relationship, and history projection.
3. The Vehicle Execution Workbench is a focused execution mode within the canonical vehicle context; it is not a second vehicle record.
4. My Work remains the staff member's queue and launch point. Staff do not browse a catalog of forms.
5. Tasks remain the execution-assignment backbone. Domain records remain authoritative for domain facts and lifecycle commands.
6. A contextual form is presented because a current action is eligible; selecting a generic form does not create authority.
7. Forms issue explicit domain or task commands. They are not unrestricted record editors.
8. Evidence is captured once, governed centrally, and linked to every authorized work, decision, and domain record that needs it.
9. Vehicle lifecycle movement follows accepted commands and gates. Dragging or editing a card does not independently change authoritative state.
10. Staff normally see one Current Work action and at most one verified-ready staged action. Other linked work remains visible without competing for attention.

This architecture is designed to make the vehicle—not the form, task list, or landing page—the persistent operational context for vehicle-centered work.

## 2. What was corrected before finalization

The earlier form catalog correctly identified the most important transactions, but it did not explicitly establish the vehicle card and workbench as the execution container.

This document corrects that omission and adds the following required safeguards:

- separation between Vehicle 360 record context and focused execution mode;
- separation between a Vehicle Lifecycle Card and a task card;
- explicit task-to-vehicle and command-to-domain authority;
- draft versus committed fact boundaries;
- evidence reuse rather than duplicate uploads;
- command eligibility, permission, separation-of-duties, version, and idempotency controls;
- concurrent-update and pending-projection behavior;
- offline limitations for consequential commands;
- form definition, template, and policy versioning;
- field-level access and privacy;
- one-current/one-staged attention control without incorrectly limiting valid parallel vehicle work;
- form completion-time budgets and burden measurement;
- navigation and return-context preservation.

## 3. Experience hierarchy

### 3.1 My Work — staff queue

My Work answers:

- What do I own now?
- What should I do next?
- What is blocked, waiting, due, or ready for review?

My Work should show task/work cards and launch vehicle-centered assignments directly into the corresponding Vehicle Execution Workbench context.

My Work is not the canonical vehicle record. It may summarize vehicle identity, stage, next action, due time, readiness, and blocker state from the vehicle projection.

### 3.2 Vehicle Lifecycle Card — operating projection

The Vehicle Lifecycle Card answers:

- Which vehicle is this?
- Where is it?
- What stage and operating state is it in?
- Who owns its current outcome?
- What is the current controlling action?
- What is preventing progress?
- When is the next action due?
- What can the current user do?

The card appears consistently in permitted Inventory lifecycle, Shop/recon, exception, approval, saved-view, and search populations.

### 3.3 Vehicle 360 — canonical record context

Vehicle 360 answers:

- What are the complete current and historical facts about this vehicle?
- What Inventory, Shop, Parts, appointment, task, evidence, decision, cost, customer, and audit records are related?
- Which information may this user view?

Vehicle 360 remains a permission-filtered projection. It does not duplicate authoritative domain records.

### 3.4 Vehicle Execution Workbench — focused action context

The workbench answers:

- What must I do for this vehicle right now?
- Why is this action eligible and important?
- What must be ready before I act?
- What evidence and authority are required?
- What will happen after I submit?
- What should I do if facts conflict or work cannot proceed?

The workbench uses Vehicle 360 identity, evidence, relationships, and history while prioritizing one contextual execution action.

### 3.5 Task Workbench — generic task and case context

The existing Task Workbench remains appropriate for:

- non-vehicle tasks;
- cross-domain concern packages;
- multi-step case resolution;
- task-specific collaborators, comments, approvals, and activity;
- work whose canonical subject is not a single vehicle.

For vehicle-centered work, the Task Workbench links to the Vehicle Execution Workbench and vice versa. Neither creates a second copy of the task or vehicle.

### 3.6 Manager Control Tower — portfolio and exception context

Managers use Inventory Home, Lifecycle, Shop & Recon, Control Tower, and Manager Review to:

- scan flow and exceptions;
- select a Vehicle Lifecycle Card;
- inspect the selected-asset command rail;
- open the Vehicle Execution Workbench when detailed action is required;
- return to the originating location, filter, stage, selection, saved view, and operating cutoff.

## 4. Canonical identity and source authority

### 4.1 Canonical identifiers

The architecture must preserve stable references for:

- Vehicle;
- InventoryUnit;
- current vehicle projection;
- work/task;
- workflow or case;
- repair order and repair job;
- Parts demand, purchase order, receipt, reservation, issue, return, and reconciliation;
- evidence object and evidence link;
- review or approval;
- command, domain event, audit event, and projection version.

The Vehicle Lifecycle Card must be keyed to the correct canonical vehicle/inventory identity. A task reference, VIN string, or UI row is not a substitute for that identity.

### 4.2 Authority rules

- Vehicle and InventoryUnit sources own canonical identity and inventory ownership facts.
- Inventory lifecycle domains own acquisition, custody, location, stage, state, title, merchandising, pricing, frontline, retail completion, and disposition facts within their approved boundaries.
- Shop domains own repair orders, jobs, execution, and operational repair completion.
- Parts domains own demand, quantity, custody, procurement, receipt, reservation, issue, installation reference, return, and reconciliation facts.
- Evidence governance owns evidence metadata, content access, retention, legal hold, version, scanning, and immutable evidence events.
- Tasks own assigned execution, checklist, due time, updates, blocker context, completion readiness, and review handoff.
- Reviews and approvals own attributable decisions and authority evidence.
- Events and audit own material action history.
- Cards and workbenches are projections and command surfaces; they do not own duplicated business facts.

### 4.3 No dual-write by the interface

A form submission must not independently edit several client-side records to simulate a completed workflow.

The accepted command owns its transaction or orchestrated effects. Those effects may include:

- authoritative domain transition;
- task creation, update, completion, or supersession;
- approval or review creation;
- evidence link;
- event and audit record;
- notification/outbox work;
- projection refresh.

If effects complete asynchronously, the workbench displays an accepted/pending state until authoritative projection confirmation arrives.

## 5. Vehicle Lifecycle Card contract

### 5.1 Card identity

The compact card displays:

- vehicle image or approved placeholder;
- stock/inventory number;
- VIN last six;
- year, make, model, and trim where authoritative;
- current physical location and confidence;
- dealership-owned/customer-owned context where applicable.

### 5.2 Flow state

- current lifecycle stage;
- operating state;
- time in current stage;
- target or due time;
- P0–P4 urgency class or approved service class;
- healthy, watch, at risk, overdue, blocked, waiting, review, or restricted text state;
- data freshness/confidence where material.

Color may reinforce state but never communicates it alone.

### 5.3 Accountability

- accountable vehicle/workflow owner;
- current executor;
- next expected owner where known;
- dependency/approval owner when constrained;
- unresolved ownership warning.

### 5.4 Execution summary

- current controlling work title;
- exact next action;
- due time;
- staged next action, if verified ready;
- completion-readiness summary;
- required review or approval;
- count of other active linked work where authorized.

### 5.5 Readiness summary

Use a concise set of role- and stage-relevant dimensions such as:

- identity/custody;
- inspection;
- authorization;
- Parts;
- resource/bay/tool;
- repair;
- quality;
- title/documents;
- merchandising/pricing;
- frontline release.

Each applicable dimension is `READY`, `NOT_READY`, `BLOCKED`, `WAITING`, `UNKNOWN`, `STALE`, or `NOT_APPLICABLE`. A mandatory failure cannot be hidden by an aggregate percentage.

### 5.6 Constraints

The card exposes the highest controlling constraint:

- hard stop;
- active blocker;
- waiting dependency;
- missing evidence;
- approval/review required;
- data conflict or stale source;
- safety or movement restriction;
- command accepted but projection pending.

Additional constraints are available in the workbench.

### 5.7 Primary action

The card's primary action is contextual and specific, for example:

- `Verify Receipt`;
- `Complete Inspection`;
- `Review Recon Plan`;
- `Start Authorized Repair`;
- `Receive Required Parts`;
- `Perform QC`;
- `Resolve Title Hold`;
- `Complete Merchandising`;
- `Review Frontline Release`;
- `Resolve Blocker`;
- `Open Workbench` when no direct low-friction action is appropriate.

The card must not show a command the actor cannot execute. Where understanding helps recovery, an ineligible action may remain visible as unavailable with an explanation and an authorized request/escalation route.

### 5.8 Card density

The card is for scanning, selection, and routing. It must not contain:

- full financial history;
- every task;
- complete evidence;
- full event history;
- every readiness dimension;
- all policy explanations;
- all possible commands.

Those belong in the workbench or authorized manager context.

## 6. Selecting current and staged work

### 6.1 Staff attention rule

For each staff member:

- normally one Current Work assignment;
- at most one staged Next Work assignment;
- other eligible work remains in My Work or manager queues;
- blocked Current Work remains owned while substitute work is assigned;
- completion, block, wait, reassignment, material state change, or manager command triggers reevaluation.

### 6.2 Vehicle parallel-work rule

One vehicle may have more than one linked active task only when:

- the domain workflow permits parallel execution;
- the work does not compete for the same vehicle access, bay, document, evidence, or authoritative transition;
- dependencies are explicit;
- each task has one owner;
- the workbench identifies the current controlling path and other active work;
- completion of one task cannot incorrectly close or advance another.

Therefore, one-current/one-staged is primarily a staff attention and constrained-resource rule, not an absolute rule that a vehicle can have only one active task.

### 6.3 Controlling action

The card and workbench show the action that currently controls meaningful progress. Selection follows:

1. hard-stop containment;
2. P1 recovery;
3. ready critical-path or dependency-unlocking action;
4. current assigned execution for the actor;
5. manager-approved staging;
6. routine next action.

The complete enterprise sequencer remains separately governed. Until activated, managers apply this ordering using visible facts.

## 7. Vehicle Execution Workbench contract

The binding visual and interaction requirements for this section are defined by [`INVENTORY_EXECUTION_VEHICLE_WORKBENCH_UI_SOURCE_OF_TRUTH.md`](INVENTORY_EXECUTION_VEHICLE_WORKBENCH_UI_SOURCE_OF_TRUTH.md). Where this architecture is less specific, the approved Workbench source of truth governs within the Workbench UI and execution scope.

### 7.1 Persistent vehicle header

Always visible in execution mode:

- vehicle identity and image;
- stock/inventory number and VIN suffix;
- current lifecycle stage and operating state;
- physical location and confidence;
- accountable owner and current executor;
- stage age and target;
- urgency and primary constraint;
- data freshness;
- return to originating queue/context.

### 7.2 Do This Now panel

The most prominent panel contains:

- exact current action;
- why it matters;
- reason codes and recommendation explanation where applicable;
- required readiness;
- tools, Parts, bay, evidence, skill, authority, and vehicle access;
- definition of done;
- expected downstream effect;
- contextual form;
- Start, Pause, Block, Waiting, Request Help, Submit, and Cancel Draft actions as eligible.

Only the current action is expanded by default. Later-stage forms are not shown as a menu or tab wall.

### 7.3 Readiness and dependencies

The workbench displays:

- required readiness dimensions;
- current state of each dimension;
- authoritative source and freshness where material;
- owner and next action for missing readiness;
- active blockers and waiting dependencies;
- expected resolution/next-check time;
- work that may proceed safely in parallel.

### 7.4 Current, staged, and related work

- Current Work is prominent.
- Staged Next Work is concise and visibly conditional on readiness.
- Other active work is summarized with owner, state, and dependency relationship.
- Completed and superseded work is available through history rather than competing for attention.
- Generic task/case detail is linked without duplicating its content.

### 7.5 Evidence packet

The workbench assembles authorized evidence already linked to the vehicle and current work:

- receipt observations;
- condition photos;
- documents;
- inspection findings and measurements;
- estimates and approvals;
- repair evidence;
- Parts receipt/issue/install references;
- QC checks and road-test evidence;
- title/document evidence;
- merchandising media and publication observations;
- release and post-release verification.

Evidence remains filtered by capability, access classification, retention, and legal-hold policy.

### 7.6 Handoff and next stage

The workbench shows:

- completion-readiness result;
- missing evidence or unresolved exception;
- required reviewer or approver;
- proposed next owner;
- proposed next action and target;
- accept, reject, return-for-information, correction, rework, hold, or escalate options;
- expected lifecycle result after an accepted command.

### 7.7 History and full Vehicle 360 context

Vehicle 360 tabs and relationship graph remain available for authorized context. Execution mode must not remove existing permission boundaries or fabricate unavailable domains.

The execution panel remains visible or easily recoverable while staff inspect history, documents, Parts, service, decisions, or audit context. Staff should not lose a draft merely by reviewing Vehicle 360 information.

## 8. Navigation and context preservation

### 8.1 Entry paths

Authorized users may enter through:

- My Work task card;
- Inventory Lifecycle Card;
- Control Tower selected-asset command rail;
- Shop/Recon work card;
- Parts-affected work link;
- review or approval item;
- authorized search;
- VIN, stock, RO, or approved barcode scan;
- direct Vehicle 360 link.

### 8.2 Required preserved context

Where permitted, preserve:

- originating route;
- location;
- operating date/cutoff;
- stage or lane;
- saved view;
- filter/search;
- selected vehicle and work;
- queue position;
- return path;
- current draft.

### 8.3 Deep-link contract

A vehicle-centered work link should identify:

- canonical vehicle/inventory context;
- selected work/task or eligible command;
- permitted return context;
- optional evidence, review, blocker, or approval focus.

The link must not embed authority. The server reevaluates the actor, current state, version, and command eligibility.

## 9. Form architecture

### 9.1 A form is a command surface

Every operational form must define:

- purpose and intended outcome;
- canonical subject;
- eligible actors and capabilities;
- eligible source states;
- required facts and freshness;
- required fields and evidence;
- hard gates;
- validation;
- authoritative command;
- resulting state/effects;
- approval or review requirement;
- event and audit receipt;
- failure and recovery;
- version and policy references.

A generic `Update Vehicle` form is prohibited for consequential lifecycle facts. Use purpose-built commands such as `Accept Receipt`, `Record Inspection`, `Submit Recon Plan`, or `Record Quality Failure`.

### 9.2 Form layers

```text
Form definition and version
  -> actor/state eligibility
  -> authorized prefilled projection
  -> draft input
  -> client guidance and validation
  -> server validation and hard gates
  -> explicit command with expected version/idempotency
  -> authoritative domain/task/evidence effects
  -> command receipt and pending/confirmed projection
  -> next action, task, review, handoff, or recovery
```

### 9.3 Form categories

| Category | Purpose | Examples |
| --- | --- | --- |
| Observation | Record a verified fact or finding | Arrival, mileage, condition, inspection measurement |
| Execution | Perform or confirm an authorized operational step | Start repair, receive part, record installation |
| Decision | Exercise human authority | Approve recon, approve price, authorize release |
| Exception | Report and route a condition preventing normal progress | Blocked, identity conflict, scope change, QC failure |
| Handoff | Transfer an accepted outcome and accountability | Receipt to inspection, QC to Inventory |
| Verification | Evaluate evidence against a gate | Completion readiness, QC, title readiness, frontline release |

The category determines evidence, authority, confirmation, offline behavior, and recovery requirements.

### 9.4 Purpose-built forms before generic configuration

The MVP and early enterprise releases should use purpose-built forms for high-risk and high-frequency workflows.

A future workflow/form configuration system may define approved templates and policy, but it must not:

- grant authority merely by exposing fields;
- allow administrators to bypass domain invariants;
- publish consequential changes without versioned approval;
- turn explicit commands into unrestricted record editing;
- break audit, evidence, or recovery requirements.

## 10. Draft, submission, and authoritative fact boundaries

### 10.1 Draft

A draft:

- belongs to the actor or approved collaborators;
- is not an authoritative domain fact;
- may be saved automatically;
- records the source projection version used;
- may contain pending evidence uploads;
- does not advance lifecycle state;
- may expire or be superseded according to approved policy.

### 10.2 Submission

Submission:

- revalidates identity, permissions, capability, field access, separation of duties, state, version, readiness, evidence, and policy;
- presents consequence/confirmation for material commands;
- includes an idempotency key where retry is plausible;
- uses the expected authoritative version;
- returns accepted, rejected, conflict, pending, or completed status;
- preserves the draft after recoverable failure.

### 10.3 Committed fact

A fact becomes authoritative only through the accepted domain command or approved source reconciliation.

Client confirmation, local draft save, upload completion, or task status change does not alone prove the domain command succeeded.

### 10.4 Correction and supersession

Committed observations and decisions are corrected through explicit correction, reversal, supersession, rework, or recovery commands. Prior facts and approvals remain in history.

## 11. Evidence architecture

### 11.1 Capture once, link many

Evidence is stored as a governed object and linked to permitted subjects:

- vehicle/inventory unit;
- task/work item;
- workflow/case;
- repair order/job;
- Parts transaction;
- decision/approval;
- domain event;
- audit record.

Do not copy the same file into multiple form-specific attachments.

### 11.2 Evidence requirements

Each evidence object or observation retains as applicable:

- evidence identifier;
- uploader/observer;
- captured and uploaded time;
- subject and purpose;
- content type and size;
- checksum/integrity;
- scan/quarantine state;
- access classification;
- retention and legal hold;
- version/supersession;
- authorized links;
- immutable evidence events.

### 11.3 Pending evidence

A form may save a draft with pending upload. A command requiring available evidence cannot pass until the evidence is accepted and usable.

The interface distinguishes:

- captured locally;
- upload pending;
- uploaded/scanning;
- available;
- quarantined;
- rejected;
- unavailable;
- access denied;
- superseded.

### 11.4 Field and evidence access

Forms and workbench projections return only fields and evidence permitted for the actor. Hiding a field in the UI is insufficient; read and command boundaries enforce access server side.

## 12. Eligibility, authority, and separation of duties

Before displaying or submitting a command, evaluate:

- organization and location;
- role, duty, capability, and skill;
- required certification or independent reviewer;
- field and evidence access;
- current domain state;
- current owner/executor relationship;
- dollar or related-exposure limit;
- delegation and expiry;
- prohibited requester/approver or executor/reviewer combination;
- policy and form version;
- vehicle, Parts, bay, tool, document, and evidence readiness;
- safety, identity, custody, title/legal, quality, privacy, or other hard stop.

The server repeats these checks on submission.

When staff lack authority, preserve their proposal and provide `Request Approval`, `Request Review`, `Escalate`, or `Return for Information` rather than discarding their work.

## 13. Concurrency and projection behavior

### 13.1 Concurrent change

If the vehicle, task, approval, Parts, or workflow state changes while a form is open:

1. preserve the user's draft;
2. show which authoritative facts changed;
3. reevaluate eligibility and consequences;
4. permit safe reapply, merge, or discard according to the command;
5. reject stale submission rather than overwrite newer facts;
6. record no false completion event.

### 13.2 Idempotency

Retrying a plausible command must not duplicate:

- vehicle transition;
- task;
- approval;
- evidence link;
- Parts transaction;
- notification;
- event;
- handoff;
- financial commitment.

### 13.3 Accepted command pending projection

When a command succeeds before the read projection refreshes:

- show the durable command receipt;
- show `Accepted — updating vehicle view` or equivalent;
- prevent duplicate resubmission;
- allow the user to continue only with actions safe for the confirmed state;
- expose retry/recovery if projection update fails.

## 14. Offline and poor-connection policy

### 14.1 May be supported offline or queued

Subject to security and implementation approval:

- local draft text;
- checklist draft;
- photo/document capture awaiting upload;
- nonconsequential observation draft;
- blocker draft;
- handoff draft.

### 14.2 Must revalidate online before commitment

- custody acceptance;
- lifecycle transition;
- financial approval or commitment;
- recon authorization or scope change;
- Parts purchase, substitution, adjustment, transfer, issue, or reconciliation;
- title readiness;
- pricing or publication;
- QC or operational release;
- frontline release, suspension, or reinstatement;
- transfer, wholesale, or disposition;
- policy or authority change.

The interface must never present a locally queued consequential command as completed.

## 15. Form and policy versioning

Every governed form retains:

- stable form code;
- form definition version;
- applicable workflow/domain version;
- policy version;
- effective date and status;
- field/evidence requirements;
- validation and hard-gate references;
- eligible roles/capabilities;
- command and event contract;
- migration/supersession behavior for open drafts and work;
- author, reviewer, and publisher where governed.

Recommended states:

```text
DRAFT -> REVIEW -> APPROVED -> SHADOW -> PILOT -> ACTIVE -> PAUSED -> RETIRED
```

Existing active work remains tied to the policy/version it inherited unless an approved migration, containment, or rollback command says otherwise.

## 16. Digital tools inside the workbench

### 16.1 Identity and location tools

- VIN/stock scan;
- approved barcode/QR scan;
- current location selection or scan;
- key/accessory count;
- custody acknowledgement;
- conflict reporting.

### 16.2 Evidence tools

- camera capture;
- document capture;
- measurement entry;
- annotated finding where approved;
- upload progress and retry;
- evidence preview and access state;
- approved voice-to-note as draft assistance, never sole critical evidence.

### 16.3 Execution tools

- concise checklists;
- Start, Pause, Resume, Block, Waiting, Complete;
- scope-change request;
- Parts demand/source/receive/reserve/issue/install/return actions;
- QC pass/fail/rework;
- handoff accept/return;
- request approval or manager direction.

### 16.4 Decision tools

- authoritative facts and freshness;
- recommendation and reasons;
- confidence and missing inputs;
- eligible alternatives;
- cost/time/risk consequence preview;
- authority and policy basis;
- approve, reject, return, contain, assign, defer, or escalate;
- required decision reason.

### 16.5 Physical enablement

Deployment planning must validate:

- mobile or shared devices;
- barcode/QR scanners;
- connectivity in office, Shop, and lot;
- charging and protective equipment;
- label printing;
- controlled key storage/tagging;
- photo space and lighting;
- bay/shared display only where it reduces coordination effort.

## 17. Form usability contract

### 17.1 Interaction rules

- one operational outcome per form;
- prefill authoritative facts;
- verification or conflict reporting instead of reentry;
- progressive disclosure;
- three to seven routine required interactions where practical;
- structured answer choices before free text;
- one short exception explanation when needed;
- clear required/optional distinction;
- save draft and preserve recovery;
- show consequence before material submission;
- show command receipt after submission;
- never require staff to rewrite history for handoff;
- accessible keyboard, assistive-technology, tablet, and mobile operation;
- state never communicated by color alone.

### 17.2 Proposed time budgets

These are product design targets pending operator validation, not active employee standards.

| Interaction | Proposed target |
| --- | ---: |
| Find or scan vehicle | Under 5 seconds |
| Understand current state | Under 10 seconds |
| Identify Current Action | Under 10 seconds |
| Start Current Work | Under 15 seconds |
| Routine progress update | 15–30 seconds |
| Blocked/Waiting/Need Help | 20–45 seconds |
| Handoff acceptance | 30–60 seconds |
| Completion/Ready for Review | 30–90 seconds when evidence was captured during work |
| Manager routine approval | 45–120 seconds with a complete packet |
| Receipt/identity/custody entry | 2–4 minutes excluding physical work |
| Inspection/QC entry | 3–7 minutes excluding physical inspection or testing |
| Recon plan | 3–6 minutes with findings prefilled |
| End-of-day confirmation | 1–2 minutes using a generated draft |

Routine digital administration should generally remain below two minutes or approximately three to five percent of the underlying work duration, subject to risk and evidence needs.

### 17.3 Chore test

A form requires redesign when:

- staff reenter known information;
- the same fact is entered in multiple forms or systems;
- routine work requires a narrative paragraph;
- evidence is reconstructed after the work from memory;
- irrelevant questions are displayed;
- submission produces no useful command, evidence, owner, next action, or receipt;
- managers still need to call staff for the same information;
- routine median or 90th-percentile time exceeds its approved budget without a justified risk reason;
- users frequently abandon, correct, or bypass the form.

## 18. Priority form catalog

### 18.1 MVP execution forms

| Priority | Form/command surface | Primary result |
| ---: | --- | --- |
| 1 | Receipt, Identity & Custody | Verified identity, location, custody, condition, restriction, and inspection handoff |
| 2 | Inspection & Triage | Evidence-backed findings, restrictions, route, and recon handoff |
| 3 | Blocked / Waiting / Need Help | Owned resolution, next check, escalation, and substitute-work path |
| 4 | Handoff & Acceptance | Accepted outcome, evidence, next owner, next action, and target |
| 5 | Completion Evidence / Ready for Review | Verified requirements and correct review/completion route |
| 6 | Manager Review / Approval | Attributable authorized decision with evidence and consequence |
| 7 | Start Day Confirmation | Acknowledged plan, Current Work, staged work, and starting blocker |
| 8 | End-of-Day Handoff | Confirmed carryover, owner, next action, evidence, and manager need |

### 18.2 Next domain forms

1. Recon Plan & Authorization.
2. Scope Change & Reapproval.
3. Parts Demand & Readiness.
4. Parts Receipt/Discrepancy/Reservation/Issue/Return/Reconciliation.
5. Repair Execution and Evidence.
6. Quality Verification, Rework & Operational Release.

### 18.3 Later enterprise forms

1. Title and Document Requirement Packet.
2. Original Document Custody and External Dependency.
3. Merchandising Package Review.
4. Pricing Proposal and Approval.
5. Channel Publication and Reconciliation.
6. Frontline Release and Post-Release Verification.
7. Vehicle Transfer and Custody Handoff.
8. Wholesale/Disposition Decision Packet.
9. Integration Conflict and Reconciliation.
10. Policy Override and Exception Review.
11. Vehicle Fact Correction/Supersession.

## 19. MVP architecture boundary

The immediate receipt-to-recon MVP requires:

- canonical Vehicle Lifecycle Card;
- Vehicle 360 link and permission-filtered context;
- focused Vehicle Execution Workbench behavior;
- Current Work and at most one staged Next Work for each pilot executor;
- Receipt, Inspection, Blocker, Completion, Handoff, and Manager Review actions;
- authoritative vehicle/task source mapping;
- evidence references;
- activity/audit receipt where currently supported;
- manual P0–P4 sequencing;
- manager start, midday, and day-end control;
- honest manual conventions where structured enterprise capability is unavailable.

The MVP does not require:

- a generic form builder;
- every Vehicle 360 domain;
- the automated enterprise sequencer;
- autonomous capacity scheduling;
- external provider activation;
- multi-location Staff Execution;
- consequential automation;
- a replacement for existing approved landing pages or workspaces.

## 20. Form-specific minimum contracts

### 20.1 Receipt, Identity & Custody

Required outcome:

- correct vehicle identified;
- arrival/location observed;
- custody decision recorded;
- keys/accessories/mileage/condition captured;
- safety/damage/identity conflict contained;
- evidence linked;
- inspection owner and next action established.

Hard stops:

- identity conflict;
- unsafe condition requiring containment;
- custody cannot be accepted;
- mandatory evidence absent;
- actor lacks authority.

### 20.2 Inspection & Triage

Required outcome:

- applicable template/version;
- qualified inspector;
- required checks and measurements;
- findings, severity, evidence, and restrictions;
- recon/no-action/hold/vendor/alternate route;
- next owner and target.

Hard stops:

- incomplete mandatory template;
- critical safety finding;
- unresolved identity/custody conflict;
- missing qualified inspector;
- required evidence unavailable.

### 20.3 Blocked / Waiting / Need Help

Required outcome:

- reason and explanation;
- affected work/vehicle and impact;
- resolution owner;
- requested action;
- next check and escalation;
- permitted substitute work;
- resume condition.

This command preserves the original accountable work owner unless an explicit reassignment command changes it.

### 20.4 Handoff & Acceptance

Required outcome:

- completed upstream result;
- evidence packet;
- open exceptions;
- proposed next owner/action/target;
- accept, reject, or return-for-information decision;
- attributable acceptance time.

Lifecycle advancement occurs only when the domain gate and handoff policy allow it.

### 20.5 Completion Evidence / Ready for Review

Required outcome:

- completion criteria evaluated;
- required checklist/fields/evidence satisfied;
- blocker/wait state resolved or correctly transferred;
- downstream consequence identified;
- direct completion or Ready for Review selected by policy;
- verified result or actionable rejection.

### 20.6 Manager Review / Approval

Required outcome:

- exact requested decision;
- requester, owner, subject, evidence, freshness, impact, recommendation, alternatives, authority, and policy;
- approve, reject, return, assign, contain, defer, or escalate command;
- required reason and conditions;
- event/audit receipt and downstream effect.

Bulk approval remains prohibited where individual evidence and consequences require separate judgment.

## 21. Operational measurement

Measure by form and role:

- median and 90th-percentile completion time;
- number of required interactions;
- prefilled versus staff-entered fields;
- duplicate entry;
- draft abandonment;
- validation error;
- concurrent conflict;
- upload failure and retry;
- correction/supersession;
- manager follow-up required;
- command rejection and recovery;
- staff clarity/burden rating;
- downstream handoff acceptance;
- missing owner, next action, evidence, or target after submission.

Metrics improve the operating system. They are not used alone to score or discipline staff.

## 22. Architecture acceptance tests

Before adoption as official, the design must pass these conceptual tests:

1. A staff member can enter from My Work and understand the correct vehicle/action without searching multiple screens.
2. The same vehicle card selected from Inventory, Shop, search, or review resolves to the same canonical vehicle context.
3. A task and vehicle can cross-link without duplicating either record.
4. A form cannot expose or execute a command merely because a field is visible.
5. A stale draft cannot overwrite a newer vehicle, task, Parts, approval, or workflow state.
6. A retry cannot duplicate a transition, task, approval, evidence link, event, handoff, or commitment.
7. Evidence captured once can support multiple authorized records without copying the content.
8. Restricted evidence and fields remain unavailable server side.
9. A failed hard gate cannot be bypassed by status, score, drag-and-drop, or manager convenience.
10. A blocked task retains ownership while resolution and substitute work are routed.
11. Parallel vehicle work cannot create conflicting authoritative transitions.
12. A command accepted before projection refresh is visibly pending and cannot be resubmitted accidentally.
13. Offline drafts do not masquerade as committed consequential actions.
14. Staff can inspect history without losing the current draft.
15. Submission returns an understandable receipt, next action, or recovery route.
16. The vehicle card remains scannable rather than becoming a miniature Vehicle 360.
17. Mobile presents Current Action, blockers, evidence, and handoff before secondary record context.
18. Managers retain contextual return to their original queue, stage, filter, and selected vehicle.

## 23. Recorded decisions and remaining adoption boundary

The following product decisions are confirmed for the official Vehicle Lifecycle Card and Vehicle Execution Workbench. They remain proposed only where they govern form definitions not expressly adopted:

1. Official name: `Vehicle Lifecycle Card`.
2. Official name: `Vehicle Execution Workbench` as an execution mode within Vehicle 360.
3. My Work remains the primary staff queue.
4. Vehicle-centered tasks deep-link to the Vehicle Execution Workbench by default.
5. Generic task/case work remains in the Task Workbench.
6. The card shows one controlling action plus a count of other active linked work.
7. One-current/one-staged applies to staff/constrained resources, with governed parallel vehicle work permitted.
8. Forms are purpose-built command surfaces rather than generic record editors.
9. Drafts are nonauthoritative and consequential commands require online revalidation.
10. Evidence uses capture-once/link-many governance.
11. MVP form and interaction time budgets are adopted as design targets, not employee standards.
12. Receipt-to-recon remains the first MVP boundary.
13. Existing Vehicle 360 tabs remain contextual record surfaces; forms are not added as another tab wall.
14. The selected Vehicle Lifecycle Card and workbench return context are preserved across manager and staff entry paths.

## 24. Adoption effect

The Vehicle Lifecycle Card and Vehicle Execution Workbench portions of this architecture are adopted through their respective official source-of-truth documents. The remaining form catalog and form-specific field contracts require separate explicit adoption.

Adoption would authorize:

- detailed no-code UX contracts and form specifications;
- mapping current capabilities to retain, consolidate, or extend;
- MVP pilot preparation using the approved architecture;
- future vertical-slice planning under the official implementation entry gates.

Adoption would not authorize:

- application code;
- database changes;
- changes to approved UI mockups without their change control;
- feature-flag or pilot activation;
- external integrations;
- policy limits or algorithm weights;
- production rollout;
- consequential automation;
- employee-performance use.

## 25. Relationship to official and supporting documents

This proposed architecture must remain consistent with:

- [`INVENTORY_EXECUTION_OPERATING_SYSTEM_OFFICIAL_ADOPTION.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM_OFFICIAL_ADOPTION.md);
- [`INVENTORY_EXECUTION_OPERATING_SYSTEM.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM.md);
- [`INVENTORY_EXECUTION_OPERATING_SYSTEM_MVP_ADOPTION.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM_MVP_ADOPTION.md);
- [`INVENTORY_EXECUTION_OPERATING_SYSTEM_IMPLEMENTATION_ROADMAP.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM_IMPLEMENTATION_ROADMAP.md);
- [`VEHICLE_WORKBENCH_OVERVIEW_AND_ROLE_LENSES_SOURCE_OF_TRUTH.md`](VEHICLE_WORKBENCH_OVERVIEW_AND_ROLE_LENSES_SOURCE_OF_TRUTH.md);
- [`VEHICLE_EVIDENCE_AND_360_IMPLEMENTATION.md`](VEHICLE_EVIDENCE_AND_360_IMPLEMENTATION.md);
- [`INVENTORY_CONSOLE_UI_SOURCE_OF_TRUTH.md`](INVENTORY_CONSOLE_UI_SOURCE_OF_TRUTH.md);
- [`INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md`](INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md);
- [`frontline-workflow/STAFF_EXPERIENCE.md`](frontline-workflow/STAFF_EXPERIENCE.md);
- [`frontline-workflow/OPERATING_CONTROLS.md`](frontline-workflow/OPERATING_CONTROLS.md);
- [`../STAFF_EXECUTION_HANDOFF_ENGINE.md`](../STAFF_EXECUTION_HANDOFF_ENGINE.md);
- [`../TASKS_UI_SOURCE_OF_TRUTH.md`](../TASKS_UI_SOURCE_OF_TRUTH.md);
- [`../TASKS_CONSOLE_UI_SOURCE_OF_TRUTH.md`](../TASKS_CONSOLE_UI_SOURCE_OF_TRUTH.md).

## 26. Final-review status

The Vehicle Lifecycle Card family described by this document was approved separately through [`INVENTORY_EXECUTION_VEHICLE_CARD_UI_SOURCE_OF_TRUTH.md`](INVENTORY_EXECUTION_VEHICLE_CARD_UI_SOURCE_OF_TRUTH.md). The neutral Vehicle Workbench overview, Inventory Manager role lens, return-to-workbench rule, role-lens model, and required Manager Notes & Decisions enhancement are approved through [`VEHICLE_WORKBENCH_OVERVIEW_AND_ROLE_LENSES_SOURCE_OF_TRUTH.md`](VEHICLE_WORKBENCH_OVERVIEW_AND_ROLE_LENSES_SOURCE_OF_TRUTH.md). Remaining form-specific field contracts and additional role-view mockups still require separate explicit adoption.

Recommended next action:

1. treat the vehicle-card decisions now governed by the official card source as resolved;
2. review the remaining form and Workbench decisions in section 23;
3. approve them unchanged or record specific revisions;
4. promote the broader document to version `1.0.0` only after that separate approval;
5. then create the detailed no-code field and command contracts for the MVP Vehicle Execution Workbench and six priority forms.
