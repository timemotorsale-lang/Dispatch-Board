# Start Workflow — Add Vehicle Official UI and Operating Contract

**Product:** Time Motor Sales Dispatch Board  
**Program:** Inventory Console Optimization  
**Surface:** Inventory Console → Start Workflow → Add Vehicle  
**Document version:** `1.0.0`  
**Status:** Approved and implemented in the repository  
**Date approved:** July 19, 2026  
**Approval authority:** Explicit project-owner approval of the review mockup and subsequent implementation direction  
**Approved visual:** [`assets/inventory-start-workflow-add-vehicle-source-of-truth-v1.png`](assets/inventory-start-workflow-add-vehicle-source-of-truth-v1.png)  
**Implemented route:** `/vehicles/workflows/add-vehicle`

---

## 1. Decision

The approved Add Vehicle form is the official fast, duplicate-safe entry point for establishing a canonical Vehicle before staff begins acquisition, service, appraisal, Inventory control, or reference work.

It is an execution form, not another Inventory landing page and not an acquisition shortcut. Its job is to answer three questions with the least safe amount of input:

1. Is this vehicle already known?
2. Why is staff adding it now?
3. Which eligible workflow should be prepared next?

The canonical vehicle may be reused across its lifecycle. Ownership, InventoryUnit, RepairOrder, stock number, acquisition cost, purchase commitment, repair authorization, and customer relationship remain separate governed records or decisions.

## 2. Approved staff experience

The form uses three visible phases: `Identify`, `Purpose`, and `Review & Continue`.

### Identify

- VIN is searched before creation.
- Exact canonical matches direct staff to the existing Vehicle 360 and may continue with that vehicle.
- A no-match result requires staff confirmation before creation.
- Year, make, model, color, current location, license plate, and a documented non-VIN exception are captured only as applicable.
- The current implementation truthfully states that VIN decoding and camera OCR are not configured. Connected keyboard-wedge scanners may enter the VIN; year, make, and model require authoritative manual confirmation.

### Purpose

Staff selects one relationship posture: Dealership Inventory, Customer Vehicle, Trade / Acquisition Candidate, or Ownership Not Confirmed. Staff then selects a compatible operational reason and supplies a required brief description of 10–240 characters. The description is operational context, not authority to purchase, repair, stock, own, price, release, or publish the vehicle.

### Review and continue

The right rail shows the recommended next workflow and confidence, the reasons, readiness checks, what the command will do, and important records it will not create.

The final action creates one canonical Vehicle, preserves attributable command/audit context, and opens a prepared next workflow. That downstream workflow performs its own authority, eligibility, source, evidence, version, and rollout checks.

## 3. Recommendation rules

| Relationship and reason | Prepared next workflow | Confidence | Guardrail |
| --- | --- | --- | --- |
| Customer Vehicle + Service/Repair or Inspection/Diagnosis | Create Service Intake | High | Prepares walk-in intake; does not itself create a RepairOrder |
| Customer Vehicle + Customer Appointment | Schedule Appointment | High | Opens scheduling with vehicle context |
| Trade/Acquisition Candidate or appraisal/acquisition reason | Start Trade / Acquisition Appraisal | High | No dealership ownership or purchase commitment is inferred |
| Dealership Inventory + Inventory Recon | Review Inventory Control | Medium | InventoryUnit eligibility precedes recon |
| Reference, ownership uncertainty, or unresolved context | Open Vehicle 360 | Medium | Human review precedes consequential workflow |

These deterministic rules are explainable support. They do not override hard rules or grant authority.

## 4. Required controls

The implemented form and service must retain authenticated and capability-scoped access; rollout enforcement; server-side validation; VIN normalization and validation; duplicate search and duplicate-review handling; a documented non-VIN exception; idempotent command execution; organization and location scoping; attributable reason/workflow context; explicit consequence preview; and no silent creation of downstream governed records.

Browser draft storage is convenience only. Saving a draft creates no record and changes no workflow state.

## 5. Canonical boundaries

| Concern | Authority |
| --- | --- |
| Vehicle identity | Vehicle Registry / canonical Vehicle |
| Vehicle-centered context | Vehicle 360 |
| Dealership ownership and lifecycle | InventoryUnit / Inventory domain |
| Customer service execution | RepairOrder / Shop domain |
| Acquisition and appraisal | Acquisition domain |
| Customer association | Customer and Vehicle relationship commands |
| Recommendation | Versioned Add Vehicle rule set; advisory until downstream command executes |
| Audit evidence | Enterprise command, domain event, audit, and outbox foundations |

Relationship posture selected on this form describes launch intent. It must not be treated as a completed legal or customer ownership relationship.

## 6. Simplicity and accessibility standard

The happy path should normally take about 20–45 seconds when VIN, location, and purpose are known. Staff should make selections rather than compose long narratives. The only required narrative is one or two short operational sentences.

The interface must retain keyboard operation, visible labels, focus treatment, readable state text in addition to color, screen-reader status messaging, responsive layout, and clear disabled-state explanations. It must never require optional photos, odometer, documents, or customer association merely to establish identity; those belong in Vehicle 360 or the prepared workflow.

## 7. Implementation boundary and known deferrals

Repository implementation includes the route, launcher entry, duplicate preview, governed canonical create command, deterministic recommendation, local draft, prepared downstream routing, and Service Intake context preparation.

It does not claim production activation; camera VIN capture/OCR; external VIN decoding; automatic customer matching or formal relationship creation; automatic RepairOrder, InventoryUnit, acquisition commitment, stock number, cost, or purchase creation; approval of dealership financial, employee, or lifecycle policy; or implementation of the complete proposed Start Workflow Orchestrator.

## 8. Acceptance criteria

1. VIN search occurs before standard-VIN creation.
2. Existing exact matches are reused rather than knowingly duplicated.
3. Required identity, location, purpose, and description are server validated.
4. Invalid relationship/reason combinations fail closed.
5. The recommendation and its basis are visible before submission.
6. The consequence preview states both created and non-created records.
7. Server authorization, rollout, idempotency, organization, and location checks remain effective.
8. Success returns the canonical vehicle and prepared next-workflow context.
9. A conflict or duplicate race remains visible and recoverable.
10. The UI never claims unavailable decoding, scanning, automation, or downstream completion.

## 9. Change control

Material changes require a new approved version. This includes changing identity rules, relationship or reason choices, recommendation mappings, required description, canonical authorities, records created, consequential effects, automation level, or the approved visual hierarchy. Styling refinements may improve responsiveness or accessibility without changing the operating contract.
