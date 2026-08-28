# UCRM-082 Email/Calendar Provider B Evidence

**Status:** `HELD`  
**Date:** 2026-08-27  
**Branch:** `codex/unified-crm-ucrm080-099`

## Scope

UCRM-082 adds the safe readiness boundary for a second email/calendar provider.

This checkpoint intentionally keeps Provider B independent from Provider A. A first provider approval does not choose, configure, authorize, or prove the second provider.

## Implemented

- Contract version `ucrm.email-calendar-provider-b/v1`.
- Manager-only Provider B readiness service.
- Fail-closed API route at `/api/crm/v1/integrations/email-calendar/provider-b`.
- Explicit second-provider independence flags:
  - no inherited Provider A approval,
  - separate credentials required,
  - separate rollback proof required.
- Held activation model:
  - external send disabled,
  - calendar write disabled,
  - inbound sync disabled,
  - provider name unset.
- Readiness checks for independent provider selection, separate OAuth approval, least-privilege comparison, sync conflict separation, dedupe isolation, revoke/fallback, retry/replay isolation, reconciliation, security/privacy, browser proof, and rollback.

## Blocker

UCRM-082 remains `HELD` because no second provider has been approved. It also depends on separate credentials, OAuth scopes, sync/conflict rules, security/privacy review, browser proof, and rollback evidence.

## Verification

Focused tests added:

- `src/tests/unit/unified-crm-email-calendar-provider-b-service.test.ts`
- `src/tests/unit/unified-crm-email-calendar-provider-b-route.test.ts`

Pending before activation:

- Product/security approval for a named second provider.
- Provider-specific OAuth, sync, dedupe, revoke, reconciliation, browser, and rollback proof.

## Honest status

UCRM-082 is `HELD`. The readiness boundary exists, but no second email/calendar provider is enabled.
