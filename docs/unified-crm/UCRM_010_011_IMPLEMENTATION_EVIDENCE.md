# UCRM-010/011 Secure UX Review Checkpoint

**Date:** 2026-08-14
**Branch:** `codex/unified-crm-console`
**Status:** `IMPLEMENTED_UNVERIFIED` pending Product Owner UX acceptance and remaining browser-role/fallback evidence

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

- 57 focused CRM, navigation, workspace, topbar, and return-navigation tests passed.
- 4 existing CRM rollout tests passed when supplied the configured test database environment.
- Focused ESLint passed with zero warnings.
- `git diff --check` passed.
- Interactive browser review passed at 1440×900, 768×1024, and 390×844 with no horizontal page overflow.
- Light and dark appearances rendered; search, queue selection, query-addressed views, New-menu Escape close, mobile navigation, mobile Escape close, and focus return were exercised.
- Existing `/customers` and `/sales` links remain available and no default landing route changed.

## Known baseline and remaining evidence

- Full repository typecheck still stops at the pre-existing `src/app/api/service-close-parts/route.ts` union-property error recorded in `CURRENT_EVIDENCE_BASELINE.md`; no new CRM type error was reported.
- Product Owner UCRM-UXR-0 acceptance or requested refinements are pending.
- Authorized Sales, denied non-CRM persona, explicit feature-off, and rollback browser journeys remain required before UCRM-010/011 can be `VERIFIED`.
- This checkpoint is not approved for merge, pilot, production enablement, real customer data, or CRM writes.
