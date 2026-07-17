# AE-2 — Enterprise Roles, Authority, Financial, Evidence, Timing, Integration, and Reconciliation Approval

**Status:** Ready for execution; not conducted  
**Decisions:** `ITF-APR-020`-`025`, `030`-`036`, `040`-`045`, `050`-`056`, `060`-`065` (32 total)

## Subpackets

| Subpacket | Source | Decisions |
| --- | --- | --- |
| Roles/responsibilities | [`Workshop 2A`](../APPROVAL_WORKSHOP_02_ENTERPRISE_ROLE_RESPONSIBILITY_CATALOG.md) | `020`-`025` |
| Authority/financial | [`Workshop 2B`](../APPROVAL_WORKSHOP_02B_AUTHORITY_FINANCIAL_CONTROL_MATRIX.md) | `030`-`036` |
| Timing/escalation | [`Workshop 2D`](../APPROVAL_WORKSHOP_02D_TIMING_ESCALATION_NOTIFICATION_COVERAGE_MATRIX.md) | `040`-`045` |
| Evidence/privacy/security | [`Workshop 2C`](../APPROVAL_WORKSHOP_02C_EVIDENCE_PRIVACY_SECURITY_MATRIX.md) | `050`-`056` |
| Source/integration | [`Workshop 2E`](../APPROVAL_WORKSHOP_02E_SOURCE_AUTHORITY_INTEGRATION_RECONCILIATION_MATRIX.md) | `060`-`065` |

## Required outcomes

- Named roles, backups, qualification, access, separation and delegation.
- Command-specific and cumulative financial authority, quotes, reapproval and emergencies.
- Business calendars, segmented clocks, pauses, escalation, notifications and coverage.
- Evidence applicability, criticality, source, access, retention, correction and quarantine.
- Field-level source authority, freshness, provider states, degraded behavior and reconciliation.

## Safe execution rule

Where names, dollar values, legal/insurance determinations, retention periods, calendars, provider contracts, or exact thresholds are absent, retain `OPEN`, use the source safe default, and continue decisions that do not depend on the missing fact. Never insert placeholder numbers as approved policy.

## Current recommendation

Three decisions recommend `DEFER_SAFE` (`051`, `052`, `063`); the source ledger recommends approval or approval-with-change for the others. Any additional decision whose required authority cannot be supplied must remain `OPEN` and use its documented safe default. Authoritative state remains `OPEN` for all 32.

## Exit gate

AE-2 exits only when every live action has a named authority, every financial commitment has exact limits, every critical fact has an approved evidence/source contract, every clock/escalation has an owner, and degraded behavior cannot fabricate a gate pass.
