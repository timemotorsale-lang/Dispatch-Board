# UCRM-020 Unified Permitted Activity Timeline Checkpoint

**Date:** 2026-08-15

**Implementation baseline:** `aa4a62a9+working`

**Branch:** `codex/unified-crm-console`

**Status:** `IMPLEMENTED_UNVERIFIED`; authenticated browser proof and isolated PostgreSQL proof remain pending

## Delivered boundary

- Customer 360 now exposes a stronger read-only unified relationship timeline inside the approved `/crm/customers/[customerId]` surface.
- The timeline merges only permitted activity from existing source-owned records:
  - manual customer interactions,
  - task and customer-resolution activity events,
  - appointment history,
  - source lead creation context,
  - concern-case creation context,
  - promise events,
  - CRM next-action domain events.
- The timeline reports explicit `READY` or `EMPTY` state, honest empty copy, newest visible event time, observation time, bounded page metadata, and stable per-item correlation keys and source record identifiers.
- The timeline remains read only. It does not mutate Tasks, Appointments, Sales, Customer Resolutions, or any external communication system.

## Security and authority

- Customer 360 now resolves canonical permitted customer access before running any timeline query.
- Missing, other-organization, other-owner, merged, and archived customer IDs fail closed through the same non-enumerating customer-not-available outcome.
- Timeline repository reads now organization-qualify customer interactions and task-linked activity branches in addition to existing organization or owner constraints on appointments, leads, cases, promises, and CRM domain events.
- Sales remains owner-scoped; Management remains organization-scoped.
- Timeline serialization continues to exclude raw contact data, hidden contact-point normalization or consent fields, address, retention, duplicate keys, and cross-organization identifiers.

## Quality and correctness improvements

- Timeline `hasMore` is now computed honestly across the merged cross-source timeline, not only within one individual source.
- Timeline items expose stable `correlationKey` and `sourceRecordId` fields for deterministic UI rendering and later drill-through or reconciliation work.
- The Customer 360 timeline UI now uses a semantic ordered list, clearer event-kind labels, `dateTime` timestamps, and explicit source-authority language.

## Automated evidence

- Focused integrated verification passed:
  - `src/tests/unit/unified-crm-customer-360-service.test.ts`
  - `src/tests/unit/unified-crm-customer-360.test.tsx`
  - `src/tests/unit/unified-crm-customer-timeline-repository.test.ts`
  - `src/tests/unit/unified-crm-customer-360-page.test.tsx`
  - `src/tests/unit/unified-crm-customer-360-page-component.test.tsx`
  - `src/tests/unit/unified-crm-customer-360-adversarial.test.ts`
  - `src/tests/unit/unified-crm-customer-360-access.test.ts`
  - `src/tests/unit/unified-crm-customer-360-repository.test.ts`
- Result: 8 files, 51 tests passed on the working baseline.
- Focused ESLint passed on the changed TypeScript and TSX files.
- `git diff --check` reports only Windows line-ending warnings; no whitespace or patch-format errors were introduced.

## Remaining gates

- Authenticated browser proof is still required for desktop/mobile/keyboard review over a permitted data-bearing customer timeline.
- An isolated PostgreSQL proof is still required before this slice can be promoted beyond `IMPLEMENTED_UNVERIFIED`.
- UCRM-020 is not yet `VERIFIED`, merged, piloted, or production-enabled from this checkpoint.
