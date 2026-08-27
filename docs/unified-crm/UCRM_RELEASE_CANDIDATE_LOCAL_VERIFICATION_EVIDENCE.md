# Unified CRM release candidate local verification evidence

Date: 2026-08-27

Branch: `codex/unified-crm-ucrm080-099`

Status: `IMPLEMENTED_UNVERIFIED`

## What was verified locally

This checkpoint strengthens the CRM release-readiness record without enabling release, pilot access, provider traffic, production promotion, or write-capable CRM behavior.

Passed local gates:

- Release and pilot gate focused suite passed: 14 files, 28 tests.
- Verification gate route suite passed: 6 files, 12 tests.
- TypeScript typecheck passed.
- Full unit-test folder suite passed after release-cleanup repair: 722 files, 3,315 tests.

These checks confirm that the current CRM release/pilot review surfaces remain fail-closed, permission-aware, and honest about held provider and pilot dependencies.

## Broad regression result

The first broader unit-test folder run did **not** pass:

- 705 files passed.
- 17 files failed.
- 3,286 tests passed.
- 29 tests failed.

Observed failure categories include request-scope test setup issues around `cookies()` in appointment routing tests and stale visual/link contract expectations in existing inventory/work-order tests. This broad red gate is treated as a release blocker until triaged and resolved or explicitly classified as unrelated with evidence.

Follow-up release-cleanup repair completed:

- CRM opportunity policy tests were aligned with the approved governed-live action direction while preserving feature-off denial.
- Customer 360 and opportunity detail fixtures/repositories were hardened against stale optional dependency/test-double gaps.
- Delegated vehicle capability grants now return `GRANT_CONSTRAINTS_NOT_MET` when scoped grant limits are exceeded instead of silently falling through to broad role defaults.
- Shared Dispatch/Inventory tests were aligned with current simplified receiving, navigation, staff-name, and return-link contracts.
- The full unit-test folder suite then passed: 722 files, 3,315 tests.

## Release blockers that remain

The CRM release candidate remains `IMPLEMENTED_UNVERIFIED` and not releasable until these gates are complete:

- Authenticated browser/UX walkthrough is completed for the CRM pilot path.
- Production build proof is completed.
- Dispatch Board impacted-regression proof is completed.
- Accessibility and responsive proof is completed on the pilot path.
- Named pilot cohort, owner approvals, rollback approver, and go/no-go decision are recorded.
- Provider and communication automation approvals remain held before any live email, SMS, voice, e-signature, accounting/DMS, or AI receptionist behavior is enabled.

## Release decision

This checkpoint does **not** make the CRM releasable.

The safe next step is release-candidate proof: run the authenticated CRM browser/UX walkthrough, impacted Dispatch Board smoke path, accessibility/responsive proof, and production build proof before requesting pilot go/no-go.
