# UCRM-123 — Accounting/DMS mapping preview evidence

Status: `IMPLEMENTED_UNVERIFIED`

## Scope

UCRM-123 extends the existing accounting/DMS connector readiness model with a read-only mapping preview for customer, quote, dispatch, and accounting/DMS fields.

## Safety posture

- Backfill is disabled.
- Incremental sync is disabled.
- Outbound writeback is disabled.
- No external system is selected.
- Rows identify source authority and conflict risk without exposing credentials or provider payloads.

## Verification

- Focused accounting/DMS service tests cover mapping preview state, sync-disabled posture, held writeback, quote conflict risk, and no credential leakage.
- Existing accounting/DMS route tests cover success and safe typed errors.
- Full TypeScript typecheck passed.

## Remaining review

Named DMS/accounting system, field ownership, conflict rules, backfill scope, payment-status handling, and browser/admin UX proof remain required before this milestone can be marked `VERIFIED`.
