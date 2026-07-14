# Vehicle Operations Governance Baseline

**Milestone:** M0 — Planning and governance  
**Completed:** 2026-07-13  
**Scope:** Documentation and policy baseline only; no production persistence, API, permission, backup, monitoring, or incident capability is implied

| Slice | Evidence | Status |
| --- | --- | --- |
| `VEH-004` Domain glossary and RACI | [`VEHICLE_OPERATIONS_GLOSSARY_RACI.md`](VEHICLE_OPERATIONS_GLOSSARY_RACI.md) | Complete |
| `VEH-005` KPI catalog v1 | [`VEHICLE_OPERATIONS_KPI_CATALOG.md`](VEHICLE_OPERATIONS_KPI_CATALOG.md) | Complete |
| `VEH-006` Threat model and data classification | [`VEHICLE_OPERATIONS_THREAT_MODEL.md`](VEHICLE_OPERATIONS_THREAT_MODEL.md) | Complete |
| `VEH-007` SLO, backup, retention, and incident policy | [`VEHICLE_OPERATIONS_RELIABILITY_POLICY.md`](VEHICLE_OPERATIONS_RELIABILITY_POLICY.md) | Complete |

## Governance order

1. Use the glossary and RACI for names, meanings, authority, and sources of truth.
2. Use the KPI catalog for formulas, windows, exclusions, quality, and publication gates.
3. Use the threat model for classification, security requirements, risk ownership, and verification.
4. Use the reliability policy for SLOs, backup/restore, retention, incidents, and operational evidence.

If requirements conflict, safety/legal constraints and the stricter data-handling rule take priority; business or architecture conflicts require an approved change to the applicable source document.

## Next milestone boundary

M1 implements the command and tenancy foundation. M0 does not prove M1 controls. Each M1 card must cite the applicable governance terms, KPI effects, `TM-*` threats, and SLO/recovery requirements.

