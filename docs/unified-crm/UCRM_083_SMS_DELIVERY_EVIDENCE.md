# UCRM-083 SMS Delivery Evidence

**Status:** `HELD`  
**Date:** 2026-08-27  
**Branch:** `codex/unified-crm-ucrm080-099`

## Scope

UCRM-083 adds the safe readiness boundary for future CRM SMS delivery.

This checkpoint does not select a vendor, provision a number, send text messages, receive live inbound messages, or bypass customer consent.

## Implemented

- Contract version `ucrm.sms-delivery/v1`.
- Manager-only SMS readiness service.
- Fail-closed API route at `/api/crm/v1/integrations/sms`.
- Explicit held activation model:
  - outbound SMS disabled,
  - inbound SMS disabled,
  - provider name unset.
- Guardrails for consent basis, STOP keyword requirement, held quiet-hours policy, and unset cost cap.
- Readiness checks for vendor selection, consent/opt-out, templates, quiet hours, inbound correlation, delivery states, retry/failure, audit, cost/rate controls, kill switch, and browser proof.

## Blocker

UCRM-083 remains `HELD` because SMS activation requires approved provider/vendor decisions and operating policies:

- vendor and phone/sender registration,
- consent and opt-out handling,
- approved templates,
- quiet hours,
- retry/dead-letter behavior,
- daily/monthly cost caps,
- rate/frequency controls,
- browser and rollback proof.

## Verification

Focused tests added:

- `src/tests/unit/unified-crm-sms-delivery-service.test.ts`
- `src/tests/unit/unified-crm-sms-delivery-route.test.ts`

Pending before activation:

- Named SMS vendor approval.
- Legal/security review of consent, opt-out, quiet-hours, and message-retention behavior.
- Live provider test in a sandbox or approved pilot environment.

## Honest status

UCRM-083 is `HELD`. The readiness boundary exists, but no live SMS behavior is enabled.
