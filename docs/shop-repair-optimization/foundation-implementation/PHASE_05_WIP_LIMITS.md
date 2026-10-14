# Phase 5 - WIP Limits and Flow Control

**Decision ID:** `SRO-FND-005`
**Status:** `PROPOSED BASELINE - PHYSICAL CAPACITIES REQUIRE VALIDATION`

## Confirmed two-bay application

- Maximum vehicles in active or staged productive-bay positions: two.
- Maximum active vehicle per bay: one.
- Inspection, diagnosis, repair and applicable QC share these bays rather than receiving separate physical capacity.
- Waiting-for-approval, waiting-for-parts, ready and QC-queued vehicles require actual parking-position mapping and cannot be assumed to have dedicated space.

## Approved-principle baseline

Work may be admitted only when the next constrained step has credible capacity. A high-priority unready vehicle receives blocker-resolution work, not an invalid technician, bay or queue position.

## Proposed limits

| Constraint | Limit | Exception/control |
| --- | --- | --- |
| Technician active work | 1 active primary job per technician | Safety stop, safe paused work or recorded diagnostic collaboration only |
| Technician next work | 1 currently ready staged-next job | No third staged job |
| Productive repair bay | 1 vehicle per bay | No storage or parts-wait occupation; containment exception requires Eli approval and removal plan |
| Diagnostic work | 1 active primary diagnosis per eligible diagnostic technician/resource combination | Collaboration recorded without duplicating ownership |
| Ready-for-dispatch queue | Maximum 2 ready vehicles per eligible on-duty technician, bounded by `Z07` safe capacity | Excess creates dispatch/capacity review; no silent parking overflow |
| QC queue | Maximum 2 submitted vehicles per currently eligible QC verifier, bounded by `Z10` capacity | Excess triggers priority review; performer cannot self-clear required independence |
| Controlled-wait zone | Published safe physical capacity only | Every vehicle requires blocker, owner, review time and removal trigger |
| Repair floor | No more active/staged vehicles than verified eligible bay positions | Floor space does not create a bay |
| New Inventory Recon admission | Forecasted 72-hour demand must fit eligible capacity after committed work and protected buffer | Otherwise Inventory receives a wait/alternate plan before custody transfer |

## Flow rules

- Finish or safely pause current work before starting another job.
- A vehicle waiting on non-stock parts or external authorization must leave a productive bay within 30 minutes when safe movement and controlled-wait capacity exist.
- A staged-next job is revalidated when authorization, part, technician, resource, vehicle location, safety state or evidence changes.
- Ten percent of verified productive capacity, with a minimum of one productive hour per staffed day, remains protected for variability and recovery under the accepted SRO baseline.
- WIP excess creates a visible manager review; it never silently cancels, reassigns or advances work.

## WIP exception record

An exception requires reason, approving authority, affected vehicles/commitments, safety state, start time, expiry/review event, temporary location, responsible owner and removal/recovery plan.
