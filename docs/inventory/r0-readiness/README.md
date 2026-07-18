# Inventory Console R0 Implementation Readiness

**Release / milestone:** R0 / M0  
**Slices:** IC-000 through IC-005  
**Prepared:** 2026-07-18  
**Branch:** `codex/inventory-console-r0-implementation-readiness`  
**Authority:** Documentation implementation only  
**Overall state:** `CONDITIONALLY READY FOR DECISIONS`; M1 code transition is not authorized

## Purpose

This package turns the approved Inventory Console program into an auditable readiness gate. It reconciles existing repository capabilities with the new R0-R12 execution program and records what is fixed, what is reusable, what still needs a named decision, and what must block code.

R0 does not erase or downgrade the Inventory, Shop, Parts, or governance capabilities already present in the repository. It controls how those capabilities are assessed, reused, extended, and truthfully represented during the new program.

## Slice register

| Slice | Artifact | Readiness | Decision needed before M1 |
| --- | --- | --- | --- |
| IC-000 | [Program charter and code gate](IC_000_PROGRAM_CHARTER_AND_CODE_GATE.md) | `BLOCKED FOR SIGN-OFF` | Name accountable people, approve pilot and thresholds, release authority, pause/rollback, and PR/merge policy |
| IC-001 | [UX and source hierarchy freeze](IC_001_UX_SOURCE_HIERARCHY_FREEZE.md) | `DOCUMENTED` | Product owner confirms this versioned register remains binding |
| IC-002 | [Workflow and action traceability](IC_002_WORKFLOW_ACTION_TRACEABILITY.md) | `CONDITIONALLY READY` | Domain, security, and integration owners approve mappings and unresolved command contracts |
| IC-003 | [Domain and source-authority map](IC_003_DOMAIN_SOURCE_AUTHORITY_MAP.md) | `BLOCKED FOR ACTUAL-SYSTEM INPUTS` | Name systems/owners and approve field-level authority for real integrations |
| IC-004 | [KPI, target, and data-quality baseline](IC_004_KPI_TARGET_DATA_QUALITY_BASELINE.md) | `BLOCKED FOR TARGET APPROVAL` | Approve metric versions, target records, freshness, materiality, privacy, and pilot thresholds |
| IC-005 | [Acceptance fixtures and pilot cases](IC_005_ACCEPTANCE_FIXTURES_AND_PILOT_CASES.md) | `CONDITIONALLY READY` | Approve fixed fixtures, pilot cohort, owners, test environment, and stop thresholds |

## Binding inputs

- [Implementation Program](../INVENTORY_CONSOLE_IMPLEMENTATION_PROGRAM.md)
- [Roadmap](../INVENTORY_CONSOLE_IMPLEMENTATION_ROADMAP.md)
- [Architecture](../INVENTORY_CONSOLE_IMPLEMENTATION_ARCHITECTURE.md)
- [Milestones](../INVENTORY_CONSOLE_IMPLEMENTATION_MILESTONES.md)
- [Execution Protocol](../INVENTORY_CONSOLE_IMPLEMENTATION_EXECUTION_PROTOCOL.md)
- [Landing-page UI source of truth](../INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md)
- [Control Tower contract](../INVENTORY_LIFECYCLE_CONTROL_TOWER_CONTRACT.md)
- [Workflow Launcher contract](../INVENTORY_CONSOLE_WORKFLOW_LAUNCHER_UX_CONTRACT.md)
- [Governance baseline](../governance/README.md)

## Existing repository evidence

The repository already contains InventoryUnit, Vehicle Registry, Control Tower, RepairOrder/Shop, Parts ledger and operations, command/policy/audit/event foundations, implementation records, routes, workspaces, and tests. Their presence is evidence of repository capability, not proof of deployment, migration, pilot, integration, or production activation.

M1 must begin with conformance and gap verification against actual code and tests. It must not create a second vehicle identity, lifecycle, RepairOrder, parts ledger, task, review, approval, policy, audit, event, or integration platform.

## R0 exit decision

R0 may be declared complete only when:

1. every blocking row in this register has a named decision record;
2. business, product, architecture, security, data, finance/title, integration, support, and pilot owners sign the exact package version;
3. the first M1 slice order names authority, stop boundary, branch, commit/PR behavior, verification, rollout-disabled state, and escalation conditions;
4. no open issue could materially change canonical identity, aggregate ownership, command contracts, navigation, source authority, or the first-slice acceptance fixture.

Until then, the only authorized continuation is R0 documentation, inspection, and safe verification.

