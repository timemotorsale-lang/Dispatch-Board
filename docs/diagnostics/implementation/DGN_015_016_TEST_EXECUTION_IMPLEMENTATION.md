# DGN-015–016 Test Planning and Execution Implementation

**Status:** Implemented in source; migration not deployed; rollout disabled by default  
**Branch:** `codex/diagnostics-dgn-015-016-test-execution`  
**Date:** 2026-07-21

## Delivered Scope

This slice introduces the governed backend foundation for diagnostic test definitions, case-specific adaptive plans, and reconstructable execution history.

- `DiagnosticTestDefinitionVersion` preserves immutable procedure semantics, ontology links, vehicle applicability, qualifications, hazards, prerequisites, tools, vehicle state, branches, interpretations, required evidence, governed source versions, risk, timing, cost, checksum, effective dates, and supersession.
- `DiagnosticTestPlanVersion` and `DiagnosticTestPlanNode` preserve immutable case-specific graphs with deterministic checksums and supersession lineage.
- `DiagnosticTestExecution` is an append-only lifecycle-event stream. Start, pause, resume, complete, invalidate, repeat, and cancel actions create new revisions instead of rewriting history.
- Purpose-specific command APIs use the existing Diagnostics command ledger, optimistic concurrency, idempotency, audit, domain-event, and outbox path.
- Case projections expose plans and execution history only to users with diagnostic evidence access plus test-plan or test-execution authority.
- Vehicle Evidence can now target an existing test-execution event while future hypothesis, conclusion, and verification targets remain rejected.

## Server-Enforced Gates

- Plan graphs reject duplicate keys, missing dependencies, self-dependencies, and cycles.
- Every plan node must reference a definition in the same tenant.
- Definitions must be effective, unexpired, and applicable to the canonical vehicle year/make/model and case risk tier.
- R4 definitions are prohibited from executable case plans in this slice.
- Plan revision is blocked while a test is running or paused.
- Test start requires the active plan version, an effective definition, explicit prerequisite completion, hazard control when hazards exist, and active server-derived technician qualifications.
- Lifecycle transitions reject invalid states, stale case versions, invalid reason codes, undisclosed completion deviations, and missing executions.
- Immutable database triggers and tenant-composite foreign keys protect definition, plan, node, execution, and evidence-link lineage.

## Commands and Events

Commands implemented: `REGISTER_DIAGNOSTIC_TEST_DEFINITION`, `CREATE_DIAGNOSTIC_TEST_PLAN`, `REVISE_DIAGNOSTIC_TEST_PLAN`, `START_DIAGNOSTIC_TEST`, `PAUSE_DIAGNOSTIC_TEST`, `RESUME_DIAGNOSTIC_TEST`, `COMPLETE_DIAGNOSTIC_TEST`, `INVALIDATE_DIAGNOSTIC_TEST`, and `CANCEL_DIAGNOSTIC_TEST`.

Events cover definition registration, plan creation/revision, and test started/paused/resumed/completed/invalidated/cancelled.

## Rollout and Remaining Holds

All mutations remain under `DIAGNOSTICS_MASTER` plus `DIAGNOSTIC_EVIDENCE`; flags remain `OFF` by default. The migration is source-controlled but was not deployed by this implementation.

DGN-017 technician lab shells and mobile execution UI, DGN-018 comparison/timeline experience, and the complete DGN-019 data-quality/safety/readiness evaluator are not implemented here. This slice does not claim source ingestion, reasoning, automatic next-test selection, conclusions, repair estimates, production deployment, or technician usability evidence.

## Verification

- Prisma schema validation
- TypeScript type checking
- zero-warning lint
- focused Diagnostics verification: 9 files and 35 tests passed
- production build passed with the new definition, plan, and lifecycle routes in the route manifest
- full repository suite: 249 files passed and 2 unrelated Inventory Control Tower text-contract files failed; 1,377 of 1,379 tests passed
