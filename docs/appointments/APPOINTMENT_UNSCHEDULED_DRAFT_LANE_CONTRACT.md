# Appointment Unscheduled Draft Lane Contract

**Slice:** EAPT-029AA  
**Status:** Implemented initial UI boundary  
**Surface:** `/appointments` Appointment Board

## Purpose

Generated follow-up appointments and other persisted draft appointments may exist before a real schedule window has been chosen. The board must keep those records visible without pretending they are timed calendar events.

## Enterprise behavior

- A draft appointment with no `startsAt` or no `endsAt` is treated as an unscheduled board item.
- Unscheduled drafts render in a dedicated `Unscheduled / Drafts` lane above the timed calendar.
- Unscheduled drafts remain selectable, so the detail rail can expose ownership, readiness, resource planning, and scheduling controls.
- Timed day/week/month/agenda surfaces use only scheduled appointments, preventing generated drafts from appearing as fake 9:00 AM calendar cards.
- The lane uses the same category colors and selection behavior as timed appointment cards so managers can recognize the work type immediately.

## Non-claims

- This slice does not add drag-and-drop scheduling.
- This slice does not add availability-search assisted time picking.
- This slice does not add browser workflow coverage.

## Acceptance evidence

- Unit coverage classifies missing-time drafts as unscheduled.
- The Appointment Board filters unscheduled drafts out of timed calendar columns.
- The detail rail shows unscheduled draft timing as an explicit scheduling-needed state.
