# Inventory Console Interaction Audit

**Audit date:** July 20, 2026  
**Scope:** Inventory Console navigation, workspace tabs, contextual links, primary actions, and intentionally unavailable controls.

## Interaction contract

Every visible control in the Inventory Console must do one of three things:

1. Open the workspace named by the control.
2. Open that workspace with the selected vehicle, repair order, workflow, case, or queue still in context.
3. Remain visibly disabled and explain why the capability is unavailable.

A route that opens but silently drops the selected record is treated as a failed interaction.

## Verified primary routes

The Inventory Console sidebar routes are backed by implemented pages:

- Home: `/vehicles`
- Inventory Lifecycle: `/vehicles/inventory`
- Shop & Recon: `/vehicles/shop-recon`
- Reviews: `/manager-review?scope=inventory&view=reviews`
- Approvals: `/manager-review?scope=inventory&view=approvals`
- Reports: `/reports?scope=inventory`
- Administration: `/settings/vehicle-operations`

The primary connected workspaces—including Control Tower, Vehicle Registry, Acquisition & Appraisal, Inventory-to-Frontline, Repair Orders, Shop Planning, Quality Control, Parts Operations, Retail Completion, Disposition & Wholesale, and Workflow Launcher—also have implemented route targets.

## Corrections made

- Shop & Recon blocker tabs now apply their selected category and expose the active tab accessibly.
- Repair Workbench is now a first-class Inventory Console tab at `/vehicles/repair-workbench`. Its searchable directory opens the selected authoritative repair order, and Shop & Recon cards, blockers, review rows, and completed check-in links use this canonical path.
- Repair-order workbench tabs now all land on real sections. Diagnosis has an honest empty state, and Timeline is present even before downstream work begins.
- Control Tower priority links preserve the selected inventory unit.
- Vehicle Registry, Acquisition, Inventory-to-Frontline, Quality Control, Retail Completion, and Disposition links now open the selected authoritative record rather than the first item in the queue.
- Add Vehicle now routes newly created vehicle identities to Vehicle Registry, avoiding a false InventoryUnit lookup before an inventory unit exists.
- Inventory-recon handoff now opens Repair Order intake with `INVENTORY_RECON` selected.
- Repair-order-specific Parts links preserve the repair order while users move between Parts tabs.
- The Inventory Console `Export` link was relabeled `Reports & Exports` because it opens the governed reporting surface rather than immediately downloading a file.
- Shop & Recon Saved Views remains disabled and now states that the capability is not activated.

## Intentionally unavailable controls

Saved views, direct exports, inactive filters, external adapters, and commands without the required workflow context remain disabled where the backend capability is not active. These controls must not be represented as live production actions until their server-side contract, permission checks, and audit behavior exist.

## Verification

- TypeScript typecheck passes.
- Focused unit tests cover the repaired Shop & Recon blocker navigation, Repair Order tabs, Parts repair-order context, and affected inventory workspaces.
- The in-app browser was unable to access the local development origin because the browser client blocked localhost. Browser-level click verification should be rerun in an environment where the local origin is permitted.
- The broader focused test run retains one pre-existing Inventory Control Tower copy assertion failure unrelated to these interaction changes; the changed interaction tests pass after correction.

## Ongoing rule

New Inventory Console controls should include a route-level test or component interaction assertion proving both destination and context preservation. Disabled controls should include a concise availability explanation.
