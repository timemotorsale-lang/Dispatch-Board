# UCRM-051 Search Interaction UI Evidence

## Scope

UCRM-051 adds the interactive CRM global search experience on top of the UCRM-050 read-only search API.

## Implementation

- Added a live CRM search combobox to the CRM shell for non-work review surfaces.
- Preserved the existing live work filter where work-queue filtering is already source-specific.
- Added loading, empty, unavailable, grouped-result, and authorized-scope states.
- Added keyboard handling for Escape, Arrow Up, Arrow Down, and Enter result opening.
- Rendered grouped result links for customers, contacts, opportunities, quotes, tasks, appointments, vehicles, and dispatch handoffs returned by the API.

## Controls

- The UI calls only `GET /api/crm/v1/search`.
- The UI does not create, update, delete, export, send, sell, deliver, invoice, or complete any record.
- Result visibility remains enforced by UCRM-050 server-side policy and repository scoping.
- Work queue filtering remains local to the work queue and does not pretend to be global search.

## Verification

- `npx vitest run src/tests/unit/unified-crm-shell-review.test.tsx`
  passed 16 shell render tests, including the live global CRM search entry and preserved live work filter.
- `npx eslint src/features/unified-crm/unified-crm-shell.tsx src/tests/unit/unified-crm-shell-review.test.tsx --max-warnings=0`
  passed after keeping the fetch effect synchronization-only.
- `npx tsc --noEmit` with the CRM/source filter returned only the known unrelated baseline issues in
  `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts`.
- UCRM-050 focused service, route, and runtime proof remain the backend authority for search scoping and result grouping.

## Residual Work

- Authenticated browser proof should verify focus, keyboard navigation, loading, empty, and result-opening behavior in the running app.
- Broader regression proof remains required before marking verified.
