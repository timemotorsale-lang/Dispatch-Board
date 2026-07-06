# Appointment Schedule Draft UI Contract

**Work package:** EAPT-029B  
**Status:** Implemented as initial UI command bridge  
**Verified:** 2026-07-06

## Purpose

This contract defines the first visible path for moving a persisted draft appointment into scheduled status from the Appointment Board detail rail.

The board now exposes **Schedule Draft** for live draft appointment records and submits the existing `SCHEDULE` lifecycle command through the command ledger and transaction path.

## User Flow

From `/appointments`:

1. User creates or selects a persisted draft appointment.
2. The detail rail shows **Schedule Draft**.
3. The UI submits `SCHEDULE` with the appointment ID, version, saved start, saved end, and scheduling timezone.
4. The command route executes the server-side scheduling command.
5. The board reloads from the permission-filtered read model.

## Enterprise Controls

This slice keeps the server-side protections already implemented by EAPT-027:

- Authentication is required.
- Manager or owner authority is enforced.
- Expected appointment version is required.
- Stale versions are rejected.
- Scheduling history is written.
- The command ledger records idempotency and correlation.
- The board refreshes from the read model after success.

## UI State Rules

- **Schedule Draft** is visible only for draft cards.
- **Check In** and **No Show** are disabled for draft cards.
- Draft appointments display with a Draft status badge.
- Preview-only cards cannot be scheduled as live records.

## Not Yet Claimed

This slice does not claim the full enterprise scheduling decision panel yet.

Partially addressed after this slice:

- EAPT-029C adds an initial server-backed Schedule Readiness warning/block preview in the detail rail.

Still pending:

- full resource requirement selection
- resource reservation candidates
- resource and staff conflict preview against selected candidates
- manager warning override UI
- recurrence scheduling UI
- bulk scheduling
- appointment-template-driven automation selection
