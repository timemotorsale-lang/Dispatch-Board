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
| 1 Service / Recon Job Intake | 30 minutes | Missing lane, vehicle, requester, concern, commitment or owner escalates |
| 2 Job Scope Definition | 30 minutes | Conflicting inclusions, exclusions or scope authority become a blocker |
| 3 Work Order Creation | 30 minutes | Missing work-order or scope linkage blocks physical intake |
| 4 Vehicle Intake & Custody | 30 minutes | Identity, key or condition exception routes to containment |
| 5 Safety & Mobility Triage | 1 staffed hour | Suspected safety risk is contained immediately, not at deadline |
| 6 Inspection & Concern Verification | 4 staffed hours | Incomplete inspection receives owner and recovery time |
| 7 Diagnosis | 8 staffed hours | Complex diagnosis may receive one versioned extension up to 24 staffed hours |
| 8 Findings & Repair Plan | 4 staffed hours | Plan delay exposes downstream target impact |
| 9 Authorization | External wait; lane-specific follow-up target | External response time remains visible; follow-up event required |
| 10 Parts and Resource Readiness | 2 staffed hours to establish source/reservation/resource plan | Non-stock/vendor wait reviewed at least once each staffed day |
| 11 Dispatch & Work Staging | 2 staffed hours | Assignment must be revalidated if start does not occur |
| 12 Repair Execution | Current approved low/expected/high job range | No unexplained active-time gap over 60 minutes; pause or progress required |
| 13 Technician Completion | 30 minutes | Missing completion evidence returns to Stage 12 |
| 14 Quality Control & Road Test | 2 staffed hours | Failed QC creates exact rework immediately |
| 15 Release & Handover Readiness | 1 staffed hour | Final scope, cost, keys, documents and receiver must reconcile |
| 16 Vehicle Handover & Shop Exit | 1 staffed hour | Receiving delay remains visible with custody owner |

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
