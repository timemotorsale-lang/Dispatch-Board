# Workflows and Permissions

## Time-card lifecycle

```text
OPEN
  -> NEEDS_ATTENTION
  -> READY_FOR_EMPLOYEE
  -> EMPLOYEE_ATTESTED
  -> READY_FOR_MANAGER
  -> MANAGER_APPROVED
  -> LOCKED
  -> EXPORTED
  -> ACKNOWLEDGED
```

Corrections can return an unlocked card to `NEEDS_ATTENTION`. A locked or exported card requires controlled reopen, a new version, reapproval, and payroll reconciliation.

## Capture workflow

| Command | Allowed actor | Preconditions | Result |
| --- | --- | --- | --- |
| Clock in | Employee or authorized manager | Valid profile; no active session | Append clock-in event |
| Start meal | Employee | Active session; no open meal | Append meal-start event |
| End meal | Employee | Open meal | Append meal-end event |
| Clock out | Employee or authorized manager | Active session; no unresolved open meal unless exception accepted | Append clock-out event |
| Record paid rest | Employee/system attestation | Active session | Append rest evidence; attendance remains paid |

Manager capture on behalf of an employee requires a reason and visible employee history.

## Correction workflow

1. Employee or manager selects the exact disputed event/interval.
2. Proposal records requested value, reason, evidence, and expected card version.
3. Authorized reviewer accepts, rejects, or returns it.
4. Acceptance appends correction/supersession events; original evidence remains.
5. Card recalculates using the same or newly resolved policy version.
6. Existing attestation/approval becomes stale.
7. Employee can see the before/after history.

The requester cannot approve their own sensitive correction when separation-of-duties policy requires independent review.

## Employee attestation

Attestation displays the period, calculated totals, exceptions, corrections, policy summary, and statement text version. The employee may attest, dispute, or report missing work. Attestation is not a waiver of legal rights.

## Manager approval

The manager approves an exact card version after blocking exceptions are resolved. Approval does not authorize deleting worked time, manufacturing breaks, or bypassing unsupported policy profiles.

## Period close and reopen

- Payroll administrator runs readiness preview.
- Preview lists missing cards, stale attestations, unresolved exceptions, policy failures, and reconciliation mismatches.
- Close locks the approved version set atomically.
- Reopen requires capability, reason, scope, expected version, and audit.
- Reopened cards cannot be exported as if the prior batch remained current.

## Payroll export

1. Preview mapped earning codes and control totals.
2. Create immutable batch manifest and content hash.
3. Deliver once using idempotency key.
4. Record acknowledgment or rejection.
5. Reconcile employee/card/earning-code totals.
6. Create an owned conflict for any mismatch.
7. Correct through card/batch versioning, never file replacement without lineage.

## Time-off workflow

```text
DRAFT -> SUBMITTED -> ROUTED
  -> MANAGER_REVIEW (ordinary PTO/coverage)
  -> LEAVE_ADMIN_REVIEW (protected/restricted)
  -> APPROVED | DENIED | RETURNED | WITHDRAWN | CANCELLED
  -> AVAILABILITY_PROJECTED
  -> TIME_CARD_APPLIED
  -> PAYROLL_RECONCILED
```

- ESST requests collect only the minimum permitted category and timing information.
- A protected reason bypasses ordinary manager detail and routes to an authorized leave administrator.
- The Dispatch Board receives availability, not sensitive reasons.
- Denial requires an authorized reason code and cannot be based on hidden automated scoring.

## Permission matrix

| Capability | Employee | Manager | Payroll admin | Leave admin | System |
| --- | ---: | ---: | ---: | ---: | ---: |
| View own card/history | Yes | Scoped | Scoped | Restricted | Service |
| Capture own time | Yes | On behalf with reason | No | No | Approved import |
| Request correction | Yes | Yes | Yes | No | No |
| Accept correction | No | Scoped | Yes | No | No |
| Attest own card | Yes | No | No | No | No |
| Approve card | No | Yes | Scoped | No | No |
| Lock/reopen period | No | No | Yes | No | No |
| Export payroll | No | No | Yes | No | Adapter |
| Request ordinary leave | Yes | No | No | No | No |
| Approve ordinary coverage | No | Yes | No | Scoped | No |
| View protected evidence | Own submission | No | Minimum code only | Yes | Restricted service |
| Activate policy version | No | No | Proposed | Proposed | No |
| View audit | Own history | Scoped | Scoped | Scoped | No |

All capabilities are enforced server-side and organization/location scoped.

## Exception ownership

Every blocking exception has a type, owner role/user, due time, severity, source event IDs, policy IDs, resolution requirements, and status. Closing an exception requires evidence and does not rewrite its original detection.

