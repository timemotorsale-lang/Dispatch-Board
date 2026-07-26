# Operations Coordinator Workspace UI Source of Truth

## UX goal

The workspace should feel like a calm command desk, not a management console.

Design tone:

- Compact
- Readable
- Enterprise
- Direct-to-work
- Wide but not overwhelming
- Clear authority boundaries

## Page title

Operations Coordinator

Subtitle:

Run the front door: appointments, intake, paperwork, payments, parts receiving, photos, and routing.

## Top actions

Top-right quick actions:

- New Appointment
- Check In Vehicle
- Upload Document
- Record Payment

Secondary actions:

- Receive Parts
- Start Sales Packet
- Verify Insurance
- Initiate Rental
- Upload Photos
- Add Collection Note

## Layout

```txt
┌─────────────────────────────────────────────────────────────────────┐
│ Operations Coordinator                         Quick Actions         │
│ Run the front door...                          [New Appt] [Check In] │
├─────────────────────────────────────────────────────────────────────┤
│ KPI Strip: Arrivals | Waiting | Confirmations | Paperwork | Parts   │
├─────────────────────────────────────────────────────────────────────┤
│ Universal Search                                                     │
├─────────────────────────────────────────────┬───────────────────────┤
│ My Coordination Queue                       │ Paperwork Command     │
│ - customer waiting                          │ - insurance           │
│ - parts arrived                             │ - finance packet      │
│ - payment to route                          │ - sales packet        │
│ - missing docs                              │ - rental packet       │
├─────────────────────────────────────────────┴───────────────────────┤
│ Department Peek Panels                                               │
│ Service | Shop | Parts | Inventory | Sales | Marketing | Collections │
├─────────────────────────────────────────────────────────────────────┤
│ Escalation Router                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## KPI strip

Cards:

- Arrivals Today
- Waiting Customers
- Confirm Appointments
- Paperwork Due
- Payments to Route
- Parts to Receive
- Photos Needed
- Escalations

## Universal search

Placeholder:

Search customer, vehicle, VIN, stock #, appointment, RO, part, document, payment, or task...

Search results group by:

- Customers
- Vehicles
- Appointments
- Repair Orders
- Parts
- Documents
- Sales/Finance
- Payments
- Tasks

No-result actions:

- Add Customer
- Add Vehicle
- New Appointment
- Start Service Intake
- Upload Document
- Route to Manager

## My Coordination Queue

Each row shows:

- Work type
- Customer/vehicle/record
- Next action
- Due/age
- Department
- Safe action button
- Route/escalate button

Example rows:

- Waiting customer: check in vehicle
- Appointment needs confirmation
- Insurance proof missing
- Sales packet missing signature
- Payment received needs accounting route
- Part delivery needs simplified receiving
- Vehicle photos needed
- Collection follow-up note due

## Paperwork Command Center

Sections:

- Sales paperwork
- Financing packet
- Proof of insurance
- Title/documents
- Rental agreement
- Payment receipt
- Missing signatures
- Manager/accounting review

Each section should show:

- Complete
- Missing
- Needs review
- Blocked

## Department Peek Panels

Panels are summary-first, not full management screens.

Service / Advisor:

- Arrivals
- Waiting intakes
- Customer updates due

Shop / Repair:

- In shop
- Waiting parts
- Ready for QC
- Blocked

Parts:

- Deliveries expected
- Receiving exceptions
- Unknown/unverified parts

Inventory:

- Photos needed
- Documents missing
- Frontline readiness blockers

Sales:

- Paperwork due
- Delivery prep
- Insurance missing

Marketing:

- Photo tasks
- Listing facts missing

Collections:

- Assigned follow-up
- Payment intent notes

Documents:

- Upload queue
- Missing signatures
- Review needed

## Escalation router

The router should ask:

1. What record is this about?
2. What is wrong/missing?
3. Who should own it?
4. How urgent is it?
5. What should they do next?

Default recipients:

- Manager
- Advisor
- Sales
- Parts
- Technician
- Inventory lead
- Collections
- Accounting

## Empty states

If no actions:

"Front desk is clear right now."

Show:

- Upcoming arrivals
- Recently completed front-desk work
- Suggested safe checks:
  - review appointments
  - check paperwork due
  - check parts deliveries
  - check photos needed

## Unavailable states

If a domain is unavailable:

- Do not hide the section.
- Show: "Temporarily unavailable."
- Preserve the route to CCC/Dispatch.
- Do not claim a task was completed.

## Mobile/tablet behavior

Top priority on small screens:

1. Search
2. Start Work
3. My Queue
4. Paperwork
5. Department Peek
