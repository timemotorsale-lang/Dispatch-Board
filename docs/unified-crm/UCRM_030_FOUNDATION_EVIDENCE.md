# UCRM-030 Opportunity Foundation Safety Checkpoint

**Date:** 2026-08-15

**Implementation baseline:** `3bbfa641+working`

**Branch:** `main`

**Status:** `IMPLEMENTED_UNVERIFIED`; durable create implementation and isolated PostgreSQL proof exist, while authenticated browser proof and Product Owner UXR-3 remain pending

## Delivered boundary

- 2026-08-26 implementation refresh adds the approved opportunity stage lifecycle:
  - `NEW_INQUIRY`
  - `QUALIFIED`
  - `APPOINTMENT_SET`
  - `WORKING_DEAL`
  - `QUOTE_PRESENTED`
  - `CUSTOMER_DECIDING`
  - `WON`
  - `LOST`
- New live opportunity create starts only at `NEW_INQUIRY`; later stage movement remains reserved for UCRM-031.
- Opportunity create requires customer or source-lead context, owner, next action, and due time.
- The durable create command records opportunity persistence, command ledger, stage-history event, domain event, audit event, and outbox message.
- Opportunity create review and pipeline preview now use the same shell-level fail-closed access path as the existing opportunity detail, hub, and queue review surfaces.
- The shared access boundary now rejects shell-off access consistently before organization scope resolution in these non-page service contexts.
- No stage transition, source-lead mutation, quote presentation, appointment bridge, or operational linkage was enabled.

## Security and authority

- Opportunity create review now resolves through `requireUnifiedCrmOpportunityDetailAccess(...)` instead of a looser direct access path.
- Opportunity pipeline preview now resolves through the same shared shell and opportunity read guard.
- Production-default shell-off behavior now fails closed before any organization lookup on both surfaces.
- Opportunity review hub now always declares whether any same-scope persisted read-only opportunity is visible, instead of silently omitting that lane when none is available.
- Opportunity detail now explicitly says whether a persisted source record is visible yet and, when one is visible, shows the latest visible source update time from the current permitted read-only record.
- Persisted opportunity detail now links back into Customer 360 when the current record has a permitted customer and shows additional same-customer persisted read-only opportunities without exposing writes, hidden records, or invalid identifiers.

## Automated evidence

- 2026-08-26 focused verification passed for:
  - `src/tests/unit/unified-crm-opportunity-policy.test.ts`
  - `src/tests/unit/unified-crm-opportunity-create-service.test.ts`
  - `src/tests/unit/unified-crm-opportunity-create-command-service.test.ts`
  - `src/tests/unit/unified-crm-opportunity-create-route.test.ts`
  - `src/tests/unit/unified-crm-opportunity-create-page.test.tsx`
  - `src/tests/integration/unified-crm-opportunity-create.test.ts`
- Result: 6 files, 16 tests passed with `RUN_DATABASE_INTEGRATION=1`.
- `npx prisma validate` passed after the additive lifecycle schema and migration were added.
- `npx tsc --noEmit` continues to stop at the documented generated Next validator cache plus pre-existing service-intake/shop-planning issues; no new Unified CRM opportunity errors were reported after the repository was changed to use parameterized SQL for the new fields.
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

- Authenticated browser proof is still required for the live create form, success path, validation failure, duplicate replay messaging, denied/off states, and source-lead continuity.
- Product Owner UXR-3 review remains required before this slice can be marked `VERIFIED`.
- UCRM-031 remains responsible for stage transitions; UCRM-030 does not authorize movement beyond `NEW_INQUIRY`.
