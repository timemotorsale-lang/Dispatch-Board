# My Tasks Implementation Build Sheet

> **Enterprise Appointment implementation:** This sheet remains the tracker for My Tasks. The Appointment Command Center uses [`docs/appointments/IMPLEMENTATION_ROADMAP.md`](appointments/IMPLEMENTATION_ROADMAP.md) and inherits this sheet’s build, UI, workflow, regression, test, and signoff discipline. Current Appointment progress is recorded in [`docs/appointments/README.md`](appointments/README.md).

## Program Rules

- Approved source of truth: the accepted `My Tasks` prototype and mockup-aligned route.
- Core v1 structure must remain intact:
  - left task queue
  - right inspector
  - expanded workspace
- No milestone is complete until build, review, regression, and testing checks pass.
- Visual polish should not override workflow clarity.
- Workflow additions should not clutter the main board.

## Roles

| Role | Responsibility |
| --- | --- |
| `Builder` | Implements ticket scope |
| `UI reviewer` | Checks fidelity to approved prototype/mockup |
| `Workflow reviewer` | Checks task logic, review flow, and manager behavior |
| `Regression reviewer` | Checks surrounding product stability |
| `Test reviewer` | Checks coverage and milestone pass/fail gates |

## Tracker

| Ticket | Milestone | Work Item | Owner | Depends On | Status | Signoff |
| --- | --- | --- | --- | --- | --- | --- |
| `M0-01` | `M0` | Freeze approved prototype and mockup as v1 visual reference | Builder | None | `Not Started` | `Pending` |
| `M0-02` | `M0` | Confirm v1 scope versus `v1.1` and deferred items | Workflow reviewer | `M0-01` | `Not Started` | `Pending` |
| `M0-03` | `M0` | Confirm production data and permission assumptions | Builder | `M0-02` | `Not Started` | `Pending` |
| `M0-04` | `M0` | Define milestone gate criteria and signoff flow | Test reviewer | `M0-03` | `Not Started` | `Pending` |
| `M1-01` | `M1` | Create production `My Tasks` page shell | Builder | `M0-04` | `Not Started` | `Pending` |
| `M1-02` | `M1` | Add navigation entry and route protection | Builder | `M1-01` | `Not Started` | `Pending` |
| `M1-03` | `M1` | Define task model, enums, and response shape | Builder | `M1-01` | `Not Started` | `Pending` |
| `M1-04` | `M1` | Add page-level loading, empty, and error states | Builder | `M1-03` | `Not Started` | `Pending` |
| `M1-05` | `M1` | Connect seeded or real production-shaped data source | Builder | `M1-03` | `Not Started` | `Pending` |
| `M2-01` | `M2` | Build compact list-first queue | Builder | `M1-05` | `Not Started` | `Pending` |
| `M2-02` | `M2` | Add task filter chips and counts | Builder | `M2-01` | `Not Started` | `Pending` |
| `M2-03` | `M2` | Add search behavior | Builder | `M2-01` | `Not Started` | `Pending` |
| `M2-04` | `M2` | Add sort behavior | Builder | `M2-01` | `Not Started` | `Pending` |
| `M2-05` | `M2` | Implement list/card toggle if retained in release scope | Builder | `M2-01` | `Not Started` | `Pending` |
| `M2-06` | `M2` | Add empty and filter-no-result states | Builder | `M2-02`, `M2-03` | `Not Started` | `Pending` |
| `M2-07` | `M2` | Tune queue width and top controls for desktop/laptop fit | Builder | `M2-01` | `Not Started` | `Pending` |
| `M3-01` | `M3` | Bind selected queue item to inspector | Builder | `M2-01` | `Not Started` | `Pending` |
| `M3-02` | `M3` | Build inspector header and summary strip | Builder | `M3-01` | `Not Started` | `Pending` |
| `M3-03` | `M3` | Build inspector tabs | Builder | `M3-01` | `Not Started` | `Pending` |
| `M3-04` | `M3` | Implement overview panel | Builder | `M3-03` | `Not Started` | `Pending` |
| `M3-05` | `M3` | Implement task information and quick actions panels | Builder | `M3-03` | `Not Started` | `Pending` |
| `M3-06` | `M3` | Keep selected task and tab state synchronized | Builder | `M3-01`, `M3-03` | `Not Started` | `Pending` |
| `M4-01` | `M4` | Implement update form rendering from real fields | Builder | `M3-04` | `Not Started` | `Pending` |
| `M4-02` | `M4` | Add form validation and required-field logic | Builder | `M4-01` | `Not Started` | `Pending` |
| `M4-03` | `M4` | Implement save and update submission | Builder | `M4-02` | `Not Started` | `Pending` |
| `M4-04` | `M4` | Implement checklist persistence | Builder | `M4-01` | `Not Started` | `Pending` |
| `M4-05` | `M4` | Add manager actions: reassign, review, send back, complete, escalate | Builder | `M3-05` | `Not Started` | `Pending` |
| `M4-06` | `M4` | Enforce workflow transitions and role restrictions | Builder | `M4-05` | `Not Started` | `Pending` |
| `M5-01` | `M5` | Open expanded workspace from inspector | Builder | `M3-03` | `Not Started` | `Pending` |
| `M5-02` | `M5` | Preserve selected task context into workspace | Builder | `M5-01` | `Not Started` | `Pending` |
| `M5-03` | `M5` | Build workspace tabs and layouts | Builder | `M5-01` | `Not Started` | `Pending` |
| `M5-04` | `M5` | Implement overview, updates, checklist, and manager tabs | Builder | `M5-03` | `Not Started` | `Pending` |
| `M5-05` | `M5` | Implement dependencies and files tabs if in v1 scope | Builder | `M5-03` | `Not Started` | `Pending` |
| `M5-06` | `M5` | Add clean return path back to inspector | Builder | `M5-02` | `Not Started` | `Pending` |
| `M6-01` | `M6` | Implement audit history | Builder | `M4-03`, `M4-05` | `Not Started` | `Pending` |
| `M6-02` | `M6` | Implement saved views if included in release | Builder | `M2-02` | `Not Started` | `Pending` |
| `M6-03` | `M6` | Implement bulk actions if included in release | Builder | `M2-01`, `M4-06` | `Not Started` | `Pending` |
| `M6-04` | `M6` | Implement attachment handling if included in release | Builder | `M5-05` | `Not Started` | `Pending` |
| `M6-05` | `M6` | Implement escalation checkpoints and reporting hooks | Builder | `M4-06` | `Not Started` | `Pending` |
| `M7-01` | `M7` | Run visual QA against approved prototype | UI reviewer | `M1-01` through `M6-*` | `Not Started` | `Pending` |
| `M7-02` | `M7` | Run cross-role workflow QA | Workflow reviewer | `M4-06`, `M5-06` | `Not Started` | `Pending` |
| `M7-03` | `M7` | Run responsive and browser QA | Regression reviewer | `M2-07`, `M3-06` | `Not Started` | `Pending` |
| `M7-04` | `M7` | Fix critical and high-priority defects | Builder | `M7-01`, `M7-02`, `M7-03` | `Not Started` | `Pending` |
| `M7-05` | `M7` | Final release-readiness check and signoff | Test reviewer | `M7-04` | `Not Started` | `Pending` |

## Milestone Gates

Use this checklist before moving to the next milestone.

| Gate | Result |
| --- | --- |
| Build complete | `Yes / No` |
| UI fidelity approved | `Yes / No` |
| Workflow approved | `Yes / No` |
| Regression clear | `Yes / No` |
| Tests passing | `Yes / No` |
| Critical issues open | `Yes / No` |
| Approved to continue | `Yes / No` |

## Recommended Execution Order

1. `M0`
2. `M1`
3. `M2`
4. `M3`
5. `M4`
6. `M5`
7. Decide whether `M6` is part of `v1` or `v1.1`
8. `M7`

## Recommended v1 Split

Include in `v1`:

- `M1` through `M5`

Decide separately for `v1` or `v1.1`:

- `M6-02` saved views
- `M6-03` bulk actions
- `M6-04` attachments
- `M6-05` escalation and reporting hooks

Strongly recommended for enterprise maturity:

- `M6-01` audit history

## Immediate Next Step

Start execution with `M0` and use this document as the working tracker during implementation.
