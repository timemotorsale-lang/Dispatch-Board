# Shop and Recon Code Foundation Implementation

**Status:** `REPOSITORY COMPLETE - DETERMINISTIC WORKFLOW READ MODEL ACTIVE`
**Contract:** `shop-recon/foundation/1.0.0`
**Projection:** `shop-recon/r9.0.0`

## Implemented boundary

The coded foundation publishes the controlled policy and now executes deterministic stage interpretation:

- sixteen ordered canonical Shop & Recon stage definitions;
- seven independent operating-state overlays;
- twelve logical zone definitions for a shared-space facility;
- Monday-Friday, 9:00 AM-6:00 PM America/Chicago operating hours;
- Saturday dealership-custody-only drop-off classification;
- two operating repair bays and baseline WIP controls;
- Brock as primary Shop/Dispatch authority and Eli as backup;
- Walter Hernandez as the primary technician and normal repair performer;
- Brock as currently identified QC authority, with independence still unresolved when Brock performs repair work;
- all-staff road-test policy with license, insurance, route and weather eligibility still unresolved;
- stage targets, alert bands and the proposed 72-staffed-hour standard Inventory Recon target;
- twenty-five stable blocker definitions;
- inbound and outbound Inventory handoff envelope requirements and non-mutating validators;
- evidence-driven mapping from the authoritative RepairOrder, RepairJob, dispatch, parts, QC and release records into the sixteen stages;
- one continuously moving vehicle card, with labeled dark-navy Inventory Recon and vivid-blue Customer Vehicle ownership lanes;
- lane-specific commitment, authorization, priority and completion-handoff intelligence with urgency represented separately;
- hard transition-gate evaluation, controlled changed-scope and QC rework loops;
- staffed-minute aging, target bands, explainable priority scoring and controlled-queue WIP checks;
- explicit activation holds for automatic physical movement and Inventory writeback.

## Repository implementation

| Area | Source |
| --- | --- |
| Foundation policy contract and validators | `src/server/shop-recon/foundation.ts` |
| Existing Shop & Recon read projection | `src/server/shop-recon/projection.ts` |
| Deterministic stage, gate, loop, priority and WIP algorithms | `src/server/shop-recon/workflow.ts` |
| Sixteen-stage checklist and form design catalog | `src/server/shop-recon/stage-workspace.ts` |
| Unified read-only vehicle-card visual workspace | `src/features/inventory/shop-recon-vehicle-card.tsx` |
| Foundation contract tests | `src/tests/unit/shop-recon-foundation.test.ts` |
| Projection conformance tests | `src/tests/unit/shop-recon-r7.test.tsx` |

The existing `/api/shop-recon` response includes the versioned `foundation`, all sixteen live stage counts, WIP status, and per-vehicle lifecycle, zone, target and priority evidence. Existing governed Shop planning, dispatch, execution, QC and release commands remain the mutation authority; no duplicate manual lifecycle field or competing mutation endpoint was added.

## Intentionally not implemented

- no database migration or new lifecycle state column;
- no mutation from the existing RepairOrder stage model to the sixteen stages;
- no automatic dispatch or routing decision;
- no physical vehicle movement command;
- no Saturday Shop clock or Shop work;
- no Inventory lifecycle writeback;
- no authority inferred for unresolved roles;
- no QC independence claim and no automatic road-test eligibility decision.

## Validation evidence

- Focused Vitest suite: 20 tests passed.
- TypeScript typecheck: passed.
- Focused ESLint validation: passed with zero warnings.

## Next implementation boundary

The next controlled slice is command-level Inventory-to-Shop acceptance/writeback. Physical movement remains a human action, and unresolved authority or road-test eligibility must remain blocked rather than inferred.
