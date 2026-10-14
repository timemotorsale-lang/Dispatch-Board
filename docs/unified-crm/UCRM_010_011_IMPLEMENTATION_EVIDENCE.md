# UCRM-010/011 Secure UX Review Checkpoint

**Date:** 2026-08-14
**Branch:** `codex/unified-crm-console`
**Status:** UCRM-010 `VERIFIED`; UCRM-011 `VERIFIED` for the CRM capability policy and customer-read isolation baseline; Product Owner accepted UCRM-UXR-0 direction

## Delivered boundary

- Authenticated `/crm` entry inside the shared Dispatch Board shell.
- Coarse route discovery for Management and Sales without changing their default workspaces.
- Deny-by-default `crm.*` capability baseline: console/customer view allowed for the accepted review roles; sensitive fields, mutation, export, and administration denied.
- Production-safe shell control: production defaults `OFF`; explicit `REVIEW` enables the non-writing experience review.
- Honest unavailable state with role-safe fallback to the existing Management or Sales workspace.
- Independent CRM navigation: Home, Work, Customers, Pipeline, Conversations, Insights, and More.
- Interactive UCRM-UXR-0 review shell with one search, one New menu, prioritized next-action queue, in-place context, and Today/Attention rail.
- All displayed people, organizations, amounts, counts, stages, appointments, and history are visibly labeled synthetic review scenarios. No CRM command, API, schema, persistence, communication, stage transition, or successful write was added.

## Verification completed

- 61 focused CRM, page-boundary, navigation, workspace, topbar, and return-navigation tests passed.
- 4 existing CRM rollout tests passed when supplied the configured test database environment.
- Focused ESLint passed with zero warnings.
- `git diff --check` passed.
- Interactive browser review passed at 1440×900, 768×1024, and 390×844 with no horizontal page overflow.
- Light and dark appearances rendered; search, queue selection, query-addressed views, New-menu Escape close, mobile navigation, mobile Escape close, and focus return were exercised.
- Existing `/customers` and `/sales` links remain available and no default landing route changed.
- Authorized Sales browser proof rendered the review shell with the Sales workspace fallback preserved.
- Denied Technician browser proof rendered only the unavailable state and `/my-tasks` fallback; no synthetic CRM queue or record context was exposed.
- Explicit `OFF` browser proof rendered only the unavailable state and the Sales fallback. Returning the same local baseline to `REVIEW` restored the shell without data migration, deletion, or changes to existing console routes.
- Page-boundary tests cover denied role, Manager flag-off, Sales fallback, and `REVIEW` to `OFF` rollback behavior.
- 2026-08-26 refresh: opt-in PostgreSQL isolation proof passed for customer list and Customer 360 reads using two-organization fixtures, colliding customer/contact identities, owner-scope intersections, masked contact assertions, nested relationship scoping, and archived/merged non-enumeration checks.
- 2026-08-26 refresh command: `RUN_DATABASE_INTEGRATION=1 npx vitest run src/tests/integration/unified-crm-customer-isolation.test.ts src/tests/integration/unified-crm-customer-360-isolation.test.ts` completed with 2 files and 2 tests passing.

## Product Owner UCRM-UXR-0 disposition

**Disposition:** Experience direction accepted on 2026-08-14.

The accepted direction is:

- retain the shared Dispatch Board application shell and independent CRM navigation;
- lead Home with “Here’s what needs attention” instead of a KPI wall;
- keep one review search and one New menu, with New linking only to real governed source workflows;
- make the prioritized next-action queue dominant and reveal selected context in place;
- keep Today and Attention as supporting context;
- use progressive disclosure and accessible responsive behavior across Home, Work, Customers, Pipeline, Conversations, Insights, and More;
- keep every current scenario visibly synthetic, non-writing, and free of fake success states.

This disposition approves the UX direction for continued UCRM work. It does **not** approve merge, enroll a pilot cohort, enable production, authorize real customer data, or authorize CRM writes, communications, stage changes, or downstream UCRM-012+ behavior.

## Verification disposition and known baseline

- Full repository typecheck still stops at the pre-existing `src/app/api/service-close-parts/route.ts` union-property error recorded in `CURRENT_EVIDENCE_BASELINE.md`; no new CRM type error was reported.
- UCRM-010 is `VERIFIED` for its route-shell boundary on implementation baseline `5c47e3f1`: authenticated entry, role-safe navigation and fallback, responsive/accessibility behavior, authorized and denied role proof, explicit flag-off proof, and reversible restoration are evidenced.
- UCRM-011 is now `VERIFIED` for its deny-by-default capability policy, page boundary, and customer-read cross-organization isolation baseline. The later customer-list and Customer 360 UX slices still retain their own Product Owner and browser acceptance gates.
- Product Owner accepted the UCRM-UXR-0 experience direction; integration disposition remains pending.
- This checkpoint is not approved for merge, pilot, production enablement, real customer data, or CRM writes.
