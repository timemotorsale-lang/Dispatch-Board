# Claims Workspace Algorithms and Decision Logic

**Status:** Planning baseline, pre-implementation  
**Purpose:** define deterministic workflow intelligence for the Claims Workspace before code is written.

## Operating Principle

The algorithms should make staff execution simpler without hiding enterprise controls.

They should answer:

- what is missing;
- what is blocking progress;
- what should staff do next;
- who owns the next action;
- whether the claim is ready for handoff;
- whether the claim needs escalation;
- which advanced workspace panels should be shown.

The first implementation should be deterministic and explainable. Predictive or AI-assisted recommendations can come later only after the deterministic rules, source data, and audit trail are reliable.

## Algorithm 1: Claim Readiness Score

### Goal

Show whether a claim is ready for its next operational milestone.

### Readiness categories

- Intake readiness
- Evidence readiness
- Estimate readiness
- Repair-order handoff readiness
- Payment follow-up readiness
- Closeout readiness

### Inputs

- customer linked;
- vehicle linked;
- claim number present or exception recorded;
- carrier present or self-pay/manual exception recorded;
- adjuster contact present when carrier claim exists;
- loss date present or unknown reason recorded;
- required photos complete;
- customer authorization complete;
- estimate status;
- supplement status;
- deductible/payment status;
- repair order linked;
- final documents attached.

### Output

Each category returns:

- `ready`;
- `not_ready`;
- `blocked`;
- `exception_ready`.

Each result must include plain-language reasons.

### Staff-facing example

```text
Repair handoff not ready:
- damage photos missing
- customer authorization not signed
- adjuster contact not captured
```

## Algorithm 2: Missing Evidence Engine

### Goal

Determine the exact photos, documents, and authorizations still needed.

### Base evidence checklist

- customer authorization;
- claim number;
- insurance carrier;
- adjuster contact;
- damage photos;
- VIN photo;
- odometer photo;
- insurance card or policy reference;
- estimate or appraisal;
- deductible confirmation.

### Conditional evidence rules

| Condition | Additional evidence |
| --- | --- |
| vehicle was towed | tow invoice, tow location, release status |
| storage is charged | storage start date, storage rate, storage authorization |
| police report exists | police report number or uploaded report |
| supplement requested | original estimate, supplement request, carrier response |
| customer is not policyholder | policyholder authorization or contact record |
| repair order handoff requested | repair authorization and minimum photo set |
| payment recovery active | payment proof, deductible status, receivable owner |

### Output

- required and missing;
- required and complete;
- optional;
- not applicable;
- blocked.

## Algorithm 3: Next Best Action

### Goal

Recommend the next operational action for staff.

### Priority order

1. Resolve unsafe duplicate or identity conflict.
2. Complete minimum claim identity.
3. Collect required authorization.
4. Collect required photos/documents.
5. Contact carrier or adjuster.
6. Prepare estimate or supplement.
7. Handoff to repair order.
8. Resolve deductible/payment status.
9. Close claim.

### Output

The algorithm returns:

- action label;
- owner role;
- suggested due date;
- reason;
- blocking fields or documents;
- allowed action button.

### Staff-facing examples

```text
Next action: Contact adjuster
Reason: Carrier is captured, but adjuster contact and approval status are missing.
Owner: Service advisor
```

```text
Next action: Upload damage photos
Reason: Repair handoff cannot happen until the required photo set is attached.
Owner: Intake staff
```

## Algorithm 4: Blocker Classification

### Goal

Group claims into simple blocker labels so queues and staff views are understandable.

### Blocker labels

- Missing customer information
- Missing vehicle information
- Waiting on customer
- Waiting on carrier
- Waiting on adjuster
- Missing authorization
- Missing photos
- Missing estimate
- Waiting on supplement
- Ready for repair order
- Payment issue
- Manager review needed
- Ready to close

### Rule behavior

Only one primary blocker should be shown in compact views. Secondary blockers can appear inside the workspace.

Primary blocker priority:

1. Duplicate or identity conflict
2. Missing authorization
3. Missing required evidence
4. Waiting on external party
5. Internal handoff needed
6. Payment/recovery issue
7. Closeout needed

## Algorithm 5: Handoff Gate Rules

### Goal

Prevent premature handoff while allowing authorized exceptions.

### Repair-order handoff gates

Required:

- linked customer;
- linked vehicle;
- loss description;
- authorization status;
- required damage photos;
- claim number or documented exception;
- carrier or self-pay/manual exception;
- next owner.

Recommended:

- adjuster contact;
- deductible amount;
- estimate status;
- tow/storage status where applicable.

### Payment handoff gates

Required:

- payer type;
- deductible known or exception recorded;
- amount expected or unknown reason;
- payment owner;
- supporting document or manual note.

### Closeout gates

Required:

- final status selected;
- outstanding next action resolved;
- required documents attached or exception recorded;
- payment status resolved or handed off;
- linked repair order status reviewed when applicable.

### Output

- handoff allowed;
- handoff blocked;
- exception allowed;
- manager approval required.

## Algorithm 6: Claim Aging and Escalation

### Goal

Flag claims that are stalled or aging beyond expected handling windows.

### Aging clocks

- time since claim opened;
- time in current stage;
- time since last activity;
- time since last customer contact;
- time since last carrier/adjuster contact;
- time since supplement request;
- time since payment follow-up started.

### Suggested thresholds

| Situation | Warning | Escalation |
| --- | --- | --- |
| no activity after opening | 1 business day | 2 business days |
| waiting on customer | 2 business days | 4 business days |
| waiting on carrier/adjuster | 2 business days | 5 business days |
| supplement pending | 3 business days | 7 business days |
| payment follow-up | 2 business days | 5 business days |
| closeout ready but not closed | 1 business day | 3 business days |

Thresholds should become configurable later.

### Output

- normal;
- watch;
- overdue;
- escalation needed.

## Algorithm 7: Document Completeness

### Goal

Show whether the claim packet is document-ready for its current stage.

### Document categories

- authorization;
- claim identity;
- damage evidence;
- estimate;
- supplement;
- tow/storage;
- payment;
- repair handoff;
- final closeout.

### Completion states

- complete;
- incomplete;
- not applicable;
- exception accepted;
- review needed.

### Enterprise rule

Documents should be stored in the central document library and linked by relationship. The algorithm should not treat a document as complete if it exists only as an unclassified upload with no relationship to the claim.

## Algorithm 8: Ownership and Work Queue Priority

### Goal

Sort claims so staff work the most important items first.

### Priority signals

- overdue next action;
- escalation state;
- claim stage;
- customer waiting;
- carrier/adjuster waiting;
- ready for repair order;
- payment exposure;
- promised date;
- vehicle in custody;
- storage charges accumulating;
- manager review needed.

### Suggested scoring

```text
priority =
  overdue_weight
  + escalation_weight
  + customer_waiting_weight
  + custody_or_storage_weight
  + payment_exposure_weight
  + ready_handoff_weight
  + manager_review_weight
```

The score should always be explainable. Staff should see the reason, not just a number.

## Algorithm 9: Duplicate Claim Detection

### Goal

Warn staff before creating duplicate open claims.

### Match signals

- exact claim number;
- same VIN;
- same customer;
- same phone/email;
- same loss date;
- same carrier;
- same open repair order;
- same vehicle stock or plate.

### Output

- no likely duplicate;
- possible duplicate;
- strong duplicate;
- exact claim-number duplicate.

### UX rule

Duplicate warnings should not erase entered intake data. Staff must be able to review the possible existing claim and then continue, merge, or cancel based on permissions.

## Algorithm 10: Progressive Disclosure Rules

### Goal

Keep the front end simple while revealing enterprise depth only when needed.

### Panel visibility rules

| Panel | Show when |
| --- | --- |
| Adjuster details | carrier exists or carrier claim selected |
| Evidence checklist | always visible after claim creation |
| Estimate panel | estimate uploaded, estimate requested, or ready-for-estimate action selected |
| Supplement panel | estimate exists and supplement status is needed |
| Repair handoff | minimum intake exists or repair handoff action selected |
| Payment recovery | deductible/payment fields exist, repair handoff completed, or payment blocker selected |
| Manager escalation | aging threshold exceeded, exception requested, or authority required |
| Closeout | repair/payment handoff resolved or closeout action selected |

### UX rule

Progressive disclosure must never hide a blocker. If a hidden panel contains the current blocker, expose that panel and explain why it is needed.

## Audit and Explainability

Every algorithmic recommendation should be inspectable.

At minimum, store or recompute:

- input facts used;
- rule version;
- result;
- reason text;
- timestamp;
- actor or system context.

For the first implementation, recomputation from current data is acceptable for UI display, but important handoff and status decisions should write an activity/audit event.

## Implementation Order

Recommended order:

1. Missing Evidence Engine
2. Handoff Gate Rules
3. Claim Readiness Score
4. Next Best Action
5. Blocker Classification
6. Claim Aging and Escalation
7. Document Completeness
8. Duplicate Claim Detection
9. Ownership and Work Queue Priority
10. Progressive Disclosure Rules

This order supports a useful first release without requiring a management dashboard or external integrations.

