# Phase 4 - Target Times and Clocks

**Decision ID:** `SRO-FND-004`
**Status:** `PROPOSED BASELINE - BASE CALENDAR CONFIRMED; BREAK POLICY REMAINS OPEN`

## Confirmed base calendar

- Shop and customer hours are Monday-Friday, 9:00 AM-6:00 PM, America/Chicago.
- Technicians and other Shop roles use the same schedule.
- No vehicle work or ordinary Shop acceptance occurs outside Shop hours.
- The dealership may accept Saturday drop-offs, but those remain dealership custody only. Total elapsed custody time remains visible; the controllable Shop clock begins when Shop staff accept the vehicle during the next staffed window.
- The gross schedule is 540 minutes per weekday and 2,700 minutes per week before breaks, holidays, absences or closures.
- Lunch/break deductions remain required before productive-capacity calculations are activated.

## Clock policy

Three clocks remain visible and separate:

1. **Total elapsed clock:** physical shop entry to accepted shop exit; never paused.
2. **Stage elapsed clock:** time in the current lifecycle stage; never erased by reassignment or correction.
3. **Controllable work clock:** staffed time excluding only an approved external dependency interval; exclusion requires a blocker, owner, expected event and review cadence.

An exclusion never hides total elapsed time. Customer promises and Inventory frontline targets are separate commitments and do not replace Shop clocks.

## Proposed stage targets

| Stage | Controllable target | Required warning/review behavior |
| --- | ---: | --- |
| 1 Shop Entry | 15 minutes | Unmatched arrival or custody risk escalates immediately at target |
| 2 Custody and Check-In | 30 minutes | Identity/key/condition exception routes to containment |
| 3 Lane and Scope Confirmation | 30 minutes | Conflicting or missing authority becomes a blocker |
| 4 Safety and Priority Triage | 60 minutes | Suspected safety risk is contained immediately, not at deadline |
| 5 Inspection | 4 staffed hours | Incomplete inspection receives owner and recovery time |
| 6 Diagnosis | 8 staffed hours | Complex diagnosis may receive one versioned extension up to 24 staffed hours |
| 7 Findings Verification | 2 staffed hours | Reviewer accepts or returns exact deficiencies |
| 8 Repair Plan and Estimate | 4 staffed hours | Plan delay exposes downstream target impact |
| 9 Authorization and Approval | 2 staffed hours for Inventory response; 4 staffed hours for first customer contact attempt | External response time remains visible; follow-up event required |
| 10 Parts and Resource Readiness | 2 staffed hours to establish source/reservation/resource plan | Non-stock/vendor wait reviewed at least once each staffed day |
| 11 Ready for Dispatch | 2 staffed hours | Ready-age breach escalates dispatch review |
| 12 Assigned and Staged | 1 staffed hour | Assignment must be revalidated if start does not occur |
| 13 Repair Execution | Current approved low/expected/high job range | No unexplained active-time gap over 60 minutes; pause or progress required |
| 14 Technician Complete | 30 minutes | Missing completion evidence returns to Stage 13 |
| 15 QC and Release Readiness | 2 staffed hours; 4 when an approved road test is required | Failed QC creates exact rework immediately |
| 16 Handoff and Shop Exit | 1 staffed hour for Inventory acceptance; 2 staffed hours for customer-ready notification/handoff preparation | Receiving delay remains visible with custody owner |

## Aggregate baseline

- Inventory Recon target: accepted shop entry through QC-complete Inventory handoff within **72 staffed hours** for standard in-house work.
- Complex diagnosis, non-stock parts, specialty/sublet, title/document issues and safety containment require explicit exception classification; they do not disappear from total elapsed reporting.
- Customer-pay completion uses the accepted repair-order promise range; no universal three-day promise is inferred.

## Alert bands

- `ON_TRACK`: less than 75% of target consumed.
- `WARNING`: 75% through less than 100%.
- `BREACHED`: 100% through less than 150%.
- `CRITICAL`: 150% or more, or any safety/authorization/custody breach regardless of age.

Targets are operating controls, not employee discipline or guaranteed customer promises. They require calibration after baseline observation.
