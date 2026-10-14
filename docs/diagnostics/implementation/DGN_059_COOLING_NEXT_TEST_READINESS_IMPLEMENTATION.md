# DGN-059 - Cooling and Overheating Next-Test Readiness Implementation

**Status:** Implemented in source; shadow-only recommendation layer, not live execution  
**Branch:** `codex/diagnostics-dgn-059-cooling-next-test-readiness`  
**Gate:** `DG-G7`

## Outcome

`DGN-059` connects the DGN-058 cooling/overheating proof output to the existing adaptive-testing pattern. The new layer can translate a cooling proof result into a governed, shadow-only next-test readiness recommendation while preserving every hard gate for safety, source rights, qualification, capability, vehicle state, and tools.

## Implemented Source

- `src/server/diagnostics/cooling-overheating-next-test-readiness.ts`
- `src/server/diagnostics/index.ts`
- `src/tests/unit/diagnostics-cooling-overheating-next-test-readiness.test.ts`

## Governed Behavior

The readiness adapter:

- uses DGN-058 proof output as the reasoning input;
- emits only shadow recommendations;
- sets `liveExecutionAuthorized` to `false`;
- blocks unsafe, no-fault-found, and source-unavailable cases from becoming executable next tests;
- ranks eligible cooling tests through the existing DGN-024/DGN-025 adaptive-testing engine;
- preserves checksums for replay and review.

## Candidate Test Coverage

The adapter can consider:

- cooling pressure integrity;
- cooling thermal profile;
- cooling fan command and response;
- combustion-gas screen.

The post-repair verification test remains outside this slice because DGN-059 does not create repair authorization or repair completion state.

## Authority Boundary

This slice does not authorize:

- live vehicle test execution;
- technician dispatch;
- customer-facing recommendations;
- repair estimates or repair authorization;
- high-voltage thermal-management workflows;
- licensed vehicle-specific pressure, temperature, bleed, fan-command, or service-procedure interpretation;
- controlled pilot or production activation.

## Verification

Focused tests verify:

- coolant-loss proof recommends pressure-integrity testing only in shadow mode;
- misleading-code cases stay measurement-first;
- missing source rights or safe access fail closed;
- unsafe and no-fault-found proof outputs do not become next-test recommendations.
