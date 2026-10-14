# Diagnostics and Labor Guide Optimization Audit

Status: implemented on `codex/diagnostics-labor-guide-optimization-audit`

## Purpose

This slice audits and strengthens the operational continuity between the Diagnostics Labor Guide, the active repair order, and Advisor Review. It preserves the existing authority contracts: Labor Guide output remains explainable estimate intelligence, not permission to present, authorize, dispatch, purchase, or close work.

## Verified defects and corrections

### Active vehicle and repair-order context

- Replaced the Labor Guide's VIN-like display field with an explicit active repair-order selector.
- The selected repair order is resolved server-side from repair orders visible to the current user.
- Changing the selector reloads the Labor Guide with the chosen canonical repair-order context.
- The Active RO card continues to open the full Repair Workbench for that record.

### Labor Guide to Advisor Review continuity

- The existing `Create Advisor Draft` handoff now resolves its labor operation and repair order on the Advisor Review server page.
- Advisor Review displays the selected RO, vehicle, customer concern, labor operation, guide time, complexity, and review-only authority state.
- Missing, invalid, or inaccessible repair-order IDs are not inferred or substituted.

### Advisor Review actions

- `Review draft package` expands and collapses a concrete review summary, including verification requirements.
- `Request technician clarification` routes to the authoritative Repair Workbench when an RO is linked; otherwise it returns to Diagnostics.
- `Route to manager review` opens the existing manager-review workflow.
- All customer presentation, insurer submission, technician dispatch, and parts-order capabilities remain blocked in this review surface.

## UX and accessibility checks

- The active-RO selector has a persistent accessible name.
- Review actions are keyboard-focusable controls or links with visible focus treatment.
- New context and package panels collapse from three or two columns to a single-column mobile layout.
- Long concern and identity values wrap instead of overflowing their cards.

## Approved dual-mode UI adoption

- Adopted `docs/diagnostics/assets/enterprise-dual-labor-guide-approved-mockup.png` as the official Labor Guide Console UI mockup.
- Wired `/diagnostics/labor-guide` to open as one console with two modes: Manual Labor Guide and Labor Intelligence Engine.
- Manual mode now presents exact operation building for requested repairs such as front right lower control arm replacement and rear shock absorber replacement on both sides.
- Labor Intelligence Engine mode now provides the route-level pattern for converting plain-language repair requests into structured work-package candidates.
- Estimate and work-order actions remain draft and handoff only; no dispatch, parts order, customer authorization, or final estimate presentation is created from this screen.

## Automated verification

- TypeScript type checking.
- Labor Guide rendering and active-RO selection regression coverage.
- Advisor Review context, workbench routing, and manager-review routing coverage.
- Diagnostics-focused automated test suite and lint checks are required before handoff.

## Remaining enterprise gates

This audit does not certify labor-time accuracy. Production-grade reliance still requires licensed OEM/aftermarket datasets, VIN-level applicability, provenance and effective dates, overlap validation, shop-history sample thresholds, calibration monitoring, exception review, and acceptance testing against known repair procedures.
