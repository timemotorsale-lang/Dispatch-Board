# Appointment MVP Rollout Roadmap

**Purpose:** Sequence the Appointment Command Center from the current enterprise implementation state to a day-one MVP rollout.  
**Rule:** Build one slice at a time. Do not widen scope until the active gate is proven.

## Architecture Spine

The MVP should preserve the enterprise architecture while narrowing what must be proven for rollout:

- UI shell and read model: `/appointments` renders the Appointment Command Center from a permission-filtered read model.
- Command boundary: appointment mutations flow through audited server commands with idempotency, optimistic concurrency, reason capture, and policy checks.
- Scheduling authority: readiness, staff, resource, hard-block, and warning decisions are server-authoritative.
- Task integration: task-created appointment drafts remain linked to the source task and visible in both workflows.
- Audit and history: appointment actions must leave command-ledger and activity evidence.
- MVP tests and gates: every rollout claim needs either automated coverage, browser smoke proof, or documented operator evidence.

## Milestone Sequence

| # | Milestone | Branch | Outcome |
| ---: | --- | --- | --- |
| 1 | MVP scope audit | `codex/appointment-mvp-readiness-gate` | Defines day-one promise, deferred scope, rollout gaps, and readiness criteria. |
| 2 | Console smoke and visual gate | `codex/appointment-console-smoke-gate` | Proves `/appointments` opens, is compact enough for day-one use, shows schedule/draft lanes, and keeps the detail rail usable. |
| 3 | Create and schedule commit reliability | `codex/appointment-schedule-commit-reliability` | Proves a draft can move to scheduled when readiness passes and cannot move when blocked. |
| 4 | Lifecycle command MVP | `codex/appointment-lifecycle-mvp-actions` | Proves day-one edit, reschedule, cancel, start, finish, no-show, and outcome actions where supported. |
| 5 | Task-to-appointment handoff | `codex/appointment-task-handoff-mvp` | Initial MVP handoff proof implemented: source task creates appointment draft, task detail shows linked appointment context, Appointment Board shows linked task context, and the operator can return to the source task. |
| 6 | Exception queues and rail clarity | `codex/appointment-exception-queues-rail` | Turns unscheduled, warning, failed automation, no-show, and follow-up states into clear operating lanes. |
| 7 | Permissions and safety gate | `codex/appointment-permission-safety-gate` | Proves manager, owner, participant, viewer, administrator, and system-action boundaries. |
| 8 | Day-one readiness gate | `codex/appointment-mvp-day-one-readiness` | Final release evidence: migrations, tests, build, browser smoke, operator runbook, known deferments, and release verdict. |

## Milestone 1 - MVP Scope Audit

Status: Complete for this slice.

Definition of done:

- Day-one MVP promise is written.
- Deferred enterprise scope is written.
- P0/P1/P2 rollout gaps are identified.
- Main appointment README links to the MVP rollout docs.
- Release checklist includes an Appointment Command Center day-one gate.

## Milestone 2 - Console Smoke And Visual Gate

Goal: make the first operator experience trustworthy before deeper workflow work.

Implementation targets:

- Confirm `/appointments` opens from the app shell for a manager.
- Confirm the approved command-center composition is visible: header, date controls, schedule area, unscheduled lane, and right rail.
- Confirm live-data, empty, loading, and error states are clear.
- Confirm selected appointment detail does not force unnecessary page scrolling at the day-one desktop viewport.
- Add or update Playwright smoke coverage for route load, selection, unscheduled draft visibility, and detail-rail command presence.

Exit gate:

- Browser pass captured.
- Smoke test passes locally.
- Any visual debt is documented as P1/P2 rather than hidden.

## Milestone 3 - Create And Schedule Commit Reliability

Goal: prove that scheduling is safe, not just displayed.

Implementation targets:

- Create a draft appointment from `/appointments`.
- Create a linked draft appointment from a task.
- Show why a draft cannot be scheduled when required readiness inputs are missing.
- Schedule an eligible draft through the command boundary.
- Prove hard blocks stop schedule commit.
- Prove warning-level conditions require an authorized override reason.
- Keep held resource reservations consistent during schedule commit.

Exit gate:

- Draft-to-scheduled happy path passes in browser automation.
- Blocked schedule path passes in browser automation or focused command tests.
- Warning override path has explicit reason evidence.

## Milestone 4 - Lifecycle Command MVP

Goal: make day-one appointment operations actionable after scheduling.

Implementation targets:

- Confirm edit and reschedule commands are available only when policy allows.
- Confirm cancel/no-show/start/finish/outcome commands capture required reasons.
- Confirm follow-up task or follow-up appointment creation from outcome where implemented.
- Confirm appointment history updates after each lifecycle command.

Exit gate:

- Lifecycle command coverage exists for the day-one supported commands.
- Unsupported enterprise commands are hidden, disabled with clear explanation, or documented as deferred.

## Milestone 5 - Task-To-Appointment Handoff

Goal: make appointments feel native to Dispatch Board, not bolted on.

Status: Initial MVP handoff proof implemented on `codex/appointment-task-handoff-mvp`; richer linked-work actions and final schedule-depth coverage remain.

Implementation targets:

- Source task creates linked unscheduled appointment draft.
- Appointment detail rail shows linked task context.
- Task detail shows linked appointment context.
- Activity history records the handoff on both sides.
- Follow-up outcomes create the correct linked task or appointment draft.

Exit gate:

- Manager can move from task to appointment and back without losing context.
- The linked-work audit trail is visible enough for day-one operations.

## Milestone 6 - Exception Queues And Rail Clarity

Goal: turn complexity into operator guidance.

Implementation targets:

- Define day-one lanes for unscheduled drafts, warnings, blocked schedule attempts, no-show follow-ups, and failed automation.
- Put the next safe command above secondary detail in the right rail.
- Use plain-language copy for readiness, staff, resource, and linked-task blockers.
- Avoid exposing enterprise-only controls that create noise during MVP.

Exit gate:

- A manager can understand the next action for each exception without reading documentation.

## Milestone 7 - Permissions And Safety Gate

Goal: prevent unsafe appointment mutations.

Status: Initial MVP permission safety and cross-location search evidence implemented through `codex/appointment-cross-location-search-proof`; direct-detail and broader automation evidence remain rollout hardening items.

Implementation targets:

- Manager can mutate eligible appointments.
- Owner can mutate only eligible owned appointments.
- Participant and viewer cannot perform manager-only appointment mutations.
- Appointment administrator configuration rights do not imply live appointment mutation rights.
- System automation can perform only explicitly allowed system actions.

Exit gate:

- Permission matrix has MVP-aligned automated or documented acceptance evidence.

## Milestone 8 - Day-One Readiness Gate

Goal: decide whether the Appointment Console is ready to roll out.

Implementation targets:

- Database generation, validation, migration status, typecheck, lint, tests, build, and E2E pass.
- Browser smoke evidence is recorded.
- Operator runbook is written for day-one appointment use.
- Known limitations are documented and aligned with deferred MVP scope.
- Release verdict is recorded in `APPOINTMENT_MVP_DAY_ONE_READINESS.md`.

Exit gate:

- Appointment Console is either explicitly approved for MVP rollout or explicitly held with named blockers.

## Sequencing Rule

Do not merge broad appointment feature work into the MVP path unless it strengthens one of the gates above. The fastest path to rollout is not more scope; it is proving that the smallest safe Appointment Command Center works reliably on day one.
