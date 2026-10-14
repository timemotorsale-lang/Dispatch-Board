# UCRM-050 Global CRM Search Evidence

## Scope

UCRM-050 adds a read-only global CRM search surface for permitted customer, contact, opportunity, quote, task, appointment, vehicle, and dispatch identifiers.

## Implementation

- Added the `ucrm.global-search/v1` contract with safe error codes and query normalization.
- Added a scoped repository that searches canonical CRM records and CRM-owned operational links without mutating records.
- Added a service that applies existing CRM customer visibility rules, resolves a single authorized organization, groups results deterministically, and returns empty states without exposing hidden matches.
- Added `GET /api/crm/v1/search` with typed, safe API errors.

## Controls

- Sales users receive owner-scoped results only.
- Management users receive organization-scoped results.
- Hidden records are filtered inside the repository query rather than after response assembly.
- Search is fail-closed behind `UNIFIED_CRM_GLOBAL_SEARCH_MODE`.
- Search requires a 2-80 character query and a 1-25 result limit.

## Verification

- `npx vitest run src/tests/unit/unified-crm-global-search-service.test.ts src/tests/unit/unified-crm-global-search-route.test.ts`
  passed 5 focused unit and route tests.
- `RUN_DATABASE_INTEGRATION=1 npx vitest run src/tests/integration/unified-crm-global-search.test.ts`
  passed the runtime proof for all eight result types and hidden owner-scope matches.
- `npx eslint ... --max-warnings=0`
  passed for the UCRM-050 source and test files.
- `npx tsc --noEmit` with the CRM/source filter returned only the known unrelated baseline issues in
  `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts`.

## Residual Work

- UCRM-051 should add the keyboard-accessible command/results UI and browser proof.
- Broader regression and authenticated browser proof remain required before marking verified.
