# Integration Foundation

**Status:** planning baseline  
**Branch:** `codex/integrations-organization-foundation`  
**Purpose:** organize future outside-tool integrations before any provider-specific code is added.

## Principle

Outside tools must enter Dispatch Board through one governed integration platform. No provider should write directly into a console, bypass source authority, or create a second version of a customer, vehicle, appointment, task, repair order, sale, payment, document, or communication record.

## Existing Anchors

- CRM Next integration checklist: `docs/crm-next/08_CRM_NEXT_INTEGRATION_CONTRACT.md`
- Unified CRM platform boundary: `docs/unified-crm/UCRM_080_INTEGRATION_PLATFORM_EVIDENCE.md`
- Inventory integration platform: `docs/inventory/M9_INTEGRATION_PLATFORM_IMPLEMENTATION.md`
- Security and privacy gates: `docs/unified-crm/SECURITY_AND_PRIVACY.md`
- Current integration domain code: `src/server/integrations`

## Foundation Packet

- `IMPLEMENTATION_FOUNDATION.md` defines the implementation order, common adapter rules, runtime gates, and release blockers.
- `PROGRESSIVE_INTEGRATION_ROADMAP.md` defines the conservative learning path from simple daily-use integrations to advanced automation.
- `PROVIDER_INTAKE_TEMPLATE.md` is the required intake document for every outside tool.
- `SOURCE_AUTHORITY_MATRIX.md` defines which internal domain owns each type of fact and what providers may do with it.

## Provider Families

The current platform should organize external tools into these families:

| Family | Examples | Default posture |
| --- | --- | --- |
| Email and calendar | Gmail, Outlook, scheduling tools | held until consent, scope, sync, and revoke rules are approved |
| SMS and messaging | SMS providers, chat tools | held until consent, suppression, delivery evidence, and duplicate-send controls are approved |
| Telephony and transcription | phone, call recording, transcription | held until recording consent, retention, and transcript classification are approved |
| Documents and e-signature | upload, forms, signature envelopes | held until document classification, storage, identity, and signature authority are approved |
| DMS and accounting | dealer management, accounting, payment references | held until source authority, reconciliation, and no-duplicate-write rules are approved |
| Inventory and vehicle data | VIN history, market/listing, parts vendors | held until advisory/canonical/delivery role is explicit |
| Collaboration and work tools | Slack, Teams, email tasks, project tools | held until notification, command authority, and audit boundaries are explicit |

## Readiness Rule

A provider can move from planning to implementation only when it has:

1. an approved provider intake record,
2. a source-authority decision for every field it reads or writes,
3. least-privilege credential and environment handling,
4. idempotency, retry, reconciliation, and audit behavior,
5. a kill switch and rollback path,
6. focused tests and browser evidence for the exposed workflow.

Until those items exist, the integration remains a documented boundary only.

## Adoption Philosophy

Integrations should start small, useful, and reversible. The first integrations should help daily operations without creating new business risk: read-only visibility, manual lookup, simple import/export, safe links, and human-confirmed outcomes. More complex behavior earns its way in only after the team understands the provider, the workflow is used regularly, and the safety controls are proven.
