# Phase 7 - Brake, HVAC, and Misfire Proof/Readiness Implementation

**Status:** Implemented in source; simulation and shadow readiness only, not live execution  
**Branch:** `codex/diagnostics-phase-7-brake-hvac-misfire-proof-readiness`  
**Gate:** `DG-G8` candidate coverage group

## Outcome

This grouped Phase 7 slice adds the proof and next-test readiness layer for the brake, HVAC, and misfire/drivability foundations.

The implementation creates a shared mechanical-family proof corpus and a shared shadow next-test readiness bridge. Proof scenarios are training/simulation-only, readiness output is shadow-only, and no test execution, repair authorization, pilot approval, customer-facing conclusion, or production authority is granted.

## Implemented Source

- `src/server/diagnostics/phase-7-mechanical-proof.ts`
- `src/server/diagnostics/phase-7-mechanical-next-test-readiness.ts`
- `src/server/diagnostics/index.ts`
- `src/tests/unit/diagnostics-phase-7-mechanical-proof-readiness.test.ts`

## Coverage

The proof corpus includes fifteen deterministic scenarios across all three families:

- brake normal, measurement, misleading-code, unsafe, and no-fault-found cases;
- HVAC normal, measurement, misleading-code, unsafe/excluded-authority, and degraded-source cases;
- misfire/drivability normal, measurement, misleading-code, unsafe, and no-fault-found cases.

The readiness bridge adds shadow-only adaptive next-test recommendations for:

- brake friction/hardware, runout, and hydraulic pressure checks;
- HVAC temperature/pressure, airflow command response, and heater comparison checks;
- misfire scan context, ignition contribution, and mechanical contribution checks.

## Authority Boundary

This grouped slice does not authorize:

- live diagnostic test execution;
- road tests;
- ABS/stability programming;
- electronic parking-brake service-mode execution;
- refrigerant service or high-voltage thermal-management diagnosis;
- fuel-system opening;
- emissions certification decisions;
- module programming;
- teardown, repair authorization, dispatch, customer-facing conclusions, controlled pilot, production rollout, or AI activation.

## Verification

Focused tests verify:

- deterministic replay over all fifteen proof scenarios;
- coverage across brake, HVAC, and misfire families;
- code-only/scan-only evidence cannot override direct measurement evidence;
- next-test readiness remains shadow-only;
- source rights, prerequisites, hazards, and proof escalation fail closed.
