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

## Automated evidence

- Focused verification passed on 2026-08-15 for:
  - `src/tests/unit/unified-crm-opportunity-create-service.test.ts`
  - `src/tests/unit/unified-crm-opportunity-read-service.test.ts`
  - `src/tests/unit/unified-crm-opportunity-detail-service.test.ts`
  - `src/tests/unit/unified-crm-opportunity-review-hub-service.test.ts`
  - `src/tests/unit/unified-crm-opportunity-queue-service.test.ts`
- Result at the focused rerun for this checkpoint: 5 files, 30 tests passed on the working baseline.

## Remaining gates

- `UCRM-030` remains `HELD` because `UCRM-DEC-003` is still deferred: the initial stage, ordered lifecycle, and entry evidence rules are not yet approved.
- No additive opportunity create migration, durable create command, audit-backed source-lead bridge activation, or browser proof for live opportunity creation exists from this checkpoint.
- This checkpoint improves the safety of held and read-only opportunity review surfaces only.
