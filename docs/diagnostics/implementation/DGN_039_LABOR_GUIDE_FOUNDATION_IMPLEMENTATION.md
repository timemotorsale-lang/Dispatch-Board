# DGN-039 — Labor Guide Foundation Implementation

**Status:** Implemented in source  
**Branch:** `codex/diagnostics-dgn-039-labor-guide-foundation`  
**Date:** 2026-07-21  
**Scope:** Unified mechanical and autobody Labor Guide foundation, internally authored seed catalog, repair-domain taxonomy, operation-type taxonomy, source lineage, advisory-only recommendations, and DGN-038 strategy-engine integration.

## Implemented Source

- `src/server/diagnostics/labor-guide-domain.ts`
- `src/server/diagnostics/estimate-strategy-engine.ts`
- `src/tests/unit/diagnostics-labor-guide-domain.test.ts`
- `src/tests/unit/diagnostics-estimate-strategy-engine.test.ts`

## What DGN-039 Adds

DGN-039 establishes the first runtime Labor Guide foundation for Release 3.

It defines:

- repair domains: `MECHANICAL` and `AUTOBODY`;
- operation types for mechanical repair, body repair, body replace, refinish, blend, R&I, R&R, section, frame/structural, ADAS calibration, scan, materials, and sublet planning;
- low/medium/high labor complexity tiers;
- labor source classes;
- internally authored mechanical and autobody seed operations;
- included and excluded work;
- duration ranges;
- required skills, certifications, tools, and bay/resource needs;
- safety notes;
- verification expectations;
- source/version metadata;
- review rules;
- advisory-only authority boundary.

## DGN-038 Integration

The estimate strategy engine now evaluates DGN-039 labor guide recommendations before producing selected strategy outputs.

Strategy outputs now include:

- labor guide recommendations;
- labor guide result checksum;
- labor guide explanation codes;
- labor guide warning codes;
- matched catalog operation keys when available.

This gives `STANDARD_SHOP_MODEL`, `THREE_TIER_LABOR_GUIDE_MODEL`, and `ELITE_ENTERPRISE_MODEL` a shared governed labor-intelligence foundation without turning Diagnostics into the official customer estimate authority.

## Seed Catalog Coverage

The initial seed catalog is intentionally limited and internally authored.

It includes representative foundation operations for:

- alternator replacement;
- front brake pads and rotors;
- front bumper cover replacement;
- tri-coat refinish and blend planning;
- ADAS pre/post scan and calibration gate.

These are not licensed third-party labor-guide records. They are controlled internal seed records used to establish the domain contract and prove the architecture.

## Authority Boundary

DGN-039 recommendations are advisory only.

The Labor Guide foundation may:

- classify operation domain and type;
- recommend labor duration range;
- assign complexity tier;
- expose skill/tool/bay requirements;
- flag autobody supplement and safety review;
- feed estimate strategy comparison;
- preserve source/version lineage.

It must not:

- present a customer estimate;
- submit an insurance estimate;
- authorize repairs;
- order or reserve parts;
- dispatch technicians;
- schedule work;
- promise completion;
- close QC or release a vehicle.

## Deferred Scope

DGN-039 does not yet implement:

- database persistence for full labor catalog administration;
- licensed labor-guide ingestion;
- external body estimating system integration;
- optical damage analysis runtime;
- 3D frame measurement runtime;
- paint/material pricing engine;
- parts sourcing/GP curves;
- capacity scheduling;
- customer/insurance explanation package.

Those remain assigned to DGN-040 through DGN-044 and later dedicated autobody intelligence work.

## Verification

Implemented tests verify that:

- mechanical operations match governed internal catalog entries;
- autobody operations match governed internal catalog entries;
- autobody recommendations flag supplement review;
- recommendations preserve advisory-only, no-parts-mutation, and no-dispatch-mutation boundaries;
- DGN-038 strategy outputs include DGN-039 labor guide recommendations and checksums.

