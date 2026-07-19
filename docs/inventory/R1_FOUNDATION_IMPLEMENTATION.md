# Inventory Console R1 Foundation Conformance Implementation

**Release / milestone:** R1 / M1
**Slices:** IC-010 through IC-017
**Implemented:** 2026-07-18
**Branch:** `codex/inventory-console-r1-foundation-implementation`
**Repository result:** `COMPLETE — SYNTHETIC CONFORMANCE EXIT PASSED`
**Activation:** OFF/SHADOW only; no deployment, external integration, pilot, or production authorization

## Outcome

R1 now has one deterministic conformance harness over the existing canonical Vehicle, InventoryUnit, RepairOrder, Parts ledger, enterprise command, work-governance, evidence, policy/rollout, event/projection, and recovery foundations. It verifies the M1 exit fixture across an InventoryUnit, customer and inventory-recon RepairOrders, Parts quantity/custody, and an exact-version approval without creating parallel domain systems.

## Implemented contracts

| Slice | Implemented conformance evidence |
| --- | --- |
| IC-010 | Canonical IDs/VINs/external identities, one open InventoryUnit cycle, reacquisition cycles, financial-acquisition evidence, explicit odometer corrections, customer-repair separation, and Parts quantity/custody reconciliation |
| IC-011 | Location/role/field scope, explicit-deny precedence, active delegation, amount ceiling, cumulative anti-splitting, and four-eyes checks |
| IC-012 | Canonical request hashes, identical replay stability, conflicting-reuse rejection, expected-version advancement, correlated audit/event/outbox evidence, and four-domain command coverage |
| IC-013 | Active-work deduplication, owner/due coverage, actionable blockers, exact-version approvals, material-revision invalidation, separation of duties, and reopen lineage |
| IC-014 | SHA-256 integrity, access classification, malware fail-closed behavior, quarantine, retention, legal-hold deletion protection, and correction lineage |
| IC-015 | Unique effective policy versions, valid windows, approval-before-activation, preview fingerprints, inheritance references, and OFF/SHADOW development rollout |
| IC-016 | Unique ordered events, bounded checkpoints, owned dead letters, deterministic rebuild fingerprints, and clean reconciliation |
| IC-017 | Migration dry-run, lineage, backup/restore RPO/RTO and totals, replay, rollback, and roll-forward evidence gates |

## Files

- `src/server/inventory-console-foundation/conformance.ts` — eight fail-closed conformance evaluators and combined report.
- `src/server/inventory-console-foundation/fixture.ts` — fixed synthetic cross-domain exit fixture.
- `src/server/inventory-console-foundation/index.ts` — stable module boundary.
- `src/tests/unit/inventory-console-r1-conformance.test.ts` — passing exit and targeted failure behavior.

## Verification

- Prisma schema validation: passed.
- R1 fixed fixture and failure paths: 9 tests passed.
- Combined R1 foundation regression: 18 test files and 71 tests passed.
- Repository lint: passed with zero warnings.
- TypeScript typecheck: passed.
- Full repository suite: 202 of 203 test files passed; 1,148 of 1,149 tests passed.
- Known unrelated failure: `appointment-admin-settings-service.test.ts` expects `nextEffectiveDateIso` `2026-07-14`, while the current-date runtime returns `2026-07-21`. No Appointment code was changed in this branch.
- Diff whitespace and documentation links: validated separately at handoff.

## Capability truth

- Repository conformance harness: implemented and verified.
- Existing canonical foundations: reused; not reimplemented.
- Schema/migrations: unchanged by this slice; existing additive migrations remain source-controlled.
- Database migration deployment: not performed.
- Production-like concurrency/restore/replay drill: not performed; the repository gate consumes synthetic evidence.
- External systems and credentials: not used.
- Rollout/pilot/production: not activated or authorized.
- Git publication: no commit, push, PR, or merge performed by this implementation.

## R1 exit

The bounded repository-level M1 exit required by [`R0-AUTH-001`](r0-readiness/R0_CODE_AUTHORIZATION_RESOLUTION.md) passes. R2 implementation may begin from a baseline containing this change after review and merge.

Operational deployment, real-system integration, pilot, and production release remain governed by their later gates and cannot use this synthetic result as production evidence.

## Wave 6 evidence amendment — 2026-07-18

IC-014 is now repository-complete. Wave 6 verifies the existing evidence service end to end for signature scanning, fail-closed quarantine, restricted capability enforcement, clean-only download, access events, retention/legal hold, integrity, and immutable lineage. This is repository evidence only and does not substitute for production security, privacy, recovery, or pilot review.
