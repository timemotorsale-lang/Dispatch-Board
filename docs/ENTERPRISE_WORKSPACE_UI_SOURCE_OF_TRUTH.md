# Enterprise Workspace UI Source of Truth

These approved mockups are the visual source of truth for the enterprise console. They define layout, hierarchy, density, navigation placement, status treatment, and role context. They do not replace the backend as the source of truth for data, permissions, workflow state, or audit history.

The [Command Control Center Shell UI Source of Truth](COMMAND_CONTROL_CENTER_SHELL_UI_SOURCE_OF_TRUTH.md) governs the global shell, umbrella product naming, and Dispatch Overview composition. Module-level mockups continue to govern their workspace interiors.

## Approved workspace map

| Mockup | Primary role(s) | Console route | Purpose |
| --- | --- | --- | --- |
| [Command Control Center Shell and Dispatch Overview](ui-mockups/command-control-center-shell-dispatch-overview.png) | General manager, dispatch manager, staff | `/board` | Global CCC shell and the Dispatch manager's daily launch, readiness, attention, team-load, and activity overview. Dispatch is the only live module in this approved planning state. |
| [Inventory Lifecycle Control Tower](ui-mockups/inventory-lifecycle-control-tower.png) | Inventory manager, general manager | `/vehicles` | Cross-functional inventory flow, capital exposure, exceptions, capacity, and readiness. |
| [Inventory Manager Workspace](ui-mockups/inventory-manager-workspace.png) | Inventory manager | `/inventory-manager` | Daily acquisition, readiness, aging, merchandising, and next-action work. |
| [Vehicle 360 Workspace](ui-mockups/vehicle-360-workspace.png) | Inventory, service advisor, manager | `/vehicles/360/[id]` | Canonical vehicle identity, lifecycle, repairs, parts, evidence, customer context, and activity. |
| [Service Advisor Workspace](ui-mockups/service-advisor-workspace.png) | Service advisor, service manager | `/vehicles/advisor` | Repair-order queue, technician status, approvals, promises, parts, quality, and delivery readiness. |
| [Insights Workspace](ui-mockups/insights-workspace.png) | General manager, department managers | `/insights` | Scorecards, bottlenecks, forecasts, data freshness, and recommendations. |
| [Administration & Integration Workspace](ui-mockups/administration-integration-workspace.png) | General manager, platform administrator | `/administration` and `/integrations` | Provider health, reconciliation, roles, audit/evidence, rollout, recovery, and system status. |

## Adoption rules

1. Preserve the shared Enterprise Operations Shell and workspace switcher across every route.
2. Keep one authenticated identity; role and delegated-duty context changes available actions, not the visual shell.
3. Use the mockup for presentation hierarchy and interaction placement. Use live APIs, Prisma read models, policies, and audit records for all values and mutations.
4. Never display generated sample metrics as if they were live data. Loading, stale, empty, unavailable, and permission-denied states must be explicit.
5. Vehicle 360 is the cross-functional record workspace. Inventory, service, parts, customer, evidence, and activity links should converge there instead of creating duplicate vehicle views.
6. The Administration & Integration mockup is a combined visual reference; implementation may remain split into `/administration` and `/integrations` so access controls stay explicit.
7. Any future visual change should update the relevant image and this mapping before changing production UI.
8. Until another Command Control Center module is explicitly approved as live, Dispatch Board is the only live module and all future shell entries must be presented as planned rather than simulated.

## Implementation status

The image assets are preserved in this repository for review and record keeping. The initial Command Control Center shell and Dispatch Overview hierarchy are implemented from the approved mockup while retaining existing backend contracts and operational actions. Planned CCC modules remain unavailable. Module interiors should continue to align to their corresponding mockups through scoped, verified implementation passes.
