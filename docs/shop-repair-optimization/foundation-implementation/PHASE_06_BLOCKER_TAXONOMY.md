# Phase 6 - Blocker Taxonomy and Recovery

**Decision ID:** `SRO-FND-006`
**Status:** `PROPOSED`

## Required blocker contract

Every blocker records code, stage, description, owner, next action, opened time, expected resolution/review time, source evidence, vehicle/location/custody effect, customer or Inventory commitment effect, restrictions and current version. Resume requires verified resolution and revalidation of affected downstream gates.

## Stable blocker families

| Code | Meaning | Default resolution owner | Minimum review cadence |
| --- | --- | --- | --- |
| `BLK-ID-IDENTITY_CONFLICT` | VIN/stock/RO/vehicle mismatch | Eli / custody owner | Immediate |
| `BLK-CUSTODY-KEY_OR_ACCESS` | Key, access or custody unavailable/disputed | Shop custody owner | Every staffed hour |
| `BLK-SAFE-VEHICLE_HAZARD` | Vehicle presents safety/environmental hazard | Eli / qualified safety route | Immediate containment |
| `BLK-SAFE-MOVEMENT_RESTRICTED` | Vehicle cannot be moved safely | Eli / qualified safety route | At each proposed move |
| `BLK-LANE-AUTHORITY_UNKNOWN` | Lane or governing authority is missing/conflicted | Eli; Brock for Inventory context | Within 1 staffed hour |
| `BLK-INSP-INCOMPLETE` | Required inspection evidence is incomplete | Inspection owner | Within 2 staffed hours |
| `BLK-DIAG-ADDITIONAL_TEST` | Diagnosis requires additional test/evidence | Assigned diagnostic owner | Within 2 staffed hours |
| `BLK-SCOPE-CHANGED` | New finding exceeds current plan/authorization | Eli proposes; lane authorizer decides | Immediate safe stop; review within 1 staffed hour |
| `BLK-AUTH-CUSTOMER` | Customer decision required | Authorized advisor/commitment owner | First attempt within 1 staffed hour; then approved cadence |
| `BLK-AUTH-INVENTORY` | Inventory plan/amount decision required | Brock Harris | Within 2 staffed hours |
| `BLK-FIN-LIMIT_OR_PRICE` | Financial threshold, price or cost conflict | Eli / required Finance authority | Within 2 staffed hours |
| `BLK-PART-NOT_SOURCED` | No approved part source | Eli as Parts primary | Within 2 staffed hours, then daily |
| `BLK-PART-ETA_RISK` | ETA is missing, stale or outside commitment | Parts owner | Each staffed day or vendor event |
| `BLK-PART-WRONG_DAMAGED` | Received part is wrong, damaged or unusable | Parts owner | Immediate on discovery |
| `BLK-PART-KIT_INCOMPLETE` | Authorized job lacks complete usable reserved kit | Parts owner | Every staffed day and part event |
| `BLK-TECH-SKILL_UNAVAILABLE` | No verified eligible technician | Eli / dispatch | Each staffed day and roster change |
| `BLK-RES-BAY_TOOL_EQUIPMENT` | Required bay/lift/tool/equipment unavailable or ineligible | Eli / resource owner | Every 2 staffed hours and resource event |
| `BLK-PROC-INFORMATION` | Required procedure/specification is absent or conflicted | Qualified procedure owner | Before work start/resume |
| `BLK-SUBLET-VENDOR` | Approved vendor, custody, SLA or return evidence is unresolved | Eli / purchasing route | Each staffed day and vendor event |
| `BLK-QC-FAILED` | Verification failed and exact rework is required | Qualified QC owner; Eli recovery owner | Immediate routing |
| `BLK-QC-REVIEWER_UNAVAILABLE` | Required qualified/independent verifier is unavailable | Eli | Each staffed day |
| `BLK-HANDOFF-RECEIVER` | Eligible receiving owner has not accepted | Lane commitment owner | Inventory: hourly; customer: approved contact cadence |
| `BLK-DATA-STALE_CONFLICT` | Required source is stale, unavailable or contradictory | Eli / future Data owner | Immediate quarantine of affected gate |
| `BLK-SYS-DEGRADED` | Application/integration unavailable | Eli declares degraded mode | At incident cadence |
| `BLK-LOC-VEHICLE_NOT_FOUND` | Recorded and observed vehicle location do not reconcile | Custody owner | Immediate search/containment |

## Severity

- `S1_CRITICAL`: safety, identity, custody, security or unauthorized-work risk; contain immediately.
- `S2_HIGH`: blocks active work, QC or a material commitment; manager review within one staffed hour.
- `S3_STANDARD`: blocks planned progression; owner acts within the stage target.
- `S4_WATCH`: risk is emerging but a hard gate has not yet failed; cannot be used to mislabel work as blocked.

## Resolution rules

Changing status, moving the vehicle, reassigning ownership or waiting for time to pass does not resolve a blocker. Resolution records evidence, actor and time, then re-evaluates identity, safety, authorization, parts, skill, resource, location and downstream commitment gates affected by the blocker.
