# Canonical Vehicle Registry Implementation Evidence

**Implemented:** 2026-07-14  
**Milestone:** M2 (`VEH-020` through `VEH-028`)  
**State:** Implemented in repository; migration deployment and production activation remain pending

## Delivered slices

| Slice | Repository evidence |
| --- | --- |
| VEH-020 | Accepted in-place ADR and explicit migration map preserve Vehicle, CustomerVehicle, appointment/resource links, snapshots, and task text references. |
| VEH-021 | `Vehicle` now stores raw and normalized VIN, validation state, documented non-VIN reason, raw/normalized stock, version, and merge lineage. Domain validation includes check digit and database checks/uniqueness. |
| VEH-022 | `VehicleRelationship` provides organization-scoped, effective-dated customer and dealership ownership/usage history with source attribution. |
| VEH-023 | `VehicleExternalIdentity` records system, authority, mapping version, sync time, and conflict state. Competing claims become visible conflicts rather than last-write-wins. |
| VEH-024 | `VehicleOdometerObservation` is an append-only observation/correction chain. Decreasing or implausible readings become exceptions. |
| VEH-025 | `VehicleCustodyEvent` records attributable check-in/out, lot/bay moves, transport, and delivery. The latest event is the current-location projection. |
| VEH-026 | `VehicleDuplicateCase` holds potential duplicates. Resolution supports distinct, dismissed, or merged-with-lineage outcomes and requires manager authority and a reason. |
| VEH-027 | Protected `/api/vehicles` APIs provide tenant-safe, paginated search across vehicle number, VIN/partial VIN, stock, plate, year/make/model text, customer, and external ID plus detail and command boundaries. |
| VEH-028 | `/vehicles/registry` provides live search, detail/history, create, revalidation/correction, import preview, odometer/custody capture, and duplicate reconciliation without database access. |

## Command and audit adoption

All registry mutations use the M1 command contract. The domain mutation, vehicle version, command ledger, domain event, immutable audit event, and transactional outbox message commit in one transaction with one correlation ID. Idempotent retries return the stored result and stale versions return HTTP 409. Mutation APIs remain gated by the M1 master/registry rollout flags.

## Non-claims and release work

This milestone does not implement retail inventory ownership economics, repair orders, parts, accounting, DMS synchronization, VIN decoder integration, or a production import job. The migration is not deployed by this change. Operators must rehearse and deploy it, resolve legacy identity exceptions, configure the outbox publisher/worker, enable rollout deliberately, and collect pilot evidence before calling the registry production-ready.
