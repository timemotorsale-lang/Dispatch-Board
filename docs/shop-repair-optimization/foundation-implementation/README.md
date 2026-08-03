# Shop and Recon Controlled Foundation Implementation

**Status:** `CODED READ-ONLY FOUNDATION - NO STAGE ALGORITHMS, WORKFLOW MIGRATION OR ACTIVATION`
**Policy extension:** Proposed `SRO-1.1-foundation`
**Location:** Time Motor Sales / Minneapolis
**Established:** 2026-08-03
**Predecessor:** `SRO-1.0` Workshops 1-7 passed for policy; Workshop 8 remains open

## Purpose

This package converts the approved Shop and Repair operating principles into seven exact, reviewable foundation phases. It defines how a vehicle is controlled from physical shop entry through accepted shop exit and how Inventory Recon crosses the Inventory-to-Frontline boundary.

The versioned read-only code foundation is implemented and exposed through the existing Shop & Recon projection. It does not authorize integration writeback, shadow evaluation, pilot operation, production activation, vehicle movement, customer communication, purchasing, repair execution, QC, release, or migration of the existing repair-order workflow to the new stages.

## Approval integrity

Creating this package does not approve it. Only an authorized human may select `APPROVE`, `APPROVE_WITH_CHANGE`, `DEFER_SAFE`, or `REJECT` for each phase in the [Approval Register](APPROVAL_REGISTER.md). Prior `SRO-APR-*` decisions remain controlling unless an authorized amendment explicitly identifies the superseded language.

## Seven phases

| Phase | Foundation | Document | Approval result required |
| ---: | --- | --- | --- |
| 1 | Sixteen controlled lifecycle stages | [PHASE_01_SIXTEEN_STAGE_LIFECYCLE.md](PHASE_01_SIXTEEN_STAGE_LIFECYCLE.md) | Exact stage codes, meanings, entry/exit gates and loop behavior |
| 2 | Physical shop zones and custody | [PHASE_02_PHYSICAL_SHOP_ZONES.md](PHASE_02_PHYSICAL_SHOP_ZONES.md) | Zone taxonomy, permitted uses, custody and movement controls |
| 3 | Lane and decision authorities | [PHASE_03_LANE_AUTHORITIES.md](PHASE_03_LANE_AUTHORITIES.md) | Named authority boundaries, unavailable roles and separation of duties |
| 4 | Target times and clocks | [PHASE_04_TARGET_TIMES.md](PHASE_04_TARGET_TIMES.md) | Stage targets, warning bands, pause rules and commitment clocks |
| 5 | WIP limits and flow control | [PHASE_05_WIP_LIMITS.md](PHASE_05_WIP_LIMITS.md) | Technician, bay, queue and exception limits |
| 6 | Blocker taxonomy and recovery | [PHASE_06_BLOCKER_TAXONOMY.md](PHASE_06_BLOCKER_TAXONOMY.md) | Stable codes, owners, review times, resolution and resume gates |
| 7 | Inventory-to-Shop handoff | [PHASE_07_INVENTORY_TO_SHOP_HANDOFF.md](PHASE_07_INVENTORY_TO_SHOP_HANDOFF.md) | Versioned inbound acceptance, changed-scope loop and outbound acceptance |

See [Code Foundation Implementation](CODE_FOUNDATION_IMPLEMENTATION.md) for the repository boundary, activation holds and validation evidence.

## Mirrored operating contract

Every active shop record carries:

- canonical vehicle, repair order, lane and location;
- lifecycle stage plus independent operating state;
- stage-entered time, accountable owner, target and next action;
- custody and intended destination zone;
- exact blocker, resolution owner and review time when work cannot progress;
- current scope, authorization and financial version;
- parts, technician, resource, procedure and evidence readiness;
- immutable command/event history and correction lineage;
- upstream and downstream Inventory correlation for Inventory Recon.

## State model

The sixteen lifecycle stages represent controlled progress. The following operating states are overlays and never substitute for a stage:

`ACTIVE`, `WAITING`, `BLOCKED`, `PAUSED`, `REWORK`, `CANCELLED`, and `CLOSED`.

Changed scope, missing parts, resource failure, customer delay and QC failure are loops or operating states. They do not create false forward progress.

## Adoption sequence

1. Review and decide Phases 1-7 in order.
2. Record exact amendments and attributable approval evidence.
3. Reconcile approved amendments into `SRO-APR-004`, `010`-`019`, `020`-`027`, `030`-`039`, and open Workshop 8 decisions `070`-`079`.
4. Map logical zones to an inspected physical floor/lot map and publish staffed operating hours.
5. Complete tabletop cases and data/source authority decisions.
6. Obtain separate technical-design authorization before any code.

## Current gate

```text
PHASES 1-7: CODED AS READ-ONLY FOUNDATION / POLICY CONFIRMATIONS REMAIN
POLICY EXTENSION: PARTIALLY CONFIRMED / NOT OPERATIONALLY EFFECTIVE
STAGE ALGORITHMS / WORKFLOW MIGRATION / SHADOW / PILOT / ACTIVATION: NOT AUTHORIZED
SAFE DEFAULT: EXISTING MANUAL SHOP AND INVENTORY-RECON PROCESS
```
