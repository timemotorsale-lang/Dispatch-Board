# UCRM-065 Full Automated Regression Evidence

## Scope

UCRM-065 adds a manager-only full regression verification gate and records the current release-candidate blockers honestly.

## Implementation

- Added a full regression verification service and API at `/api/crm/v1/full-regression`.
- Records pass evidence for CRM schema validation/migrations, focused lint, focused unit tests, focused integration tests, and policy-path tests.
- Records named holds for full typecheck, production build, authenticated CRM browser regression, and impacted Dispatch Board regression.
- Fixed two actionable baseline type blockers:
  - Service intake repair-order records now include the `version` used for duplicate-close expected-version safety.
  - Shop-planning completion shortcut now narrows estimate, authorization, and job command results before reading IDs/version fields.

## Controls

- Non-management CRM workspaces are denied.
- Holds must include an owner.
- The gate remains `HELD` until the full automated regression suite and browser/build proof pass on one release-candidate commit.

## Verification

- `npx vitest run src/tests/unit/unified-crm-full-regression-service.test.ts src/tests/unit/unified-crm-full-regression-route.test.ts` passed 4 tests.
- `npx eslint ... --max-warnings=0` passed for the full-regression contract, service, route, tests, and the two baseline type-fix files.
- `npx tsc --noEmit` filtered to source/test paths emitted no source/test errors.
- Full `npx tsc --noEmit` was run and remains held by stale generated Next validator files under `../../../../AppData/Local/DispatchBoard/next/*/dev/types/**/*.ts`.

## Current Hold

- Full `npx tsc --noEmit` no longer reports source errors from `src/features/inventory/service-intake-workspace.tsx` or `src/server/shop-planning/service.ts`, but it still fails because `tsconfig.json` explicitly includes stale generated Next validator files under `../../../../AppData/Local/DispatchBoard/next/*/dev/types/**/*.ts`.
