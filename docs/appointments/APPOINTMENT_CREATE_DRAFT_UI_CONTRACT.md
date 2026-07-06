# Appointment Create Draft UI Contract

**Work package:** EAPT-029A  
**Status:** Implemented as initial UI command bridge  
**Verified:** 2026-07-06

## Purpose

This contract defines the first persisted creation path from the visible Appointment Board.

The New Appointment modal now submits a real `CREATE_DRAFT` appointment command instead of only showing a preview shell. This allows the board to create persisted appointment records that can be returned by the live read-model binding.

## User Flow

From `/appointments`:

1. User opens **New Appointment**.
2. User provides category, title, customer, vehicle, date, start time, duration, and reason.
3. Owner defaults to the signed-in user or manager.
4. The UI submits `CREATE_DRAFT` to `/api/appointments/commands`.
5. On success, the board reloads the appointment read model.

## Command Payload

The UI sends:

- `organizationId`
- `locationId`
- `idempotencyKey`
- `correlationId`
- `payload.appointmentNumber`
- `payload.title`
- `payload.sourceType = MANUAL`
- `payload.sourceReference`
- `payload.startsAt`
- `payload.endsAt`
- `payload.schedulingTimezone`
- `payload.purposeSnapshot`
- `payload.customerSnapshot`
- `payload.vehicleSnapshot`

## Enterprise Controls

The creation flow keeps the existing server-side protections:

- Authentication is required.
- Location access is required.
- Manager or eligible owner authority is enforced by the command boundary.
- The command ledger records idempotency and correlation.
- The lifecycle transaction creates appointment and history records atomically.
- The board refreshes through the permission-filtered read model.

## Not Yet Claimed

This slice does not claim:

- Manager assignment to arbitrary staff from a live staff directory.
- Schedule approval, resource reservation, or hard-conflict evaluation from the modal.
- Full customer and vehicle master-data creation.
- Recurrence, automation rule selection, or template administration.
- Final completion and outcome capture.
