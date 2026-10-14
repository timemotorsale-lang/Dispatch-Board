# Phase 2 - Physical Shop Zones and Custody

**Decision ID:** `SRO-FND-002`
**Status:** `PROPOSED - LOGICAL ZONES REQUIRE PHYSICAL MAP VALIDATION`

## Confirmed current facility facts

- The Shop has two operating bays.
- Inspection, approval wait, ready-for-technician and QC do not have dedicated physical spaces.
- Vehicles enter and exit through the same access point.
- The twelve zones are therefore logical custody/location classifications; they must map to actual parking positions or one of the two shared bays.
- `Z03`, `Z04`, `Z08` and, when safe, `Z10` may share a bay, but the vehicle's current purpose remains explicit.
- Waiting and ready vehicles must not be represented as occupying a dedicated zone that does not physically exist.

## Proposed zone taxonomy

| Code | Zone | Permitted purpose | Primary restrictions |
| --- | --- | --- | --- |
| `Z01_INBOUND` | Inbound / Arrival Boundary | Detect arrival and await controlled acceptance | No unattended key transfer; no repair start |
| `Z02_CHECK_IN` | Secure Check-In and Custody | Identity, condition, key and custody intake | Controlled key access; unresolved identity remains here or in quarantine |
| `Z03_TRIAGE_INSPECTION` | Triage and Inspection | Safety triage, walkaround and standard inspection | Eligible inspector; applicable lift/equipment rules |
| `Z04_DIAGNOSTIC` | Diagnostic Area | Testing and diagnosis requiring diagnostic resources | Qualification, ventilation, battery/scan and equipment rules |
| `Z05_CONTROLLED_WAIT` | Controlled Wait Lot | Await authorization, non-stock parts, external decision or scheduled resource | Must not occupy a productive bay; blocker owner and review time required |
| `Z06_PARTS_KIT` | Parts Staging / Kitting | Secure job-specific parts, cores and return items | Labeled reservation and custody; no ambiguous loose parts |
| `Z07_READY_QUEUE` | Ready-for-Dispatch Staging | Hold vehicles that currently pass readiness | Readiness revalidated before movement/start; capacity limited |
| `Z08_REPAIR_BAY` | Mechanical Repair Bay | Authorized active repair | One vehicle per bay; eligible technician/resource; safe-stop record on interruption |
| `Z09_SPECIALTY_SUBLET` | Specialty / Detail / Body / Sublet Transfer | Approved internal specialty or external vendor work | Custody transfer, vendor authority, SLA and return evidence required |
| `Z10_QC` | QC and Road-Test Staging | Independent verification and approved road-test preparation | Repair performer cannot self-pass where independence is required |
| `Z11_OUTBOUND` | Handoff / Outbound | Await accepted customer, advisor or Inventory handoff | Release package and receiving-owner acceptance required |
| `Z12_QUARANTINE` | Safety / Identity / Security Quarantine | Contain unsafe, unidentified, disputed or security-sensitive vehicles | Movement only under approved containment instruction |

## Movement contract

Every movement records vehicle, from-zone, to-zone, reason, requested-by, moved-by, event time, odometer when applicable, custody change, key location and correlation to the governing job/stage. The destination must be eligible and within approved capacity before movement.

The recommended next zone is advisory until a human confirms movement. A stage transition and a physical movement are separate events and may occur independently.

## Physical validation gate

Before these zones can control operations, an authorized Shop/Safety owner must publish:

- actual floor/lot names and boundaries mapped to each code;
- safe capacity and overflow rule for each zone;
- fire lane, environmental, EV/high-voltage and restricted-access exclusions;
- key-control locations and authorized roles;
- approved traffic direction, tow/push procedures and after-hours boundary;
- signage/labeling and degraded-mode location roster.

Until that inspection is accepted, the codes may be used only as a planning taxonomy; the existing physical safety process controls.
