# Appointment Duration and Buffer Contract

**Work package:** EAPT-016  
**Status:** Implemented  
**Purpose:** Define how Appointment templates become concrete appointment and reservation time windows.

## Enterprise Rule

Every scheduled appointment has two related time windows:

1. **Customer-visible appointment window** — the start and end time shown on the board.
2. **Reserved resource window** — the appointment window expanded by preparation and cleanup buffers.

Conflict detection must use the reserved resource window when evaluating staff, vehicles, rooms, bays, equipment, and configured resources.

## Template Defaults

Each appointment purpose template owns the default timing rule:

- Default duration
- Minimum duration
- Maximum duration
- Preparation buffer
- Cleanup buffer
- Start interval
- Approval mode

The initial enterprise catalog already defines these fields for every approved day-one appointment purpose.

## Override Rules

Duration or buffer overrides are allowed only when they remain inside the approved template range and enterprise safety limits.

Any override that changes the template default requires a documented reason code. Optional notes can add context, but the reason code is mandatory.

Manager approval is required when a non-manager overrides a template governed by:

- `MANAGER_REQUIRED`
- `RULE_DEPENDENT`

Owner-scheduled templates can accept owner overrides with a reason when the override stays inside the template limits.

## Enterprise Safety Limits

| Control | Limit |
| --- | ---: |
| Minimum appointment duration | 5 minutes |
| Maximum appointment duration | 480 minutes |
| Maximum preparation buffer | 240 minutes |
| Maximum cleanup buffer | 240 minutes |
| Maximum reserved footprint | 720 minutes |
| Minimum start interval | 5 minutes |
| Maximum start interval | 120 minutes |

These limits are intentionally broader than the initial catalog values. They protect future administration changes while still allowing controlled enterprise exceptions.

## Time Footprint Calculation

For a given appointment start:

```text
appointmentEndsAt = appointmentStartsAt + durationMinutes
resourceWindowStartsAt = appointmentStartsAt - preparationBufferMinutes
resourceWindowEndsAt = appointmentEndsAt + cleanupBufferMinutes
```

The start time must align to the template start interval in the location timezone.

## Implemented Boundary

The implementation lives in:

- `src/server/appointments/appointment-duration-rules.ts`
- `src/tests/unit/appointment-duration-rules.test.ts`

Implemented behavior:

- Resolves template defaults into a concrete duration rule.
- Builds appointment and resource reservation time windows.
- Requires documented reasons for overrides.
- Flags manager approval requirements for governed overrides.
- Enforces template duration ranges, buffer limits, reserved-footprint limits, and start intervals.

## Not Yet Claimed

This contract does not yet persist scheduled appointments, run full multi-resource conflict checks, or update the visible board from live appointment records. Those are covered by later E2 scheduling and command-center work packages.
