# DGN-040–041 — Parts Demand and Labor Economics Implementation

**Status:** Implemented in source  
**Branch:** `codex/diagnostics-dgn-040-041-parts-labor-economics`  
**Date:** 2026-07-21  
**Scope:** Parts demand candidate mapping, GP curve pricing guidance, labor economics, short-job minimum/bump logic, paint/material visibility, margin and manager-review safeguards, and DGN-038/DGN-039 strategy integration.

## Implemented Source

- `src/server/diagnostics/parts-labor-economics-domain.ts`
- `src/server/diagnostics/estimate-strategy-engine.ts`
- `src/server/diagnostics/labor-guide-domain.ts`
- `src/tests/unit/diagnostics-parts-labor-economics-domain.test.ts`
- `src/tests/unit/diagnostics-estimate-strategy-engine.test.ts`
- `src/tests/unit/diagnostics-labor-guide-domain.test.ts`

## What DGN-040 Adds

DGN-040 implements advisory parts demand candidates.

It defines:

- part classes: OEM, aftermarket, recycled/LKQ, remanufactured, clip/fastener, material, sublet, and review-required;
- fitment confidence;
- pricing status;
- estimated cost;
- recommended sell price using target GP policy;
- warning codes for pending pricing, substitute review, and class review;
- demand-signal-only authority boundary.

The parts layer does not order, reserve, substitute, receive, or mutate inventory. It only prepares controlled demand signals for the existing Parts authority.

## What DGN-041 Adds

DGN-041 implements visible labor economics and margin-protection logic.

It defines:

- base labor rate;
- effective labor rate;
- guide minutes;
- billable minutes;
- minimum labor application;
- short-job bump;
- tier multiplier;
- autobody safety/refinish multiplier;
- visible paint/material charge;
- target labor GP;
- warnings and manager-review codes.

The economics layer is intentionally explainable. It does not silently reprice customer-facing estimates.

## Strategy Engine Integration

The DGN-038 estimate strategy engine now includes DGN-040–041 output in selected and compared strategy outputs.

Strategy output now carries:

- part demand candidates;
- parts/labor economics checksum;
- material charge total;
- economics warning codes;
- economics manager-review codes.

The tiered and elite strategy paths may use effective labor rates from the economics layer, but the output remains a draft-only recommendation.

## Authority Boundary

DGN-040–041 may:

- recommend demand-signal parts;
- estimate sell-price guidance from placeholder cost and GP policy;
- apply visible labor minimums and short-job bump logic;
- surface paint/material charges;
- flag manager review;
- feed strategy comparison.

It must not:

- order parts;
- reserve parts;
- substitute parts;
- mutate inventory;
- create or present an official customer estimate;
- request authorization;
- dispatch technicians;
- schedule work;
- hide pricing changes after customer presentation.

## Deferred Scope

DGN-040–041 does not yet implement:

- live vendor parts lookup;
- real-time inventory availability;
- official Repair Estimate mutation;
- tax finalization;
- capacity scheduling;
- customer/insurance explanation;
- release handoff.

Those remain assigned to DGN-042 through DGN-044 and downstream authority systems.

## Verification

Implemented tests verify that:

- parts candidates remain demand-signal-only;
- GP curve pricing creates recommended sell guidance from placeholder cost;
- short jobs apply visible minimum labor and bump warnings;
- autobody refinish operations create visible material economics;
- manager-review safeguards appear for high-risk economics;
- estimate strategy outputs include parts/labor economics checksums and demand boundaries.

