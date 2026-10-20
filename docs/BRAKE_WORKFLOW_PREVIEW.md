# Guided brakes workflow preview

Open `/prototype/brake-workflow`, or select **Try the guided brakes workflow** from the Repair Explorer Preview header. Authentication is required; the existing Labor Guide and live repair workflows are unchanged.

This isolated vertical slice covers one combined job: replacement of both front brake pads and rotors. It is a workflow review, not a real vehicle-specific procedure, customer authorization, timecard, invoice, or production repair order.

## Review journey

1. Enter a fictional vehicle configuration, finding, measurements and specification reference.
2. Review provisional labor, shop rate, parts allowance, scope exclusions and assigned technician. Initial subtotal is $520 before tax and fees; it is not a supplier quote or sourced labor standard.
3. Simulate the customer decision. Returning for revision preserves the reason and increments the next estimate revision. Approval freezes revision, subtotal, customer-role name and time.
4. Confirm parts/instructions readiness, start or pause work, record a blocker, resume, and document completion. Blocked time is excluded. Additional scope is not authorized by this approval.
5. Record every verification check and results. Failed or incomplete checks must not be marked complete.
6. Export the review record for assessment.

## Isolation and data

There are no production writes, migrations, external requests, messages or payments. Save/load uses a separate per-reviewer localStorage key. Saves are explicit, not automatic. Loading an existing draft requires confirmation when the current workflow has events. A running clock continues across saved browser sessions; it is based on the device clock, not independently verified technician labor. Do not use real personal/customer information. Export is plain JSON; users control the downloaded file.

Drafts store an event sequence and replay it through the same transition validation. Invalid sequences are rejected without replacing current work. This is not tamper-proof: browser records, names and clock times are reviewer-controlled. No simulated approval or clock data is submitted to the labor evidence pool.

## Deliberate limits and adoption gates

This slice has one combined operation and one all-scope preview approval. It does not support real customer identity, partial approvals, attachments, post-approval change orders, live parts fitment, invoices, independently verified timing, multi-user conflict handling or durable shared records. Inspection evidence is text, including measurements and reference notes; media capture remains a later slice.

Before production adoption: map into existing repair-order/authorization services rather than creating parallel production records; enforce server-side role permissions and transitions; persist immutable estimate revisions and attribution; implement real customer authorization, supplemental approvals, vehicle-specific scope, tax/fee pricing and parts purchasing; add durable timing/corrections, shared concurrency protection, media retention, release policy and auditing. Gate rollout and retain the current production interface until the complete workflow is validated by staff.
