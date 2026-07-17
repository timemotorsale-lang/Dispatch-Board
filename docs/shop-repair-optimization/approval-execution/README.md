# Shop and Recon Optimization Approval Execution

**Formal title:** Time Motor Sales Shop and Recon Optimization — Policy, Authority, Controls, Pilot, and Implementation Approval
**Branch:** `codex/shop-recon-optimization-approval-execution`
**Status:** `READY_FOR_AE0`; not entered; 79 decisions open; no code authorized
**Proposed policy version:** `SRO-1.0`
**Organization/location:** Time Motor Sales / Minneapolis, subject to authorized confirmation

## Purpose

This package converts the completed Shop and Repair Optimization planning baseline into one controlled approval process covering all eight workshops and all 79 `SRO-APR-*` decisions. It does not repeat the catalogs or interpret planning recommendations as dealership policy.

## Execution sequence

1. Enter [`AE-0 Authority and Session`](AE_00_AUTHORITY_AND_SESSION_RECORD.md).
2. Validate each participant's scope, conflicts, backup and independent-review requirements.
3. Process the 79 decisions sequentially through the [`Consolidated Decision Ledger`](CONSOLIDATED_79_DECISION_LEDGER.md) and [`Workshop Execution Gates`](WORKSHOP_EXECUTION_GATES.md).
4. Record each valid disposition in the [`Decision Signature Journal`](DECISION_SIGNATURE_JOURNAL.md).
5. Resolve or safely contain the [`Missing Inputs`](MISSING_INPUTS_REGISTER.md).
6. Execute and accept the [`Tabletop and Acceptance Suite`](TABLETOP_AND_ACCEPTANCE.md).
7. Complete the [`Master Authorization Resolution`](MASTER_AUTHORIZATION_RESOLUTION.md).

## Eight-workshop coverage

| Workshop | Decisions | Approval domain | Current result |
| --- | --- | --- | --- |
| 1 | `001`–`009` | Charter, lanes, scope, authority and pilot | 9 OPEN |
| 2 | `010`–`019` | States, class of service, WIP and readiness | 10 OPEN |
| 3 | `020`–`029` | Capacity, skills, resources, dispatch and fairness | 10 OPEN |
| 4 | `030`–`039` | Parts, execution, changed scope, QC and recovery | 10 OPEN |
| 5 | `040`–`049` | Parts/labor pricing, discounts and financial controls | 10 OPEN |
| 6 | `050`–`059` | Technician/advisor assistance, evidence and privacy | 10 OPEN |
| 7 | `060`–`069` | Customer intelligence, prediction, consent and outreach | 10 OPEN |
| 8 | `070`–`079` | Data authority, measurement, tabletop and activation | 10 OPEN |
| **Total** | **79** | **Complete approval program** | **79 OPEN** |

## Decision integrity

Only an authorized human may close a decision. Each record requires the exact policy or exact replacement language, approver identity and represented authority, effective scope/version/time, conflicts and recusals, additional signers, conditions, dependencies, safe default, review/expiry and evidence. Discussion, silence, document creation, a commit or a recommendation is not approval.

## Authorization separation

```text
POLICY APPROVAL
  != TECHNICAL DESIGN AUTHORIZATION
  != CODE IMPLEMENTATION AUTHORIZATION
  != SHADOW AUTHORIZATION
  != PILOT AUTHORIZATION
  != PRODUCTION ACTIVATION
```

Current result: `NO-GO FOR DESIGN / CODE / SHADOW / PILOT / ACTIVATION`.
