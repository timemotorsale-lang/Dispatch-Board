# DG-G7 - Cooling and Overheating Foundation Implementation

**Status:** Implemented in source; shadow/pilot evidence not yet recorded
**Branch:** `codex/diagnostics-coverage-cooling-overheating-foundation`
**Gate:** `DG-G7`

## Outcome

The first advanced Diagnostics coverage slice is implemented as a governed cooling and overheating foundation. It extends the no-start proof pattern into a new system family without claiming broad all-make coverage, production approval, high-voltage thermal authority, or vehicle-specific OEM thresholds.

## Implemented Source

- `src/server/diagnostics/cooling-overheating-knowledge.ts`
- `src/tests/unit/diagnostics-cooling-overheating-knowledge.test.ts`
- `src/server/diagnostics/index.ts`

## Coverage

The foundation includes generic, measurement-first topology for:

- coolant circulation;
- pressure control;
- temperature regulation;
- heat rejection;
- cooling fan command and response;
- sensor feedback;
- coolant leaks;
- flow restriction;
- airflow deficits;
- pressure cap or sealing faults;
- combustion-gas intrusion;
- post-repair cooling verification.

## Initial Test Seed

The initial shadow-ready test definitions are:

- `COOL_PRESSURE_INTEGRITY`;
- `COOL_THERMAL_PROFILE`;
- `COOL_FAN_COMMAND_RESPONSE`;
- `COOL_COMBUSTION_GAS_SCREEN`;
- `COOL_POST_REPAIR_VERIFICATION`.

Each definition is safety-gated, source-bound, checksum-bound, and blocked from interpretation as universal vehicle-specific procedure data.

## Authority Boundary

This slice does not authorize:

- opening hot pressurized systems without confirmed safe state;
- high-voltage battery or powertrain thermal-management diagnosis;
- proprietary vehicle-specific pressure or temperature thresholds without licensed source rights;
- customer-facing conclusions;
- repair authorization;
- production rollout;
- AI activation.

## Verification

Focused tests verify:

- the governed knowledge package and checksum;
- the five initial test definitions;
- source-rights fail-closed behavior;
- independent review before shadow release;
- explicit high-voltage thermal-management exclusion.
