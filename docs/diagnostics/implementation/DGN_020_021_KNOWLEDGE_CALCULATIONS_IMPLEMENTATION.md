# DGN-020–021 — No-Start Knowledge and Engineering Calculations

**Status:** Implemented in source; migration not deployed; no vehicle-specific knowledge activated  
**Date:** 2026-07-21  
**Gate contribution:** `DG-G3` foundation; gate remains open

## Delivered boundary

This slice implements the governed knowledge and calculation foundation required before hypothesis reasoning. It does not claim that the complete no-start diagnostic engine exists.

### DGN-020 — knowledge and graph seed

- Added tenant-scoped, append-only `DiagnosticKnowledgeSourceVersion`, `DiagnosticRuleSetVersion`, and `DiagnosticRuleSetSourceLink` persistence.
- Added source class, rights state, release state, effective/expiry/withdrawal time, checksum, independent technical/rights review, supersession, citation, and rollback-predecessor lineage.
- Added database checks for authorized-source review separation, rule-set review separation, withdrawal completeness, checksums, effective windows, tenant integrity, and immutable history.
- Added deterministic knowledge normalization, checksums, bounded graph traversal, source/applicability validation, execution eligibility, and fail-closed abstention after expiry or withdrawal.
- Added the first generic starting/charging/no-start graph across system, function, component, path, failure-mode, test, verification, and security-escalation nodes.
- Added four governed DGN-015-compatible test-definition payloads: loaded source voltage, loaded path voltage drop, starter current/speed, and post-repair charging/recurrence verification.
- Kept all test interpretations dependent on applicable vehicle-specific limits. The package contains no universal pass/fail thresholds, OEM procedures, security bypass, or DTC-to-part rule.

The seed can become `SHADOW` or `ACTIVE` only when its source is authorized and independent reviews are supplied. DGN-004 `HOLD` entries for OEM procedures, wiring, DTC meaning, adapters, and reference waveforms remain holds.

### DGN-021 — engineering calculation library

Added a deterministic versioned library for:

- explicit unit construction and conversion;
- Ohm's-law voltage/current/resistance;
- electrical power and energy;
- series and parallel resistance;
- Kirchhoff voltage and current balance;
- loaded voltage drop, loss percentage, and inferred path resistance;
- tolerance ranges and comparisons;
- elapsed time;
- rotational speed, ratio, and power/speed/torque relationships.

The library rejects non-finite values, invalid dimensions/units, impossible negative resistance/time, zero divisors, loaded voltage greater than its declared source without another source, and invalid event ordering. Calculations return typed quantities rather than unlabelled numbers.

## Verification evidence

- Prisma schema validation passes.
- DGN-020–021 focused tests pass, including independent review, deterministic checksum, citations, traversal, source hold, source withdrawal/abstention, active applicability, rollback schema, reference calculations, boundaries, reversible properties, wrong dimensions, unit conversion, precision, and impossible cases.
- TypeScript validation passes.
- Zero-warning lint passes.

## Explicitly not delivered

- No external or licensed content ingestion.
- No knowledge-administration service or Procedure Authoring Studio; those are now carried forward under DGN-045–046.
- No database deployment, production seed activation, or rollout enablement.
- No hypotheses, conflict sets, causal evaluation, next-test ranking, conclusion, repair handoff, or verification execution; those begin with DGN-022.
- No assertion of all-make, vehicle-specific, or production diagnostic coverage.

## Exit disposition

DGN-020 and DGN-021 are complete in source. `DG-G3` remains open until DGN-022–027 produce and validate the bounded deterministic no-start reasoning experience.
