# Appointment Task Linked Work Read Model Contract

**Slice:** EAPT-030A  
**Status:** Implemented initial read-model/UI boundary  
**Surface:** `/appointments`, appointment read model, and Appointment Board detail rail

## Purpose

Appointments and tasks must remain connected as independent but coordinated work. The Appointment Board already had a visual Linked Tasks section, but it needed to read real appointment-task link data instead of showing task IDs or placeholder rows.

## Enterprise behavior

- The appointment read repository loads appointment-task links with safe task summary fields:
  - task title
  - task status
  - task due time
  - assigned user
  - link type
  - link code
  - link title
  - link explanation
  - required/blocking flags
- The appointment read service projects those fields into the Appointment Board read model.
- The Appointment Board detail rail renders real linked-task rows when live appointment-task links exist.
- Preview/sample appointments continue using existing fallback task text.
- This slice does not create, update, or delete task links.
- This slice does not create an appointment from a task.

## Non-claims

- This slice does not implement EAPT-032 create-appointment-from-any-task.
- This slice does not implement task blueprint generation.
- This slice does not add task status mutation from the Appointment Board.
- This slice does not add browser workflow coverage.

## Acceptance evidence

- Appointment read service focused coverage proves linked task title, status, due time, assigned user, link metadata, and blocking flags are projected.
- Appointment Board focused coverage continues to prove the Linked Tasks detail section renders.
- Type-check confirms the read model and board model are aligned.
