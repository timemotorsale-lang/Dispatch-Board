# MVP Release Checklist

Use this checklist before calling the Dispatch Board MVP release-ready.

## 1. Environment readiness

- [ ] Required environment variables are documented in [docs/SETUP.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SETUP.md).
- [ ] `.env.example` is complete for local development.
- [ ] No real secrets are committed to the repository.
- [ ] Local and production `DATABASE_URL` values are kept separate.
- [ ] Build and runtime expectations are clear for the deployment target.
- [ ] `CRON_SECRET` is configured anywhere the scheduled generation route will run.

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
- [ ] No obvious loading, empty, or error-state gaps block the main board, task, settings, or activity views.

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
