# DG-G8 - Advanced Family Readiness Gate Implementation

**Status:** Implemented in source; readiness review only, not pilot approval  
**Branch:** `codex/diagnostics-dg-g8-advanced-family-readiness-gate`  
**Gate:** `DG-G8`

## Outcome

`DG-G8` adds a grouped advanced-family readiness gate that evaluates the cooling/overheating evidence package together with the Phase 7 brake, HVAC, and misfire/drivability evidence package.

The gate can mark the grouped evidence ready for advanced pilot review only when both evidence packages are ready, licensed-source activation is recorded, runtime workflow acceptance is complete, role training is complete, monitoring/rollback/pause controls are documented, at least two acceptance signatures are present, and open risks are owned and disposed.

This is not controlled-pilot approval. It is a readiness review gate that keeps all advanced diagnostic families shadow-only until a separate approved pilot decision exists.

## Implemented Source

- `src/server/diagnostics/advanced-family-readiness-gate.ts`
- `src/features/diagnostics/advanced-family-readiness-gate-card.tsx`
- `src/server/diagnostics/index.ts`
- `src/tests/unit/diagnostics-advanced-family-readiness-gate.test.tsx`

## Coverage

The gate evaluates:

- cooling/overheating pilot-evidence package readiness;
- brake/HVAC/misfire pilot-evidence package readiness;
- licensed-source activation;
- runtime workflow acceptance;
- role training;
- monitoring, rollback, and pause controls;
- acceptance signatures;
- unresolved risk disposition;
- production prohibition.

The review card summarizes:

- cooling acknowledgements;
- Phase 7 mechanical acknowledgements;
- mechanical family coverage;
- total evidence records;
- dashboard item status;
- gate checksum.

## Authority Boundary

`DG-G8` does not authorize:

- advanced pilot activation;
- live diagnostic test execution;
- dispatch;
- repair approval;
- customer presentation;
- production rollout;
- AI activation.

The gate explicitly reports that readiness for review is not pilot approval.

## Verification

Focused tests verify:

- ready cooling plus Phase 7 mechanical evidence can become `READY_FOR_ADVANCED_PILOT_REVIEW` while pilot authority remains false;
- shadow expansion readiness keeps operational authority locked;
- incomplete mechanical evidence fails closed;
- production requests are prohibited;
- the review card renders the DG-G8 boundary.
