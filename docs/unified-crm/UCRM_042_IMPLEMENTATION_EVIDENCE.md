# UCRM-042 Quote Presentation And Version Lock Evidence

## Scope

`UCRM-042` now contains the safe immutable-history packet for Unified CRM quotes:

- quote version review is available on a real authenticated route;
- immutable version history renders presented, draft, and superseded evidence distinctly;
- quote presentation stays fail closed through a typed held route and held UI messaging;
- version review tests prove that presented evidence is shown as immutable history rather than a mutable current draft;
- the repository/service chain now supports real persisted version review while refusing to claim live commercial presentation.

This checkpoint does **not** activate customer-facing quote presentation. The decision register still holds commercial presentation activation behind deferred exact authority thresholds.

## Files

- `src/server/services/unified-crm-quote-draft-service.ts`
- `src/server/services/unified-crm-quote-present-service.ts`
- `src/server/unified-crm/quote-present-command.ts`
- `src/server/unified-crm/quote-version-review-contract.ts`
- `src/app/(app)/crm/quotes/[quoteId]/versions/page.tsx`
- `src/app/api/crm/v1/quotes/[quoteId]/present/route.ts`
- `src/features/unified-crm/unified-crm-quote-version-review.tsx`
- `src/features/unified-crm/unified-crm-quote-foundation.tsx`
- `src/features/unified-crm/unified-crm-quote-return.ts`
- `src/tests/unit/unified-crm-quote-present-route.test.ts`
- `src/tests/unit/unified-crm-quote-version-review-service.test.ts`
- `src/tests/unit/unified-crm-quote-version-review.test.tsx`
- `src/tests/unit/unified-crm-quote-version-review-page.test.tsx`

## Verification

Focused verification passed on 2026-08-15 for:

- `src/tests/unit/unified-crm-quote-present-route.test.ts`
- `src/tests/unit/unified-crm-quote-version-review-service.test.ts`
- `src/tests/unit/unified-crm-quote-version-review.test.tsx`
- `src/tests/unit/unified-crm-quote-version-review-page.test.tsx`

The combined quote packet verification command is recorded in [`docs/unified-crm/UCRM_041_IMPLEMENTATION_EVIDENCE.md`](UCRM_041_IMPLEMENTATION_EVIDENCE.md).

## Status

- `UCRM-042`: `HELD`

Immutable review and fail-closed presentation boundaries are implemented, but milestone completion remains `HELD` because `UCRM-DEC-013` still defers exact pricing, discount, amount, and cumulative approval thresholds, and the milestone exit gate requires a real permitted presentation path before completion.
