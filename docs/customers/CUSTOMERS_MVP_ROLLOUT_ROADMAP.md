# Customers Console MVP Rollout Roadmap

**Document:** Customers Console MVP Rollout Roadmap
**Date:** 2026-07-10
**Status:** Implementation roadmap
**Primary routes:** `/customers`, `/customers/[customerId]`
**Architecture:** [`CUSTOMERS_ARCHITECTURE.md`](CUSTOMERS_ARCHITECTURE.md)

---

## 1. Rollout Goal

Move Customers from:

```text
Approved Customer Command Center UI with sample presentation data
```

to:

```text
Day-one customer operating console with durable identity, ownership,
interaction memory, follow-up, cases, module handoffs, manager control,
permissions, audit evidence, and release proof
```

Build one vertical slice at a time. Each slice must include the applicable database, repository, service, policy, validation, route, UI state, event, and test work. Do not build large frontend-only or schema-only batches.

---

## 2. Product Guardrails

- Build an original dealership customer operating system, not a clone of a named CRM.
- Preserve the supplied dashboard and Customer 360 mockups as composition references.
- Keep Customers inside the Dispatch Board modular monolith.
- Connect customer intelligence to operational execution through Tasks and Appointments.
- Optimize for independent-dealer daily use before advanced enterprise administration.
- Prepare structured, AI-ready data without requiring AI for MVP workflows.
- Keep recommendations explainable and manager-overridable.
- Preserve identical workflow behavior in light and dark modes.
- Do not require CRM, DMS, SMS, email, or calendar integrations for day one.

---

## 3. Current Rollout Position

| Area | Current state | MVP gap |
| --- | --- | --- |
| Customers landing UI | Approved dashboard implemented with light/dark mode | Replace sample values with permission-filtered home read model |
| Customer 360 UI | Presentation shell implemented | Add route, durable customer read model, states, and commands |
| Customer schema | Minimum appointment-compatible `Customer` model exists | Extend ownership, contacts, preferences, and relationships additively |
| Customer search | Not implemented | Add organization-safe search and paginated list |
| Interactions/timeline | Presentation data only | Add durable interaction and activity events |
| Leads | Presentation data only | Add lifecycle, owner, stage, next action, and queues |
| Cases/SLA | Not implemented | Add case lifecycle, SLA, escalation, resolution |
| Vehicles/documents | Minimum Vehicle exists; no customer relationship | Add relationship and document requirement models |
| Task bridge | Task customer context is mostly text | Add durable customer-task link and bridge service |
| Appointment bridge | Customer participant model exists | Expose safe Customer workflow commands and projections |
| Manager intelligence | Presentation metrics only | Add risk, queue, coaching, and saved-view read models |
| Governance | Shared auth exists | Add Customers policies, audit, exports, and field classification |
| Rollout proof | Theme/browser smoke exists | Add full manager/staff customer workflow proof and runbook |

This is sufficient to begin implementation, not evidence of rollout readiness.

---

## 4. Milestone Sequence

| Order | Milestone | Suggested branch | Outcome |
| ---: | --- | --- | --- |
| 0 | Planning and design gate | `codex/customers-mvp-readiness-gate` | Architecture, roadmap, milestones, UI source of truth, and MVP boundary are accepted. |
| 1 | Trusted customer foundation | `codex/customers-trusted-foundation` | Durable customer CRUD, ownership, contacts, validation, and policy baseline. |
| 2 | Search, list, and Customer 360 | `codex/customers-search-360` | Real customer list/search and routed Customer 360 read model. |
| 3 | Customer memory | `codex/customers-activity-timeline` | Durable interactions, notes, next steps, and shared activity projection. |
| 4 | Lead intelligence and follow-up | `codex/customers-lead-follow-up` | Owned lead lifecycle with required next action and manager queues. |
| 5 | Cases, SLA, and escalation | `codex/customers-case-sla` | Governed customer issue workflow with deadlines and resolution. |
| 6 | Dealership relationship bridges | `codex/customers-relationship-bridges` | Vehicle, document, Task, and Appointment customer context is connected. |
| 7 | Manager intelligence and saved views | `codex/customers-manager-intelligence` | Explainable risk, prioritization, coaching, and durable shared views. |
| 8 | Enterprise controls | `codex/customers-enterprise-controls` | Permissions, audit, merge, exports, feature gates, and integration identities. |
| 9 | Day-one rollout gate | `codex/customers-mvp-day-one-readiness` | Full validation, browser proof, runbook, known limits, and go/no-go verdict. |

Merge each milestone into the shared Customers baseline before beginning the next unless a reviewed dependency requires stacking branches.

---

## 5. Milestone 0 - Planning And Design Gate

**Goal:** establish the implementation contract before deeper code.

Scope:

- Accept Customers as a first-class Dispatch Board module.
- Adopt the supplied front-page dashboard and Customer 360 mockups as UI composition sources of truth.
- Confirm persistent light and dark appearances.
- Accept the architecture decisions in `CUSTOMERS_ARCHITECTURE.md`.
- Approve MVP, post-MVP, and commercial-tier boundaries.
- Record the current implementation baseline honestly.

Exit gate:

- Architecture, roadmap, and implementation milestones are linked from the core docs.
- The UI shell has browser smoke proof.
- Planned workflow is not described as implemented behavior.

---

## 6. Milestone 1 - Trusted Customer Foundation

**Goal:** make customer identity safe enough for all later workflows.

Vertical slices:

1. Extend `Customer` with owner and operational profile fields through an additive migration.
2. Add normalized `CustomerContactPoint` records and primary-contact rules.
3. Add customer create service, policy, validation, repository, route, activity event, and tests.
4. Add customer update and owner assignment commands with optimistic concurrency.
5. Add archive behavior without destructive deletion.
6. Seed only non-sensitive synthetic customers for development and browser tests.

Required states:

- valid create/update
- duplicate warning candidate
- invalid contact input
- cross-organization denial
- inactive owner rejection
- stale update conflict
- archived customer handling

Exit gate:

- Managers can create, update, assign, and archive a durable customer.
- Staff visibility and mutation boundaries are server-enforced.
- Every mutation creates customer activity and audit metadata.
- Existing Appointment customer references remain valid.

---

## 7. Milestone 2 - Search, List, And Customer 360

**Goal:** make durable customers findable and operationally understandable.

Vertical slices:

1. Implement paginated customer list read model.
2. Implement normalized search by customer number, name, phone, email, VIN, and stock number.
3. Add filter and sort contracts for status, owner, source, last interaction, and next action.
4. Implement `/customers/[customerId]` with the approved Customer 360 shell.
5. Bind the profile header, overview, and right rail to a permission-filtered read service.
6. Add URL-addressable selected tabs and safe missing/restricted record behavior.
7. Replace dashboard identity metrics with an initial live home read model.

Required states:

- loading
- no customers
- no search results
- search error and retry
- customer not found
- restricted fields masked
- merged customer redirected to survivor
- stale dashboard freshness notice

Exit gate:

- An authorized user can find a customer and open Customer 360 without relying on sample constants.
- Search does not leak cross-organization or restricted information.
- Customer profile load and search performance meet the agreed local baseline.

---

## 8. Milestone 3 - Customer Memory

**Goal:** establish one trusted chronology of customer contact and commitments.

Vertical slices:

1. Add `CustomerInteraction`, `CustomerNote`, and `CustomerActivityEvent` models.
2. Add explicit Log Call, Log Message, Log Visit, Add Note, and Record Promise commands.
3. Require communication outcome and optional/required next step according to interaction type.
4. Add timeline read model with type, actor, channel, and date filters.
5. Project important customer events into the shared Activity Feed.
6. Add communication preference and opt-out enforcement.
7. Add quick-log UI from Customers home and Customer 360.

Required states:

- successful interaction
- missing outcome
- next step required
- contact channel restricted
- concurrent timeline update
- empty timeline
- activity projection failure handled transactionally or retryably

Exit gate:

- Staff can record a real interaction and see it immediately in Customer 360.
- Promised next steps are dated and owned.
- Important customer activity appears in the shared company memory.

---

## 9. Milestone 4 - Lead Intelligence And Follow-Up

**Goal:** prevent active leads from becoming ownerless or actionless.

Vertical slices:

1. Add Lead with source, stage, owner, priority, vehicle interest, and purchase timeframe.
2. Implement create, assign, stage transition, set-next-action, close, and reopen commands.
3. Require owner, stage, and dated next action for every active lead.
4. Add lead list and pipeline read models.
5. Add unassigned, untouched, overdue, high-intent, and aging manager queues.
6. Add lead-to-task and lead-to-appointment bridge commands.
7. Bind Customers home pipeline, source, recent lead, and KPI panels to live read models.

Required states:

- new lead
- duplicate customer candidate
- unassigned intake
- overdue follow-up
- stage transition denied
- lost reason required
- next action completed and renewed
- bridge retry without duplicate task/appointment

Exit gate:

- Every active lead has a visible owner, stage, and next action.
- Managers can see and intervene in neglected or high-intent leads.
- Lead commands leave timeline and activity evidence.

---

## 10. Milestone 5 - Cases, SLA, And Escalation

**Goal:** manage customer problems with explicit ownership and deadlines.

Vertical slices:

1. Add CustomerCase with type, priority, status, owner, response target, resolution target, and source.
2. Add organization-safe SLA rules using configured timezone and business hours.
3. Implement create, assign, acknowledge, investigate, wait, escalate, resolve, reopen, and cancel commands.
4. Add required resolution code and outcome notes.
5. Add case-to-task bridge with correlation and idempotency.
6. Add case board/list and manager breached-SLA queue.
7. Add case activity to Customer 360 and shared Activity.

Required states:

- within SLA
- warning threshold
- breached SLA
- escalation required
- waiting on customer
- waiting on dealership
- resolution incomplete
- unauthorized override
- reopened case

Exit gate:

- Every open case has owner, priority, SLA state, and next action.
- Escalation and resolution are explainable and audited.
- Operational execution can move to Tasks without losing case context.

---

## 11. Milestone 6 - Dealership Relationship Bridges

**Goal:** make Customer 360 reflect the actual dealership relationship.

Vertical slices:

1. Add `CustomerVehicle` relationship types: interested, test-driven, traded, purchased, financed, serviced, customer-owned, and BHPH account vehicle.
2. Add `DocumentRequirement` with type, status, owner, due time, and source.
3. Add durable `CustomerTaskLink` while retaining safe task snapshots/reference text.
4. Expose existing Appointment participant links through Customers read models and commands.
5. Add task, appointment, vehicle, and document tabs/rails to Customer 360.
6. Add title, registration, ID, insurance, payoff, contract, and proof-of-income document categories.
7. Add document-to-task follow-up bridge.

Required states:

- relationship already exists
- vehicle belongs to another organization
- ambiguous ownership
- missing document overdue
- appointment link unavailable by policy
- task bridge retry
- deleted/archived related record displayed historically

Exit gate:

- Staff can understand customer, vehicle, appointment, task, and document context from one profile.
- Cross-module links are durable, policy-safe, and correlation-backed.

---

## 12. Milestone 7 - Manager Intelligence And Saved Views

**Goal:** turn trusted customer data into explainable daily priorities.

Vertical slices:

1. Add explainable risk flags for overdue follow-up, title/document issue, complaint, no-show, payment signal, and stalled lead.
2. Add next-best-action rule catalog using deterministic signals and freshness.
3. Add manager queues and Customer home KPI/read models.
4. Add staff follow-up quality and workload summaries without opaque employee scoring.
5. Add private and shared server-backed saved views.
6. Add watched queues and manager-safe digest preparation.
7. Add freshness labels and drill-through links for every dashboard metric.

Required states:

- no risk
- multiple contributing risks
- stale source data
- recommendation overridden with reason
- shared view permission denied
- saved view schema version upgraded
- queue returns no work

Exit gate:

- Every priority and recommendation explains why it exists and when its data was refreshed.
- Managers can save, share, reopen, and act from operational queues.
- Dashboard values reconcile with their drill-through records.

---

## 13. Milestone 8 - Enterprise Controls

**Goal:** make the module governable and commercially extensible.

Vertical slices:

1. Complete customer permission capabilities and role mapping.
2. Add field-level visibility for operational, limited, restricted, and audit data.
3. Add controlled duplicate merge with preview, reason, survivor, and recovery evidence.
4. Add customer audit timeline for sensitive changes and exports.
5. Add safe CSV export with authorization and audit record.
6. Add integration identity/source-attribution contracts without requiring live adapters.
7. Add server-enforced feature entitlements for future product tiers.
8. Add retention and archive jobs with dry-run/simulation evidence.

Required states:

- field masked
- mutation denied
- merge conflict
- stale merge preview
- export denied or audited
- retention hold
- feature unavailable by entitlement
- integration identity collision

Exit gate:

- Customers policy tests cover manager, staff, owner, assigned-worker, restricted-role, and cross-organization behavior.
- Sensitive actions are append-only audited.
- Commercial preparation does not fork the application or weaken internal MVP usability.

---

## 14. Milestone 9 - Day-One Rollout Gate

**Goal:** convert implemented capability into an explicit release decision.

Quality evidence:

- Prisma generation and schema validation
- migration status and deployment rehearsal
- seed validation with synthetic data only
- typecheck and lint
- full unit and integration suites
- production build
- Customers browser workflows in light and dark modes
- full Dispatch Board end-to-end suite
- performance and accessibility checks at approved desktop/mobile viewports

Manager browser workflow:

1. Open Customers home and reconcile KPI drill-through.
2. Search for and open a customer.
3. Create or update a customer and assign an owner.
4. Record an interaction and next action.
5. Create/advance a lead and create a follow-up task or appointment.
6. Open/escalate/resolve a case.
7. Review related vehicle, document, task, and appointment context.
8. Apply and share a manager view.
9. Review risk, activity, and audit evidence.

Staff browser workflow:

1. Find an authorized customer.
2. View only permitted fields.
3. Record contact outcome.
4. Complete and renew a next action.
5. Update an owned lead or case within policy.
6. Create linked work without assigning unauthorized users.

Operational readiness:

- operator quick-start guide
- role and permission matrix
- duplicate/merge runbook
- case escalation runbook
- data recovery and rollback notes
- known limitations and deferred features
- named product, operations, and engineering signoff

Exit gate:

`CUSTOMERS_MVP_DAY_ONE_READINESS.md` records either **Approved for MVP rollout** with current evidence or **Held** with named blockers. There is no implied or provisional approval.

---

## 15. Day-One MVP Definition

Customers is rollout-ready only when:

- Customer identity, contact, ownership, and archive behavior are durable.
- Search and Customer 360 are permission-filtered and no longer depend on presentation constants.
- Interactions and next steps create trusted customer memory.
- Every active lead has owner, stage, and next action.
- Every open case has owner, priority, SLA state, and next action.
- Customer relationships to vehicles, documents, Tasks, and Appointments are visible and durable.
- Manager queues and recommendations are explainable and actionable.
- Shared saved views are server-backed and permission-safe.
- Sensitive changes and exports are audited.
- Light and dark modes preserve the same accessible workflow.
- Manager and staff end-to-end workflows pass on the same release baseline.
- Remaining scope is explicitly deferred.

---

## 16. Deferred Until After Day One

Do not block MVP on:

- full deal desking and lender workflow
- automated marketing journeys
- production SMS/email delivery adapters
- external CRM or DMS synchronization
- AI-generated outreach or autonomous lead assignment
- custom workflow builder
- unrestricted custom fields
- multi-tenant billing and subscription administration
- advanced attribution and forecasting
- full BHPH servicing/collections ledger
- native mobile applications
- white-label administration

The architecture supports later slices, but day-one value comes from trusted identity, follow-up, cases, dealership relationships, and operational handoffs.
