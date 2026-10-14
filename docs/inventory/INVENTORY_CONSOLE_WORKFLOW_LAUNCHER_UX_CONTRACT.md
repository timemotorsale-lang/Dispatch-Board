# Inventory Console Workflow Launcher UX Contract

**Product:** Time Motor Sales Dispatch Board
**Module:** Inventory Console
**Design version:** 0.2.0
**Date:** 2026-07-16
**Status:** Active launcher contract; approved Add Vehicle slice implemented; remaining proposed scope retains its stated gates
**Activation:** Repository implementation is authorized only for the approved Add Vehicle slice and separately implemented foundations; no production rollout or complete Orchestrator activation is implied
**Proposed final Start Workflow specification:** [`INVENTORY_START_WORKFLOW_ORCHESTRATOR_PRODUCT_SPECIFICATION.md`](INVENTORY_START_WORKFLOW_ORCHESTRATOR_PRODUCT_SPECIFICATION.md)
**Approved Add Vehicle contract:** [`INVENTORY_START_WORKFLOW_ADD_VEHICLE_UI_SOURCE_OF_TRUTH.md`](INVENTORY_START_WORKFLOW_ADD_VEHICLE_UI_SOURCE_OF_TRUTH.md)

---

## 1. Decision summary

The approved Inventory Console `+ Start Workflow` control opens a role-aware **Workflow Launcher**. It does not open the generic Task Intake form and it is not a navigation tab.

The launcher follows this sequence:

```text
Start Workflow
  -> choose an eligible workflow
  -> identify or confirm its business context
  -> complete the purpose-built intake
  -> validate authority, state, sources, and evidence
  -> review exact consequences
  -> start now or submit for approval
  -> show the created records, tasks, approvals, and events
```

`Create General Task` remains one launcher choice for ad hoc work. Governed inventory and Shop workflows use their own forms because a task alone cannot safely represent vehicle identity, custody, lifecycle stage, repair authority, parts dependencies, quality gates, or financial exposure.

## 2. Truthful implementation boundary

The repository currently contains foundations for:

- canonical vehicles and Vehicle 360;
- inventory-unit creation and control;
- repair-order intake for appointment, walk-in, and inventory-recon work;
- inspection, diagnosis, estimate, authorization, and repair-job planning;
- repair-part demand and readiness;
- Shop dispatch, execution, QC, release, close, and related evidence;
- generic Task Intake, manager review, comments, checklists, and activity events;
- capability grants, rollout flags, optimistic versions, idempotent commands, domain events, audit events, and outbox messages.

The full Inventory-to-Frontline trigger program remains documentation-gated. Open company policy, timing, evidence, source, authority, pilot, and activation decisions must not be treated as implemented behavior. Launcher choices therefore carry one of four availability states:

| State | Meaning |
| --- | --- |
| **Available** | A compatible command foundation exists and the applicable rollout and capability gates may permit execution. |
| **Context required** | The command exists but only appears after an eligible vehicle, inventory unit, repair order, job, or task is selected. |
| **Approval gated** | The UX is designed, but the governing policy or workflow slice is not authorized for activation. |
| **Unavailable** | The user lacks authority, the record is ineligible, a source is unavailable, or a hard rule blocks execution. |

The UI must display the state and explanation. It must not present a planned or gated command as live.

## 3. Launcher surface

### 3.1 Presentation

- Desktop: centered modal approximately 760-840 pixels wide.
- Tablet: wide modal or right drawer.
- Mobile: full-screen sheet preserving entered data.
- Title: `Start Workflow`.
- Subtitle: `Choose the business process you want to begin.`
- Search placeholder: `Search workflows, vehicles, stock #, VIN, RO...`.
- Context banner: selected vehicle, inventory unit, repair order, job, task, location, and freshness when launched contextually.

### 3.2 Groups

1. **Inventory Lifecycle**
2. **Shop & Recon**
3. **Exceptions & Governance**
4. **General Work**

### 3.3 Workflow card contract

Every choice shows:

- staff-language title;
- one-sentence outcome;
- context requirement;
- expected duration to complete the intake;
- `Starts now`, `Approval may be required`, `Context required`, or `Planned` badge;
- why it is unavailable when applicable;
- the primary record it will create or change.

Do not use internal event names, model names, or algorithm names as card titles.

### 3.4 Visibility behavior

- Show eligible choices first.
- Show context-required choices only when their required context exists or when search finds a valid record.
- Keep policy-gated choices visible to authorized planning and management users with a `Planned` or `Approval gated` explanation.
- Hide sensitive financial or restricted-evidence detail when the user lacks view authority.
- Do not rely on a hidden button as permission enforcement; every submission is re-authorized server-side.
- Preserve the user's intended workflow and entered draft if a version conflict or recoverable source failure occurs.

## 4. Phase-one workflow catalog

### 4.1 Global launcher choices

| ID | Staff-facing choice | Form | Minimum context | Availability target | Primary authority |
| --- | --- | --- | --- | --- | --- |
| `WL-01` | Add Vehicle | Add Vehicle | None; searches or creates canonical Vehicle | Implemented repository foundation; mutation remains capability and rollout governed | Vehicle command authority at location |
| `WL-01B` | Start Acquisition | Acquisition Intake | Canonical or newly registered vehicle | Available governed foundation; commitment authority remains separate | Inventory manager or acquisition authority |
| `WL-02` | Receive Vehicle | Receipt & Custody Intake | Open inventory unit | Approval gated by Inventory-to-Frontline slice | Inventory/receiving authority at location |
| `WL-03` | Start Inspection | Inspection Start Intake | Received vehicle or eligible repair order | Contextual foundation; full trigger behavior approval gated | Qualified inspector/technician |
| `WL-04` | Request Inventory Recon | Inventory Recon Request | Open dealership inventory unit | Available repair-order intake foundation | Inventory manager or authorized Shop dispatcher |
| `WL-05` | Create Repair Order | Repair Order Intake | Appointment, walk-in customer/vehicle, or inventory unit | Available foundation | Advisor, Shop manager, or `REPAIR_ORDER_MANAGE` grant |
| `WL-06` | Report Blocker | Blocker & Exception Intake | Preferred but not always required | Partially available; unified exception projection may require implementation | Record owner, assigned staff, or manager |
| `WL-07` | Request Approval | Approval Request | Affected record and proposed decision | Manager-review foundation available; domain approval varies | Any authorized requester; approver must be independent where required |
| `WL-08` | Create General Task | Task Intake | None | Available | Staff for self-assigned work; managers for broader assignment |

### 4.2 Context-only commands

These are phase-one forms but are not permanent global tiles. They appear through launcher search or contextual launch only when eligibility is proven.

| ID | Staff-facing choice | Required context | Why it is contextual |
| --- | --- | --- | --- |
| `WL-C01` | Request Parts | Open repair order/job with a documented need | Parts demand must attach to authorized or reviewable work and a valid location. |
| `WL-C02` | Start Quality Control | Repair job in `READY_FOR_QC` with completion evidence | QC cannot begin until repair execution and evidence gates pass. |

`Start Diagnosis`, `Present Estimate`, `Decide Authorization`, `Create Repair Job`, `Dispatch Work`, `Authorize Release`, `Close Repair Order`, and later Inventory-to-Frontline stage transitions remain contextual commands inside the appropriate record or workspace. They are not global launcher choices.

## 5. Shared intake shell

Every purpose-built form uses the same five-part structure.

### 5.1 Context

- organization and location;
- vehicle identity, VIN/exception identity, stock or inventory number;
- customer versus dealership ownership;
- selected source record and current version;
- current stage, operating state, owner, target, and freshness;
- visible source conflicts or duplicate warnings.

### 5.2 Requested outcome

- plain-language objective;
- responsible owner or requested owner;
- target or due time;
- urgency and reason;
- relevant financial, customer, safety, or operational impact;
- whether the request starts work or asks another authority to decide.

### 5.3 Evidence and dependencies

- required structured facts;
- required and optional evidence;
- source and freshness for prefilled values;
- missing, stale, conflicting, quarantined, or unavailable evidence;
- prerequisites and downstream dependencies.

### 5.4 Consequence preview

A persistent `What will happen` panel lists:

- records created or changed;
- tasks created and proposed owners;
- review or approval created;
- lifecycle or operating-state effect;
- notifications and escalation target;
- domain, audit, activity, and outbox events;
- actions that will remain pending.

### 5.5 Footer actions

- `Cancel`;
- `Save Draft` when the workflow supports drafts;
- `Review & Start` when the user can execute;
- `Review & Request Approval` when another authority must decide.

Never use a generic `Submit` label for the final command.

## 6. Purpose-built form specifications

### 6.1 `WL-01` Add / Acquire Vehicle — Acquisition Intake

**Purpose:** create a dealership-controlled inventory cycle for a canonical vehicle.

**Sections and fields**

1. **Vehicle identity:** search existing vehicle; VIN or approved non-VIN exception; year/make/model; duplicate-conflict result.
2. **Acquisition:** acquisition source/type, financial acquisition time, inventory number, known source reference, business reason.
3. **Ownership and location:** organization, location, accountable owner.
4. **Initial control:** stage target, next action, initial state (`Active`, `Waiting`, or `Blocked`), waiting/blocker reason when applicable.
5. **Economics and evidence:** acquisition amount and supporting evidence when governed policy enables them; confidence/source labels.

**Validation**

- canonical vehicle is eligible and has no other open inventory unit;
- inventory number is unique within the organization;
- acquisition time is not materially in the future;
- target is not before acquisition;
- owner and location are active and permitted;
- waiting or blocked state has a meaningful reason;
- capability, rollout, idempotency, and duplicate gates pass;
- amount over authority or acquisition-policy exceptions route to approval rather than silently creating the unit.

**Confirmation:** `Create Inventory Unit` or `Request Acquisition Approval`.

**Outputs**

- Inventory Unit at the approved initial lifecycle stage;
- initial inventory state-history record;
- acquisition/appraisal or approval reference when applicable;
- optional next-action task if policy requires execution work;
- enterprise command, domain event, audit event, outbox message, and user-facing activity entry.

### 6.2 `WL-02` Receive Vehicle — Receipt & Custody Intake

**Purpose:** record observed arrival, custody, keys, condition, documents, and readiness for inspection.

**Sections and fields**

1. **Inventory context:** inventory unit, expected vehicle identity, destination, expected transport/source.
2. **Observed arrival:** arrival time, actual location, receiver, transport/provider reference.
3. **Identity and custody:** VIN/identity check, custody transfer, key count/tag, odometer observation, possession status.
4. **Condition and evidence:** arrival photos, visible damage, safety concerns, received documents/items, source conflicts.
5. **Handoff:** inspection owner, target, next action, exception owner when receipt cannot complete.

**Validation**

- inventory unit is open and eligible for receipt;
- observed identity matches or creates a hard-stop identity exception;
- receiving location and actor authority are valid;
- custody and key facts are attributable;
- required evidence is present under the approved receipt policy;
- conflicting authoritative facts cannot be overwritten in place;
- open safety, identity, or custody exceptions prevent a clean Inspection handoff.

**Confirmation:** `Complete Receipt & Create Inspection Work` or `Record Receipt Exception`.

**Outputs**

- receipt/custody evidence and attributable custody event;
- inventory stage/state history when the approved transition is enabled;
- inspection task/work package for a clean handoff;
- owned exception and response task when receipt is incomplete;
- command, domain, audit, activity, and outbox events.

**Activation note:** this form remains approval gated until the applicable Inventory-to-Frontline receipt decisions and implementation authority are complete.

### 6.3 `WL-03` Start Inspection — Inspection Start Intake

**Purpose:** create attributable inspection work using the correct template and context.

**Sections and fields**

1. **Subject:** vehicle, inventory unit or repair order, ownership lane, location.
2. **Inspection plan:** inspection type/template/version, inspector, start target, completion target.
3. **Known condition:** concern summary, odometer/source, safety warnings, existing evidence and unresolved conflicts.
4. **Resources:** bay/resource needs, tools, qualifications, dependencies.
5. **Evidence readiness:** required measurements, photos, test results, and unavailable-evidence reason.

**Validation**

- subject is in an eligible state and does not already have conflicting active inspection work;
- template/version is effective for the vehicle, lane, and location;
- inspector is active, permitted, and qualified where rules exist;
- required safety information and evidence sources are available;
- current record version and rollout gate pass.

**Confirmation:** `Start Inspection Work`.

**Outputs**

- linked inspection task/work package and checklist;
- inspection context snapshot and selected template version;
- assignment and target events;
- no completed inspection result until the inspector records item-level pass/advisory/fail/not-applicable results, measurements, notes, evidence, summary, and completion time;
- failed or advisory results may create Recon, safety hold, evidence, or manager-review work according to approved rules.

### 6.4 `WL-04` Request Inventory Recon — Inventory Recon Request

**Purpose:** create Shop coordination for dealership-owned inventory without confusing it with customer repair.

**Sections and fields**

1. **Inventory context:** inventory unit, vehicle, lifecycle stage, frontline target, capital/aging exposure.
2. **Recon concern:** inspection findings, requested outcome, known scope, safety priority, evidence links.
3. **Shop intake:** arrival/availability time, location, keys, transport mode, accountable Shop owner.
4. **Commitment:** target, next action, priority reason, expected frontline impact.
5. **Authority preview:** estimated amount when known, approval threshold status, missing diagnosis/estimate warning.

**Validation**

- inventory unit is open, dealership-owned, and eligible for recon;
- no duplicate open inventory-recon repair order exists unless an authorized supplement path applies;
- location, keys, ownership, concern, target, and next action are present;
- inspection findings are referenced when policy requires them;
- requester has Inventory or Shop authority at the location;
- the request does not itself approve work, price, parts purchase, or release.

**Confirmation:** `Create Inventory Recon Request`.

**Outputs**

- Service Visit with inventory-recon intake evidence;
- Repair Order linked to the Inventory Unit and vehicle;
- intake/state-history record;
- initial diagnosis/planning task and accountable owner;
- command, domain, audit, activity, and outbox events;
- later estimate, authorization, job, parts, dispatch, QC, and handoff remain pending.

### 6.5 `WL-05` Create Repair Order — Repair Order Intake

**Purpose:** open accountable Shop coordination for an appointment, walk-in, or authorized internal source.

**Sections and fields**

1. **Intake source:** appointment, walk-in, or inventory recon; source reference.
2. **Customer and vehicle:** authoritative customer/vehicle for appointment; customer and canonical vehicle for walk-in; inventory unit for recon.
3. **Arrival and concern:** arrival time, concern summary, intake notes.
4. **Consent and custody:** consent status/reference/time, key count/tag, transport mode.
5. **Ownership and promise:** location, Shop owner, target, customer promise where applicable, next action, initial state/reason.

**Validation**

- appointment conversion is idempotent and uses authoritative appointment links;
- walk-in customer and vehicle belong to the organization;
- inventory recon uses an eligible inventory unit;
- arrival is not materially in the future and target follows arrival;
- documented consent has reference and timestamp;
- key count is a valid whole number;
- waiting or blocked state has a reason;
- capability, location, rollout, and duplicate gates pass.

**Confirmation:** `Open Repair Order`.

**Outputs**

- immutable Service Visit intake evidence;
- Repair Order with owner, location, target, state, and next action;
- repair-order state history;
- optional intake/diagnosis task based on configured blueprint;
- command, domain, audit, activity, and outbox events.

### 6.6 `WL-06` Report Blocker — Blocker & Exception Intake

**Purpose:** convert a problem into owned, visible, time-bound recovery work.

**Sections and fields**

1. **Affected work:** vehicle, inventory unit, repair order, job, part demand, approval, task, integration, or `No record found`.
2. **Blocker:** category, plain-language description, observed time, source.
3. **Impact:** safety, customer promise, frontline target, cost, capacity, compliance, or data integrity.
4. **Ownership:** current owner, requested resolver, response target, escalation target.
5. **Evidence and workaround:** evidence, attempted actions, safe temporary containment, help needed.

**Validation**

- description is meaningful and structured category is selected;
- affected record and latest state are resolved when available;
- assigned staff may block their own work; broader state mutation requires record authority;
- safety/identity/compliance hard stops cannot be downgraded;
- duplicate active blocker is detected and offered as an update path;
- no-record reports still receive an owner and response target.

**Confirmation:** `Report Blocker`.

**Outputs**

- affected record moves to `BLOCKED` only when the reporter has authority;
- otherwise a correlated exception/review request is created without unauthorized state mutation;
- owned response task with due time;
- notification/escalation according to severity and policy;
- blocker, task, domain/audit, and activity events.

Reporting a blocker never requires approval. Resolving, overriding, or accepting risk may require approval.

### 6.7 `WL-07` Request Approval — Approval Request

**Purpose:** ask an authorized decision-maker to approve a specific proposed action without executing it first.

**Sections and fields**

1. **Subject and decision:** affected record, decision type, exact proposed action.
2. **Why now:** business reason, deadline, operational/customer/safety impact.
3. **Financial and authority facts:** amount, cumulative correlated exposure, requester authority, required approver class.
4. **Evidence and sources:** supporting records, freshness, conflicts, missing facts.
5. **Alternatives and consequences:** eligible alternatives, recommendation and reasons, consequence if approved/rejected/returned.

**Validation**

- subject and proposed command are valid and currently eligible;
- requester may request but cannot self-approve when separation is required;
- approver is derived from policy, amount, location, and decision type rather than manually bypassed;
- correlated amounts prevent approval splitting;
- evidence requirements and hard rules are evaluated before routing;
- duplicate pending approval is detected.

**Confirmation:** `Send Approval Request`.

**Outputs**

- domain approval/review record when the domain supports one, otherwise a manager-review item with explicit subject linkage;
- approval task/notification for the correct authority;
- affected record remains unchanged or visibly waiting for approval;
- request, routing, and waiting-state events;
- approval, rejection, return-for-information, expiry, and cancellation create later attributable events.

Approval executes no underlying business command unless the approved policy explicitly defines an atomic approve-and-execute operation.

### 6.8 `WL-08` Create General Task — Task Intake

**Purpose:** create ad hoc work that does not start or advance a governed vehicle workflow.

**Sections and fields**

1. Title and description.
2. Board date and required due time.
3. Workflow area and priority.
4. Owner and collaborators.
5. Optional vehicle/customer references and intake metadata.
6. Manager-review requirement when the creator has authority to set it.

**Validation**

- title, board date, due time, workflow area, priority, and active owner are valid;
- non-managers create only self-assigned Not Started tasks and cannot require manager approval;
- owner cannot also be a collaborator;
- blocked state requires a blocker reason;
- approval-required completion follows Ready for Review;
- vehicle and customer references remain contextual links, not substitutes for governed records.

**Confirmation:** `Create Task`.

**Outputs**

- Task on the correct Board Day;
- adaptive checklist and collaborators when supplied;
- `TASK_CREATED` activity event and any explicitly selected, permitted automation trigger;
- no Inventory Unit, Repair Order, Part Demand, QC record, or lifecycle transition.

### 6.9 `WL-C01` Request Parts — Part Demand Intake

**Purpose:** create traceable part demand for identified Shop work.

**Sections and fields**

- repair order/job and authorized or reviewable operation;
- canonical part or unresolved requested part description;
- quantity, location, need-by time, priority and reason;
- source preference, substitution constraints, core/warranty relevance;
- supporting diagnosis/estimate/job reference.

**Validation**

- repair order is open and in the same organization/location boundary;
- demand attaches to valid work and is not an unassociated shopping request;
- quantity and need-by are valid;
- duplicate active demand and existing reservation are visible;
- requesting demand does not authorize purchase or substitution;
- parts capability and rollout gates pass.

**Confirmation:** `Create Parts Request`.

**Outputs**

- Repair Part Demand;
- readiness evaluation and sourcing/reservation work where configured;
- parts task and owner when intervention is needed;
- command, domain, audit, activity, and outbox events;
- Purchase Order remains a later governed command.

### 6.10 `WL-C02` Start Quality Control — QC Intake

**Purpose:** assign and start independent quality verification for repair work that is ready.

**Sections and fields**

- eligible repair job and repair-order context;
- effective QC template/version and completed repair procedure;
- QC inspector and independent peer verifier when required;
- safety, completion, peer, and road-test requirements;
- completion evidence readiness and target time.

**Validation**

- job status is `READY_FOR_QC`;
- technician completion evidence exists;
- effective repair procedure and QC template are available;
- inspector is active and authorized;
- required peer verifier is different from the executing technician;
- no conflicting active QC assignment exists.

**Confirmation:** `Start Quality Control`.

**Outputs**

- assigned QC task/work item and checklist;
- start/assignment activity and audit events;
- no pass, fail, or release at start;
- completed QC creates a versioned Repair Quality Inspection;
- pass moves the job to `QC_PASSED`; fail returns it to repair with attributable rework instructions;
- vehicle release remains a separate authorization after all jobs pass and all release gates are satisfied.

## 7. Role and permission visibility

### 7.1 UX role matrix

| Role/persona | Default visible choices | Conditional choices | Normally unavailable |
| --- | --- | --- | --- |
| General/Operations Manager | All catalog choices | Restricted evidence according to grant | None solely because of role; hard state and separation rules still apply |
| Inventory Manager | Add/Acquire, Receive, Start Inspection, Request Recon, Report Blocker, Request Approval, General Task | Repair Order when granted; Parts/QC with Shop authority | Policy administration and independent approvals outside authority |
| Receiving/Lot Staff | Receive, Report Blocker, General Task | Start Inspection when qualified/granted | Acquisition approval, repair authorization, release approval |
| Technician/Inspector | Start Inspection, Report Blocker, General Task | Parts Request and QC when assigned/qualified | Inventory acquisition, reassignment, financial approval |
| Shop Dispatcher/Manager | Request Recon, Create Repair Order, Report Blocker, Request Approval, General Task | Parts and QC in eligible context | Acquisition decisions without Inventory authority |
| Service Advisor | Create Repair Order, Report Blocker, Request Approval, General Task | Parts request when policy permits | Inventory stage changes, technician/QC verification |
| Parts Staff | Report Blocker, General Task | Parts Request from eligible Shop context | Repair authorization, QC and release |
| QC Verifier | Report Blocker, General Task | Start QC for eligible assigned work | Executing technician self-verification where independence is required |
| General Staff | Report Blocker, Create General Task | Request Approval for a record they may view | Governed mutations without explicit grants |

### 7.2 Enforcement model

The UI may use roles for sensible defaults, but server enforcement uses authenticated identity, capability grant, organization, location, resource ownership, amount constraints, rollout state, current aggregate version, and command-specific hard rules.

Current broad capabilities include `INVENTORY_UNIT_VIEW`, `INVENTORY_UNIT_MANAGE`, `REPAIR_ORDER_VIEW`, `REPAIR_ORDER_MANAGE`, `PARTS_VIEW`, `PARTS_MANAGE`, `VEHICLE_EVIDENCE_VIEW`, `VEHICLE_EVIDENCE_MANAGE`, and policy capabilities. Enterprise implementation should avoid granting a broad manage capability merely to expose one low-risk launcher choice. Where required, introduce narrower command capabilities such as receipt execution, inspection recording, parts-demand creation, QC inspection, or approval request.

### 7.3 Disabled-state explanations

Examples:

- `Select an inventory unit before receiving a vehicle.`
- `This vehicle already has an open inventory cycle.`
- `Repair work is not ready for QC because completion evidence is missing.`
- `You may request this approval, but you cannot approve your own request.`
- `This workflow is planned and is not enabled for the current rollout.`
- `Your location grant does not permit this command.`

## 8. Validation model

Validation occurs in five layers.

| Layer | Responsibility | Examples |
| --- | --- | --- |
| 1. Form completeness | Immediate UX feedback | Required field, date format, key count, meaningful reason |
| 2. Context eligibility | Domain read model | Open inventory unit, eligible stage, job ready for QC, no duplicate open order |
| 3. Authority and policy | Server-side policy | Capability, location, amount limit, separation of duties, rollout flag |
| 4. Concurrency and idempotency | Enterprise command boundary | Expected version, unique idempotency key, stale source, duplicate request |
| 5. Transactional invariants | Database/service transaction | Unique open inventory unit, immutable evidence/history, atomic command/event/audit/outbox |

Warnings do not behave like hard blocks.

- **Hard block:** cannot continue; show exact reason and recovery action.
- **Warning:** may continue only when policy permits; show impact and capture acknowledgement or override reason.
- **Approval required:** preserve the proposal and route it; do not discard entered work.
- **Source conflict:** preserve the proposed observation, show authoritative facts, and create correction/reconciliation work rather than overwriting silently.

## 9. Review, confirmation, and approval behavior

### 9.1 Review screen

Before execution, show:

- exact workflow and subject;
- authoritative versus entered facts;
- owner, location, target, and urgency;
- evidence and missing/stale/conflicting inputs;
- authority decision;
- exact records, tasks, approvals, and events that will be created;
- what will not happen yet;
- final business reason.

### 9.2 Final actions

| Decision | Final action |
| --- | --- |
| Authorized and eligible | Workflow-specific verb such as `Open Repair Order` |
| Approval required | `Send Approval Request` |
| Missing recoverable information | `Save Draft` or `Create Information Request` |
| Hard rule failed | No execution action; show recovery path |
| Concurrent change | `Review Latest Version` with entered draft preserved |

### 9.3 Approval queue contract

An approval item shows requester, subject, proposed action, evidence, amount/impact, policy basis, age/target, alternatives, and consequence preview. Authorized approvers may:

- approve;
- reject;
- return for information;
- assign or escalate when policy allows;
- cancel only according to requester/manager rules.

Every decision requires an attributable reason. High-impact approvals are evaluated individually; unsafe bulk approval is prohibited.

### 9.4 Success receipt

After a command succeeds, show:

- plain-language result;
- created or changed record identifiers;
- tasks and owners;
- approval status;
- next action and target;
- links to `Open Record`, `View Created Work`, and `View Event Log`;
- duplicate-safe result when an idempotent retry returns the original outcome.

## 10. Records, tasks, and events matrix

| Workflow | Primary records | Tasks/work | Approval behavior | Material events |
| --- | --- | --- | --- | --- |
| Add / Acquire Vehicle | Vehicle reference, Inventory Unit, state history | Next-action task when configured | Threshold/policy exception may route before creation | Inventory command, created, ownership/location/target, audit, outbox, activity |
| Receive Vehicle | Receipt/custody evidence, custody event, inventory history | Inspection or exception work | Exceptions may require review; reporting never suppressed | Arrival observed, custody accepted/exception, handoff, audit/activity |
| Start Inspection | Inspection work package/template snapshot | Assigned inspection checklist | No approval to start when eligible | Inspection work created/assigned; later result events |
| Request Inventory Recon | Service Visit, Repair Order, state history | Diagnosis/planning work | Estimate/authorization later | Recon requested, order opened, task assigned, audit/outbox/activity |
| Create Repair Order | Service Visit, Repair Order, state history | Intake/diagnosis work | Consent and later authorization gates | Intake captured, order opened, task/activity, audit/outbox |
| Report Blocker | Subject state or correlated exception | Response/recovery task | Resolution or override may require approval | Blocker reported, state changed or review routed, escalation/activity |
| Request Approval | Domain approval or linked manager-review item | Approver task/notification | This is the approval request | Requested, routed, waiting; later approved/rejected/returned/expired |
| Create General Task | Task, Board Day link, checklist/collaborators | The task itself | Optional manager review under task policy | Task created and activity event |
| Request Parts | Repair Part Demand, readiness evaluation | Sourcing/reservation task | Purchase/substitution may require later approval | Demand created, readiness evaluated, audit/outbox/activity |
| Start Quality Control | QC assignment/work item; later Quality Inspection | QC checklist | Release remains separate | QC assigned/started; later passed/failed/rework/release events |

## 11. Event visibility

The launcher does not expose a technical `Triggers` tab. Users see events in the location that helps them act:

- success receipt after starting a workflow;
- Priority Work when follow-up is created;
- Reviews or Approvals when authority is required;
- Inventory Lifecycle or Shop & Recon when stage/state changes;
- notifications for owned work or escalation;
- record activity/audit history;
- Inventory Console `View Event Log` for authorized cross-workflow inspection;
- Data & Integration Health for source, projection, outbox, or integration failures.

Events must include actor/system identity, subject, event type, reason, correlation identifier, occurred time, and permitted before/after context. System events must be distinguishable from human commands.

## 12. States and recovery

Every launcher and form supports:

- loading;
- no eligible workflow;
- live/fresh;
- draft saved;
- source stale or partially available;
- missing required information;
- source conflict;
- unauthorized;
- approval required;
- concurrent update conflict;
- command accepted and projection pending;
- duplicate-safe success;
- command rejected with recovery instructions;
- integration unavailable;
- retry and resume.

Closing a form with changes prompts `Save draft`, `Discard`, or `Continue editing`. Drafts do not reserve authority, change workflow state, create tasks, or emit business-completion events.

## 13. Accessibility and floor use

- Keyboard and assistive-technology completion is mandatory.
- Focus returns to `+ Start Workflow` after cancel and to the success receipt after completion.
- Errors are summarized and linked to exact fields.
- State uses text and iconography in addition to color.
- Touch targets support tablet/shop-floor use.
- Evidence upload shows pending, failed, retrying, quarantined, and complete states.
- Plain language is primary; internal codes appear only in technical details.
- Drafts survive recoverable navigation and network failures.

## 14. Phase-one acceptance scenarios

1. Inventory manager creates an eligible inventory unit and sees the record, next work, and events created.
2. Duplicate vehicle/open-inventory conflict blocks creation without losing entered acquisition facts.
3. Receiving staff records an identity mismatch and creates an owned exception without advancing the clean handoff.
4. Qualified inspector starts work with the effective template and cannot record a completed result from the start form.
5. Inventory recon creates an Inventory-linked Repair Order and does not present it as customer repair.
6. Appointment conversion is retried and returns the original Repair Order without duplication.
7. Staff report a blocker on their own work; a manager sees the response task and event immediately.
8. Staff request an approval above their authority and cannot self-approve it.
9. General staff create a self-assigned Not Started task with a due time but cannot require manager approval.
10. Parts demand cannot be created without eligible Shop context.
11. QC does not appear until a job is ready and completion evidence exists.
12. A version conflict preserves entered data and requires review of the latest authoritative state.
13. A gated Inventory-to-Frontline workflow is visibly planned and cannot execute.
14. Every successful command links to its created record, created work, and event history.

## 15. Decisions required before implementation

This design can be reviewed independently of implementation. Before code or activation, product and operating authorities must still approve:

- exact phase-one workflow availability by role and location;
- whether a workflow is global, contextual, or both;
- narrower command capabilities needed beyond current broad manage grants;
- receipt, inspection, evidence, timing, escalation, and handoff policies;
- financial thresholds and correlated-exposure rules;
- approval types, approver resolution, independence, expiry, and delegation;
- task blueprints, owners, checklists, and due-time rules;
- draft retention and sensitive-data policy;
- event, notification, and escalation routing;
- rollout mode: disabled, shadow, manual pilot, limited active, or active;
- tabletop, staff usability, accessibility, security, and rollback evidence.

## 16. Source alignment

This contract is designed to align with:

- [`INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md`](INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md)
- [`INVENTORY_CONSOLE_UI_SOURCE_OF_TRUTH.md`](INVENTORY_CONSOLE_UI_SOURCE_OF_TRUTH.md)
- [`INVENTORY_UNIT_FOUNDATION_IMPLEMENTATION.md`](INVENTORY_UNIT_FOUNDATION_IMPLEMENTATION.md)
- [`REPAIR_ORDER_CORE_IMPLEMENTATION.md`](REPAIR_ORDER_CORE_IMPLEMENTATION.md)
- [`SHOP_PLANNING_CORE_IMPLEMENTATION.md`](SHOP_PLANNING_CORE_IMPLEMENTATION.md)
- [`ENTERPRISE_PARTS_WAVE_ONE_IMPLEMENTATION.md`](ENTERPRISE_PARTS_WAVE_ONE_IMPLEMENTATION.md)
- [`QUALITY_CONTROL_RELEASE_IMPLEMENTATION.md`](QUALITY_CONTROL_RELEASE_IMPLEMENTATION.md)
- [`frontline-workflow/WORKFLOW_SPECIFICATION.md`](frontline-workflow/WORKFLOW_SPECIFICATION.md)
- [`frontline-workflow/STAFF_EXPERIENCE.md`](frontline-workflow/STAFF_EXPERIENCE.md)
- [`frontline-workflow/APPROVAL_REGISTER.md`](frontline-workflow/APPROVAL_REGISTER.md)
- [`../TASKS_UI_SOURCE_OF_TRUTH.md`](../TASKS_UI_SOURCE_OF_TRUTH.md)
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md)

## 17. Change control

Material changes to launcher grouping, phase-one choices, global-versus-contextual placement, form consequences, permission boundaries, approval separation, or records/tasks/events outcomes require product review and a versioned update to this contract. An approved UX contract does not by itself authorize code, rollout, pilot, or activation.
