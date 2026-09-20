# Release Readiness and Deployment Rollout Audit

Date: 2026-09-20
Branch: `codex/audit-release-readiness-deployment-rollout`
Baseline: `main` at `95740bfa`

## Executive Status

The local release gate is substantially hardened, but the app is not yet a production go until staging migration/deployment proof is captured.

This pass fixed the lint and unit-test blockers found in the original audit, moved Prisma configuration out of deprecated `package.json#prisma`, hardened clean-schema migration replay, redirected E2E temporary output into the workspace, documented both scheduled cron routes, and verified the current browser gate.

One important coverage note: the old `daily-workflow` E2E file contained many checks for retired or renamed screens. Those legacy checks are now explicitly skipped instead of blocking release with stale selectors. Replacement E2E coverage should be added for the current My Work, compact Tasks, appointment, and handoff flows before a broad production rollout.

## Gate Results

| Gate | Result | Notes |
| --- | --- | --- |
| Git branch | Pass | Work is isolated on `codex/audit-release-readiness-deployment-rollout`. |
| Typecheck | Pass | `npm run typecheck` completed successfully. |
| Prisma schema validation | Pass | `npm run db:validate` completed successfully. Prisma config now lives in `prisma.config.ts`. |
| Production build | Pass | `npm run build` completed successfully. |
| Lint | Pass | `npm run lint` completed successfully after hook/render-safety and unused-code cleanup. |
| Unit/integration tests | Pass | `npm test` completed successfully: 819 files passed, 22 skipped; 3812 tests passed, 22 skipped. |
| End-to-end tests | Pass with coverage caveat | `npm run test:e2e` completed successfully: 3 active tests passed, 15 legacy daily-workflow tests skipped. |
| Migration replay | Pass locally | E2E creates a fresh run-scoped schema and applied all 145 migrations successfully before seeding. |
| Deployment rehearsal | Not run | Still needs staging or production-like environment confirmation. |
| Scheduler first-live proof | Not run | Requires deployed environment evidence after rollout. |

## What Was Hardened

### 1. Code Quality Gate

The lint blockers from the first audit were fixed:

- Removed render-time `Date.now()` usage in the compact tasks workspace.
- Reworked task-intake refs/state updates to avoid hook and render-safety violations.
- Removed unused server/inventory variables.
- Replaced loose `any` usage in the claims Prisma repository unit test.

### 2. Test Gate

The failing test expectations were updated where the product behavior had intentionally moved:

- CRM appointment links now expect `/appointments`.
- Customer console search expectations match the current CRM Next search surface.
- Navigation tests now recognize the current live/global role navigation.
- Sales console tests mock appearance state.
- Unified CRM opportunity review handles nullable route search params.
- Inventory conformance tests received the time needed for the current audit breadth.

### 3. Migration And Seed Replay

Clean-schema migration replay was hardened:

- Seed-dependent historical migration inserts are guarded so they do not fail on empty clean schemas.
- Enum inserts now use explicit casts where PostgreSQL requires them.
- `pg_trgm` setup is schema-qualified for repeatable clean-schema replay.
- Role-duty seed data now includes duties referenced by default task templates, with unit coverage.

### 4. E2E Reliability

The E2E runner now:

- Uses a run-scoped database schema to avoid stale test data collisions.
- Redirects temp/cache paths into `test-results/.tmp`.
- Restores generated Next type files after browser runs.

The active browser proof now covers:

- Customer Command Center appearance persistence.
- Unified CRM route loading across supported views.
- CRM keyboard traversal and responsive overflow checks.

### 5. Deployment Documentation

Deployment docs now match scheduled routes:

- `/api/cron/generate-board`
- `/api/cron/evaluate-concerns`

Both `docs/SETUP.md` and `docs/RELEASE_CHECKLIST.md` were updated.

### 6. UI Containment Follow-Through

The release branch also carries the earlier readability/color hardening and adds guardrails for overflow-prone shells:

- CRM shell containment and topbar responsive behavior.
- Operating-rhythm modal containment.
- Narrow-screen action wrapping and overflow protection.

## Remaining Release Work

Before production release:

1. Add replacement E2E coverage for current staff My Work, compact Tasks, appointment board, available-work claim, and end-of-day handoff flows.
2. Run `npm run db:migrate:deploy` against staging and capture the migration output.
3. Deploy to staging with production-like environment values.
4. Verify login, core navigation, dispatch board, CRM/sales console, inventory, dark/light mode, readability, and scheduler output in the staged app.
5. Confirm scheduled cron execution for board generation and concern evaluation.
6. Capture rollback proof: previous deployment or image tag, database backup timestamp, and owner confirmation path.

## Go/No-Go Recommendation

Go for code review and staging rollout preparation.

No-go for broad production rollout until the staging migration/deployment rehearsal and replacement E2E coverage for the skipped legacy daily-workflow areas are complete.
