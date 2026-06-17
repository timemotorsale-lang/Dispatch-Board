# AGENTS.md

This file defines the working rules for AI coding agents in the Time Motor Sales Dispatch Board repository.

## Project Mission

The Dispatch Board MVP is a responsive internal web app for Time Motor Sales that generates a daily team dispatch board from staff roles, duties, and task templates.

The product direction is:

- Managers can generate, review, adjust, assign, and approve work.
- Staff can see the full board, update their own tasks, add comments, and report blockers quickly from desktop or mobile.
- The board and activity feed should make the state of the day visible without requiring deep third-party integrations.
- Automation should be deterministic, explainable, and easy for a manager to override.

## Current State

This repository is currently documentation-first and pre-implementation.

- Treat `docs/ARCHITECTURE.md` as the target architecture, not as proof that code already exists.
- Do not describe planned features as completed work.
- When implementation begins, keep docs updated so the documented architecture and actual code do not drift apart.

## Read First

Before making meaningful changes, read the available project docs first.

Minimum required context:

- `docs/PRODUCT_SPEC.md`
- `docs/MVP_SCOPE.md`
- `docs/ARCHITECTURE.md`
- `docs/AGENTS.md`

Read these too when they exist:

- `README.md`
- `docs/ROADMAP.md`
- `docs/SETUP.md`

## Product And Architecture Rules

These are durable project constraints taken from the architecture and vibe-coding guide.

- Build the MVP around the daily dispatch workflow first.
- Prefer one deployable web app unless a later implementation constraint clearly justifies splitting services.
- Keep business rules server-side. UI controls can hide actions, but the server must be the source of truth.
- Keep automation simple and explainable. Recommendation logic should support the manager, not replace the manager.
- Do not add required third-party integrations in the MVP unless the product docs are updated first.
- Build in small vertical slices instead of isolated frontend-only or backend-only batches.
- Preserve the distinction between planned architecture and implemented behavior.

## Planned Stack

Unless the architecture is intentionally revised, prefer this stack:

- Next.js with React and TypeScript
- Tailwind CSS or project-local CSS modules, chosen once and used consistently
- PostgreSQL
- Prisma
- App-owned auth or Auth.js
- Platform cron plus manual trigger for daily board generation
- Short polling first for activity and board refresh, with streaming deferred unless needed

Do not introduce major framework or infrastructure changes casually. If a task appears to require one, explain the tradeoff before editing.

## Planned Repository Structure

Target structure from `docs/ARCHITECTURE.md`:

```text
docs/
prisma/
src/
  app/
  components/
  features/
  server/
  tests/
```

Structure responsibilities:

- `src/app` owns routes and page composition.
- `src/components` owns shared presentation building blocks.
- `src/features` owns feature-specific UI and client logic.
- `src/server/services` owns business workflows like daily generation and assignment recommendation.
- `src/server/repositories` owns database reads and writes.
- `src/server/policies` owns permission checks.
- `src/server/validation` owns request and domain validation.

Do not bury business logic only inside UI components.

## Core Domain Invariants

Protect these domain rules unless the product and architecture docs change deliberately.

- There is one `BoardDay` per business date.
- Daily generation must be idempotent and safe to retry.
- Manual tasks must never be deleted or overwritten by daily generation.
- Generated tasks should retain template references for duplicate prevention.
- Every task requires a due time.
- `Blocked` requires a blocker reason.
- Tasks that require manager approval must pass through `Ready for Review` before `Completed`.
- Staff can update their own assigned tasks, but server-side policy must enforce that boundary.
- Managers can assign, reassign, review, and manually trigger generation.
- Important state changes should create `ActivityEvent` records. The activity feed should be event-backed, not inferred from UI state.

## Recommendation And Generation Rules

When working on generation or assignment logic, preserve these priorities:

- Recommendation order is direct user duty match, then role match, then template owner, then workflow-area match, then manager review.
- Recommendation output should include a reason and short explanation that can be shown in the UI.
- Daily generation should load active users, determine duties, create missing tasks, skip duplicates, write an activity event, and record a generation run.
- Failure states should be visible and retryable instead of silently ignored.

## Workflow For Agents

Follow the vibe-coding loop:

1. Define one small task.
2. Gather the relevant context.
3. Plan before coding when the change is non-trivial.
4. Implement one scoped step.
5. Review the diff.
6. Run the relevant checks.
7. Update docs if behavior or architecture changed.

Do not ask to build the whole app at once. Work issue by issue and milestone by milestone.

## Task Sizing Rules

- Prefer small, reviewable changes.
- Do not make broad rewrites unless explicitly requested.
- Keep frontend, backend, database, and docs changes separated when practical.
- If a task is ambiguous or has hidden architectural consequences, plan first before editing.
- If a larger refactor seems necessary, explain it first instead of doing it by default.

For major features, prefer this order:

1. Plan
2. Core data model
3. Main workflow
4. UI shell for that workflow
5. Reliability states
6. Tests
7. Polish

## Prompt Shape To Prefer

When given a vague request, reshape the work internally around this format:

- Goal
- Context
- Constraints
- Done when

For bigger work, first inspect the project and produce a plan before making code changes.

## Coding Standards

Apply these standards once code exists:

- Follow the documented architecture before inventing new structure.
- Reuse existing patterns before introducing new ones.
- Keep changes minimal and targeted to the request.
- Avoid adding dependencies unless they are clearly necessary and justified.
- Update tests when behavior changes.
- Update docs when setup, architecture, workflow, or constraints change.
- Prefer explicit validation close to server entry points.
- Keep permission checks server-side.

## UI And UX Rules

For the MVP interface:

- Optimize for fast daily use by managers and staff.
- Desktop should make board state and activity easy to scan.
- Mobile should prioritize "my tasks", quick status changes, blocker updates, and comments.
- Reduce clutter and avoid burying important daily actions.
- Preserve responsiveness and avoid horizontal overflow.

Do not add decorative complexity at the expense of clarity or speed.

## Testing Expectations

Match test depth to the change.

When implementation exists, prioritize tests around:

- Daily board generation
- Duplicate prevention
- Assignment recommendation ordering
- Status transition rules
- Permission policy enforcement
- Activity event creation
- Manual generation retry behavior

If checks cannot be run, say so clearly and name what was not verified.

## Git And Change Safety

- Check the worktree before editing.
- Assume unrelated uncommitted changes belong to the user.
- Do not overwrite, revert, or clean up user changes unless explicitly asked.
- Make focused changes scoped to the task.
- Prefer small commits after successful, verified steps.
- Do not commit secrets, `.env` files, local databases, caches, or generated build output.
- Use descriptive branch names when branch creation is requested.

Git is the safety net. Use it to keep tasks isolated and reviewable.

## Review Rules

Before considering a task done, review for:

1. Unrelated edits
2. Broken edge cases
3. Missing validation
4. Permission regressions
5. Missing tests
6. UI regressions
7. Docs drift

Fix only issues directly related to the task unless the user asks for broader cleanup.

## Definition Of Done

A task is done only when all applicable items are true:

- The requested behavior works.
- The change is scoped and reviewable.
- No unrelated files were changed.
- Relevant tests or checks were run, or the gap was clearly reported.
- Docs were updated if setup, architecture, or behavior changed.
- Planned work is not presented as implemented work.

## When Creating Plans, Issues, Or Roadmaps

Keep work aligned to the intended build order from the guide:

1. Product definition
2. Technical architecture
3. Project scaffold
4. Core models
5. Core workflow
6. UI shell
7. Search and organization
8. Reliability
9. Polish
10. Release

Each issue or task should be small enough to complete without rewriting half the app.
