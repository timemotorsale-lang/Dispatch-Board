# Appointment Command Boundary

**Work package:** EAPT-010  
**Status:** Implemented foundation  
**Scope:** Repository, service, validation, policy, and API boundary for enterprise appointment commands

## Purpose

The command boundary is the safe intake layer for appointment operations. It does not replace the future scheduling, conflict, lifecycle, automation, or reporting engines. It gives those engines one consistent place to receive commands with authentication, authorization, idempotency, optimistic-concurrency checks, and command-ledger evidence.

## Implemented Boundary

The initial boundary includes:

- Request validation for appointment command intake
- Repository contract for appointment lookup, location-access lookup, idempotency lookup, and command-ledger creation
- Service contract for authenticated command submission
- Server-side permission checks using the approved manager/owner location model
- Idempotency duplicate handling
- Request-hash mismatch rejection
- Stale-version conflict recording
- API route for command submission

The API route is:

```text
POST /api/appointments/commands
```

## Command Intake Rules

Every command request must provide:

- `commandType`
- `idempotencyKey`

Existing-appointment mutation commands must also provide:

- `appointmentId`
- `expectedAppointmentVersion`

Draft creation commands must provide:

- `organizationId`
- `locationId`

The service derives appointment organization, location, owner, and current version from the stored appointment when the command targets an existing appointment.

## Authorization Boundary

The command service enforces the approved E0 rule:

- A manager with appointment-management access at the location may create or change appointments.
- The accountable owner may create or mutate their own appointment when location access permits ownership and participation.
- Ownership transfer and warning override remain manager-only.

This is intentionally server-side. UI controls may hide unauthorized actions, but the API remains authoritative.

## Idempotency Boundary

The service calculates a stable request hash from the normalized command intent.

If a command with the same organization, command type, and idempotency key already exists:

- Same request hash: return the existing command as a duplicate-safe response.
- Different request hash: reject the request as a conflict.

This prevents duplicate browser clicks, retries, and automation replays from creating multiple command records.

## Concurrency Boundary

When a command targets an existing appointment, the request must include the expected appointment version.

If the expected version does not match the current appointment version:

- A `CONFLICT` command-ledger record is created.
- No appointment mutation is performed.
- The API returns a conflict response with expected and current versions.

This preserves user work and prevents silent overwrites.

## Current Limits

This slice intentionally does not execute scheduling or lifecycle mutations yet. Future slices will attach the scheduling engine, lifecycle commands, resource reservations, task orchestration, and audit-history writes behind this boundary.

## Acceptance Evidence

The boundary is covered by unit tests for:

- Authorized command acceptance
- Manager/owner mutation enforcement
- Stale-version conflict recording
- Duplicate idempotency replay
- Reused idempotency key mismatch rejection
- API status mapping for accepted, duplicate, conflict, unauthorized, and unauthenticated paths
