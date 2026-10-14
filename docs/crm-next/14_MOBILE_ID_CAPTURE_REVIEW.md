# CRM Next Capture Hub Review

## Purpose

Capture Hub should make phone-camera work fast for front-desk, sales, service, inventory, parts, accounting, and management staff. The camera can help start records, attach proof, route documents, and create the next action, but staff must still confirm the useful fields before anything becomes official.

## Review Scope

- Add a phone-friendly Capture Hub area to CRM Next Add Customer.
- Let staff choose the purpose before capturing anything.
- Support review routes for customer ID, vehicle identity, mileage, condition, repair proof, parts, documents, and signatures.
- Let staff confirm name, address, phone, email, license state, and license ending for customer ID capture.
- Copy confirmed customer fields into the existing Add Customer form when the Add customer purpose is selected.
- Keep the workflow reviewable before it becomes the approved production process.

## Privacy Guardrails

- Do not save sensitive photos in this review build.
- Do not store full driver license numbers.
- Show only the license ending when a license reference is needed.
- Require staff confirmation before customer creation.
- Search for an existing customer before saving a new customer record.
- Keep live OCR, permanent storage, and automatic record updates off until approved.

## Capture Routes

| Purpose | Attach To | Next Action |
| --- | --- | --- |
| Add customer | Customer record | Create or update customer after duplicate review |
| Add vehicle | Vehicle, inventory unit, or customer vehicle | Find or create vehicle |
| Record mileage | Vehicle, RO, inventory, transport, or delivery | Attach odometer proof |
| Show condition | Vehicle, inventory, RO, or deal | Attach condition evidence or create repair task |
| Repair proof | RO, repair job, diagnostic case, estimate, or QC | Move estimate, authorization, repair, or verification forward |
| Add part | RO, repair job, parts request, return, or warranty claim | Order, receive, return, or hold part |
| Add document | Customer, vehicle, RO, deal, invoice, or vendor | Route to the responsible workflow |
| Capture approval | Estimate, authorization, delivery, consent, or trade-in | Hold for manager review or attach approval proof |

## Future Approval Items

- OCR or barcode scan provider.
- Customer consent language.
- Retention schedule for any legally required identity proof.
- Duplicate matching against existing CRM and DMS records.
- Audit trail for staff confirmation.
