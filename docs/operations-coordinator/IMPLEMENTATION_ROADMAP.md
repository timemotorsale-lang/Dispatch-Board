# Operations Coordinator Implementation Roadmap

## Implementation strategy

Build the Operations Coordinator Workspace as a safe vertical slice first. Do not attempt every deep workflow at once.

The workspace should initially aggregate existing canonical records and link to established routes. Add write actions only where a safe backend path already exists.

## Milestone 1: Role foundation

Goal: make the role real.

Deliverables:

- Add/confirm `Operations Coordinator` role definition.
- Seed demo user if needed.
- Add role-aware landing route.
- Add navigation definition.
- Add capability defaults:
  - broad view permissions
  - lightweight create/update permissions
  - no protected approval/close/admin authority
- Tests for default landing and access boundaries.

Acceptance:

- Operations Coordinator logs in and lands on `/operations-coordinator` or approved route.
- Protected manager actions remain blocked.

## Milestone 2: Workspace read model

Goal: one front-desk snapshot.

Deliverables:

- Server read service that composes:
  - appointments
  - customer/vehicle search summaries
  - service intake waiting states
  - parts receiving summaries
  - paperwork/document queues
  - payment intake queue
  - sales/finance/rental placeholders if canonical services are not ready
  - assigned tasks
- No schema changes unless absolutely necessary.

Acceptance:

- Page renders without console errors.
- Empty state is useful.
- Unavailable domains show safe fallback.

## Milestone 3: Enterprise landing UI

Goal: direct-to-work, not management clutter.

Deliverables:

- Header and quick actions.
- KPI strip.
- Universal search panel.
- My Coordination Queue.
- Paperwork Command Center.
- Department Peek Panels.
- Escalation Router.

Acceptance:

- UI is compact and readable.
- Staff can quickly see what to touch next.
- User is not forced into specialist consoles for simple tasks.

## Milestone 4: Universal search and no-result create options

Goal: search before create.

Deliverables:

- Wire global operational search.
- Group results by record type.
- Safe no-result actions:
  - add customer
  - add vehicle
  - new appointment
  - start intake
  - upload document
  - route to manager

Acceptance:

- No duplicate customer/vehicle creation without search.
- Exact matches open safe routes.

## Milestone 5: Quick action flows

Goal: start and route common work.

Deliverables:

- New appointment link/action.
- Check-in vehicle link/action.
- Upload document link/action.
- Record payment intake draft/route.
- Receive parts simplified link/action.
- Verify insurance checklist action.
- Initiate rental checklist action.
- Start sales/finance packet placeholders or canonical links.

Acceptance:

- Actions either complete safely or route to canonical workflow.
- Protected final authority remains blocked.

## Milestone 6: Paperwork command center

Goal: make paperwork visible and controlled.

Deliverables:

- Sales packet checklist model/view.
- Finance packet checklist model/view.
- Insurance proof received state.
- Rental packet checklist.
- Payment intake/accounting route state.
- Missing signatures/documents list.

Acceptance:

- Coordinator can see what paperwork is missing.
- Manager/accounting/sales receive routed blockers.

## Milestone 7: Escalation router

Goal: every blocked task has an owner.

Deliverables:

- Escalation form.
- Department recipient list.
- Reason/urgency/requested action fields.
- Create task or route to existing task framework.

Acceptance:

- Every escalation produces a traceable work item.
- No blocked front-desk item becomes invisible.

## Milestone 8: Tests and reliability

Goal: safe release.

Deliverables:

- Unit tests:
  - role routing
  - capability boundaries
  - read model
  - queue ranking
  - UI render
  - search no-result actions
  - protected action blocking
- Run typecheck and focused tests.

Acceptance:

- Typecheck passes.
- Focused tests pass.
- No unrelated branch changes.

## Suggested implementation order in one prompt

1. Read all operations-coordinator docs.
2. Inspect existing role routing/navigation/capability patterns.
3. Add role foundation and tests.
4. Build read model from existing services.
5. Build UI shell.
6. Add quick action links to existing canonical routes.
7. Add queue ranking logic.
8. Add paperwork/peek/escalation sections.
9. Add tests.
10. Run validation.
11. Report files and verification.

## Risk controls

- Do not create duplicate domain systems.
- Do not add migrations unless unavoidable.
- Do not mutate financial/legal/repair authorization records without explicit existing service support.
- Do not replace manager/advisor/parts/technician authority.
- Prefer links and draft/preparation actions for deep workflows.
- Keep every action attributable and reversible where possible.
