# UCRM-084 Telephony/Transcription Evidence

**Status:** `HELD`  
**Date:** 2026-08-27  
**Branch:** `codex/unified-crm-ucrm080-099`

## Scope

UCRM-084 adds the safe readiness boundary for future CRM calling, recording, transcription, inbound routing, and AI receptionist support.

This checkpoint does not select a provider, place calls, record calls, transcribe calls, route inbound calls, or enable an AI receptionist.

## Implemented

- Contract version `ucrm.telephony-transcription/v1`.
- Manager-only telephony/transcription readiness service.
- Fail-closed API route at `/api/crm/v1/integrations/telephony`.
- Explicit held activation model:
  - click-to-call disabled,
  - inbound call routing disabled,
  - call recording disabled,
  - transcription disabled,
  - AI receptionist disabled,
  - provider name unset.
- Readiness checks for provider selection, calling authority, recording consent, retention, transcription provenance, restricted access, inbound routing, AI receptionist boundary, provider failure, audit, legal approval, and kill switch.

## Blocker

UCRM-084 remains `HELD` because activation requires provider, legal, security/privacy, retention, and operations decisions:

- telephony/transcription provider,
- number strategy,
- calling permission model,
- recording consent wording and jurisdiction handling,
- retention period under UCRM-DEC-014,
- inbound routing behavior,
- AI receptionist limits and human approval boundary,
- browser and rollback proof.

## Verification

Focused tests added:

- `src/tests/unit/unified-crm-telephony-transcription-service.test.ts`
- `src/tests/unit/unified-crm-telephony-transcription-route.test.ts`

Pending before activation:

- Named provider approval.
- Legal/security approval for calling, recording, and transcription.
- Retention/disposition decision for recordings and transcripts.
- Live provider sandbox/pilot proof.

## Honest status

UCRM-084 is `HELD`. The readiness boundary exists, but no live voice, recording, transcription, inbound routing, or AI receptionist behavior is enabled.
