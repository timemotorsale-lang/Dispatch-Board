# Hard Conflict Evaluation Contract

**Work package:** EAPT-018  
**Status:** Implemented as service boundary  
**Purpose:** Define the server-side hard-block evaluator used before appointment scheduling commitment.

## Enterprise Rule

Hard conflicts are not overrideable.

Before an appointment is scheduled, rescheduled, approved into a scheduled state, or committed as part of a recurring series, the server must evaluate hard conflicts using authoritative server-side inputs. A stale browser-side preview never authorizes the write.

## Implemented Hard-Block Sources

The implemented evaluator aggregates hard blocks from:

- Invalid appointment timing
- Inactive appointment template
- Missing required template context
- Location closed, inactive, or outside operating hours
- Mandatory hard-block resource unavailable, out of service, or already committed beyond capacity
- Owner unavailable or unauthorized for the location
- Required staff unavailable or unauthorized for the location
- Recurring series occurrences that contain hard conflicts when all occurrences must be valid

Warning-only availability issues are intentionally not blocked in this layer. They are handled by EAPT-019.

## Evaluation Order

The implemented boundary follows this order:

1. Validate template activity.
2. Validate required template context fields.
3. Resolve duration, preparation buffer, cleanup buffer, and start interval.
4. Evaluate location availability against the appointment window.
5. Evaluate mandatory resources against the reserved resource window.
6. Evaluate required staff/owner eligibility and availability.
7. Aggregate recurrence occurrence failures when evaluating a series.

## Time Windows

The evaluator uses two windows:

- **Appointment window:** the customer-visible start/end time.
- **Resource window:** appointment window plus preparation and cleanup buffers.

Location and staff checks use the appointment window. Mandatory resources use the resource window so prep and cleanup time cannot be silently overbooked.

## Conflict Shape

Each hard conflict includes:

- Conflict code
- Source
- Human-readable message
- Optional occurrence key
- Optional resource ID
- Optional staff user ID
- Optional missing context field

Implemented conflict codes:

- `INVALID_TIME`
- `INACTIVE_TEMPLATE`
- `REQUIRED_CONTEXT_MISSING`
- `LOCATION_UNAVAILABLE`
- `REQUIRED_RESOURCE_UNAVAILABLE`
- `OWNER_UNAVAILABLE_OR_UNAUTHORIZED`
- `STAFF_UNAVAILABLE_OR_UNAUTHORIZED`
- `RECURRENCE_OCCURRENCE_INVALID`

## Implemented Boundary

The implementation lives in:

- `src/server/appointments/appointment-hard-conflict-service.ts`
- `src/tests/unit/appointment-hard-conflict-service.test.ts`

Implemented behavior:

- Accepts valid appointment candidates without hard conflicts.
- Blocks inactive templates.
- Blocks missing required purpose context.
- Blocks invalid start interval or timing.
- Blocks candidates outside location operating hours.
- Blocks mandatory exclusive resources already committed beyond capacity.
- Blocks owners who lack appointment ownership access.
- Keeps warning-only staff conflicts out of hard-block evaluation.
- Rejects recurring series when a required occurrence has hard conflicts.

## Not Yet Claimed

This contract does not yet commit reservations, persist appointments, implement warning override records, perform database locking, or expose live conflict results in the Appointment Board UI. Those are covered by later E2 and command-center work packages.
