# Manager Review Command Center Planning Package

The Manager Review Command Center is the decision, quality-control, and operational-intervention surface inside the Time Motor Sales Dispatch Board.

It is not a second task system and it is not an employee performance-review product. It converts task, evidence, deadline, dependency, customer, vehicle, and operational signals into an explainable management-attention queue.

## Read Order

1. [`MANAGER_REVIEW_UI_SOURCE_OF_TRUTH.md`](MANAGER_REVIEW_UI_SOURCE_OF_TRUTH.md) - approved visual reference, required desktop composition, interaction contract, responsive direction, and UI acceptance gate.
2. [`MANAGER_REVIEW_ARCHITECTURE.md`](MANAGER_REVIEW_ARCHITECTURE.md) - module boundary, domain model, services, commands, read models, permissions, events, and architecture decisions.
3. [`MANAGER_ATTENTION_ENGINE.md`](MANAGER_ATTENTION_ENGINE.md) - formal deterministic eligibility, classification, ranking, explanation, and calibration algorithm.
4. [`MANAGER_REVIEW_ROLLOUT_ROADMAP.md`](MANAGER_REVIEW_ROLLOUT_ROADMAP.md) - phased product path from the current review page to a trusted command center.
5. [`MANAGER_REVIEW_IMPLEMENTATION_MILESTONES.md`](MANAGER_REVIEW_IMPLEMENTATION_MILESTONES.md) - small vertical implementation slices, dependencies, validation evidence, and exit gates.

## Product Position

The Dispatch Board answers:

- What work exists?
- Who owns it?
- What is its current status?

The Manager Review Command Center answers:

- What management decision or intervention is required next?
- What completed work has not passed quality control?
- What is aging, blocked, incomplete, or exposing the dealership to risk?
- What evidence supports approval?
- What must happen next, by when, and who owns it?

The operating principle is:

> Put the manager's attention on decisions, risks, quality control, and bottlenecks instead of making the manager search for information or repeatedly request updates.

## Current Truth

As of July 12, 2026:

- `/manager-review` is implemented and manager-restricted.
- The current page exposes ready-for-review work and management-attention buckets.
- Managers can approve completion, return work to `IN_PROGRESS`, change eligible statuses, and reassign tasks.
- Tasks already support ownership, due time, priority, workflow area, checklist items, comments, blocker context, `readyForReviewAt`, `reviewedByUserId`, and activity events.
- Approval-required tasks must pass through `READY_FOR_REVIEW` before `COMPLETED`.
- Explainable assignment recommendations already exist.
- The approved three-pane queue, ordered worklist, and persistent workbench now have an initial live implementation using current task facts and existing authorized actions.
- Current ordering is an explicitly interim, server-side task-priority and task-due-time adapter; it is not presented as MAE-1.
- Unsupported Customer Risk, Returned Work, formal review SLA, evidence-request, and escalation capabilities are visibly unavailable rather than populated with sample data.
- A durable review-case model, structured decision records, evidence submissions, review SLA policies, formal risk signals, attention evaluation snapshots, and MAE-1 ranking remain planned.

Use [`../CURRENT_IMPLEMENTATION_STATUS.md`](../CURRENT_IMPLEMENTATION_STATUS.md) as the evidence-based implementation record. These documents describe accepted target direction and do not prove completed behavior.

## Non-Negotiable Guardrails

- The manager remains the final decision-maker.
- Ranking must be deterministic, explainable, versioned, testable, and overridable.
- Critical policy rules outrank numeric scoring.
- Business rules and permissions are enforced server-side.
- Every material review decision creates durable audit evidence.
- Operational review remains separate from long-term employee performance evaluation.
- Honest blocker reporting must not automatically become a negative employee score.
- The module extends the existing task domain; it does not create a parallel task lifecycle.
- Initial implementation uses the existing modular monolith and requires no new infrastructure service.

## Suggested Branch Sequence

Start with:

`codex/manager-review-command-center-foundation`

Create later milestone branches only when the preceding gate is accepted. The detailed sequence is in the implementation milestones document.
