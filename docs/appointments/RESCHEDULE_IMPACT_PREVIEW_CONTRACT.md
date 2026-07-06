# Reschedule and Recurrence Impact Preview Contract

**Work package:** EAPT-022  
**Status:** Implemented as service boundary  
**Purpose:** Preview appointment rescheduling and recurrence-change effects before anything is committed.

## Enterprise Rule

Rescheduling must be previewed before commitment.

The preview must show prior time, proposed time, affected reservations, hard blocks, warnings, and recurrence scope impact. It must not mutate appointment state, release reservations, create reservations, or write history.

## Single-Appointment Preview

The implemented preview returns:

- Appointment ID
- Prior start/end
- Proposed start/end
- Proposed resource reservation window
- Whether the change can currently apply
- Reason-required flag
- Hard-conflict result
- Warning result
- Existing reservation impacts
- Proposed reservation resource IDs

Reservation impact actions:

- `UNCHANGED`
- `RELEASE_AND_RECREATE`
- `RELEASE_ONLY`

Consuming reservations in `HELD` or `COMMITTED` status are marked for recreate when the proposed time changes.

## Recurrence Preview

Recurring changes use the EAPT-017 edit scopes:

- This occurrence
- This and future occurrences
- Entire series

The recurrence preview reports:

- Affected occurrence keys
- Preserved completed/cancelled occurrence keys
- Per-occurrence reschedule previews
- Blocked occurrence keys
- Warning occurrence keys
- Whether the scoped change can currently apply

Completed and cancelled occurrences are preserved from silent rewrite. Their preservation is reported, but it is not by itself a hard failure.

## Conflict and Warning Reconciliation

The preview uses:

- EAPT-018 hard-conflict evaluation
- EAPT-019 warning evaluation
- EAPT-017 recurrence edit impact rules

A preview can apply only when no affected occurrence has hard blocks or unresolved manager-required warnings.

## Implemented Boundary

The implementation lives in:

- `src/server/appointments/appointment-reschedule-impact-service.ts`
- `src/tests/unit/appointment-reschedule-impact-service.test.ts`

Implemented behavior:

- Previews prior/new times for a clean reschedule.
- Identifies reservations that must be released and recreated.
- Shows hard-blocked reschedules without claiming they can apply.
- Shows warning reschedules that need manager resolution.
- Previews recurrence scope impact with affected, blocked, warning, and preserved occurrences.

## Not Yet Claimed

This contract does not yet execute reschedules, persist preview snapshots, write history, update recurring series records, release or recreate reservations, or expose preview controls in the Appointment Board UI. Those are covered by later bulk, command execution, lifecycle, persistence, and UI work packages.
