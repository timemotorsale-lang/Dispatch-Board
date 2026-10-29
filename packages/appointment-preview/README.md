# Isolated appointment experience

This shared component is a **design simulator**, not an availability engine or
appointment store. It has fixed fictitious November 2–6, 2026 dates, sample people,
example times and a deliberately simple one-event-per-time conflict demonstration.
It must not supply real operating hours, business rules, capacity or confirmation.

All changes are React state inside the mounted component. There are no network
calls, storage writes, personal/contact fields, notifications, CRM records or native
appointment commands. Reset, reload, navigation away or unmount restores fixtures.
The sample reason field is for invented text only; it is not a customer note store.

The private Website Console has its own isolated instance. The customer site renders
an instance only when its existing approved snapshot is `PREVIEW`; public production
renders an unavailable-scheduling message without importing sample records into the
customer projection. The existing sample environment/host policy remains authoritative.

Actual staff scheduling belongs to the existing Appointment Board/backend. Do not
reuse this simulator's date/time options or transition rules in an operational API.
The separate staff read API exposes a limited authenticated projection only.
