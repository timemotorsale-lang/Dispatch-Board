# Autobody Estimating Implementation Blueprint

**Decision date:** 2026-10-29  
**Status:** Official branch baseline; generic/manual implementation available for owner review
**Working branch:** `codex/autobody-estimating`  
**Branch starting revision:** `26d71041d24439a115c23dc9a2bd3adc36056a8a` from `main`  
**Product owner:** Time Motor Sales  
**Primary entry:** `/diagnostics/autobody-estimate`

Build a diagram-driven estimating tool that lets staff select a vehicle, identify damaged components, choose the required operations and produce a reviewed estimate without re-entering customer, vehicle or repair-order information. Enterprise depth belongs in accurate catalogs, explainable calculations, reliable records and connected execution. The normal screen should remain brief and task-focused.

The owner approved the compact layout and adopted this package as the official implementation reference for `codex/autobody-estimating`, including detailed operation-linked diagrams, full-screen expansion, zoom/pan, panel layers and supported detail views. Actual delivery evidence is recorded in [Implementation status](IMPLEMENTATION_STATUS.md), with [source and coverage limits](SOURCE_AND_COVERAGE.md). This does not approve technical repair methods, purchase data subscriptions, or adopt the new console as the default experience. The implementation remains available for owner review before adoption.

Open `http://localhost:3000/prototype/autobody-estimate`, or use **Open diagram-driven estimating · Review new experience** from the existing console. See the [owner review walkthrough](REVIEW_WALKTHROUGH.md).

## Official document authority

The blueprint, architecture, catalog and diagram standard, and implementation roadmap listed below form the official planning baseline for this branch. Keep their decisions, scope and milestone status consistent as implementation progresses. Record material changes to the approved direction explicitly rather than silently replacing it. Planned capabilities remain labeled planned until their acceptance evidence exists.

For autobody layout, interaction and delivery sequencing, this package takes precedence over the earlier landing-page mockup and DGN-039 planning inventory where they conflict. Existing domain ownership, source rights, financial authority and repair execution rules remain in force. The detailed diagram requirements are part of the adopted scope, not optional visual polish.

## Document map

| Document | Purpose |
| --- | --- |
| [Architecture](ARCHITECTURE.md) | Domain ownership, data contracts, calculation rules, commands, security and integrations |
| [Catalog and diagram standard](CATALOG_AND_DIAGRAM_STANDARD.md) | Comprehensive operation families, vehicle coverage, visual references, source rights and content quality |
| [Implementation roadmap](IMPLEMENTATION_ROADMAP.md) | Ordered vertical slices, dependencies, review scenarios and measurable acceptance criteria |
| [Earlier capability planning](../implementation/DGN_039_AUTOBODY_ESTIMATE_CAPABILITY_PLANNING.md) | Broader diagnostic and collision capabilities retained as context |

This package supersedes the earlier autobody landing-page layout and build order where they conflict with the compact workflow. Existing vehicle, estimate, approval, procurement, execution, QC and billing authorities remain authoritative. Feature acceptance criteria here do not add a global deployment checker or change other consoles' deployment requirements.

## Original inspection baseline

The code inspection baseline is the repository state reviewed on 2026-10-29, following the Live Board release represented by main revision `26d71041d24439a115c23dc9a2bd3adc36056a8a`.

| Existing source | Actual capability | Reuse decision |
| --- | --- | --- |
| `src/features/diagnostics/autobody-estimate-console.tsx` | Static photo slots, damage labels, draft categories and links to other tools | Replace the static work area; retain the existing entry route |
| `src/features/prototype/repair-explorer/visual-repair-finder.tsx` and `visual-catalog.ts` | Generic visual selection, callouts, zoom and links to repair operations | Reuse interaction patterns and component boundaries; replace collision content and brittle label-based associations |
| `src/features/diagnostics/enterprise-labor-guide-console.tsx` | RO context, parts lookup and connected estimate presentation | Reuse shared services and document handoffs rather than duplicating the entire component |
| `src/features/prototype/repair-explorer/estimate.ts` | Browser draft, simple totals and limited positional types | Preserve existing behavior; introduce collision-specific draft contracts instead of extending every mechanical assumption |
| `src/server/diagnostics/labor-guide-domain.ts`, `labor-operation-taxonomy.ts` and `src/lib/labor-planning.ts` | Multiple catalog/planning representations with some body operations | Reconcile into stable collision operation identities and explicit labor sources |
| `src/server/shop-planning/service.ts` and existing repair/billing services | Versioned estimates, authorization and downstream repair workflows | Continue to own official records and business transitions |

Generic illustrations and internally authored planning allowances are not vehicle-specific OEM instructions or licensed commercial labor times. Existing catalog breadth does not establish complete collision coverage.

## Approved compact interaction

```mermaid
flowchart LR
  A[Find or select vehicle] --> B[Reuse active RO or compact intake]
  B --> C[Select damage area and component]
  C --> D[Choose operation and related work]
  D --> E[Review estimate]
  E --> F[Generate document through estimate service]
  F --> G[Approval and repair planning]
  G --> H[Parts and execution]
  H --> I[QC and closeout]
  I --> J[Invoice or internal cost closeout]
```

The diagram is a staff journey, not permission to skip existing stage prerequisites. A document is not approval, a draft part is not an order, and a calculated labor allowance is not elapsed technician time.

| Screen area | Default content |
| --- | --- |
| Compact context strip | Vehicle, stock/reference, RO, customer or internal recon, estimate revision and save state |
| Left area | Front, rear, left, right, roof, interior and underbody; search as an equally usable alternative |
| Main area | Large relevant diagram, damage-photo access, highlighted component and brief operation choices |
| Right area | Selected estimate lines, labor categories, parts/material amounts, pending values and running total |
| Action area | Save draft and the next meaningful action; review, generate/print or continue the RO |

The action sequence has two primary authoring states: **Build** and **Review**. They are states of one workspace, not a new multi-page intake wizard. On phones, show diagram and estimate as switchable panels while retaining context, save state and the next action. No horizontal page scrolling is required.

Selecting a component opens a brief panel with applicable choices: Repair, Replace, Remove and install, Refinish, Blend or Inspect/measure. Specialized methods appear only where supported. The estimator can inspect included work, exclusions, source, procedure links and calculation explanations in Details.

## Simplicity requirements

- Reuse customer and vehicle records. Search existing records before offering creation; keep Add new at the top of selection results.
- Preserve the selected vehicle, inventory unit, RO and return destination across entry paths. Never substitute a sample vehicle when real context fails to load.
- Allow saving incomplete drafts. Show missing prices and unsupported applicability explicitly rather than filling them with zero.
- Explain a blocked action beside its button and provide a way to resolve it. Missing optional photos, purchase references or follow-up notes do not become unrelated intake barriers.
- Keep standard additions direct: select component, choose operation, add. Show optional technical depth progressively.
- Surface the existing estimate and work history so a returning staff member can resume rather than recreate.
- Keep cycle-time, margin and capacity tools in contextual details. Estimated completion is not a promised or booked appointment.

## Product scope

Support internal dealership recon, customer-pay collision work, outside-vendor work and insurance-related estimate preparation. These share one vehicle/RO foundation but retain different payer, approval and cost treatment. An insurer's review does not replace customer repair authorization or an internal spend decision.

The comprehensive target includes all operation families and diagram levels defined in the catalog standard. The first vertical slice proves one complete bumper/fender journey; that slice is not the definition of full catalog completion.

Supervised photo suggestions, advanced structural visualization, supplier integrations and insurer interchange are later capabilities. Basic manual/diagram estimating must work without AI or a mandatory external service. Broad exact-vehicle coverage depends on obtaining and validating appropriate source data.

## Market patterns informing this design

These are product patterns, not a claim of vendor parity or permission to reuse proprietary assets.

| Public documentation | Pattern used here |
| --- | --- |
| [Mitchell Estimate Editor](https://www.mymitchell.com/tchs/helpfiles/RCW/1033/Content/40655.htm) | Parts and estimate views, running totals, estimate profiles, supplements and PDF review |
| [Mitchell Procedure Pages](https://www.mymitchell.com/tchs/helpfiles/RCW/1033/Content/40700.htm) | Estimating definitions, allowance explanations and refinish rules treated as part of the engine |
| [ALLDATA Repair Planner](https://www.alldata.com/ca/en/support/repair-planner/article/accessing-collision-info) | Applicable OEM procedures, diagrams and alerts linked to estimate lines |
| [CCC Estimating](https://www.cccis.com/insurance-carriers/apd/claims-estimating) | Parts availability/sourcing and reviewed line-level photo assistance |

Sources reviewed on 2026-10-29. The architecture, milestones and acceptance measures in this package are Time Motor Sales design decisions, not vendor specifications.

## Decisions recorded and decisions still needed

Approved: the compact three-area desktop layout, diagram-driven authoring, shared canonical records, comprehensive catalog direction, progressive technical detail and review before adoption.

Resolve during the foundation milestone: the first exact vehicle configurations, available licensed sources and entitlements, a qualified catalog/diagram reviewer, shop rate/material policies, and the people who will review the completed workflow. Do not invent licensed coverage, technical procedures, tax rates or account entitlements while those inputs are pending. Foundation work and generic navigation design can proceed independently.
