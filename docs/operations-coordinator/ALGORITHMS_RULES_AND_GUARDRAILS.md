# Operations Coordinator Algorithms, Rules, and Guardrails

## Primary optimization objective

Minimize operational friction at the front desk while preventing unauthorized final decisions.

The workspace should answer:

1. Who is here or coming soon?
2. What needs front-desk action now?
3. What paperwork/payment/document is missing?
4. What can she complete safely?
5. What must be routed to a specialist or manager?

## Core algorithm: action ranking

Rank coordinator actions using a weighted score:

```txt
score =
  customerWaitingWeight
  + appointmentTimeWeight
  + dueSoonWeight
  + blockerSeverityWeight
  + missingDocumentWeight
  + paymentRiskWeight
  + promisedTimeRiskWeight
  + managerEscalationWeight
  - alreadyAssignedElsewherePenalty
```

Priority tiers:

- Critical: customer waiting, payment/rental/insurance blocker, same-day delivery blocked, legal/title blocker, manager escalation.
- High: appointment due within 60 minutes, parts delivery waiting receiving, missing sale/finance docs, pickup blocked.
- Normal: photo/listing support, follow-up notes, routine document upload.
- Low: non-urgent cleanup, informational check.

## Core algorithm: role-safe action resolver

Every action must resolve to one of four categories:

1. Complete safely
   - Example: upload insurance card, mark document received, add customer phone number.

2. Prepare canonical workflow
   - Example: start appointment draft, start service intake, start sales packet.

3. Route to authority
   - Example: financing term approval, repair authorization, manager approval, accounting close.

4. Read-only peek
   - Example: view shop status, view parts status, view collection follow-up state.

If the action cannot be categorized, default to route-to-manager.

## Universal search algorithm

Search should classify results into:

- Customer
- Vehicle
- Appointment
- Repair Order
- Repair Job
- Inventory Unit
- Part / PO / Receipt
- Sales packet
- Finance packet
- Rental packet
- Payment intake
- Document
- Collection task
- General task

Result behavior:

- If one exact match: open the safest role-appropriate workspace route.
- If multiple matches: group by type and show highest-confidence match first.
- If no match: offer safe create options:
  - Add customer
  - Add vehicle
  - New appointment
  - Start service intake
  - Upload document
  - Route to manager

## Appointment rules

Allowed:

- Create appointment draft.
- Confirm appointment.
- Reschedule within availability constraints.
- Mark arrival / check-in readiness.
- Link customer and vehicle.

Blocked without higher authority:

- Overbook hard conflicts.
- Override staff/resource conflict.
- Ignore required customer/vehicle fields.
- Delete appointment history.

## Service intake rules

Allowed:

- Search customer/vehicle.
- Add customer/vehicle if missing.
- Capture customer concern in their own words.
- Start service intake.
- Route to service advisor.
- Act in the Service Advisor Support lane to prepare check-in, appointment context, advisor-safe customer update language, and technician clarification routing.

Blocked:

- Final repair authorization.
- Estimate approval.
- Close repair order.
- Override QC or technician workflow.
- Assume full Service Advisor authority unless the user is explicitly assigned that role.

## Paperwork rules

Allowed:

- Start sales paperwork checklist.
- Start finance packet checklist.
- Verify proof of insurance received.
- Upload ID, insurance, title, finance, rental, payment documents.
- Mark missing signature/document.
- Route to manager/accounting/sales.

Blocked:

- Approve financing terms.
- Finalize accounting.
- Delete payment records.
- Change legal ownership/title outcome.
- Mark deal fully complete without all required documents and authority.

## Payment rules

Allowed:

- Record payment intake as received/pending accounting review.
- Attach receipt/reference.
- Route to accounting/manager.

Blocked:

- Final accounting close.
- Backdate payment.
- Delete payment.
- Modify official ledger totals unless explicit accounting workflow exists.

## Parts receiving rules

Allowed:

- Simplified receiving against canonical PO/order when found.
- Mark arrived quantity/condition.
- Select bin/RO bin/counter/quarantine/return area.
- Flag unknown/missing/wrong/damaged.

Blocked:

- Create duplicate PO.
- Force receive without unresolved discrepancy note.
- Close return/credit recovery without parts/accounting authority.

## Photo/listing/marketing rules

Allowed:

- Upload photos.
- Mark photos needed/complete.
- Start listing/advertising task.
- Flag missing vehicle facts.

Blocked:

- Final pricing approval.
- Publish restricted claims without manager approval.
- Override merchandising gate.

## Rental rules

Allowed:

- Initiate rental workflow.
- Verify customer, driver, insurance, vehicle, dates.
- Upload rental paperwork.
- Route missing approval.

Blocked:

- Approve exceptions to insurance/driver requirements.
- Close financial rental charges without accounting/manager authority.

## Collections rules

Allowed:

- Add follow-up note.
- Mark contact attempt.
- Record customer-provided payment intent.
- Route payment issue.

Blocked:

- Change account terms.
- Waive balances.
- Finalize collection resolution.

## Error-proofing guardrails

- Every mutation must be attributable to user, time, reason, and source.
- Every route/escalation must name the target owner/domain.
- No silent overwrites.
- No duplicate canonical records when a matching record exists.
- All create flows start with search.
- All protected actions must show why they are blocked and who can resolve them.
- Front desk can prepare and route; final authority remains with the owning domain.

## Failure handling

If a backend/domain route is unavailable:

- Show "Temporarily unavailable".
- Preserve draft input locally where practical.
- Offer route to manager or open CCC/Dispatch.
- Do not pretend action completed.
