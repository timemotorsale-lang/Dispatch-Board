# DGN-058 - Cooling and Overheating Scenario Replay Implementation

**Status:** Implemented in source; simulation-only proof corpus, not pilot approval  
**Branch:** `codex/diagnostics-dgn-058-cooling-overheating-scenarios`  
**Gate:** `DG-G7`

## Outcome

`DGN-058` adds the first replay/proof layer for the advanced cooling and overheating coverage slice. It gives the diagnostics engine a deterministic, checksum-bound simulation corpus before any live case execution, customer-facing conclusion, or production/pilot authority is granted.

This extends the existing no-start proof pattern into cooling-system concerns while preserving the same authority boundary: evidence can support, abstain, escalate, or return no-fault-found, but a trouble code or weak association cannot override direct cooling evidence.

## Implemented Source

- `src/server/diagnostics/cooling-overheating-proof.ts`
- `src/server/diagnostics/index.ts`
- `src/tests/unit/diagnostics-cooling-overheating-proof.test.ts`

## Scenario Families

The proof corpus covers nine training-only families:

1. normal supported cooling conclusion;
2. coolant leak;
3. flow restriction;
4. fan-control or airflow deficit;
5. combustion-gas intrusion;
6. misleading code or scan association;
7. unsafe hot/pressurized/moving-component condition;
8. degraded source or incomplete evaluation;
9. no-fault-found when the concern is not reproduced and no qualified evidence exists.

## Deterministic Replay Controls

The runner enforces:

- `trainingOnly` isolation for every scenario;
- duplicate scenario ID rejection;
- stable family coverage reporting;
- expected-result and actual-result checksums;
- full corpus and run checksums;
- deterministic second-run comparison in unit coverage.

## Safety and Authority Boundary

This slice does not authorize:

- live vehicle execution;
- opening hot pressurized systems without confirmed safe state;
- high-voltage thermal-management diagnosis;
- vehicle-specific pressure, temperature, bleed, fan-command, or service-procedure thresholds without licensed applicable sources;
- customer-facing conclusions;
- repair recommendations or repair authorization;
- controlled pilot, production rollout, or AI activation.

Unsafe cooling conditions escalate with `SAFETY_HOT_PRESSURIZED_SYSTEM_STOP`. High-voltage thermal-management inputs escalate with `DG_G7_HIGH_VOLTAGE_THERMAL_ESCALATION_REQUIRED`.

## Verification

Focused tests verify:

- all nine scenario families pass deterministically;
- misleading scan/code association cannot override direct cooling evidence;
- unsafe and high-voltage thermal cases escalate;
- non-training scenarios are rejected from the proof runner.
