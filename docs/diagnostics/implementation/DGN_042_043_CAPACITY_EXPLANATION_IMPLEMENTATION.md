# DGN-042–043 — Capacity Impact and Explanation Package Implementation

**Status:** Implemented in source  
**Branch:** `codex/diagnostics-dgn-042-043-capacity-explanation`  
**Date:** 2026-07-21  
**Scope:** Capacity/dispatch impact projection, skill/tool/bay/certification requirements, cycle-time risk, customer/advisor/insurance draft explanation packages, and DGN-038 strategy-engine integration.

## Implemented Source

- `src/server/diagnostics/capacity-explanation-domain.ts`
- `src/server/diagnostics/estimate-strategy-engine.ts`
- `src/tests/unit/diagnostics-capacity-explanation-domain.test.ts`
- `src/tests/unit/diagnostics-estimate-strategy-engine.test.ts`

## What DGN-042 Adds

DGN-042 implements advisory capacity and dispatch impact modeling.

It produces:

- total billable minutes;
- projected elapsed hours;
- cycle-time days;
- required skills;
- required certifications;
- required tools;
- required bays/resources;
- blocker codes;
- feasibility codes;
- low/medium/high capacity risk.

Capacity output is advisory only. It does not book appointments, assign technicians, reserve bays, schedule paint booths, promise completion, or mutate dispatch.

## What DGN-043 Adds

DGN-043 implements draft explanation packages.

It produces role/audience-specific packages for:

- customer review;
- internal advisor review;
- insurance review when autobody/collision work is present.

Each package includes:

- concern;
- cause;
- correction;
- consequence;
- verification;
- not-included boundaries;
- edit-required flag;
- explanation codes;
- draft-only authority boundary.

The explanation package is not customer-presented or insurer-submitted by Diagnostics. It remains editable and governed by downstream estimate, authorization, and communication authorities.

## Strategy Engine Integration

The DGN-038 estimate strategy engine now includes DGN-042–043 output in selected and compared strategy outputs.

Strategy output now carries:

- capacity/explanation checksum;
- capacity risk;
- cycle-time days;
- explanation packages;
- capacity warning codes;
- capacity manager-review codes.

## Authority Boundary

DGN-042–043 may:

- project capacity impact;
- list skill/tool/bay/resource needs;
- identify capacity blockers;
- create editable explanation drafts;
- create insurance-quality draft language for autobody cases;
- feed strategy comparison.

It must not:

- dispatch technicians;
- schedule appointments;
- reserve resources;
- promise completion;
- present customer estimates;
- submit insurer estimates;
- request customer authorization;
- alter price or authorization status.

## Deferred Scope

DGN-042–043 does not yet implement:

- live technician calendars;
- real capacity scheduling;
- appointment booking;
- customer messaging;
- insurer submission;
- formal handoff into repair execution authorities.

Those remain assigned to DGN-044 and downstream systems.

## Verification

Implemented tests verify that:

- mechanical capacity projection remains advisory only;
- required skills/resources are exposed;
- autobody safety/calibration work produces insurance draft explanation;
- explanation packages are draft-only and block insurer/customer submission;
- strategy outputs include capacity/explanation checksum, cycle time, capacity risk, and explanation packages.

