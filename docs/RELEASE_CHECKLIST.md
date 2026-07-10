# MVP Release Checklist

Use this checklist before calling the Dispatch Board MVP release-ready.

## 1. Environment readiness

- [ ] Scheduler verification expectations are understood from [docs/SCHEDULER_VERIFICATION_CONTRACT.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SCHEDULER_VERIFICATION_CONTRACT.md).
- [ ] The scheduler deployment verification runbook has been reviewed: [docs/SCHEDULER_DEPLOYMENT_VERIFICATION_RUNBOOK.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SCHEDULER_DEPLOYMENT_VERIFICATION_RUNBOOK.md).
- [ ] The first-live validation workflow has been reviewed: [docs/SCHEDULER_FIRST_LIVE_VALIDATION_WORKFLOW.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SCHEDULER_FIRST_LIVE_VALIDATION_WORKFLOW.md).
- [ ] Required environment variables are documented in [docs/SETUP.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SETUP.md).
- [ ] `.env.example` is complete for local development.
- [ ] No real secrets are committed to the repository.
- [ ] Local and production `DATABASE_URL` values are kept separate.
- [ ] Build and runtime expectations are clear for the deployment target.
- [ ] `CRON_SECRET` is configured anywhere the scheduled generation route will run.
- [ ] The deployment scheduler is enabled for `/api/cron/generate-board` in the chosen hosting environment.

## 2. Database readiness

- [ ] Prisma migrations apply cleanly on a fresh database with `npm run db:migrate:deploy`.
- [ ] Local development migrations work with `npm run db:migrate`.
- [ ] Prisma client generation works with `npm run db:generate`.
- [ ] Seed data runs successfully with `npm run db:seed`.
- [ ] Seed data contains only local development users and no real customer or dealership secrets.
- [ ] Task, board, activity, and generation-run tables exist as expected after migration.

## 3. App checks

- [ ] The app boots locally with `npm run dev`.
- [ ] Production build succeeds with `npm run build`.
- [ ] Login works for an active seeded user.
- [ ] Logout clears the current session.
- [ ] A manager can open the board.
- [ ] A staff user can open My Tasks and a task detail page.
- [ ] Manual board generation works from the board surface.
- [ ] Scheduled board generation is evaluated using the operator runbook instead of a casual spot-check.
- [ ] Any scheduled unauthorized, skipped, succeeded, or failed evidence is interpreted using the scheduler verification contract instead of ad hoc log reading.
- [ ] No obvious loading, empty, or error-state gaps block the main board, task, settings, or activity views.

## 3A. Scheduler production proof gate

Use this section before calling autonomous board generation production-ready.

- [ ] `CRON_SECRET` is configured in the deployed app runtime.
- [ ] The hosting scheduler is enabled for `/api/cron/generate-board`.
- [ ] The hosting scheduler sends a supported authorization header shape.
- [ ] App generation settings were reviewed for timezone, generation time, and business days.
- [ ] The first expected scheduled request was observed after the configured local generation time.
- [ ] The first observed scheduled request was authorized.
- [ ] The first observed scheduled request was not silently skipped for the wrong reason.
- [ ] The manager scheduler health panel reflected the real scheduled result.
- [ ] Any unauthorized scheduled hits for the same board date were reviewed.
- [ ] Manual retry availability was confirmed for the same manager health surface.
- [ ] First-live evidence was recorded using [docs/SCHEDULER_FIRST_LIVE_VALIDATION_WORKFLOW.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SCHEDULER_FIRST_LIVE_VALIDATION_WORKFLOW.md).

Required proof for this gate:

- [ ] Deployment host recorded
- [ ] Board date recorded
- [ ] Configured timezone and generation time recorded
- [ ] Screenshot of the manager scheduler health panel captured
- [ ] Latest scheduled attempt state and timestamp captured
- [ ] Final autonomous generation assessment recorded

## 4. Core MVP workflow verification

- [ ] Daily board generation does not duplicate generated tasks for the same board date.
- [ ] Manual tasks remain intact when generation is retried.
- [ ] A manager can create a task with a due time.
- [ ] Staff can update their own assigned task.
- [ ] Staff cannot update another user's assigned task.
- [ ] Moving a task to Blocked requires a blocker reason.
- [ ] Approval-required tasks move through Ready for Review before Completed.
- [ ] A manager can approve or reopen review-required work through the current task workflow.
- [ ] Activity feed entries appear for key workflow events.
- [ ] Recommendation explanation data appears where the current UI surfaces it.

## 4A. Tasks Operations Console day-one gate

- [ ] `/tasks` opens as the Task Operations Console for a manager.
- [ ] The console keeps the compact 8-row first page at the day-one desktop viewport.
- [ ] Manager can create, reassign, block with reason, move to Ready for Review, and complete eligible work.
- [ ] Staff can create self-assigned work from My Tasks and update assigned work.
- [ ] Shared saved views are database-backed through `TaskSavedView`.
- [ ] Manager can create and delete a shared saved view from `/tasks`.
- [ ] Staff can apply shared saved views but cannot create/delete them.
- [ ] The E2E reset clears `TaskSavedView` records before each daily workflow smoke run.
- [ ] Operator evidence is recorded in [docs/TASKS_MVP_DAY_ONE_READINESS.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/TASKS_MVP_DAY_ONE_READINESS.md).

## 5. Test and quality commands

- [ ] Dependencies install with `npm install`.
- [ ] Lint passes with `npm run lint`.
- [ ] Typecheck passes with `npm run typecheck`.
- [ ] Unit and integration tests pass with `npm test`.
- [ ] Chromium is installed for Playwright with `npx playwright install chromium`.
- [ ] End-to-end workflow tests pass with `npm run test:e2e`.
- [ ] Optional schema validation passes with `npm run db:validate`.

Note:
This repo does not currently define separate `unit` and `integration` npm scripts. Both are covered by `npm test`.

## 6. Manual QA checklist

- [ ] Mobile viewport: My Tasks is readable and usable for quick staff updates.
- [ ] Tablet viewport: the board layout remains usable without horizontal overflow.
- [ ] Desktop viewport: the board and activity surfaces remain easy to scan.
- [ ] Loading states are visible and understandable.
- [ ] Empty states are present where no board or activity exists yet.
- [ ] Error states are visible when data loading fails.
- [ ] Task detail actions remain usable on smaller screens.
- [ ] No obvious clipping or overflow appears in navigation, board cards, task panels, or activity items.

## 7. Known limitations and deferred scope

The MVP intentionally does not include:

- [ ] No native mobile app
- [ ] No DealerCenter or other DMS integration
- [ ] No Asana integration
- [ ] No Google Workspace integration
- [ ] No SMS or email notifications
- [ ] No advanced AI-only assignment or capacity scoring
- [ ] No full CRM replacement
- [ ] No full accounting replacement
- [ ] No full repair-order replacement
- [ ] No deep compliance or deep collections subsystem beyond broad MVP task coverage

## Release notes for the current repo state

As of this documentation pass, the codebase includes the board foundation, seeded auth, settings, activity feed, task detail/comments/status flows, manager review, and automated tests. Non-core shell routes now act as MVP guidance pages instead of dead-end placeholders, so release sign-off can focus on whether the live board workflow is sufficient for daily use.

For autonomous board generation specifically, release sign-off now also requires operator proof that the deployed scheduler fired, authorized correctly, and produced visible manager health evidence after the configured local generation time.
