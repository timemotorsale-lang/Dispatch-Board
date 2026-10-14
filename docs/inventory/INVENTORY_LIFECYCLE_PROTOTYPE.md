# Inventory Lifecycle Prototype

**Status:** Active isolated prototype
**Prototype route:** `/vehicles/inventory/prototype`
**Started:** August 2, 2026
**Production adoption:** Not approved

## Purpose

This prototype is the controlled design and interaction environment for the proposed complete Inventory Lifecycle workflow.

It preserves one vehicle-centered workspace across these stages:

1. Acquisition
2. Transportation
3. Receiving
4. Intake
5. Inspection
6. Initial Quality Control
7. Work Order
8. Recon and Repair
9. Final Quality Control
10. Detailing
11. Photos and Marketing
12. Title Readiness
13. Selling
14. Sale Titling
15. Filing
16. Post-Sale

## Isolation boundary

The prototype currently:

- uses a clearly identified sample vehicle;
- stores checklist progress only in React screen state;
- makes no API request;
- performs no database write;
- does not mutate a Vehicle, InventoryUnit, location, custody record, repair order, evidence item, or authoritative lifecycle workflow;
- labels every handoff as a simulation;
- links back to the existing Inventory Lifecycle.

The existing `/vehicles/inventory` workflow remains authoritative and unchanged by prototype interactions.

## Current capability

- persistent vehicle identity and operating facts;
- all 16 lifecycle stages visible in one journey;
- stage selection without changing vehicle context;
- six required actions for every stage;
- action owner, completion test, and evidence requirement;
- stage owner, deadline, blocker policy, and handoff gate;
- local-only action completion and progress;
- handoff simulation enabled only after all stage actions are complete;
- responsive desktop, tablet, and mobile layouts.

## Acquisition and TAI prototype slice

The Acquisition stage now contains the first **TMS Acquisition Intelligence (TAI)** buyer workflow. It remains local-only and uses an illustrative vehicle and sample inputs.

The slice demonstrates:

- retail-back purchase-ceiling calculation from expected retail, target gross, fees, transport, recon, title/document cost, holding reserve, and risk reserve;
- a transparent 100-point acquisition score across demand, unit economics, inventory fit, market position, and condition risk;
- confidence kept separate from the score;
- identity, seller-authority, title, and condition blockers that override an attractive score;
- explainable `Buy`, `Buy up to`, `Manager review`, `Watch`, `Pass`, and `Hold` recommendations;
- exact-evaluation manager approval;
- accepted purchase recording at or below the approved ceiling;
- automatic completion of the six Acquisition checklist controls from TAI evidence and workflow state; and
- release of the simulated lifecycle handoff only after the purchase is recorded.

Changing a material TAI input invalidates the local evaluation, approval, and commitment so the buyer must run and approve a new version. This models the intended authoritative behavior without creating production records.

## Expansion policy

The approved shell is preserved while stage detail is added one stage at a time.

The first expansion will be Transportation. It will introduce a conditional drivability decision and a focused transport detail form without replacing the lifecycle workspace.

No prototype behavior becomes authoritative production behavior without explicit review, approval, server-side authority design, persistence design, audit behavior, tests, and a separate adoption decision.
