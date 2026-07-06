# Appointment Held Reservation Schedule Commit Contract

**Work package:** EAPT-029I  
**Status:** Implemented as initial Schedule command held-reservation commit bridge  
**Verified:** 2026-07-06

## Purpose

This contract connects Appointment Board resource holds to final scheduling.

Before this slice, the board could attach a requirement, propose a candidate, preview availability, and convert the proposal to a `HELD` reservation. The held reservation protected capacity, but the Schedule Draft command did not yet consume that hold as part of final scheduling.

The Schedule command now collects the appointment's server-side `HELD` reservations and commits those exact rows to `COMMITTED` during lifecycle command execution.

## User Flow

From `/appointments`:

1. User creates or selects a persisted draft appointment.
2. User attaches a resource requirement.
3. User proposes a resource candidate.
4. User confirms availability and selects **Hold Candidate**.
5. User selects **Schedule Draft**.
6. The command execution service loads the appointment's `HELD` reservations on the server.
7. The lifecycle planner receives those held reservations as reservation commit candidates.
8. The transaction repository updates the existing reservation rows from `HELD` to `COMMITTED`.
9. The appointment moves to `SCHEDULED`, appointment version increments, command ledger completes, and appointment history records the scheduling event.

## Enterprise Controls

- The browser does not submit resource internals for scheduling.
- Held reservation candidates are loaded server-side from persisted appointment state.
- Only reservations belonging to the appointment and currently marked `HELD` are eligible.
- Existing `HELD` rows are updated to `COMMITTED`; duplicate committed rows are not created.
- Schedule command authorization, expected-version protection, command ledger handling, appointment history, and transaction rollback behavior stay inside the existing lifecycle command boundary.
- If no held reservations exist, Schedule Draft continues through the existing scheduling path without reservation effects.

## Commit Candidate Source

The command repository converts held reservations into lifecycle reservation candidates with:

- source reservation id
- appointment id and location
- requirement id, appointment id, and requirement code
- resource id, location, name, status, capacity, mode, conflict policy, and effective dates
- resource operating windows
- resource unavailability
- reservation start, end, capacity, and buffers

## Transaction Behavior

When a lifecycle reservation candidate includes a source reservation id:

1. The transaction updates that reservation from `HELD` to `COMMITTED`.
2. If the row is no longer `HELD`, execution fails.
3. The committed row is reloaded and returned as the committed reservation result.
4. No new reservation row is inserted.

When no source reservation id exists, the existing create-new-committed-reservation behavior remains available for later server-side scheduling paths.

## Not Yet Claimed

Still pending:

- dedicated warning override UI/history capture before committing warning-policy holds
- release/change controls for held and committed reservations from the board
- staff conflict preview alongside resource availability
- browser workflow coverage for the full attach → propose → hold → schedule path
- production evidence for concurrent scheduling behavior
