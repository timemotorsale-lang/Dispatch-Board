# UCRM-030 Opportunity Foundation Safety Checkpoint

**Date:** 2026-08-15

**Implementation baseline:** `3bbfa641+working`

**Branch:** `main`

**Status:** `HELD`; this is a foundation-only safety checkpoint, not operational milestone completion

## Delivered boundary

- Opportunity create review and pipeline preview now use the same shell-level fail-closed access path as the existing opportunity detail, hub, and queue review surfaces.
- The shared access boundary now rejects shell-off access consistently before organization scope resolution in these non-page service contexts.
- No live opportunity create, stage entry, stage transition, source-lead mutation, or operational linkage was enabled.

## Security and authority

- Opportunity create review now resolves through `requireUnifiedCrmOpportunityDetailAccess(...)` instead of a looser direct access path.
- Opportunity pipeline preview now resolves through the same shared shell and opportunity read guard.
- Production-default shell-off behavior now fails closed before any organization lookup on both surfaces.
- Opportunity review hub now always declares whether any same-scope persisted read-only opportunity is visible, instead of silently omitting that lane when none is available.
- Opportunity detail now explicitly says whether a persisted source record is visible yet and, when one is visible, shows the latest visible source update time from the current permitted read-only record.
- Persisted opportunity detail now links back into Customer 360 when the current record has a permitted customer and shows additional same-customer persisted read-only opportunities without exposing writes, hidden records, or invalid identifiers.

## Automated evidence

- Focused verification passed on 2026-08-15 for:
  - `src/tests/unit/unified-crm-opportunity-create-service.test.ts`
  - `src/tests/unit/unified-crm-opportunity-read-service.test.ts`
  - `src/tests/unit/unified-crm-opportunity-detail-service.test.ts`
  - `src/tests/unit/unified-crm-opportunity-review-hub-service.test.ts`
  - `src/tests/unit/unified-crm-opportunity-queue-service.test.ts`
  - `src/tests/unit/unified-crm-opportunity-detail.test.tsx`
  - `src/tests/unit/unified-crm-opportunity-review-hub.test.tsx`
  - `src/tests/unit/unified-crm-opportunity-review-hub-page.test.tsx`
  - focused rerun after same-customer continuity expansion:
    - `src/tests/unit/unified-crm-opportunity-detail-service.test.ts`
    - `src/tests/unit/unified-crm-opportunity-detail.test.tsx`
- Result at the focused rerun for this checkpoint: 8 files, 37 tests passed on the working baseline.

## Remaining gates

- `UCRM-030` remains `HELD` because `UCRM-DEC-003` is still deferred: the initial stage, ordered lifecycle, and entry evidence rules are not yet approved.
- No additive opportunity create migration, durable create command, audit-backed source-lead bridge activation, or browser proof for live opportunity creation exists from this checkpoint.
- This checkpoint improves the safety of held and read-only opportunity review surfaces only.
