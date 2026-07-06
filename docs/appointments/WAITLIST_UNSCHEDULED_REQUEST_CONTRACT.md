# Waitlist and Unscheduled Request Contract

**Work package:** EAPT-024  
**Status:** Implemented as service boundary  
**Purpose:** Capture appointment demand safely when no appointment has been scheduled yet.

## Enterprise Rule

Waitlist and unscheduled requests must never silently schedule appointments.

They preserve demand, context, source, priority, and reason information. Candidate slots can be surfaced for review, but promotion still requires an explicit appointment command or manager-review workflow.

## Request Capture

The implemented request boundary records:

- Request ID
- Organization and location
- Appointment template code and version
- Source
- Priority
- Requesting user
- Proposed owner
- Source task
- Provided context fields
- Missing required context fields
- Reason code
- Reason notes
- Created timestamp

Requests remain unscheduled. The service explicitly returns `isSilentlyScheduled: false`.

## Supported Sources

- `MANUAL`
- `TASK`
- `AUTOMATION`
- `CUSTOMER_REQUEST`
- `WAITLIST`

## Supported Priorities

- `LOW`
- `NORMAL`
- `HIGH`
- `URGENT`

## Candidate Search

Candidate ranking uses the EAPT-021 availability search service.

The waitlist service:

- Requires schedule access before request capture.
- Requires all template-required context before candidate search.
- Searches candidate slots without committing anything.
- Ranks clean available slots ahead of warning slots.
- Returns candidate explanations.
- Keeps `noSilentScheduling: true`.

## Promotion Planning

Promotion planning prepares the next explicit action but does not schedule the appointment.

Supported modes:

- `CREATE_DRAFT_FOR_REVIEW`
- `REQUEST_MANAGER_REVIEW`

Promotion requires:

- Candidate belongs to the request
- Appropriate permission for the selected mode
- Structured reason code
- Reason notes

Promotion plans return:

- `createsScheduledAppointment: false`
- `requiresExplicitCommit: true`

## Implemented Boundary

The implementation lives in:

- `src/server/appointments/appointment-waitlist-service.ts`
- `src/tests/unit/appointment-waitlist-service.test.ts`

Implemented behavior:

- Creates open unscheduled requests without scheduling.
- Tracks missing required context.
- Requires schedule access.
- Blocks candidate search until required context is complete.
- Ranks clean availability candidates ahead of warning candidates.
- Prepares promotion plans that still require explicit appointment commands.
- Enforces promotion authority and candidate ownership.

## Not Yet Claimed

This contract does not yet persist waitlist records in Prisma, create review tasks, notify managers, promote requests through live appointment commands, or expose waitlist queues in the Appointment Board UI. Those are covered by later command-center, lifecycle, automation, and UI work packages.
