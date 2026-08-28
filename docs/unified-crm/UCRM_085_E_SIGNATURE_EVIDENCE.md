# UCRM-085 E-Signature Evidence

**Status:** `HELD`  
**Date:** 2026-08-27  
**Branch:** `codex/unified-crm-ucrm080-099`

## Scope

UCRM-085 adds the safe readiness boundary for future CRM e-signature support.

This checkpoint does not select a provider, create an envelope, send documents for signature, import live signature status, or treat any quote/order as signed.

## Implemented

- Contract version `ucrm.e-signature/v1`.
- Manager-only e-signature readiness service.
- Fail-closed API route at `/api/crm/v1/integrations/e-signature`.
- Explicit held activation model:
  - envelope creation disabled,
  - signature status import disabled,
  - provider name unset.
- Readiness checks for provider selection, document authority, signer identity, immutable envelope evidence, webhook reconciliation, expiry/cancel, permissions, template versioning, audit, and rollback.

## Blocker

UCRM-085 remains `HELD` because e-signature activation requires approved business and security decisions:

- provider selection,
- document authority,
- signer identity rules,
- expiry/cancel/resend behavior,
- template governance,
- provider webhook proof,
- rollback rehearsal.

## Verification

Focused tests added:

- `src/tests/unit/unified-crm-e-signature-service.test.ts`
- `src/tests/unit/unified-crm-e-signature-route.test.ts`

Pending before activation:

- Named provider approval.
- Document/signature authority decision.
- Signer identity and immutable evidence proof.
- Provider webhook, browser, and rollback evidence.

## Honest status

UCRM-085 is `HELD`. The readiness boundary exists, but no live e-signature behavior is enabled.
