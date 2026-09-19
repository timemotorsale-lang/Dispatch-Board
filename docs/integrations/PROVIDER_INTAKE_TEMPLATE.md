# Provider Intake Template

Copy this template for every outside tool before implementation begins.

## Provider Summary

| Field | Decision |
| --- | --- |
| Provider name | TBD |
| Provider family | TBD |
| Business owner | TBD |
| Technical owner | TBD |
| Target environment | sandbox / pilot / production |
| Intended first workflow | TBD |
| Default posture | read-only / write-back / sync / action-only / held |
| Feature flag or kill switch | TBD |

## Business Purpose

- What staff workflow does this improve?
- What internal console owns the workflow?
- What manual fallback remains available?
- What must not happen automatically?

## Data Scope

| Data area | Read from provider | Write to provider | Internal owner | Classification |
| --- | --- | --- | --- | --- |
| Customer identity | TBD | TBD | Customers / CRM | TBD |
| Contact method | TBD | TBD | Customers / CRM | confidential |
| Vehicle identity | TBD | TBD | Inventory / Vehicle 360 | TBD |
| Appointment | TBD | TBD | Appointments | TBD |
| Task or work item | TBD | TBD | Dispatch Board / Tasks | TBD |
| Communication content | TBD | TBD | CRM / Communications | confidential |
| Document | TBD | TBD | owning workflow | TBD |
| Payment/accounting fact | TBD | TBD | Accounting/DMS boundary | restricted |

## Authority Decisions

- Which fields are canonical in Dispatch Board?
- Which fields are canonical in the provider?
- Which provider values are advisory only?
- What happens when provider data conflicts with internal data?
- What freshness window is acceptable?
- What duplicate identity rules apply?

## Credentials and Security

- Required OAuth scopes, API permissions, or service-account permissions:
- Secret storage path or credential reference:
- Token rotation and revocation process:
- Webhook signing and replay protection:
- IP allowlist or egress restrictions:
- Rate limits and expected daily volume:

## Consent, Privacy, and Retention

- Consent or legal basis required:
- Suppression or opt-out rules:
- Retention period for provider payloads:
- Fields that must never be logged:
- Fields that must never be sent to AI or analytics:
- Customer request/correction behavior:

## Adapter Behavior

| Behavior | Decision |
| --- | --- |
| Health check | TBD |
| Pull resources | TBD |
| Push resources | TBD |
| Webhooks | TBD |
| Idempotency key format | TBD |
| Correlation ID format | TBD |
| Retry policy | TBD |
| Dead-letter handling | TBD |
| Reconciliation cadence | TBD |

## User Experience

- Where does connection health appear?
- What does the user see when provider data is unavailable?
- Which actions are disabled during degraded or paused state?
- What manual fallback button/path is visible?
- What audit or source context is shown before action?

## Tests and Evidence

Required before activation:

- provider registry test;
- source-authority test;
- credential-missing fail-closed test;
- revoked credential test;
- idempotency/retry test;
- duplicate/conflict test;
- webhook signature/replay test;
- permission and organization isolation test;
- browser proof for the user workflow;
- rollback rehearsal evidence.

## Activation Decision

| Gate | Owner | Status | Evidence |
| --- | --- | --- | --- |
| Business approval | TBD | held | TBD |
| Security/privacy approval | TBD | held | TBD |
| Source authority approval | TBD | held | TBD |
| Technical readiness | TBD | held | TBD |
| Pilot readiness | TBD | held | TBD |
| Rollback readiness | TBD | held | TBD |
