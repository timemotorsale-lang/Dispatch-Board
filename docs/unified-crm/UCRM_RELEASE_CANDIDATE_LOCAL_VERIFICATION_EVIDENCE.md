# Unified CRM release candidate local verification evidence

Date: 2026-08-27

Branch: `codex/unified-crm-ucrm080-099`

Status: `HELD`

## What was verified locally

This checkpoint strengthens the CRM release-readiness record without enabling release, pilot access, provider traffic, production promotion, or write-capable CRM behavior.

Passed local gates:

- Release and pilot gate focused suite passed: 14 files, 28 tests.
- Verification gate route suite passed: 6 files, 12 tests.
- TypeScript typecheck passed.

These checks confirm that the current CRM release/pilot review surfaces remain fail-closed, permission-aware, and honest about held provider and pilot dependencies.

## Broad regression result

The broader unit-test folder run did **not** pass:

- 705 files passed.
- 17 files failed.
- 3,286 tests passed.
- 29 tests failed.

Observed failure categories include request-scope test setup issues around `cookies()` in appointment routing tests and stale visual/link contract expectations in existing inventory/work-order tests. This broad red gate is treated as a release blocker until triaged and resolved or explicitly classified as unrelated with evidence.

## Release blockers that remain

The CRM release candidate remains `HELD` until these gates are complete:

- Full broad regression suite is green or failures are formally triaged with approved release impact.
- Authenticated browser/UX walkthrough is completed for the CRM pilot path.
- Production build proof is completed.
- Dispatch Board impacted-regression proof is completed.
- Accessibility and responsive proof is completed on the pilot path.
- Named pilot cohort, owner approvals, rollback approver, and go/no-go decision are recorded.
- Provider and communication automation approvals remain held before any live email, SMS, voice, e-signature, accounting/DMS, or AI receptionist behavior is enabled.

## Release decision

This checkpoint does **not** make the CRM releasable.

The safe next step is release-candidate cleanup: triage the 29 broad unit failures, repair the failures that represent real regressions, document any stale test expectations, then rerun focused CRM release gates, impacted Dispatch Board regression, typecheck, and production build proof.
