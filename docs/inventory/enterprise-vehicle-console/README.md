# Enterprise Vehicle Console Foundation

**Branch:** `inventory-vehicle-console`  
**Program:** Inventory / Vehicle Operations strengthening  
**Status:** Planning foundation only. No production behavior, integration, data migration, or operational rollout is authorized by these documents.  
**Primary intent:** Strengthen the existing Inventory / Vehicles section into a practical enterprise-grade vehicle operating console, inspired by DealerCenter daily usability and Reynolds-style connected data discipline.

## Why this package exists

Time Motor Sales does not need a separate DMS product inside Dispatch Board as the first move. The safer path is to strengthen the existing vehicle and inventory foundations into an independent-enough console that staff can run daily without duplicating customer, task, shop, document, sales, or reporting systems.

The design goal is:

- simple staff execution at the screen level;
- deep enterprise controls underneath;
- one canonical vehicle truth;
- reusable shared tasks, documents, approvals, appointments, shop, CRM, and reporting;
- clear fallback and recovery if a workflow, provider, or projection fails.

## Benchmarks and inspiration

These are inspiration points, not feature-parity claims:

- DealerCenter: fast inventory entry, vehicle detail management, photos, booking, listing, import, and mobile-friendly inventory operations. See DealerCenter inventory overview and support topics: <https://get.dealercenter.com/inventory/> and <https://support.dealercenter.net/hc/en-us/sections/201074865-Inventory-Management-Merchandising->.
- Reynolds and Reynolds: connected retail management discipline, where customer, vehicle, and transaction data share consistent identifiers and reduce rekeying. See Reynolds Retail Management System overview: <https://www.reyrey.com/solutions/retail-management-system>.

Dispatch Board should borrow the operating lessons, not copy vendor screens.

## Relationship to existing inventory documentation

This package sits on top of the existing inventory program, especially:

- [`../INVENTORY_ENTERPRISE_ARCHITECTURE.md`](../INVENTORY_ENTERPRISE_ARCHITECTURE.md)
- [`../INVENTORY_CONSOLE_IMPLEMENTATION_ROADMAP.md`](../INVENTORY_CONSOLE_IMPLEMENTATION_ROADMAP.md)
- [`../INVENTORY_START_WORKFLOW_ADD_VEHICLE_UI_SOURCE_OF_TRUTH.md`](../INVENTORY_START_WORKFLOW_ADD_VEHICLE_UI_SOURCE_OF_TRUTH.md)
- [`../VEHICLE_REGISTRY_IMPLEMENTATION.md`](../VEHICLE_REGISTRY_IMPLEMENTATION.md)
- [`../governance/README.md`](../governance/README.md)

If this package conflicts with already approved governance, vehicle identity, safety, title, financial authority, or privacy rules, the stricter approved source wins.

## Documents

| Document | Purpose |
| --- | --- |
| [`PRODUCT_ARCHITECTURE.md`](PRODUCT_ARCHITECTURE.md) | Product boundary, domain architecture, source-of-truth principles, resilience posture, and console topology. |
| [`WORKFLOWS_AND_BUSINESS_LOGIC.md`](WORKFLOWS_AND_BUSINESS_LOGIC.md) | Staff workflows, decision rules, stage gates, and simple execution logic. |
| [`ROADMAP_AND_MILESTONES.md`](ROADMAP_AND_MILESTONES.md) | Phased build plan, milestone IDs, pilot sequence, and acceptance gates. |

## Operating promise

The Enterprise Vehicle Console should answer four staff questions quickly:

1. What vehicle is this?
2. Who owns the next action?
3. What is blocking it from moving forward?
4. What should we do now?

The backend must answer four enterprise questions reliably:

1. Which record is authoritative?
2. Who changed what, when, and under what authority?
3. Which workflow state is proven by evidence?
4. Can we recover, replay, reconcile, and explain the outcome?

## First recommended build target

The first implementation target should be:

**Enterprise Add Vehicle + Vehicle Master Console Foundation**

This should not attempt to build a complete DMS. It should establish:

- duplicate-safe vehicle creation and lookup;
- VIN/manual identity handling;
- vehicle master/detail page;
- inventory intake path;
- document/photo intake;
- assignment/task handoff;
- vehicle timeline;
- readiness/blocker model;
- clear boundaries to shop, sales, CRM, documents, tasks, and reports.

