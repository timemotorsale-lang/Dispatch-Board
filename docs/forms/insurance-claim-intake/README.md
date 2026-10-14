# Insurance Claim Intake Forms

**Status:** first implementation baseline  
**Source module:** `src/lib/insurance-claim-intake-form-packet.ts`

These forms define the intake facts needed before deep backend implementation. They are intentionally HTML-first so they can be reviewed, printed, archived, and later wired into PDF generation, e-signature, the document library, claim workspace, customer record, vehicle record, and repair order.

## Packet Forms

| Form | Required | Purpose |
| --- | --- | --- |
| Insurance claim intake form | Yes | Captures first-contact claim, customer, vehicle, carrier, loss, driveability, tow/storage, and next-action facts. |
| Customer authorization and direction to repair | Yes | Lets staff inspect, communicate with insurer/adjuster, prepare estimate material, coordinate documents, and route repair/payment work. |
| Vehicle condition and damage photo checklist | Yes | Forces photo/evidence capture for VIN, odometer, four corners, damaged areas, pre-existing damage, interior, keys, tow arrival, and storage condition. |
| Insurance carrier and adjuster contact form | Yes | Captures carrier, policy, claim, adjuster, deductible, coverage, estimate status, payment status, and follow-up notes. |
| Tow, storage, and release form | Conditional | Used when tow, impound, storage, outside release, or fee recovery is involved. |
| Claim handoff checklist | Yes | Gates handoff to estimate, supplement, repair order, accounting, customer follow-up, manager review, or closeout. |

## Implementation Principle

The desk stays short. These forms carry the detailed facts progressively after staff selects or starts the claim.

## Later Wiring

- Generate PDF versions from the same packet definitions.
- Store completed forms once in the document library.
- Link documents to claim, customer, vehicle, and repair order.
- Add e-signature for authorization and handoff acknowledgements.
- Make photo checklist completion a gate before repair-order handoff.
