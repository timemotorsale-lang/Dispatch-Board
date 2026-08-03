# Seven-Phase Foundation Approval Register

**Status:** `7 OPEN`
**Policy extension:** Proposed `SRO-1.1-foundation`

## Decision rule

For each phase, an authorized human must select one disposition and accept the exact text or provide exact replacement language. Document creation, discussion, silence or an implementation request is not approval.

| Decision | Phase | Required authority | Recommended disposition | State |
| --- | --- | --- | --- | --- |
| `SRO-FND-001` | Sixteen-stage lifecycle | Eli Aswan plus affected Shop/Inventory owners | `APPROVE_WITH_CHANGE` if labels or loops change; otherwise `APPROVE` | `OPEN` |
| `SRO-FND-002` | Physical zones | Eli Aswan plus qualified Shop/Safety validation | `APPROVE_WITH_CHANGE` pending physical map/capacity validation | `OPEN` |
| `SRO-FND-003` | Lane authorities | Eli Aswan, Brock Harris and each affected independent/qualified owner | `APPROVE_WITH_CHANGE` retaining unavailable unnamed roles | `OPEN` |
| `SRO-FND-004` | Target times | Eli Aswan and Brock Harris; Data/measurement review before activation | `APPROVE_WITH_CHANGE` pending staffed calendar and baseline calibration | `OPEN` |
| `SRO-FND-005` | WIP limits | Eli Aswan plus affected technicians/Shop/Safety validation | `APPROVE_WITH_CHANGE` pending actual zone/bay capacities | `OPEN` |
| `SRO-FND-006` | Blocker taxonomy | Eli Aswan, Brock Harris and affected resolution owners | `APPROVE` or exact amendments | `OPEN` |
| `SRO-FND-007` | Inventory-to-Shop handoff | Brock Harris + Eli Aswan; IT/Data for later integration | `APPROVE_WITH_CHANGE` for policy; integration remains held | `OPEN` |

## Safe defaults

| Decision | Safe default while open |
| --- | --- |
| `SRO-FND-001` | Existing authoritative Shop states and manual workflow |
| `SRO-FND-002` | Existing physical safety, key and custody process |
| `SRO-FND-003` | Only previously confirmed named authority; unnamed/independent capabilities unavailable |
| `SRO-FND-004` | Targets are planning hypotheses only; no promise or staff action |
| `SRO-FND-005` | Existing human dispatch plus accepted one-active/one-next and one-vehicle-per-bay principles |
| `SRO-FND-006` | Existing exact blocker narrative/owner/review contract |
| `SRO-FND-007` | Existing manual Inventory Recon handoff; no inferred Inventory transition |

## Required approval response

```text
SRO-FND-001: APPROVE | APPROVE_WITH_CHANGE - <exact replacement> | DEFER_SAFE | REJECT
SRO-FND-002: APPROVE | APPROVE_WITH_CHANGE - <exact replacement> | DEFER_SAFE | REJECT
SRO-FND-003: APPROVE | APPROVE_WITH_CHANGE - <exact replacement> | DEFER_SAFE | REJECT
SRO-FND-004: APPROVE | APPROVE_WITH_CHANGE - <exact replacement> | DEFER_SAFE | REJECT
SRO-FND-005: APPROVE | APPROVE_WITH_CHANGE - <exact replacement> | DEFER_SAFE | REJECT
SRO-FND-006: APPROVE | APPROVE_WITH_CHANGE - <exact replacement> | DEFER_SAFE | REJECT
SRO-FND-007: APPROVE | APPROVE_WITH_CHANGE - <exact replacement> | DEFER_SAFE | REJECT

I accept the exact proposed text for every item marked APPROVE: YES / NO
Approver identity and represented authority:
Effective date/time and timezone:
Conditions, dependencies or expiry:
```

## Downstream authorization remains separate

Approval of all seven foundation phases establishes policy only. Technical design, code, data migration, integration, shadow evaluation, pilot and production activation each require a separate recorded authorization under Workshop 8.
