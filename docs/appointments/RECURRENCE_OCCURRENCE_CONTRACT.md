# Recurrence and Occurrence Contract

**Work package:** EAPT-017  
**Status:** Implemented as service boundary  
**Purpose:** Define how recurring Appointment series expand into concrete occurrences with exceptions and safe edit scopes.

## Enterprise Rule

Recurring appointments are modeled as a series definition plus materialized or previewed occurrences.

The series owns the pattern. Each occurrence can later own its own appointment state, reservations, history, and exceptions.

This keeps the system from silently rewriting historical work when a recurring appointment changes.

## Supported Recurrence Definitions

The implemented recurrence boundary supports:

- Daily recurrence
- Weekly recurrence
- Monthly recurrence
- Recurrence interval
- Location timezone
- Local start date
- Local start minute
- Duration
- Optional weekday selection for weekly recurrence
- Optional day-of-month selection for monthly recurrence
- End never, on local date, or after a number of occurrences

Expansion is bounded by an explicit horizon.

## Expansion Horizon

Recurring series expansion must be bounded. The current enterprise safety limits are:

| Control | Limit |
| --- | ---: |
| Maximum expansion horizon | 366 days |
| Maximum returned occurrences | 500 |
| Minimum duration | 5 minutes |
| Maximum duration | 480 minutes |
| Earliest start minute | 0 |
| Latest start minute | 1439 |

These limits prevent accidental unbounded generation while still covering operational planning needs.

## Daylight-Saving Behavior

Recurrence expansion preserves approved local-time behavior.

For example, a Monday 9:00 AM Minneapolis recurrence remains Monday 9:00 AM locally even when the UTC instant changes after daylight saving time begins or ends.

## Occurrence Exceptions

Occurrence exceptions are explicit and reasoned.

Supported exception actions:

- `SKIP`
- `RESCHEDULE`

Every exception requires a reason code. A rescheduled occurrence can override:

- Replacement local date
- Replacement start minute
- Replacement duration

The occurrence key remains tied to the original series date so audit, conflict preview, and future correction can explain what changed.

## Series Edit Scopes

Series edits support the enterprise scopes approved in the lifecycle and conflict matrix:

- This occurrence
- This and future occurrences
- Entire series

Completed and cancelled occurrences are protected from silent rewrite. They are listed as preserved in the edit-impact preview.

Editing only one occurrence requires an occurrence exception rather than rewriting the series definition.

## Implemented Boundary

The implementation lives in:

- `src/server/appointments/appointment-recurrence-service.ts`
- `src/tests/unit/appointment-recurrence-service.test.ts`

Implemented behavior:

- Expands daily, weekly, and monthly recurrence definitions.
- Preserves local-time recurrence across daylight-saving transitions.
- Applies skipped and rescheduled occurrence exceptions.
- Requires reason codes for exceptions.
- Honors count-based and local-date-based series endings.
- Rejects expansion horizons beyond enterprise limits.
- Previews this-occurrence, this-and-future, and entire-series edit scopes.
- Preserves completed and cancelled occurrences during series-edit previews.

## Not Yet Claimed

This contract does not yet persist recurrence series, materialize database-backed occurrence appointments, run per-occurrence conflict evaluation, or expose recurrence controls in the Appointment Board UI. Those are covered by later scheduling, conflict, persistence, and administration work packages.
