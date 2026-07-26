# Technician Workspace Page and Record Routing Matrix

**Product:** Time Motor Sales Dispatch Board
**Program:** Technician Experience Optimization
**Version:** `1.0.0`
**Status:** Draft for product-owner review
**Date prepared:** July 25, 2026
**Approved execution UI:** [`TECHNICIAN_REPAIR_WORKBENCH_UI_SOURCE_OF_TRUTH.md`](TECHNICIAN_REPAIR_WORKBENCH_UI_SOURCE_OF_TRUTH.md)
**Implementation status rule:** A documented target route is not implemented merely because it appears in this matrix. Current and target states are identified separately.

---

## 1. Proposed decision

The technician experience uses three screens:

1. **My Work** — assigned-work landing and triage.
2. **Available Work** — eligible claimable-work queue.
3. **Technician Repair Workbench** — one repair job's execution surface.

These are not three competing workbenches. The first two select and route work. The third performs repair work.

For a specialist diagnostic case, the Technician Repair Workbench opens the linked Diagnostics workspace with shared context. Diagnostics owns diagnostic evidence and reasoning but does not own the repair order or replace the repair workbench.

## 2. Page and record routing matrix

| Page or surface | Primary roles | Canonical record or projection | Approved entry route | Approved next route | Prohibited duplication | Current repository state |
| --- | --- | --- | --- | --- | --- | --- |
| Technician My Work | Technician; manager may inspect by permission | Assignment projection from `Task`, `RepairJob`, current `RepairJobDispatch`, and waiting/review state | Role-aware sign-in landing; `/my-tasks`; Back to My Work | Active repair assignment → Technician Repair Workbench; general task → Generic Task Detail; no assignment → Available Work | Must not copy concern, work performed, repair outcome, parts ledger, diagnosis, or evidence | `/my-tasks` exists; role simplification and repair-aware routing require conformance work |
| Available Work | Eligible technician; dispatcher/manager oversight | Read model of claimable `Task` and `RepairJob` candidates; claim remains an atomic assignment/dispatch action | My Work `Find Work`; no-current-work state; approved notification | Successful claim → authoritative destination, normally Technician Repair Workbench | Must not invent work, expose ineligible jobs, rank employees, or create a second task/job when claimed | Available-work architecture is approved; dedicated technician view and claimable engine remain planned/partial |
| Technician Repair Workbench | Assigned or eligible claiming technician; manager/advisor read access as permitted | One `RepairJob` with parent `RepairOrder`, current dispatch/labor, linked Task, Parts, Evidence, QC, and optional diagnostic case | My Work; Available Work after claim; Shop Dispatch; Repair Order Workbench; authorized deep link | QC, advisor/manager review, Parts, Diagnostics, next job, or My Work according to outcome | Must not create a second repair order, vehicle record, parts ledger, diagnostic case copy, or generic completion record | Approved source of truth; dedicated canonical route is proposed and not yet claimed as complete |
| Repair Order Workbench | Service advisor; shop manager; dispatcher; permitted technician read-through | One `RepairOrder` and its `RepairJob` children, authorization, estimate, QC, release, and activity | Check-in completion; Repair Orders list; Shop & Recon; `/vehicles/repair-workbench?repairOrderId=:id` | Selected assigned job → Technician Repair Workbench; diagnostics, Parts, QC, release, or customer handoff | Must not become the technician's second repair-entry form or copy job closeout | Implemented route exists at `/vehicles/repair-workbench`; conformance continues under its approved source |
| Vehicle Service Intake | Service advisor; permitted manager | `Customer`, `Vehicle`, optional `Appointment`, `ServiceVisit`, and new governed `RepairOrder` | Shop & Recon `Check In Vehicle`; `/vehicles/repair-orders?intakeSource=WALK_IN` | Successful check-in → Repair Order Workbench | Must not prescribe diagnosis, create repair-job checklists prematurely, or duplicate customer/vehicle/appointment/repair order | Approved and implemented foundation exists |
| Shop Dispatch | Dispatcher; shop manager; limited technician visibility | Dispatch/capacity projection and `RepairJobDispatch` commands | Shop & Recon; Repair Order Workbench; `/vehicles/shop-dispatch` | Assignment accepted → Technician My Work and Technician Repair Workbench | Must not store separate repair scope, technician notes, or job status | Implemented route exists |
| Quality Control | QC inspector; authorized technician or manager by policy | Quality inspection linked to `RepairOrder` and `RepairJob` | Accepted technician completion; Shop & Recon; `/vehicles/quality-control` | Pass → release/handoff; fail → same RepairJob or governed corrective job and Technician Workbench | Must not overwrite technician evidence or create an unrelated task without record linkage | Implemented route exists |
| Diagnostics Command Center | Diagnostic technician; advisor/manager with role-specific access | Diagnostic case queue and evidence/reasoning projections | `/diagnostics`; Workbench `Diagnostics & Tools`; authorized case notification | Selected case → Diagnostic Case/Troubleshooting; governed repair handoff → Repair Order/Technician Workbench | Must not own or duplicate `RepairOrder`, `RepairJob`, customer concern, authorization, estimate, Parts, or QC | First-class console and substantial diagnostic foundation exist |
| Diagnostic Case / Troubleshooting | Assigned diagnostic technician; authorized reviewer | One diagnostic case, immutable observations, measurements, tests, hypotheses, conclusions, and verification | Linked repair job; Diagnostics queue; `/diagnostics/cases/:caseId`; `/diagnostics/cases/:caseId/troubleshooting` | Governed finding/handoff → Advisor Review, Repair Order Workbench, or linked Technician Repair Workbench | Must not silently convert a hypothesis into repair authorization or maintain a parallel repair job | Implemented specialist routes and backend controls exist |
| Generic Task Detail | General staff; task assignee; manager/reviewer | One general `Task`, checklist, comments, activity, collaborators, and approval requirements | My Work general task; Tasks Console; `/tasks/:id` | Back to My Work/Tasks; specialist-linked task redirects or links to its authoritative workbench | Must not collect repair-specific concern, diagnosis, parts, repair correction, or QC when a RepairJob owns them | Implemented; specialist-routing rule requires explicit conformance |
| Task Intake | Manager and other authorized task creators | New general `Task` or governed concern-resolution package | `/tasks/intake` or approved launcher | Created general task → Generic Task Detail; specialist request → authoritative specialist intake | Must not be used to create a second repair order, repair job, diagnostic case, customer, or vehicle | Implemented general intake foundation exists |
| Tasks Console | Manager/dispatcher and authorized staff | Search, queue, saved-view, and attention projection over `Task` | `/tasks` | General task → Generic Task Detail; linked specialist task → authoritative specialist page | Must not become another technician repair workbench or own specialist record data | Implemented/expanding task console |
| Vehicle 360 | Advisors, managers, technicians, and other roles through permission lenses | Canonical `Vehicle` context and linked-record projection | Vehicle search; repair/intake/workbench links; `/vehicles/360/:id` | Relevant linked authoritative record | Must not duplicate child records or offer unrestricted editing across domains | Implemented foundation exists |
| Vehicle Execution Workbench | Inventory/recon staff; manager; authorized reviewer | Vehicle-centered `InventoryWorkPacket`, linked Task, Evidence, Parts, and lifecycle context | Vehicle 360; Inventory Lifecycle; `/vehicles/:id/workbench` | Inventory QC, manager review, next inventory task, or Vehicle 360 | Must not execute a customer repair `RepairJob` or replace the Technician Repair Workbench | Existing approved inventory workbench and route remain separate |
| Manager Review | Manager/reviewer | Review projection over authoritative Task, repair, inventory, approval, or exception records | Review notification; My Work/Tasks; `/manager-review`; exception handoff | Approve/return/route to authoritative originating workbench | Must not become the source record or copy staff evidence into a manager-only shadow record | Implemented general manager review foundation exists |

## 3. Proposed canonical route for the approved Technician Repair Workbench

The dedicated target route is:

```text
/vehicles/repair-jobs/:repairJobId/workbench
```

Why it is job-scoped:

- a repair order may contain multiple repair jobs;
- assignment, labor, parts, evidence requirements, completion, and QC readiness operate at job level;
- the technician must execute one clearly bounded unit of work;
- the parent repair order remains accessible but does not become a second technician form.

Until this route is implemented and verified, existing pages must not be represented as conforming merely because they can display some repair data.

## 4. Authoritative routing resolver

Every queue, notification, saved view, global search result, and linked-work control should resolve the selected record before choosing a page:

```text
RepairJob or repair-execution Task
  -> /vehicles/repair-jobs/:repairJobId/workbench

DiagnosticCase or diagnostic-execution Task
  -> /diagnostics/cases/:caseId/troubleshooting

InventoryWorkPacket or inventory-execution Task
  -> /vehicles/:vehicleId/workbench?inventoryUnitId=:inventoryUnitId

RepairOrder without a selected job
  -> /vehicles/repair-workbench?repairOrderId=:repairOrderId

Review or approval item
  -> /manager-review with authoritative record context

General Task
  -> /tasks/:taskId
```

The resolver follows the linked canonical record, not the page from which the user happened to click.

## 5. Record relationship rules

### Service intake to repair execution

```text
Customer + Vehicle + optional Appointment
  -> ServiceVisit
  -> RepairOrder
  -> authorized RepairJob(s)
  -> RepairJobDispatch
  -> Technician Repair Workbench
  -> Quality Inspection
  -> RepairOrder release and handoff
```

### Task relationship

A `Task` may provide assignment, due time, checklist, collaboration, or manager-review accountability. When the task represents specialist repair execution, it links to the `RepairJob` and routes there. It does not copy the specialist record's fields.

### Diagnostic relationship

An unresolved concern may create or link a diagnostic case. The diagnostic case receives references to the vehicle, service visit, repair order, repair job when applicable, original concern, evidence, and authorization boundary. It returns governed findings, conclusions, verification, and repair-handoff references without replacing those parent records.

### Evidence relationship

Evidence is stored once and linked to every authorized subject that needs it. A photo or document does not need to be re-uploaded merely because an advisor, technician, diagnostician, manager, Parts user, or QC inspector views it from a different page.

## 6. Prohibited duplication register

The following are prohibited:

1. A second technician repair form inside Generic Task Detail.
2. A second repair order embedded in a Task, diagnostic case, Vehicle Workbench, or uploaded document.
3. Copies of the customer's concern that can diverge from the intake/repair-order record.
4. A separate technician notes record with no `RepairJob` and author/timestamp linkage.
5. Parts status inferred from free text instead of the Parts ledger.
6. A diagnostic case treated as repair authorization or a replacement repair order.
7. QC performed by changing a generic task status without an authoritative quality inspection.
8. Uploading the system's own repair order as the primary method of attaching it to technician work.
9. Separate “complete,” “unable,” or “needs diagnosis” submissions on multiple pages for the same job.
10. Queue pages mutating specialist records through client-only state.
11. Vehicle Execution Workbench and Technician Repair Workbench being presented as interchangeable.
12. Manager Review copying evidence or decisions into a shadow record instead of linking and commanding the authoritative record.

## 7. Technician navigation contract

The role-aware technician shell should expose only:

- **My Work**
- **Available Work**
- **Diagnostics & Tools**

Contextual links inside a job may expose:

- Work Order;
- Vehicle 360;
- Parts;
- Evidence;
- manager/advisor direction;
- Quality Control status.

Broad Inventory Console, administrative, reporting, customer, approval, and management navigation must not be shown to a technician without a separate permitted responsibility. Permission still applies on the server even when navigation is hidden.

## 8. Saved views and deep links

Saved views are reusable filters over a queue. They do not own records and do not create another destination. Selecting an item from a saved view must use the authoritative routing resolver in Section 4.

Every deep link must:

- resolve organization and location scope;
- verify record permission;
- resolve the current canonical record and version;
- redirect a superseded or alias route safely;
- show an honest unavailable, forbidden, stale, or deleted state;
- preserve a safe return route to the user's originating queue.

## 9. Acceptance checks for implementation

Implementation is conforming only when:

1. a technician signs in and lands on My Work;
2. the technician can reach an active job in one clear action;
3. Available Work shows only eligible claimable work with an explanation;
4. claiming is atomic and cannot double-assign a job;
5. a repair-linked task opens the Technician Repair Workbench, not a competing form;
6. the linked repair order opens without re-upload or re-entry;
7. concern, authorization, parts, evidence, diagnosis, and QC read from authoritative records;
8. incomplete and further-diagnosis outcomes capture a usable management decision packet;
9. completed work routes to authoritative QC;
10. all consequential commands are server-authorized, idempotent, version-aware, audited, and recoverable;
11. keyboard, responsive, loading, empty, unavailable, conflict, and permission states are verified;
12. no prohibited duplication in Section 6 remains.

## 10. Change control

Any new page in the technician, repair, diagnostics, Parts, QC, task, or vehicle-execution path must be added to this matrix before implementation if it introduces a new record owner, entry route, exit route, or mutation.

Changes that create overlapping ownership, a second execution form, or a new canonical record require explicit architecture and product-owner approval.
