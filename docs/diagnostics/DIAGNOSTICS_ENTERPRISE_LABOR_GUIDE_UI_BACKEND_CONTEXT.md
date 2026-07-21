# Enterprise Labor Guide UI Backend Context

**Status:** Adopted planning context for implementation  
**Date adopted:** 2026-07-21  
**Branch:** `codex/diagnostics-dgn-038-039-labor-guide-ui-planning`  
**Applies to:** Release 3, `DGN-038` selectable estimate strategy direction, `DGN-039` Enterprise Labor Guide Module, and downstream DVI-to-estimate conversion planning.

## Product Intent

The Enterprise Labor Guide must not feel like a separate labor-guide lookup tool.

In the target experience, the labor guide is the intelligence layer underneath the Estimate Builder. The advisor should not manually select year/make/model, look up book time, remember labor rates, calculate overlap, query parts, and then copy those values into an estimate.

The system should use the active Repair Order, VIN, DVI findings, diagnostic conclusions, labor intelligence, parts availability, margin safeguards, and shop rules to prepare a governed estimate draft quickly.

The advisor's role changes from manual builder to governed reviewer and approver.

## Core Operating Model

The landing page mockup represents two closely related workflows:

1. **Labor operation lookup from an active RO**
   - Advisor opens or searches for a labor operation while the RO, vehicle, VIN, trim, engine, complaint, and diagnostic case context are already known.
   - The Labor Guide Intelligence Engine calculates labor time, rate, overlap, complexity, skill/tool/bay requirements, and GP safeguards.
   - The advisor can create or revise a Diagnostic Estimate Draft.

2. **DVI finding conversion into an estimate draft**
   - Technician records a red/yellow DVI finding with notes, media, severity, and recommended action.
   - The system maps the finding to one or more standard job templates.
   - The advisor reviews the generated job block and applies it to the estimate draft.

Both workflows must feel fast and nearly one-click, but they remain governed. The system may propose and draft; it must not silently authorize, dispatch, order parts, or promise completion.

## Required Backend Responsibilities by UI Area

| UI Area | Backend Responsibility | Must Capture |
| --- | --- | --- |
| VIN / YMM Search | Resolve vehicle identity from active RO, VIN, decoded attributes, engine, trim, and diagnostic case context. | VIN source, decode version, confidence, fallback reason. |
| System / Operation Navigator | Provide searchable labor operation hierarchy by system, component, and operation. | Catalog source, version, vehicle applicability, selected operation ID. |
| Vehicle Diagram Placeholder | Provide safe visual context without embedding unlicensed OEM diagram data. | Diagram source, licensing status, selected component mapping. |
| OEM Time | Read licensed or authorized OEM/warranty labor time when available. | Source, version, units, applicability, effective date. |
| Aftermarket Guide | Read aftermarket guide time when available. | Provider, version, labor operation mapping, confidence. |
| Shop Historical Actuals | Calculate confidence-weighted shop actual time from prior completed jobs. | Sample size, date range, vehicle/engine match level, technician class, outlier handling. |
| Three-Tier Complexity | Classify labor operation as low, medium, or high complexity. | Rule version, factors, selected tier, confidence. |
| Overlap / Teardown Logic | Detect shared teardown steps across selected or proposed jobs and calculate overlap adjustment. | Dependency graph version, applied deduction, affected jobs, explanation. |
| Required Skill / Tool / Bay | Determine technician skill level, primary tools, special tools, bay type, and lift needs. | Requirement source, rule version, missing-resource warnings. |
| Dynamic Labor Rate | Apply labor matrix, asset class adjustment, short-duration bump, specialty multipliers, and shop policy floors. | Base rate, adjustment rules, final rate, policy version. |
| Estimated Labor GP | Calculate expected labor gross profit from labor amount, technician cost assumptions, and shop target. | GP target, cost basis, assumptions, warnings, override status. |
| Advisor Estimate Draft | Create draft-only estimate lines for advisor review. | Draft version, line lineage, originating finding/operation, source calculations. |
| Manager Review | Trigger review when margin, override, complexity, or authority policy requires it. | Trigger reason, threshold, reviewer, decision, timestamp. |
| Compare Models | Compare selectable estimate strategies without changing the official customer estimate automatically. | Strategy IDs, inputs, outputs, selected strategy, user decision. |
| View History | Show prior changes, calculations, overrides, and conversions. | Immutable audit events and actor lineage. |

## DVI-to-Estimate Conversion Flow

The target advisor journey is:

```text
Customer concern / technician DVI finding
-> Advisor clicks Auto-Convert or Add Line Item on active RO
-> System passes VIN, RO, complaint, finding, media, and diagnostic context to labor intelligence
-> Labor intelligence maps the finding to job template(s)
-> Labor, parts, overlap, rate, skill, bay, and GP calculations run
-> Advisor reviews a generated job block
-> Advisor applies it to Diagnostic Estimate Draft
-> Existing estimate, authorization, parts, dispatch, and repair-job authorities handle downstream actions
```

### Conversion Inputs

The backend should accept these inputs when available:

- active repair order ID;
- diagnostic case ID;
- service visit ID;
- vehicle ID and VIN;
- decoded year/make/model/engine/trim;
- customer concern;
- technician DVI finding ID;
- finding severity: red, yellow, green, monitor, urgent;
- technician notes;
- photo/video evidence references;
- recommended action text;
- selected system/component;
- known diagnostic conclusion or suspected cause;
- selected estimate strategy;
- shop policy version.

### Conversion Outputs

The conversion engine may return:

- proposed job container;
- mapped labor operations;
- selected labor hours;
- alternate labor-hour sources;
- overlap adjustments;
- parts demand candidates;
- required skill/tool/bay requirements;
- dynamic labor rate;
- labor and job GP projections;
- warning flags;
- manager-review requirement;
- explanation and audit trail;
- draft estimate lines.

## One-Click Does Not Mean Uncontrolled

The phrase "one-click estimate" means one-click preparation of a governed estimate draft, not one-click execution of every downstream business action.

The system may:

- convert a DVI finding into a proposed job block;
- query labor intelligence;
- query parts candidates;
- calculate overlap and labor matrix rates;
- create or update a Diagnostic Estimate Draft;
- flag margin, policy, or confidence concerns;
- prepare role-specific views for advisor, manager, parts, and technician review.

The system must not automatically:

- present the estimate to the customer;
- request customer authorization;
- authorize work;
- create final repair jobs;
- order, reserve, or commit parts;
- assign or dispatch a technician;
- schedule shop capacity;
- promise completion time;
- suppress warnings or override manager gates.

Those actions remain owned by their existing Dispatch Board authorities and approval workflows.

## Estimate Strategy Model

The backend should support selectable estimate strategies, including but not limited to:

- conservative/customer-friendly estimate;
- target-margin estimate;
- premium/top-tier repair recommendation;
- shop-historical actuals weighted estimate;
- manager-approved custom strategy.

Each strategy must produce explainable outputs from the same governed input set. Strategy comparison must be visible to the advisor or manager before selection.

## Parts Query Integration

Parts lookup should run asynchronously after a proposed job is created or converted.

The estimate draft may show placeholders such as "querying" while vendor responses are pending, but it must preserve the difference between:

- candidate part;
- selected part;
- quoted part;
- reserved part;
- ordered part.

Only the authorized parts workflow may reserve or order inventory.

## Required Audit and Explainability

Every generated line must be traceable.

The audit trail must record:

- originating user action;
- originating DVI finding, diagnostic conclusion, or labor operation;
- source data and source versions;
- selected estimate strategy;
- calculation inputs;
- calculation outputs;
- overlap deductions;
- dynamic rate rules;
- GP assumptions;
- warnings and gates;
- manager overrides;
- draft version changes;
- downstream handoff events.

## Implementation Acceptance Rules

Backend implementation is not complete until it can prove:

1. The advisor can create a draft without manually re-entering VIN/YMM context.
2. A DVI red/yellow finding can be mapped to a proposed job template.
3. Labor hours are source-attributed and versioned.
4. Dynamic labor rate calculations are explainable.
5. Overlap deductions are explicit and reversible.
6. GP safeguards are visible and auditable.
7. Parts queries do not equal parts orders.
8. Estimate drafts do not equal customer-presented estimates.
9. Manager-review gates are enforced by policy.
10. All generated estimate lines retain lineage back to diagnostic evidence or labor operation selection.

