# Appointment Read Model and Permission-Filtered Query Contract

**Work package:** EAPT-026  
**Status:** Implemented service boundary  
**Scope:** Server-side appointment read model, location access checks, viewer relationship classification, and field masking

## Purpose

The Appointment Board must not read raw appointment records directly. This contract defines the server-side read model that future live board, agenda, queue, and detail views will consume.

The read model exists before the live UI/API wiring so that the visible board can later move from preview data to production data without weakening permission, privacy, or location boundaries.

## Implemented Boundary

The EAPT-026 service boundary includes:

- Authenticated appointment date-window queries for a location.
- Server-side location access enforcement through `UserLocationAccess`.
- Manager, owner, participant, and location-viewer relationship classification.
- Mutation-authority projection so the UI can show actions without becoming the source of truth.
- Customer contact and vehicle identifier masking unless policy allows limited detail.
- Participant, task-link, and resource-reservation summaries for operational board display.
- Default exclusion of cancelled appointments and out-of-window appointments.

## Permission Rules

| Viewer | Schedule visible | Customer/vehicle detail | Can mutate |
| --- | --- | --- | --- |
| Location manager | Yes | Limited detail allowed | Yes |
| Appointment owner | Yes | Limited detail allowed | Yes |
| Appointment participant | Yes | Schedule summary only unless also owner/manager | No |
| Location viewer | Yes | Schedule summary only | No |
| No active location access | No | No data | No |

The service does not grant mutation authority. It only projects the current policy result for the UI. Future command execution remains responsible for enforcing mutation authorization again server-side.

## Field Visibility

Schedule-summary viewers can see operational timing and assignment context but cannot see sensitive customer contact or vehicle identifiers.

Examples:

- Customer phone and email are removed.
- Customer names are shortened.
- Vehicle VIN and license plate are removed.
- Owner, appointment status, timing, resource reservation labels, and linked-task summaries remain visible for operating the schedule.

## Query Rules

Appointment read queries must provide:

- `locationId`
- `windowStart`
- `windowEnd`

The service rejects:

- Unauthenticated users.
- Users without active schedule access at the location.
- Missing location IDs.
- Invalid dates.
- Windows where `windowEnd` is not after `windowStart`.

By default, cancelled appointments are excluded. Callers must explicitly request `includeCancelled` when an exception queue or audit workflow needs them.

## Current Limits

This slice intentionally does not:

- Replace the preview data in `/appointments`.
- Add a live appointment board API route.
- Execute lifecycle commands.
- Persist new appointment mutations.
- Build the appointment detail workspace.

Those items remain planned in later E3 and E4 work packages.

## Acceptance Evidence

The boundary is covered by unit tests for:

- Manager detail visibility and mutation projection.
- Owner detail visibility and mutation projection.
- Participant schedule visibility with sensitive field masking.
- Location-viewer schedule visibility with sensitive field masking.
- Cancelled and out-of-window filtering.
- Unauthenticated and unauthorized access rejection.
