# Phase 7 - Brake, HVAC, and Misfire Foundations Implementation

**Status:** Implemented in source; shadow foundations only, not live execution  
**Branch:** `codex/diagnostics-phase-7-brake-hvac-misfire-foundations`  
**Gate:** `DG-G8` candidate coverage group

## Outcome

This grouped Phase 7 slice starts the next three advanced diagnostic coverage families after cooling/overheating:

- brake noise, pulsation, and hydraulic concerns;
- HVAC performance;
- misfire and drivability.

The implementation follows the cooling foundation pattern: governed generic topology, explicit source-rights requirements, safety-first rules, and initial measurement-first test definitions. It does not create scenario proof corpora, shadow next-test readiness, technician review UI, durable persistence, pilot approval, or production authority.

## Implemented Source

- `src/server/diagnostics/phase-7-mechanical-foundations.ts`
- `src/server/diagnostics/index.ts`
- `src/tests/unit/diagnostics-phase-7-mechanical-foundations.test.ts`

## Coverage

The slice creates three governed knowledge packages:

1. `BRAKE_NOISE_PULSATION_HYDRAULIC_FOUNDATION`
2. `HVAC_PERFORMANCE_FOUNDATION`
3. `MISFIRE_DRIVABILITY_FOUNDATION`

It also creates twelve initial test definitions:

- brake friction and hardware inspection;
- brake rotor runout measurement;
- brake hydraulic pressure integrity;
- controlled brake road-test screen;
- HVAC temperature and pressure profile;
- HVAC airflow and command response;
- HVAC heater performance comparison;
- HVAC control scan review;
- misfire scan context review;
- misfire ignition contribution check;
- misfire fuel/air data review;
- misfire mechanical contribution comparison.

## Authority Boundary

This grouped slice does not authorize:

- road tests;
- ABS/stability programming;
- electronic parking-brake service-mode execution;
- refrigerant recovery, evacuation, recharge, or leak repair;
- high-voltage thermal-management diagnosis;
- fuel-system opening;
- emissions certification decisions;
- module programming;
- teardown, repair authorization, dispatch, customer-facing conclusions, controlled pilot, production rollout, or AI activation.

## Verification

Focused tests verify:

- all three knowledge packages are created with governed checksums;
- all twelve initial test definitions are created;
- source rights fail closed;
- independent review is required before shadow release;
- brake, HVAC, and misfire hazards remain explicit.
