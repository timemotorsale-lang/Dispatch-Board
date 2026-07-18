# Inventory Console Implementation Program

**Product:** Time Motor Sales Dispatch Board  
**Version:** 1.0 planning baseline  
**Date:** 2026-07-18  
**Status:** R0 resolved for bounded repository implementation; pilot and production activation remain unauthorized

## 1. Program documents

| Document | Governs |
| --- | --- |
| [`INVENTORY_CONSOLE_IMPLEMENTATION_ROADMAP.md`](INVENTORY_CONSOLE_IMPLEMENTATION_ROADMAP.md) | Outcomes, scope, release train, dependencies, rollout, success, and stop conditions |
| [`INVENTORY_CONSOLE_IMPLEMENTATION_ARCHITECTURE.md`](INVENTORY_CONSOLE_IMPLEMENTATION_ARCHITECTURE.md) | Domain ownership, command/event/read architecture, integrations, security, reliability, and deployment boundaries |
| [`INVENTORY_CONSOLE_IMPLEMENTATION_MILESTONES.md`](INVENTORY_CONSOLE_IMPLEMENTATION_MILESTONES.md) | 121 planned vertical slices, acceptance evidence, critical path, gates, and first implementation batch |
| [`INVENTORY_CONSOLE_IMPLEMENTATION_EXECUTION_PROTOCOL.md`](INVENTORY_CONSOLE_IMPLEMENTATION_EXECUTION_PROTOCOL.md) | Reusable order language, authority boundaries, engineering requirements, slice loop, definition of done, and reporting format |
| [`r0-readiness/README.md`](r0-readiness/README.md) | R0/M0 evidence for IC-000 through IC-005, open decisions, sign-off gates, and the M1 code-authorization boundary |
| [`r0-readiness/R0_CODE_AUTHORIZATION_RESOLUTION.md`](r0-readiness/R0_CODE_AUTHORIZATION_RESOLUTION.md) | Binding bounded authorization for dependency-ordered R1–R3 repository implementation with synthetic fixtures and rollout disabled |
| [`r1-foundation-conformance/README.md`](r1-foundation-conformance/README.md) | Read-only IC-010 through IC-017 repository conformance evidence, reusable foundations, gaps, verification, and authorization blockers |
| [`R1_FOUNDATION_IMPLEMENTATION.md`](R1_FOUNDATION_IMPLEMENTATION.md) | Implemented IC-010 through IC-017 conformance harness, fixed cross-domain fixture, verification, capability truth, and repository exit evidence |
| [`r2-shell-home/README.md`](r2-shell-home/README.md) | Read-only IC-020 through IC-028 shell/Home conformance evidence, source-of-truth mismatches, reusable capabilities, gaps, and dependency blockers |
| [`R2_SHELL_HOME_IMPLEMENTATION.md`](R2_SHELL_HOME_IMPLEMENTATION.md) | Implemented IC-020 through IC-028 shell/Home routes, live and unavailable-state contracts, launcher, system views, tests, and repository exit evidence |
| [`R3_LIFECYCLE_CONTROL_TOWER_IMPLEMENTATION.md`](R3_LIFECYCLE_CONTROL_TOWER_IMPLEMENTATION.md) | Implemented InventoryUnit-backed IC-030 through IC-039 lifecycle landing, Control Tower, context transitions, fixed-fixture reconciliation, honest dependent-source boundaries, and remaining pilot gates |
| [`R4_ACQUISITION_APPRAISAL_IMPLEMENTATION.md`](R4_ACQUISITION_APPRAISAL_IMPLEMENTATION.md) | Implemented pre-control IC-040 through IC-048 Acquisition Case workflow, evidence/appraisal/recommendation/authorization boundaries, atomic InventoryUnit creation, internal handoff, tests, and remaining deployment/integration gates |

These documents form one coordinated execution contract. A change to domain ownership, release order, approval boundary, external authority, or activation gate must update all affected documents.

## 2. Approved experience sources

| Area | Source |
| --- | --- |
| Console Home, Inventory Lifecycle, Shop & Recon, Wholesale, Parts, navigation | [`INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md`](INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md) |
| Detailed Inventory Lifecycle Control Tower | [`INVENTORY_CONSOLE_UI_SOURCE_OF_TRUTH.md`](INVENTORY_CONSOLE_UI_SOURCE_OF_TRUTH.md) and [`INVENTORY_LIFECYCLE_CONTROL_TOWER_CONTRACT.md`](INVENTORY_LIFECYCLE_CONTROL_TOWER_CONTRACT.md) |
| Workflow Launcher | [`INVENTORY_CONSOLE_WORKFLOW_LAUNCHER_UX_CONTRACT.md`](INVENTORY_CONSOLE_WORKFLOW_LAUNCHER_UX_CONTRACT.md) |
| Inventory Lifecycle planning | [`INVENTORY_LIFECYCLE_WORKSPACE_IMPLEMENTATION_PLAN.md`](INVENTORY_LIFECYCLE_WORKSPACE_IMPLEMENTATION_PLAN.md) |
| Acquisition & Appraisal | [`INVENTORY_LIFECYCLE_ACQUISITION_APPRAISAL_WORKFLOW_AND_ALGORITHM_CATALOG.md`](INVENTORY_LIFECYCLE_ACQUISITION_APPRAISAL_WORKFLOW_AND_ALGORITHM_CATALOG.md) |
| Inventory-to-Frontline | [`frontline-workflow/README.md`](frontline-workflow/README.md) and its nine decision catalogs |
| R5 Inventory-to-Frontline repository implementation | [`R5_INVENTORY_TO_FRONTLINE_IMPLEMENTATION.md`](R5_INVENTORY_TO_FRONTLINE_IMPLEMENTATION.md) |
| R6 Retail Completion repository implementation | [`R6_RETAIL_COMPLETION_IMPLEMENTATION.md`](R6_RETAIL_COMPLETION_IMPLEMENTATION.md) |
| R7 Shop & Recon repository implementation | [`R7_SHOP_RECON_IMPLEMENTATION.md`](R7_SHOP_RECON_IMPLEMENTATION.md) |
| R8 Parts Operations repository implementation | [`R8_PARTS_OPERATIONS_IMPLEMENTATION.md`](R8_PARTS_OPERATIONS_IMPLEMENTATION.md) |
| R9 Disposition & Wholesale repository implementation | [`R9_DISPOSITION_WHOLESALE_IMPLEMENTATION.md`](R9_DISPOSITION_WHOLESALE_IMPLEMENTATION.md) |
| R10 Governance, Reporting & Administration repository implementation | [`R10_GOVERNANCE_REPORTING_ADMIN_IMPLEMENTATION.md`](R10_GOVERNANCE_REPORTING_ADMIN_IMPLEMENTATION.md) |
| Disposition & Wholesale | [`DISPOSITION_WHOLESALE_WORKSPACE_IMPLEMENTATION_PLAN.md`](DISPOSITION_WHOLESALE_WORKSPACE_IMPLEMENTATION_PLAN.md) and [`DISPOSITION_WHOLESALE_WORKFLOW_AND_ALGORITHM_CATALOG.md`](DISPOSITION_WHOLESALE_WORKFLOW_AND_ALGORITHM_CATALOG.md) |
| Parts Operations | [`PARTS_OPERATIONS_WORKSPACE_IMPLEMENTATION_PLAN.md`](PARTS_OPERATIONS_WORKSPACE_IMPLEMENTATION_PLAN.md) and [`PARTS_OPERATIONS_WORKFLOW_AND_ALGORITHM_CATALOG.md`](PARTS_OPERATIONS_WORKFLOW_AND_ALGORITHM_CATALOG.md) |
| Enterprise algorithms | [`INVENTORY_OPTIMIZATION_ALGORITHMS.md`](INVENTORY_OPTIMIZATION_ALGORITHMS.md) |
| KPI governance | [`governance/VEHICLE_OPERATIONS_KPI_CATALOG.md`](governance/VEHICLE_OPERATIONS_KPI_CATALOG.md) |

## 3. Execution map

| Product capability | Roadmap release | Architecture owner | Milestone group |
| --- | --- | --- | --- |
| Program approval and traceability | R0 | Program governance | M0 / IC-000–005 |
| Enterprise foundations | R1 | Shared command/policy/work/evidence platform | M1 / IC-010–017 |
| Console shell, Home, launcher, search, saved views | R2 | Console composition + shared services | M2 / IC-020–028 |
| Inventory Lifecycle and Control Tower | R3 | InventoryUnit projections + console contracts | M3 / IC-030–039 |
| Acquisition & Appraisal | R4 | Acquisition/Appraisal + InventoryUnit boundary | M4 / IC-040–048 |
| Inventory-to-Frontline | R5 | `INV-ITF` workflow + Shop/Parts handoffs | M5 / IC-050–059 |
| Retail completion | R6 | InventoryUnit commercial workflow | M6 / IC-060–068 |
| Shop & Recon | R7 | RepairOrder/RepairJob/Shop | M7 / IC-070–079 |
| Parts Operations | R8 | Parts ledger/procurement/custody | M8 / IC-080–089 |
| Disposition & Wholesale | R9 | Wholesale/disposition | M9 / IC-090–099 |
| Reviews, Approvals, Reports, Administration | R10 | Shared governance/reporting | M10 / IC-100–109 |
| Integration ecosystem | R11 | Integration platform/adapters | M11 / IC-110–119 |
| Enterprise readiness and pilot | R12 | Security/reliability/operations/program | M12 / IC-120–129 |

## 4. Implementation sequence rules

1. Do not start a slice before its named upstream foundation and business decisions are approved.
2. Do not use UI mockup values as implementation fixtures without explicit synthetic labeling.
3. Do not build a generic state-change endpoint; every transition uses a purpose-built evidence-bearing command.
4. Do not create alternate identity, lifecycle, task, approval, document, event, or parts-ledger systems.
5. Implement read contracts and reconciliation fixtures before enabling high-consequence commands.
6. Treat provider requests and domain completion as different states.
7. Activate by role/location/command/integration; deployment alone does not activate behavior.
8. Mark a milestone complete only when all applicable business, data, security, integration, experience, reliability, and measurement gates pass.

## 5. No-code-to-code authorization gate

Coding may begin only after all of the following are explicitly approved:

- the roadmap, architecture, milestones, critical path, first implementation batch, and change-control rules;
- named business/domain/data/security/integration/support/pilot owners;
- remaining dealership workflow and policy decisions affecting the first slice;
- first slice, pilot location/roles, source systems, evidence, authority, thresholds, acceptance fixtures, rollout, pause, and rollback;
- implementation branch and PR strategy;
- no unresolved issue that would materially change canonical identity, aggregate ownership, command contract, navigation, or external authority.

Approval to start one slice does not authorize later slices or broader activation.

## 6. Recommended first code authorization

When the user later authorizes code, the safest first authorization is:

```text
Foundation conformance
  → shared shell/scope/search/saved views
  → read-only lifecycle projections with fixed fixtures
  → approved Inventory Lifecycle landing and Control Tower reads
  → one manual-start acquisition or transport command slice
```

Shop, Parts, Wholesale, retail completion, integrations, and algorithms can be planned in parallel but should activate only after their dependencies and independent gates pass.

## 7. Program review checklist

- [ ] All approved workspaces and navigation destinations appear in the roadmap and milestones.
- [ ] Every major domain has one architecture owner and explicit non-ownership boundaries.
- [ ] Control Tower, Shop, Parts, Wholesale, and retail completion use shared tasks/reviews/approvals/events rather than duplicates.
- [ ] Milestone dependencies match the roadmap release train and architecture references.
- [ ] Every consequential action remains human-authorized and server-enforced.
- [ ] Every external completion claim requires acknowledgement and reconciliation evidence.
- [ ] Accessibility, security, privacy, performance, observability, recovery, pilot, and rollback are delivery requirements, not final cleanup.
- [ ] No document claims this planning package authorizes code.

## 8. Change control

This master index changes only through a versioned documentation update. If an approved source-of-truth image or workflow changes, update traceability, roadmap impact, architecture impact, milestone impact, acceptance fixtures, and release decision before implementation continues.
