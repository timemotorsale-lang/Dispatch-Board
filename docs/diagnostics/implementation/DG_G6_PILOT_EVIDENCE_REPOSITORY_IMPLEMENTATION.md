# DG-G6 - Pilot Evidence Repository Implementation

**Status:** Implemented in source; real operational evidence still must be recorded
**Branch:** `codex/diagnostics-dg-g6-pilot-evidence-repository`
**Gate:** `DG-G6`

## Outcome

The Release 4 acceptance dashboard now reads through an explicit pilot evidence repository contract instead of constructing a local blocked placeholder. The repository supports append-style snapshot recording, checksum binding, latest-snapshot reads, and carries the evidence needed by the existing controlled-pilot gate.

This does not approve a pilot. An empty repository still produces a held gate result, and production remains permanently prohibited by the Release 4 gate.

## Implemented Source

- `src/server/diagnostics/release-4-pilot-evidence-repository.ts`
- `src/app/(app)/diagnostics/pilot-readiness/page.tsx`
- `src/features/diagnostics/release-4-acceptance-dashboard.tsx`
- `src/tests/unit/diagnostics-release-4-pilot-readiness-domain.test.ts`

## Evidence Contract

Each pilot evidence snapshot records:

- operational readiness result and checksum;
- review/approval result and checksum;
- representative replay result, metrics, and checksum;
- runtime workflow acceptance evidence;
- role training evidence;
- monitoring plan evidence;
- rollback plan evidence;
- pause-control evidence;
- multi-role signatures;
- risk dispositions;
- repository checksum.

Every evidence record must include a reference, reviewer, timestamp, checksum, and substantive note before it can satisfy a `DG-G6` row.

The default repository remains empty until a durable database-backed adapter is attached. Tests and local callers can use the in-memory repository harness to record and read snapshots through the same contract.

## Authority Boundary

The repository can feed dashboard readiness and controlled-pilot eligibility only. It cannot authorize production, customer-facing automation, AI activation, parts ordering, dispatch scheduling, insurer submission, final labor time, or estimate mutation.

## Verification

Focused Release 4 tests now verify:

- the dashboard remains held when the evidence repository is empty;
- complete repository evidence can produce controlled-pilot eligibility;
- manager access is required to read pilot readiness;
- production remains prohibited by the underlying gate.
