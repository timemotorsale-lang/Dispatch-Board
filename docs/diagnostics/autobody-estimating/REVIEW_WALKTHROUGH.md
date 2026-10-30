# Autobody Estimating Owner Review

The implementation is on `codex/autobody-estimating`. It is a separate local review experience. No push, merge, deployment or default adoption is included.

## Open the tool

- New workspace: `http://localhost:3000/prototype/autobody-estimate`
- Existing console and review entry: `http://localhost:3000/diagnostics/autobody-estimate`
- Keep an actual RO: `http://localhost:3000/prototype/autobody-estimate?repairOrderId=<actual RO ID>`

Sign in with your normal local account. Search authorized existing vehicles/ROs. The top links retain canonical Add Vehicle and check-in paths. An unlinked draft is saved before navigating to intake; its return link carries the saved scope. After check-in, the tool verifies the actual vehicle/RO and restores that scope into a new RO draft while preserving the original. If no vehicle had been identified, applicability must be reviewed against the newly selected vehicle. Existing RO estimates remain visible before adding work.

Saving or generating through this local tool changes local business records. Synthetic automated tests use a separate restored verification database; their customer approvals, clocks and receipts are not real business activity.

## Author and review

1. Select a vehicle area or catalog family, then a component through the diagram or text list. Left/right refer to vehicle orientation.
2. Expand the assembly; zoom, pan, reset and inspect separate relationship layers. All current artwork is original generic navigation, not exact-model assembly or repair instructions.
3. Choose an operation. Enter the reviewed hours and scope/applicability. Prices and technical references remain pending until supplied; no published labor time is inserted.
4. Open Parts/materials/technical details only when needed. Search stored parts or add a real quote. A candidate part is not ordered. Confirm fitment and selling price separately from stored cost.
5. Use Review to confirm tax treatment, category rates, scope and totals. Tax is an explicit staff-reviewed decision, including zero. Administrator rate changes need an explanation. Shared access requires an explicit group, deduction and reason; conflicting repair/replacement or refinish/blend choices are explained.
6. Save and reopen the shared draft. The address retains its `draftId` for bookmarking. If another staff member saved first, reload and compare rather than overwrite. An uncertain save retries the same command. Browser recovery restores unsaved work; changed shared versions recover into a separate review draft.
7. Generate the exact reviewed revision once. Open the frozen estimate to print or save PDF. Generation does not authorize repairs, order parts, issue an invoice or post inventory costs.
8. Continue to existing authorization/planning, parts procurement, repair workbench, QC, billing/internal costs and saved documents with the same RO.

On phones, **Areas**, **Work & diagram**, and **Totals & next steps** switch compact panels while context and save actions remain available.

## Outside work

Use the repair workbench to record vendor scope, approval, progress, pickup and actual return. For quoted collision vendor lines, open **Outside work · review returned repair** in the new workspace after generation. Select returned work and the exact authorized lines, record the completion/invoice reference and actual inspection evidence, and confirm fit/finish and applicable safety/road-test requirements.

Acceptance is an attributable vendor-return record, not invented internal repair time. After verifying keys and resolving exceptions, authorize release. Existing billing uses a native customer invoice or an internal-cost package according to the RO. Actual costs and payments still use their established authorities.

## Supplements and evidence

Open the current issued draft and choose **Start supplement**. Explain changed scope, compare the earlier estimate and retain all quoted work that should remain before generating its replacement revision. Earlier documents and decisions stay preserved; changed scope needs exact-version authorization. For existing mixed mechanical/body charges, the existing official estimate/charge editor remains available rather than converting unknown mechanical lines into collision operations.

Saved revision comparison names added, changed and removed operations and compares known totals. Optional original photos use the private vehicle evidence library and a staff-selected retention date. Missing photos never prevent draft saving. Internal JSON review export preserves source/calculation context; it is not an insurer or proprietary-provider interchange format.

## Decisions still required

Owner review has not occurred and adoption has not been recorded. Exact-vehicle procedures, attachment/joining/measurement diagrams, commercial labor times, supplier entitlements and qualified content review require actual permitted sources and reviewer decisions. The release must not be represented as an OEM-verified catalog.

For reversible adoption later, change the entry/default only after owner approval. Returning to the current console leaves durable drafts and official documents intact. Do not roll back the additive tables or delete evidence to hide the review entry.

## Vehicle groups and nested components

1. Open the estimating review and choose **Vehicle diagrams & components** at the top, or open `/prototype/autobody-estimate?illustration=vehicle-groups`.
2. From the dropdown, choose a vehicle group to open its estimating category, then choose one of its five views. Select a visible panel; this does not add a charge or change the RO vehicle.
3. Open **Explore [panel] components**. Use the branch summaries or separated-part cards to reach smaller components. For a door, try glass/window mechanism → regulator → motor; for a sliding door, try sliding mechanism → optional power drive → motor/cable.
4. Use the component-path buttons to return to an assembly. Search for clips, seals or connectors; no-match means uncataloged, not absent.
5. Choose **Show selected component operations**. Confirm the exact side, serviceability, applicable source and manual time before adding/quoting work. Review included scope if both the assembly and a child are quoted.

The illustrative catalog is not an exhaustive OEM parts list. Default adoption and licensed/qualified technical-content acceptance remain separate decisions.

The header now has one **Vehicle diagrams & components** entry. It opens a compact dropdown grouped into passenger/light-duty and commercial vehicles. Choosing a group immediately opens that category without a separate confirmation. Within Sedan, **Sedan illustration** offers General sedan or the original 2025 Toyota Camry SE exterior study. The separate Camry header button has been removed. Selection does not replace the RO vehicle or alter saved estimate lines.

## Double-click a panel

Click once to select/highlight; double-click to open only that panel and its component breakdown. For example, double-click a fender to see its outer panel, liner, brackets/fasteners, arch molding and seals. Select a subcomponent, then choose **Show selected component operations** to continue estimating. **Back to vehicle diagram** restores the exterior view. Keyboard and touch users can select a panel and use **Open selected panel components** instead. Drilling into a panel never adds or approves a repair line automatically.

## Review recognizable part illustrations

Double-click a door, then open **Interior trim & equipment**. The trim panel, switches, speaker and hardware now have distinct original physical-form illustrations. Choose the speaker or another individual part for an enlarged view. **Show part names** can hide printed captions for visual review; accessible names and selection remain available. Use the same component path and operations handoff as before. These remain generic identification illustrations requiring actual-vehicle fitment/serviceability review.
