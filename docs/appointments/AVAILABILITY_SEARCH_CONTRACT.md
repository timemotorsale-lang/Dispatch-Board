# Availability Search Contract

**Work package:** EAPT-021  
**Status:** Implemented as service boundary  
**Purpose:** Find candidate appointment slots using the same authoritative rules used by scheduling commitment.

## Enterprise Rule

Availability search must not invent a separate scheduling truth.

Search results are useful only when they reconcile with the same server-side rules used immediately before commitment:

- Location time and operating windows
- Template duration and buffers
- Hard-conflict evaluation
- Warning evaluation
- Resource availability
- Staff availability
- Reservation capacity rules

A slot shown as available by search still must be rechecked at commit time by EAPT-018 through EAPT-020 because another user or automation may have changed capacity after the search ran.

## Implemented Search Behavior

The implemented search service:

- Searches a bounded local-date window.
- Generates candidate starts from effective location operating windows.
- Uses the template start interval unless a stricter interval is provided.
- Evaluates each candidate through the EAPT-018 hard-conflict evaluator.
- Evaluates warnings through the EAPT-019 warning evaluator.
- Labels slots as:
  - `AVAILABLE`
  - `WARNING`
  - `BLOCKED`
- Returns available and warning slots separately.
- Excludes blocked slots by default.
- Can include blocked slots for diagnostics or conflict previews.
- Can suppress warning slots when a caller wants clean availability only.

## Search Limits

| Control | Limit |
| --- | ---: |
| Maximum search horizon | 31 days |
| Maximum evaluated candidate slots | 1000 |
| Default returned result count | 25 |

These limits keep interactive searches responsive and prevent accidental broad scans.

## Warning Behavior

Warning slots are returned when the appointment has no hard block but requires resolution or manager override before commitment.

Examples:

- Staff warning overlap
- Warning-policy resource availability
- Duration or buffer override requiring manager approval
- Explicit business-warning signals such as customer nearby appointment or prep readiness risk

## Commit Reconciliation

Availability search does not commit reservations. The final scheduling command must still:

1. Re-run hard-conflict evaluation.
2. Re-run warning evaluation.
3. Validate required warning overrides.
4. Re-check and create resource reservations inside the protected EAPT-020 boundary.

## Implemented Boundary

The implementation lives in:

- `src/server/appointments/appointment-availability-search-service.ts`
- `src/tests/unit/appointment-availability-search-service.test.ts`

Implemented behavior:

- Finds slots using duration, buffer, location, resource, and staff rules.
- Excludes hard-blocked resource conflicts from available results.
- Returns manager-required warning slots separately.
- Supports clean availability-only search.
- Rejects oversized search horizons.

## Not Yet Claimed

This contract does not yet provide a database-backed search adapter, rank across alternative resources or staff, expose search results in the Appointment Board UI, or commit selected slots. Those are covered by later command-center, persistence, and UI work packages.
