# DGN-035–037 — Advisor Estimate Foundation Implementation

**Status:** Implemented in source  
**Branch:** `codex/diagnostics-dgn-035-037-advisor-estimate-foundation`  
**Date:** 2026-07-21  
**Scope:** Release 3 pilot-readiness controls, advisor review foundation, and diagnostic estimate draft contract.

## What This Implements

This slice adds an advisor-reviewable estimate foundation inside Diagnostics without creating a second customer estimate system.

Diagnostics can now create an immutable **Diagnostic Estimate Draft** from a confirmed diagnostic conclusion and published repair-diagnosis handoff. The draft is designed for advisor review and handoff into the existing Repair Estimate authority.

## Authority Boundary

The new draft record is advisory only.

It does not:

- present a customer estimate;
- authorize customer work;
- create repair jobs;
- order or reserve parts;
- assign technicians;
- schedule appointments;
- create customer promises;
- replace `RepairEstimateVersion`.

The existing Repair Order estimate, authorization, parts, dispatch, job, and customer-lifecycle authorities remain authoritative.

## Implemented Components

- `DiagnosticEstimateDraftVersion` immutable schema and migration.
- Advisor estimate domain policy `DGN-035-037/POLICY/1.0.0`.
- Selectable initial strategy keys:
  - `STANDARD_SHOP_MODEL`
  - `THREE_TIER_LABOR_GUIDE_MODEL`
  - `ELITE_ENTERPRISE_MODEL`
- Standard draft-line builder from diagnostic repair operations.
- Server controls requiring:
  - confirmed conclusion;
  - published diagnosis handoff;
  - case in handed-off/verification/closed diagnostic state;
  - customer-safe concern/cause/correction language;
  - draft estimate lines;
  - future expiry;
  - tax and authority boundary disclosure.
- Repository persistence with exact conclusion/handoff checksum lineage.
- Case workspace advisor estimate panel.
- API route for recording advisor estimate drafts.
- Capability `DIAGNOSTIC_ESTIMATE_ADVISOR_REVIEW`.

## Persistence and Lineage

Each draft records:

- diagnostic case;
- repair order;
- concern version;
- conclusion version and checksum;
- repair handoff version and checksum;
- published repair diagnosis version;
- selected strategy;
- advisor summary;
- customer-safe concern/cause/correction text;
- assumptions and not-included boundaries;
- draft lines;
- totals before final tax authority;
- estimate authority boundary;
- draft checksum;
- command/control checksum;
- author and supersession lineage.

## Remaining Holds

- DGN-038 selectable strategy engine is not yet implemented.
- DGN-039 Enterprise Labor Guide catalog is not yet implemented.
- DGN-040 parts/GP curve mapping is not yet implemented.
- DGN-041 labor economics and bump logic is not yet implemented.
- DGN-042 capacity/dispatch impact is not yet implemented.
- DGN-043 customer explanation/heat-risk package is not yet implemented beyond basic customer-safe text fields.
- DGN-044 execution handoff gate is not yet implemented.
- The draft is not production-active until migrations are deployed and rollout/acceptance gates are approved.

## Validation

- Focused domain, service, and schema tests cover advisor-estimate controls, standard draft-line generation, fail-closed missing handoff behavior, and migration/schema contract.
- Prisma schema validation passes after adding the immutable draft model.
