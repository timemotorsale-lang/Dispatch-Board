# UCRM-081 Email/Calendar Provider A Evidence

**Status:** `HELD`  
**Date:** 2026-08-27  
**Branch:** `codex/unified-crm-ucrm080-099`

## Scope

UCRM-081 adds the safe provider A readiness boundary for a future email/calendar integration.

This checkpoint does not choose a provider, start OAuth, store tokens, sync messages, create calendar events, send email, or change Customer/Appointment source-of-truth data.

## Implemented

- Contract version `ucrm.email-calendar-provider-a/v1`.
- Manager-only provider A readiness service.
- Fail-closed API route at `/api/crm/v1/integrations/email-calendar/provider-a`.
- Explicit held activation model:
  - external send disabled,
  - calendar write disabled,
  - inbound sync disabled,
  - provider name unset.
- Readiness checks for provider selection, OAuth scope, consent/purpose, sync direction, backfill, dedupe/conflict, revoke, retry/reconciliation, security/privacy, browser proof, and rollback.
- Manual fallback posture through existing manual contact outcome and source calendar workflows.

## Blocker

UCRM-081 remains `HELD` because provider-specific business and security decisions are not approved:

- provider A name,
- OAuth scopes,
- sync direction,
- backfill window,
- conflict behavior,
- token/security handling,
- browser proof,
- rollback rehearsal.

## Verification

Focused tests added:

- `src/tests/unit/unified-crm-email-calendar-provider-a-service.test.ts`
- `src/tests/unit/unified-crm-email-calendar-provider-a-route.test.ts`

Pending before activation:

- Product/security approval for a named provider.
- Provider credentials and least-privilege OAuth proof.
- Consent, revoke, dedupe, conflict, retry, reconciliation, browser, and rollback evidence.

## Honest status

UCRM-081 is `HELD`. The readiness boundary exists, but no live email/calendar provider behavior is enabled.
