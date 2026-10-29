# Website Appointments — Preview and Shared Read Foundation

## Scope (2026-10-24)

Permanent staff entry: Website Console → Appointments
(`/website-console?section=appointments`). This slice separates three views:

1. Connection & launch plan: describes the single scheduling authority, deployment
   dependencies and remaining public-intake work. It has no fake request counts.
2. Isolated calendar demo: invented people/dates and request → review → confirmation,
   conflict, reschedule, cancellation and reset demonstrations. It never writes records.
3. Shared staff calendar: read-only, on-demand view of existing authorized appointments
   from the native backend, plus direct links to native scheduling and creation tools.

The customer app has `/appointments`, linked from My Garage → Appointments when
preview access is available. A `PREVIEW` snapshot permits the same isolated simulator.
Non-preview mode renders no sample people, slots or simulation controls and makes no
live scheduling claim. Existing service/test-drive preview receipts remain separate;
sample confirmations never populate request forms or My Garage appointment records.

## Private read API

`GET /api/website-console/appointments?date=YYYY-MM-DD` requires an active Website
Console manager/delegated manager and native appointment access at the configured
Minneapolis location. It reuses `listAppointmentReadModels` and the native DST-aware
location day boundaries. No public credentials, new tenant scope or second calendar
database is introduced. Query location/organization overrides and duplicate dates
are rejected. Responses are private/no-store. No mutation methods are implemented;
the framework handles read-related HEAD/OPTIONS behavior.

Projection: appointment ID/number/title, start/end, owner display name and separate
booking/customer-confirmation states. Customer contact data, snapshots and private
notes are not projected. Responses are capped at 100 and explicitly disclose truncation.
Unscheduled drafts are labeled as unscheduled, never rendered as a fabricated time.
An empty read result is not an availability claim. Errors and native access denial are
not presented as empty calendars. Date changes/refresh clear old results; aborted
requests cannot replace a newer view. This is not automatic live polling or an inbox.

The canonical Appointment Board remains the only operating scheduling writer in this
slice. Its own authorization, staff/resource conflicts, revisions, commands and audit
rules remain unchanged. Opening a staff link is not an appointment confirmation.

## Separate launch architecture and remaining work

The staff backend must be hosted and available even when the daily dispatch interface
is not launched or no employee has that screen open. Deploy a restricted private staff
appointment workspace and identity foundation; do not publish internal routes or embed
staff credentials in browser code.

The future website-server → restricted intake API bridge must validate and rate-limit
submissions, authenticate the server, persist one pending request with idempotency,
issue a receipt only after durable acceptance, route accountable work, and reconcile
retries/outages. Verified participant linking is required before revealing private
status. CRM should reference structured requests/native appointments rather than
requiring manual copying; customer matching and CRM notifications are not implemented
here. Native scheduling/resource rules must be reused for staff confirmation.

Sales/service hours, booking categories, owners, buffers/capacity, cancellation rules,
customer status access, verified notification delivery and recovery acceptance remain
activation gates. No public intake endpoint, reservation, real confirmation, reminder,
CRM send, calendar synchronization or customer reschedule/cancel mutation is added by
this slice. Do not describe the read API as a working public scheduling integration.

No migration, data import, subscription or provider activation is required for this
preview/read foundation. Existing native backend configuration, migrations and access
grants are required for the shared staff view. An unavailable backend produces an
explicit error. The installed framework's security warning remains a launch blocker.

## Verification

- Pure simulator tests: legal transitions within the example, sample conflicts,
  reason requirements, immutable updates, reset isolation and timezone/date helpers.
- API tests: active manager and native access, denied anonymous/unrelated access,
  projection/privacy, query validation, DST, truncation and sanitized outages.
- Customer tests: sample-only rendering; non-preview rendering contains no fixtures.
- Browser acceptance: demo state transitions, zero demo network mutations, native
  authenticated read, explicit backend error/empty states, anonymous denial, reset,
  keyboard-accessible controls, desktop/mobile overflow and scoped accessibility.

Verified locally: 56 focused staff/unit/API tests and all 118 dealership-preview
tests passed. Two authenticated/anonymous staff browser checks and the customer
preview browser check passed, including a real authorized native read and controlled
outage/empty-response tests. Scoped staff TypeScript, dealership TypeScript and
edited-file lint passed. Desktop/mobile screenshots were reviewed. These checks do
not verify live public intake, message delivery, booking writes or production launch.

See `src/tests/unit/website-appointments.test.tsx`,
`src/tests/unit/website-appointment-route.test.ts`,
`apps/dealership/tests/appointment-preview.test.tsx` and
`src/tests/e2e/website-appointments.spec.ts`. Browser fixtures are client-only except
for sign-in and read queries; no operational appointment is created.
