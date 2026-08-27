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
- Remaining pilot-release proof focused suite passed: 9 files, 18 tests, covering release-readiness cleanup, release-candidate validation, full regression, reliability verification, accessibility/responsive gates, and internal release decision routes/services.
- Impacted Dispatch/repair workflow smoke suite passed: 10 files, 92 tests, covering Shop & Recon stage/workflow surfaces, repair-order workbench, diagnostics, quality control, shop planning, and CRM opportunity dispatch bridge guards.
- Direct production package proof passed with `npx next build`: Next.js compiled successfully, completed TypeScript, generated 270 static pages, and listed the CRM, Dispatch, Customers, Diagnostics, Appointments, Vehicles, and API routes.
- Scripted production package proof passed with `npm run build` after the build preflight was hardened to validate Prisma schema, retry generation, and continue only for the known Windows locked-engine case when an existing generated client is usable.
- Local authenticated browser proof passed for the supported CRM view URLs `/crm`, `/crm?view=work`, `/crm?view=customers`, `/crm?view=pipeline`, `/crm?view=conversations`, `/crm?view=insights`, `/crm?view=more`, `/crm/opportunities`, and `/crm/quotes`: no 404s and no browser console errors were observed.
- Responsive browser proof passed at 1440x900 and 390x844 for `/crm`, `/crm?view=customers`, `/crm?view=pipeline`, and `/crm/quotes`: no horizontal overflow was observed after render.
- Repeatable CRM pilot browser proof now exists in `src/tests/e2e/unified-crm-pilot-proof.spec.ts`; it verifies supported CRM review routes, desktop/mobile overflow, console-error absence, and keyboard traversal through shell navigation and work controls.

These checks confirm that the current CRM release/pilot review surfaces remain fail-closed, permission-aware, and honest about held provider and pilot dependencies.

## Remaining pilot-release proof gate results

The remaining local proof gates were executed on 2026-08-27:

| Gate | Result | Evidence |
| --- | --- | --- |
| Typecheck | Passed | `npm run typecheck` completed successfully. |
| Release/readiness focused tests | Passed | 9 files and 18 tests passed. |
| Impacted Dispatch/repair smoke tests | Passed | 10 files and 92 tests passed. |
| Browser route walkthrough | Passed for supported routes | Supported CRM view URLs and review routes loaded without 404s or console errors. Path-style URLs such as `/crm/customers` are not the shell contract; the shell uses `/crm?view=customers`. |
| Responsive proof | Passed | Desktop 1440x900 and mobile 390x844 checks showed no horizontal overflow on the checked CRM routes. |
| Production package proof | Passed locally | `npm run build` completed successfully. The build preflight validated `prisma/schema.prisma`, retried Prisma generation, detected the known local Windows locked-engine case, verified an existing generated client, and then completed the Next.js production package. |
| Keyboard proof | Passed with Playwright harness | `npx playwright test src/tests/e2e/unified-crm-pilot-proof.spec.ts` passed 2 tests, including Tab traversal through CRM shell navigation and work controls. |

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

- Clean Prisma generation is rerun after the local dev server releases the Windows query-engine DLL, or in the target release environment where no dev process holds the generated client.
- Named pilot cohort, owner approvals, rollback approver, and go/no-go decision are recorded.
- Provider and communication automation approvals remain held before any live email, SMS, voice, e-signature, accounting/DMS, or AI receptionist behavior is enabled.

## Release decision

This checkpoint does **not** make the CRM releasable.

The safe next step is release-candidate proof: run the authenticated CRM browser/UX walkthrough, impacted Dispatch Board smoke path, accessibility/responsive proof, and production build proof before requesting pilot go/no-go.
