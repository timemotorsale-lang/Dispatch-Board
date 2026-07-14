# ADR — Canonical Vehicle Registry and No-Loss Migration Map

**Decision:** Accepted  
**Date:** 2026-07-14  
**Milestone:** VEH-020

## Context

The repository already had a minimal `Vehicle` identity used by appointments, schedulable resources, and `CustomerVehicle`. Tasks retained a free-text `vehicleReference`. Creating a second canonical table would split identity and force every working appointment/customer path through a risky cutover.

## Decision

Evolve the existing `Vehicle` table in place as the canonical registry root. Preserve every existing primary key and reference. Add governed identity fields, a version, merge lineage, and separate append-only/effective-dated ledgers around it.

## Reference migration map

| Existing source | M2 destination and compatibility rule | No-loss behavior |
| --- | --- | --- |
| `Vehicle.id` | Remains the canonical identifier | Appointment, resource, and customer foreign keys do not change. |
| `Vehicle.vin` | Normalized canonical VIN; original copied to `vinRaw` | Valid unique values normalize. Invalid legacy values remain in `vinRaw` with `LEGACY_UNVERIFIED`. Normalization collisions retain both records and open duplicate review cases. |
| `Vehicle.stockNumber` | Preserved raw; normalized into `stockNumberNormalized` | Collisions retain raw values and enter duplicate review instead of overwriting. |
| `Vehicle.externalReference` | Preserved and copied into `VehicleExternalIdentity` with `LEGACY` authority | Existing consumers continue reading the old field while new integrations use the governed mapping. |
| `CustomerVehicle` | Preserved and copied to effective-dated `VehicleRelationship` | Original relationship rows remain available; the new ledger records source IDs and maps known types, using `OTHER` for unknown legacy values. |
| `AppointmentVehicle.vehicleId` | Continues referencing the same `Vehicle.id` | Appointment snapshots remain immutable and continue to provide historical fallback. |
| `SchedulableResource.vehicleId` | Continues referencing the same `Vehicle.id` | Scheduling behavior does not change. |
| `Task.vehicleReference` | Preserved; new nullable `Task.vehicleId` added | Exact, unambiguous matches are linked. Ambiguous or unmatched text remains untouched for later reconciliation. |

## Identity decisions

- A canonical VIN is uppercase, contains 17 permitted characters, and passes the ISO/NHTSA check-digit calculation.
- Assets without a VIN use `NON_VIN_EXCEPTION` and require a documented reason.
- Organization-scoped VIN and normalized stock uniqueness are database-enforced.
- Suspected duplicates are never silently merged. A candidate keeps its raw identity and receives an open `VehicleDuplicateCase`.
- Merge resolution makes the candidate inactive and records `mergedIntoVehicleId`; it does not delete history or rewrite foreign keys.

## Rollout and recovery

The migration is additive. The M1 `VEHICLE_REGISTRY` feature flag remains `OFF` until an operator deliberately enables master and registry rollout. Rollback before writes can remove the additive objects and columns. After registry writes begin, roll forward is required because dropping ledgers would discard odometer, custody, relationship, identity-map, command, and audit history.

Production activation requires a backup, migration rehearsal against a restored copy, counts before/after, unresolved-legacy and duplicate queues, exact task-link reconciliation counts, and a rollback decision before enabling mutation rollout.
