# UCRM-025 CRM Home "My Work" v1 Checkpoint

**Date:** 2026-08-15

**Implementation baseline:** `3bbfa641+working`

**Branch:** `main`

**Status:** `IMPLEMENTED_UNVERIFIED`; authenticated browser proof and isolated PostgreSQL reconciliation proof remain pending

## Delivered boundary

- `/crm` Home and `/crm?view=work` now use a real persisted read-only CRM work queue.
- The queue currently aggregates permitted work from existing Appointments, Leads, Customer Resolution Cases, and CRM customer next-action follow-up records.
- Task rows remain intentionally withheld from the live CRM queue until tenant-safe Task authority can be proven without inferring organization scope.
- Every queue item drills into an existing governed source route, and safe Customer 360 continuity is shown only when a valid customer route can be derived.

## Security and authority

- The queue fails closed unless shell mode, CRM customer read mode, and the dedicated CRM work mode are all `REVIEW`.
- Viewer authorization is derived from the existing CRM customer read policy, including owner-only restrictions for Sales.
- Organization scope is resolved from active location grants and rejects zero-scope or multi-organization ambiguity.
- Linked Customer 360 routes are omitted when the linked customer identity is absent, invalid, archived, merged, cross-organization, or outside owner scope.

## Quality and correctness improvements

- Queue ranking remains deterministic: overdue first, then today, upcoming, and waiting, with stable due-time, source-kind, freshness, and id ordering.
- CRM Home and Work explain queue freshness from the live aggregated read model instead of implying operational completion.
- Live filtering now stays honest when no items match: the UI shows filtered counts and a no-match state rather than falsely suggesting that no work exists.
- The Today rail now shows only same-day appointments instead of simply taking the first few future appointments.
- The overdue visual state is now aligned with the live `overdue` contract so urgent work renders consistently.
- Attention actions now disable when no matching overdue or due-today item is available.

## Automated evidence

- Focused verification passed on 2026-08-15 for:
  - `src/tests/unit/unified-crm-work-queue-service.test.ts`
  - `src/tests/unit/unified-crm-shell-review.test.tsx`
  - `src/tests/unit/unified-crm-page-access.test.tsx`
- The shell review suite includes focused proof that a zero-match live filter:
  - preserves honest filtered counts,
  - shows a no-match message instead of an empty-work claim,
  - and keeps the queue boundary read-only.

## Remaining gates

- Source-specific location-grant proof, timezone-correct Today behavior, and reconciled truncation metadata still need follow-up before UCRM-025 can move beyond `IMPLEMENTED_UNVERIFIED`.
- Authenticated browser proof is still required across desktop/mobile for live work, filter behavior, Today rail continuity, denied/off fallback, and keyboard interaction.
- Isolated PostgreSQL proof is still required to verify real multi-source reconciliation against migrated data.
- UCRM-025 is not yet `VERIFIED`, merged as a dedicated review packet, piloted, or production-enabled from this checkpoint.
