# Tasks MVP Day-One Readiness

**Branch:** `codex/tasks-mvp-day-one-readiness`  
**Date:** 2026-07-09  
**Scope:** Final readiness gates for the Tasks Operations Console and adjacent day-one task workflows.

## MVP Promise

The Tasks console can be rolled out as the day-one command center when these promises are true:

- Managers can scan the compact `/tasks` console without page-level scrolling at the target desktop viewport.
- Managers can create, assign, reassign, block, review, and complete task work.
- Staff can create their own tasks from My Tasks and update assigned work.
- Blocked, overdue, waiting, ready-for-review, unassigned, and department queues are visible and actionable.
- Comments, checklist, and activity history provide operational evidence.
- Saved views are durable shared team views, not local browser-only state.

## Durable Shared Saved Views

Saved views are now a formal MVP promise.

- Data source: `TaskSavedView`.
- API: `/api/tasks/saved-views`.
- Read access: any authenticated user.
- Create/delete access: managers.
- Stored fields: queue filter, department filter, list/board mode, group mode, search text, and visible columns.
- Smoke coverage: the daily workflow E2E creates, applies, and deletes a shared saved view.

## Operator Day-One Runbook

1. Sign in as a manager and open `/tasks`.
2. Confirm `Task Operations Console` appears under `Tasks`.
3. Confirm the first list page shows `1 to 8` tasks and the right rail is visible.
4. Create or verify the day board.
5. Create one manager task with due time and owner.
6. Save a shared saved view for the active filter/search state.
7. Apply the shared saved view and confirm the visible filters return.
8. Delete the test saved view if it was created only for verification.
9. Sign in as staff and confirm My Tasks allows self-created work.
10. Record any visual, permission, or workflow exceptions before rollout.

## Validation Commands

Use these gates before merging this branch:

```powershell
npm.cmd run db:validate
npx.cmd prisma migrate status
npm.cmd run typecheck
npm.cmd run lint
npm.cmd exec vitest run src/tests/unit/task-saved-views-service.test.ts src/tests/unit/task-saved-views-route.test.ts src/tests/unit/tasks-console-screen.test.tsx src/tests/unit/task-create-service.test.ts src/tests/unit/task-create-route.test.ts src/tests/unit/my-tasks-screen.test.tsx src/tests/unit/my-tasks-service.test.ts
npm.cmd run test:e2e
```

## Known Deferments

These are not day-one blockers:

- Custom workflow builder.
- Advanced SLA/escalation engine.
- Advanced analytics.
- DMS/CRM/Asana integrations.
- Tenant/location administration beyond the current single-location MVP posture.
- Enterprise audit-log expansion beyond current activity events.

## Rollout Verdict Template

Record the final result here before merge:

```text
Database migration status: PASS - `npx.cmd prisma migrate status` reports database schema is up to date.
Task-focused tests: PASS - saved views, console, create, My Tasks, and route coverage passed.
Full typecheck: PASS - `npm.cmd run typecheck`.
Full lint: PASS - `npm.cmd run lint`.
Full unit/integration suite: PASS - 125 files and 821 tests passed.
Production build: PASS - `npm.cmd run build`.
Browser/E2E smoke: PASS - 3 Playwright workflows passed, including compact `/tasks` and shared saved-view create/apply/delete.
Manager permission check: PASS - manager create/status/review/shared-view flows covered.
Staff permission check: PASS - staff self-work, comments, status update, and review handoff covered.
Known exceptions: Appointment scheduling commit is not part of the Tasks day-one gate; E2E keeps the task-to-appointment draft/link proof.
Final verdict: Tasks Operations Console is ready to merge as the day-one MVP rollout foundation.
```
