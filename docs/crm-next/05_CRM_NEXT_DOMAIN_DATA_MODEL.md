# CRM Next — Domain & Data Model

## Principle

Use one customer identity and relate lifecycle records to it. Exact schema must be reconciled with the existing database before migrations.

## Customer aggregate

Conceptual fields: id; name; phone; email; preferred contact method; status; assigned owner; timestamps; optional external IDs. Minimize sensitive data.

## Relationships

Customer → Lead/Opportunity; Communication; Appointment; TestDrive; Deal; CustomerVehicle; Finance/BHPH relationship; Payment reference/event; Service/Repair reference; RentalLoaner; Document/Title Case; Customer Case; Insurance Claim; shared Task reference; ActivityEvent; IntelligenceSignal/Recommendation.

## Common Case model

Prefer a common case framework where practical with types such as Customer Issue, Title/Document, Service, Insurance, Payment/BHPH attention, Rental/Loaner. Common fields: customer, type/subtype, status, priority, owner, related vehicle/deal, opened time, SLA/deadline, next action, resolution, closed time.

## Shared Work/Task

CRM work references the Dispatch Board task/work entity. Do not create a parallel CRM task table unless a later architecture decision explicitly requires it. Useful linkage: customerId; originating entity type/id; CRM context; due time; assignee; status; review/approval state.

## Activity Event

The timeline is event-backed. Significant mutations emit an event with customer, actor/system, event type, related entity, timestamp, human-readable summary, and structured metadata.

## Intelligence Signal

Suggested fields: customerId; type (`risk`, `next_action`, `opportunity`); severity/priority; reasonCode; explanation; source signals; related entity; recommended action; status; created/updated/expired timestamps.

## Data ownership

For every field/domain, identify the authoritative system. CRM Next should reference or integrate with DMS/accounting/communications sources where they remain authoritative rather than silently duplicating them.

