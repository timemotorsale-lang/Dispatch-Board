# DGN-038 — Estimate Strategy Engine Implementation

**Status:** Implemented in source  
**Branch:** `codex/diagnostics-dgn-038-estimate-strategy-engine`  
**Date:** 2026-07-21  
**Scope:** Selectable estimate strategy registry, deterministic strategy evaluation, advisor comparison outputs, checksums, and authority boundaries.

## Implemented Source

- `src/server/diagnostics/estimate-strategy-engine.ts`
- `src/server/diagnostics/service.ts`
- `src/tests/unit/diagnostics-estimate-strategy-engine.test.ts`

## What DGN-038 Adds

DGN-038 implements the first runtime layer of Release 3 estimate intelligence above the DGN-035-037 advisor estimate draft contract.

It adds a deterministic strategy engine that can evaluate and compare:

- `STANDARD_SHOP_MODEL`
- `THREE_TIER_LABOR_GUIDE_MODEL`
- `ELITE_ENTERPRISE_MODEL`

The engine returns:

- selected strategy output;
- all compared strategy outputs;
- model registry metadata;
- line-level draft output;
- labor/parts/fee totals;
- labor complexity explanation codes;
- warning and review codes;
- output checksums;
- comparison deltas against a baseline;
- explicit advisory-only authority boundary.

## Service Integration

When an advisor estimate draft is created from a published repair handoff and no custom draft lines are provided, the advisor estimate service now uses the selected strategy engine output to generate the draft lines.

The stored command data includes the strategy evaluation result so the draft can be traced back to:

- selected strategy;
- compared strategies;
- model versions;
- strategy result checksum;
- draft checksum;
- conclusion checksum;
- repair handoff checksum.

## Authority Boundary

DGN-038 does not create a new estimating authority.

The strategy engine may produce advisor-reviewable draft lines and comparison outputs only. It must not:

- present a customer estimate;
- request authorization;
- create repair jobs;
- order or reserve parts;
- dispatch technicians;
- schedule work;
- promise completion;
- mutate official Repair Estimate records.

Those boundaries remain enforced by the DGN-035-037 advisor estimate foundation and downstream Dispatch Board authorities.

## Deferred Scope

DGN-038 intentionally does not implement:

- the full DGN-039 Enterprise Labor Guide catalog;
- licensed labor-source ingestion;
- parts sourcing or GP curves;
- capacity scheduling;
- customer explanation package;
- repair execution handoff from approved estimates.

Those remain assigned to DGN-039 through DGN-044.

## Verification

Implemented tests verify that:

- all three adopted strategies can be compared;
- selected strategy output is checksum-bound;
- strategy outputs preserve advisory-only boundaries;
- manager/complexity review codes appear for the elite/high-complexity path;
- generated draft lines remain tied to source repair operations.

