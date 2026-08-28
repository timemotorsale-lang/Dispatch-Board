# UCRM-086 Accounting/DMS Connector Evidence

**Status:** `HELD`  
**Date:** 2026-08-27  
**Branch:** `codex/unified-crm-ucrm080-099`

## Scope

UCRM-086 adds the safe readiness boundary for a future accounting or DMS connector.

This checkpoint does not choose a system, perform backfill, run incremental sync, write accounting/DMS records, or change ownership of source-domain data.

## Implemented

- Contract version `ucrm.accounting-dms-connector/v1`.
- Manager-only accounting/DMS connector readiness service.
- Fail-closed API route at `/api/crm/v1/integrations/accounting-dms`.
- Explicit held activation model:
  - outbound write disabled,
  - backfill disabled,
  - incremental sync disabled,
  - selected system unset.
- Readiness checks for system selection, field ownership, mapping, conflict rules, backfill, incremental sync, reconciliation, sensitive data, failure recovery, and disablement.

## Blocker

UCRM-086 remains `HELD` because activation requires approved decisions for one named system:

- accounting/DMS system selection,
- field ownership map,
- mapping and normalization,
- conflict behavior,
- backfill/incremental sync limits,
- reconciliation criteria,
- sensitive-data handling,
- recovery and disablement proof.

## Verification

Focused tests added:

- `src/tests/unit/unified-crm-accounting-dms-connector-service.test.ts`
- `src/tests/unit/unified-crm-accounting-dms-connector-route.test.ts`

Pending before activation:

- Named system approval.
- Provider/schema mapping proof.
- Dry-run backfill and reconciliation evidence.
- Browser and rollback proof.

## Honest status

UCRM-086 is `HELD`. The readiness boundary exists, but no live accounting/DMS connector behavior is enabled.
