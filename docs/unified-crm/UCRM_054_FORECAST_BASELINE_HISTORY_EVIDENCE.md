# UCRM-054 Forecast Baseline and History Evidence

## Scope

UCRM-054 adds governed CRM forecast baseline and history support for opportunities.

## Implementation

- Added append-only `UnifiedCrmForecastSnapshot` storage with source, category, amount, probability, reason, input snapshot, actor, and timestamp.
- Added deterministic baseline forecast calculation from opportunity stage and estimated value.
- Added seller and manager judgment submissions as separate human forecast sources.
- Added idempotent submit behavior through the enterprise command ledger.
- Added `GET` and `POST` forecast routes under `/api/crm/v1/opportunities/[opportunityId]/forecast`.

## Controls

- Baseline projections are labeled `BASELINE` and are not persisted as human judgment.
- Seller and manager forecast judgments are distinguishable through `SELLER_JUDGMENT` and `MANAGER_JUDGMENT`.
- Human judgment submissions require reason text, current opportunity version, probability, amount, category, and idempotency key.
- Forecast history is append-only; new judgments add snapshots rather than modifying prior snapshots.
- Sales users remain owner-scoped; manager judgment is restricted to management workspace users.

## Verification

- `npx prisma validate` passed.
- `npx prisma migrate deploy` applied `20260826080000_add_unified_crm_forecast_snapshots`.
- `npx vitest run src/tests/unit/unified-crm-forecast-service.test.ts src/tests/unit/unified-crm-forecast-route.test.ts` passed 5 tests.
- `RUN_DATABASE_INTEGRATION=1 npx vitest run src/tests/integration/unified-crm-forecast.test.ts` passed 1 database-backed integration test.
- `npx eslint ... --max-warnings=0` passed for the forecast contract, repository, service, route, and tests.
- `npx tsc --noEmit` filtered to source/test paths produced only the existing unrelated baseline errors in `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts`.

## Residual Work

- UI and authenticated browser proof remain pending.
- Forecast accuracy/backtesting and advanced attribution remain later UCRM-105 work.
