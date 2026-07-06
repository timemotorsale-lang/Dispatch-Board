# Resource Reservation Commit and Release Contract

**Work package:** EAPT-020  
**Status:** Implemented as service boundary  
**Purpose:** Define protected resource reservation commitment and release behavior.

## Enterprise Rule

Resource reservation commitment must be protected from overbooking.

The system must not rely on a stale browser preview or an earlier conflict check. Immediately before creating resource reservations, the server must re-check current resource availability inside a protected transaction/lock boundary.

## Implemented Commit Boundary

The implemented service:

- Normalizes reservation inputs against EAPT-005 reservation invariants.
- Sorts and de-duplicates resource IDs before locking to reduce deadlock risk.
- Opens a resource-reservation transaction boundary.
- Reads current overlapping reservations inside that boundary.
- Re-evaluates resource availability using the EAPT-014 evaluator.
- Creates no reservations when any protected candidate fails.
- Creates all reservations only after every candidate passes.
- Treats `HELD` and `COMMITTED` reservations as capacity-consuming.
- Treats `PROPOSED`, `RELEASED`, and `CANCELLED` reservations as non-consuming through the availability evaluator.

## Warning Resource Policy

Warning-policy resources are blocked by default at the commit boundary when unavailable.

The service can accept `allowWarningCommit` only after upstream warning evaluation and manager override policy have explicitly authorized the warning. Hard-block resources still cannot be committed when unavailable.

## Release Boundary

Reservation release requires:

- One or more reservation references
- Protected transaction/lock boundary
- Structured reason code
- Reason notes
- Release timestamp
- Optional releasing user ID

Only `HELD` and `COMMITTED` reservations are released. Already `RELEASED` or `CANCELLED` reservations are ignored by release execution.

## Conflict Shape

Commit conflicts include:

- Conflict code
- Appointment ID
- Requirement code
- Resource ID
- Message
- Underlying availability reasons

Implemented conflict codes:

- `RESOURCE_CAPACITY_UNAVAILABLE`
- `RESOURCE_WARNING_NOT_ALLOWED`

## Implemented Boundary

The implementation lives in:

- `src/server/appointments/appointment-reservation-commit-service.ts`
- `src/tests/unit/appointment-reservation-commit-service.test.ts`

Implemented behavior:

- Locks resources in deterministic order.
- Creates reservations after availability passes.
- Prevents a second commit from overbooking an exclusive resource.
- Treats held reservations as capacity-consuming.
- Avoids partial reservation creation when one candidate fails.
- Blocks warning-resource commitment by default.
- Allows warning-resource commitment only when explicitly permitted by upstream policy.
- Releases held/committed reservations with a documented reason.

## Not Yet Claimed

This contract does not yet provide the concrete Prisma transaction adapter, write appointment history, update appointment lifecycle state, or expose live reservation commitment in the Appointment Board UI. Those are covered by later command execution, lifecycle, and persistence work packages.
