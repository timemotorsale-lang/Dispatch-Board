# Inventory Console Approved Visual Conformance

**Status:** Implemented and verified in the `codex/inventory-console-approved-visual-conformance` delivery slice  
**Implemented:** 2026-07-19  
**Governing source:** [`INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md`](INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md)

## Purpose

This slice reproduces the adopted Inventory Console images as binding desktop screen specifications. They are not inspiration or reference points. Each image governs the visible page hierarchy, section order, control placement, panel structure, operational density, and navigation emphasis. Illustrative mockup values are the sole exception: every displayed value comes from an authoritative projection or is shown explicitly as unavailable.

## Implemented conformance matrix

| Surface | Route | Implemented visual contract |
| --- | --- | --- |
| Inventory Console Home | `/vehicles` | Adopted operations header and filter placement, six enterprise KPI positions, two equal seven-stage workspace flows, six-field Priority Work table with My Work/Team/Exceptions views, governed Reviews & Approvals queue with direct contextual actions, Flow Health, throughput, and integration health |
| Inventory Lifecycle | `/vehicles/inventory` | Adopted V2 filters and commands, six KPI positions, seven lifecycle stage cards, Priority Work with My Work/Team/Exceptions categories and the complete nine-column execution table, Reviews & Approvals categories with contextual actions, velocity, bottleneck, and aging panels |
| Inventory Lifecycle Control Tower | `/vehicles/control-tower` | Adopted twelve-step Retail Inventory, eight-step Shop / Recon, and eleven-step Repair Parts flow map; seven-field exception and capacity structures; capital-and-aging portfolio; and full-height selected-asset execution rail with constraint, next action, execution history, coaching-health boundary, linked work, audit, and governed actions |
| Shop & Recon | `/vehicles/shop-recon` | Adopted seven-column production board and seven-KPI band; technician Capacity & Assignment structure; categorized Blocker Center; categorized Reviews & Approvals execution table; current-snapshot throughput; Parts Operations readiness; and three-tier at-risk completion |
| Parts Operations | `/vehicles/parts-operations` | Approved local tabs, six-filter command bar, seven KPIs, nine milestones, categorized Parts Work Queue with the full vehicle/sourcing/reservation/owner/blocker fact set, separate Reviews and Approvals execution tables, five supporting operations panels, and a truthful non-executing recommendation explanation |
| Disposition & Wholesale | `/vehicles/disposition-wholesale` | Approved local tabs, six-filter command bar, seven KPIs, eight milestones, categorized Recommendation Workbench with its complete evidence and decision facts, separate Reviews and Approvals execution tables, governed tab-level command surfaces, four supporting decision panels, and an advisory explanation boundary |

## Truth and safety rules

- Mockup counts, names, dates, vehicles, trend percentages, and charts are never treated as production facts.
- No implementation-only banner, shortcut row, filter, panel, or alternate composition may be inserted into an adopted desktop page unless the source-of-truth image and document are first versioned and approved.
- Derived values are labeled according to their actual meaning. For example, Inventory Lifecycle uses a target-date compliance proxy rather than claiming a configured SLA source.
- Unsupported history or recommendation evidence is displayed as unavailable instead of being fabricated.
- Existing server-side authorization, exact-version approval, workflow, reconciliation, and audit boundaries remain unchanged.
- Recommendations remain advisory and non-executing.
- Responsive layouts collapse at enterprise tablet and mobile breakpoints without removing primary actions or decision boundaries.

## Regression protection

`src/tests/unit/inventory-approved-visual-conformance.test.ts` protects the approved image assets, required panel contracts, shared dense-layout primitives, and responsive breakpoints. Existing domain tests continue to protect the real projections and workflow rules behind each surface.

Material changes to these compositions still require product approval and a versioned update to the governing image and source-of-truth document.
