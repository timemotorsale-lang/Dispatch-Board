# UCRM-023 Commitment and Next Action Checkpoint

**Date:** 2026-08-15

**Implementation baseline:** `3bbfa641+working`

**Branch:** `main`

**Status:** `IMPLEMENTED_UNVERIFIED`; authenticated browser proof and isolated PostgreSQL proof remain pending

## Delivered boundary

- Customer 360 now carries a server-authored CRM next-action state for the current relationship follow-up:
  - `NONE`
  - `SCHEDULED`
  - `DUE_TODAY`
  - `OVERDUE`
- The next-action repository now follows the same fail-closed authorization-first replay pattern as the adjacent CRM note and interaction slices.
- Customer 360 and the next-action form now use honest renewal/overdue guidance without implying any external communication or non-CRM source mutation.

## Security and authority

- Exact customer authorization now precedes next-action idempotency replay in the repository.
- Replay is bound to the same authorized customer subject and rejects cross-customer reuse.
- Invalid stored replay payloads now fail closed instead of being trusted.
- Owner requirement and stale next-action conflict behavior remain enforced before a customer follow-up can be changed.
- The command path now uses a dedicated CRM mutation capability boundary instead of relying on Customer 360 read authority alone.
- Customer 360 only advertises the live next-action surface when shell mode, customer read mode, command mode, customer ownership, and the CRM mutation capability all allow it together.
- The route now returns the typed next-action error envelope and safe `500` fallback behavior instead of collapsing unknown failures into a validation-shaped response.

## Quality and correctness improvements

- Customer 360 now explains when a dated follow-up is overdue, due today, scheduled, or absent.
- The next-action form now uses state-aware action language for overdue and due-today follow-up renewal.
- The read model remains source-safe and read only outside the explicit next-action command path.

## Automated evidence

- Focused verification passed on 2026-08-15 for:
  - `src/tests/unit/unified-crm-access.test.ts`
  - `src/tests/unit/unified-crm-customer-next-action-access.test.ts`
  - `src/tests/unit/unified-crm-customer-next-action-service.test.ts`
  - `src/tests/unit/unified-crm-customer-next-action-route.test.ts`
  - `src/tests/unit/unified-crm-customer-next-action-repository.test.ts`
  - `src/tests/unit/unified-crm-customer-360-service.test.ts`
  - `src/tests/unit/unified-crm-customer-360.test.tsx`
- Result at the final rerun for this checkpoint: 7 files, 58 tests passed on the working baseline.

## Remaining gates

- Authenticated browser proof is still required for keyboard/mobile review of overdue, due-today, renewal, complete, and stale-conflict behavior.
- Isolated PostgreSQL proof is still required before this slice can be promoted beyond `IMPLEMENTED_UNVERIFIED`.
- UCRM-023 is not yet `VERIFIED`, merged as a dedicated review packet, piloted, or production-enabled from this checkpoint.
