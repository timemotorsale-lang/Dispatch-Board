# Warning Evaluation and Override Contract

**Work package:** EAPT-019  
**Status:** Implemented as service boundary  
**Purpose:** Define server-side warning evaluation and manager override records before appointment commitment.

## Enterprise Rule

Warnings are not the same as hard blocks.

- A hard block refuses commitment and cannot be overridden.
- A warning can allow commitment only when the warning policy permits it.
- Manager-required warnings must be overridden by an authorized manager with a structured reason code and notes.

Owners can resolve the underlying condition, but they cannot use manager-only warning overrides.

## Implemented Warning Sources

The warning evaluator consumes the EAPT-018 hard-conflict result and extracts warning-only risks from:

- Warning-policy resource availability failures
- Warning-policy staff availability failures
- Duration or buffer overrides that require manager approval

It also accepts explicit warning signals for business conditions such as:

- Preparation or cleanup buffer overlap
- Vehicle readiness incomplete
- Preparation task at risk
- Customer nearby appointment
- Outside preferred purpose hours
- Confirmation pending
- Owner workload threshold
- Recurrence warning occurrence

## Implemented Warning Codes

- `STAFF_OVERLAP`
- `PREPARATION_OR_CLEANUP_BUFFER_OVERLAP`
- `VEHICLE_READINESS_INCOMPLETE`
- `PREPARATION_TASK_AT_RISK`
- `CUSTOMER_NEARBY_APPOINTMENT`
- `OUTSIDE_PREFERRED_PURPOSE_HOURS`
- `DURATION_OVERRIDE_REQUIRES_MANAGER_APPROVAL`
- `RESOURCE_WARNING`
- `CONFIRMATION_PENDING`
- `OWNER_WORKLOAD_THRESHOLD`
- `RECURRENCE_WARNING_OCCURRENCE`

## Override Requirements

Manager-required warning overrides require:

- An authenticated manager
- A location access grant that can manage appointments
- A warning key that exists in the current server-side warning result
- Structured reason code
- Reason notes
- Timestamp

The service returns an audit-shaped override record containing:

- Warning key
- Warning code
- Overriding manager user ID
- Reason code
- Reason notes
- Prior warning value
- New override status
- Occurred-at timestamp

## Commit Decision

The warning evaluator returns `canCommit: true` only when:

1. The hard-conflict evaluator says the candidate can commit.
2. Every manager-required warning has a valid override record.

Informational or operational-acknowledgement warnings do not block commitment unless their policy says manager override is required.

## Implemented Boundary

The implementation lives in:

- `src/server/appointments/appointment-warning-service.ts`
- `src/tests/unit/appointment-warning-service.test.ts`

Implemented behavior:

- Converts warning-only staff availability issues into unresolved warnings.
- Rejects owner attempts to override manager-required warnings.
- Requires manager reason code and notes.
- Creates auditable manager override records.
- Allows non-override informational warnings without blocking commitment.
- Surfaces duration overrides requiring manager approval as warnings.
- Prevents warning overrides from making hard-blocked candidates committable.

## Not Yet Claimed

This contract does not yet persist warning override records, write appointment history events, perform atomic scheduling commits, or show live warning resolution controls in the Appointment Board UI. Those are covered by later E2, lifecycle, and command-center work packages.
