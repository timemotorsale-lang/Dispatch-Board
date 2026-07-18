# Inventory Console R1 Foundation Conformance Assessment

**Release / milestone:** R1 / M1  
**Slices assessed:** IC-010 through IC-017  
**Assessment date:** 2026-07-18  
**Branch:** `codex/inventory-console-r1-foundation-conformance`  
**Mode:** Read-only conformance assessment and safe local verification  
**Result:** `PARTIAL — R0 BLOCK REMOVED; R1 IMPLEMENTATION REQUIRED`

## Executive result

The repository contains substantial reusable enterprise foundations. The canonical Vehicle Registry, InventoryUnit, RepairOrder, Parts ledger, enterprise command ledger, aggregate versioning, audit, domain event, transactional outbox, capability, rollout, projection checkpoint, evidence, policy, saved-view, review, and resilience building blocks are present and their focused tests pass.

This does not complete R1. [`R0-AUTH-001`](../r0-readiness/R0_CODE_AUTHORIZATION_RESOLUTION.md) now authorizes bounded repository implementation, but IC-010 through IC-017 still require implementation and exit evidence. This assessment branch itself contains no application-code changes.

## Binding acceptance

Acceptance is governed by [M1 — Shared enterprise foundation conformance](../INVENTORY_CONSOLE_IMPLEMENTATION_MILESTONES.md#3-m1--shared-enterprise-foundation-conformance) and the [Inventory Console execution protocol](../INVENTORY_CONSOLE_IMPLEMENTATION_EXECUTION_PROTOCOL.md). Repository presence is not treated as deployment, migration, pilot, integration, or production evidence.

## Slice assessment

| Slice | Assessment | Reusable evidence | Missing proof or capability before acceptance |
| --- | --- | --- | --- |
| IC-010 | `PARTIAL / STRONG` | Canonical Vehicle and InventoryUnit models, registry/unit services, identity normalization, duplicate/custody/external-identity structures, state history, optimistic versions | Database-backed duplicate, reacquisition, relationship, external-identity, odometer, location/custody, and one-open-cycle conformance suite; migration/deployment evidence |
| IC-011 | `PARTIAL` | Server-side capabilities, explicit deny, location/user scope, delegation window, owner constraint, delegated amount ceiling, rollout flags | Approved field-level matrix, generalized separation of duties, cumulative exposure and anti-splitting controls, authoritative threshold records, fail-closed integration tests |
| IC-012 | `PARTIAL / STRONG` | Canonical request hashing, idempotency ledger, conflicting-reuse error, aggregate versions, atomic audit/domain-event/outbox transaction, outbox retry/dead-letter behavior | Database-backed concurrent command tests across InventoryUnit, RepairOrder, Parts, and approval; stable full response-envelope conformance; replay/reversal integration proof |
| IC-013 | `PARTIAL / MATERIAL GAP` | Existing tasks, task review behavior, manager-review service, saved views, assignment/task lifecycle foundations | One cross-domain Work Governance contract for blockers, reviews, exact-version approvals, claims, escalation, deduplication, expiry, material-change invalidation, reopening, and four-eyes evidence |
| IC-014 | `PARTIAL` | Evidence objects/links/events, SHA-256 checksum, malware fields, access level, retention date, legal hold, quarantine/deletion states, controlled outputs | End-to-end upload security, scanner/quarantine flow, correction lineage, retention/legal-hold execution, field-access tests, and domain completion/evidence-link conformance |
| IC-015 | `PARTIAL` | Feature flags with OFF/SHADOW/PILOT/GENERAL, rollout events, policy-version records, policy and administration tests | Unified effective policy inheritance/override, preview/simulation, approval/four-eyes, scheduled effective date, pilot outcome, pause/rollback, and cross-domain conformance |
| IC-016 | `PARTIAL` | Transactional outbox, domain events, projection checkpoints, retry/dead-letter status, health projection and focused tests | Ordered consumer/inbox contract, idempotent projection application, replay/rebuild tooling, checkpoint recovery, dead-letter replay, reconciliation fixtures, command-to-projection lag proof |
| IC-017 | `PARTIAL / RELEASE GAP` | Additive source-controlled migrations, valid Prisma schema, pure hardening/scale gates for backup/restore and reconciliation evidence | Approved RPO/RTO, real backup/restore drill, migration dry run/error/lineage report, rollback/roll-forward rehearsal, replay, and source-target reconciliation totals |

No slice is marked complete because each acceptance statement requires evidence beyond repository structure or focused unit tests.

## Existing foundations to reuse

- `src/server/enterprise-command/` for command, idempotency, aggregate version, audit, event, outbox, capability, rollout, and health contracts.
- `src/server/vehicle-registry/` and `src/server/inventory-unit/` for canonical identity and controlled inventory cycles.
- `src/server/repair-order/` for customer-repair versus inventory-recon work ownership.
- `src/server/parts-ledger/` for immutable quantity and custody behavior.
- `VehicleEvidenceObject`, `VehicleEvidenceLink`, and `VehicleEvidenceEvent` for evidence governance.
- Existing Task, manager-review, saved-view, administration/resilience, integration, and projection-checkpoint foundations where conformance tests prove they meet the new shared contract.

New work must extend these foundations or justify an approved ADR. It must not create parallel canonical systems.

## Verification performed

### Passed

- Prisma schema validation: passed.
- 11 focused foundation test files: 42 tests passed.
- 6 policy/resilience/review/saved-view/Vehicle 360 test files: 20 tests passed.
- Total targeted verification: 17 test files and 62 tests passed.

Coverage included command validation/hashing, capabilities, rollout, outbox retry, Vehicle/InventoryUnit, RepairOrder, Parts ledger, hardening/scale gates, administration policies/resilience, manager review, saved views, and Vehicle 360.

### Not performed or not sufficient

- No migration was applied to a database.
- No database-backed concurrency, restore, replay/rebuild, or source-target reconciliation exercise was run.
- No browser, accessibility, performance/load, security/privacy, or external-integration test was run for this assessment.
- No rollout, pilot, external request, deployment, or production action occurred.

## Dependency and authorization blockers

Before code mutation begins:

1. execute the authorized R1 order in `R0-AUTH-001` on a dedicated implementation branch;
2. implement the synthetic cross-domain conformance fixture and close demonstrated gaps;
3. keep all R1 capability rollout disabled and prohibit external calls, real-data migration, pilot, and production activation;
4. obtain separate authority before commit, push, PR, or merge if those actions are desired.

## Recommended executable order after authorization

1. IC-010 canonical Vehicle/InventoryUnit database-backed conformance.
2. IC-011 capability/authority gap closure.
3. IC-012 shared command contract integration conformance.
4. IC-013 cross-domain Work Governance contract.
5. IC-014 evidence/document lifecycle conformance.
6. IC-015 policy and rollout conformance.
7. IC-016 event/outbox/projection replay and reconciliation conformance.
8. IC-017 migration and recovery harness.
9. Run the M1 exit fixture across InventoryUnit, RepairOrder, Parts, and an approval command.

## Stop boundary

This assessment stops before application code, schema, migration, dependency, configuration, fixture, deployment, external-system, or rollout mutation. It does not authorize or begin R2.

