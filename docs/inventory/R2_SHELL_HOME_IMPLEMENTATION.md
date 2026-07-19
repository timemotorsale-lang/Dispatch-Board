# Inventory Console R2 Shell and Home Implementation

**Release / milestone:** R2 / M2
**Slices:** IC-020 through IC-028
**Implemented:** 2026-07-18
**Branch:** `codex/inventory-console-r2-shell-home-implementation`
**Repository result:** `COMPLETE — HONEST HOME AND ROUTING EXIT PASSED`
**Activation:** Repository only; external systems, pilot, and production activation remain unauthorized

## Outcome

`/vehicles` is now the approved Inventory Console Home rather than the older detailed Control Tower. The detailed Control Tower moved to `/vehicles/control-tower`. The shared shell retains exactly seven destinations and Home routes staff to Inventory Lifecycle, Shop & Recon, Parts Operations, Disposition & Wholesale, Reviews, Approvals, Reports, Administration, Workflow Launcher, search, and Event Log destinations without restoring a module-tab wall.

## Implemented slices

| Slice | Repository implementation |
| --- | --- |
| IC-020 | Seven-destination sidebar, correct selected states, Home route, separate Control Tower route, breadcrumbs, responsive Home, and no Home tab wall |
| IC-021 | Server-enforced organization/capability scope, location reauthorization, permitted location selector, all-location fallback, and explicit unavailable state |
| IC-022 | Console search entry routes to the existing permission-filtered enterprise Vehicle Discovery capability and preserves deeper record links |
| IC-023 | Versioned system saved-view contract (`All`, `Attention`, `Blocked`, `Overdue`) through URL state, location preservation, selected state, and invalid-view recovery notice |
| IC-024 | Phase-one Workflow Launcher at `/vehicles/workflows` with WL-01–08 and WL-C01, role context, purpose-built workspace routing, contextual and approval-gated states, and no generic stage-change action |
| IC-025 | Live InventoryUnit totals, capital, attention, stage, location, freshness/cutoff, and drill-through; disconnected Shop/Parts/throughput facts are explicitly unavailable |
| IC-026 | Authoritative blocked/overdue/waiting InventoryUnit Priority Work with owner, lifecycle age, reason/next action, and record routing |
| IC-027 | Permission-scoped review and approval counts/actions using the existing manager-review contract, with restricted-state handling |
| IC-028 | Explicit live/stale/unavailable states, partial-domain health, disabled external-adapter state, Event Log routing, empty priority state, and error recovery presentation |

## Important capability boundaries

- System saved views are versioned URL contracts. Durable user-created/shared Inventory Console views remain a later extension; the existing Task saved-view model was not misused as a second Console authority.
- Workflow Launcher choices route only to existing purpose-built foundations. Receipt and inspection starts remain visibly gated until their owning workflow slices are authorized.
- Home does not invent Shop, Parts, throughput, wholesale, or integration facts. It shows `Unavailable`, `Disabled`, or rollout-gated explanations.
- The Disposition & Wholesale route is an honest reserved destination; R9 algorithms and commands are not activated.
- The detailed Control Tower still contains representative legacy content and is governed by R3. Moving it to a deeper route does not claim R3 completion.

## Files and routes

- `src/features/inventory/inventory-console-home.tsx`
- `src/features/inventory/workflow-launcher.tsx`
- `/vehicles`
- `/vehicles/control-tower`
- `/vehicles/workflows`
- `/vehicles/disposition-wholesale`
- shared console navigation, topbar breadcrumbs, Inventory scope authorization, responsive styles, and focused tests

## Verification

- TypeScript typecheck: passed.
- Repository lint: passed with zero warnings.
- Focused R2 verification: 7 files and 36 tests passed.
- Final Home/Control Tower verification after saved-view and scope changes: 2 files and 7 tests passed.
- Next.js production build: passed; 135 pages generated and all four R2 routes registered.
- No schema or migration change was required.

## Capability truth

- Repository UI and routing: implemented.
- Live InventoryUnit Home facts: connected.
- Shop/Parts/throughput Home facts: not connected and labeled unavailable.
- Workflow Launcher catalog and safe routing: implemented; gated workflows remain disabled.
- External integrations: disabled and not contacted.
- Pilot/production rollout: not activated.
- Git publication: no commit, push, PR, or merge performed by this implementation.

## R2 exit

The bounded R2 exit passes: Home contains no representative operational data and routes every currently authorized journey to a real or honestly gated destination. R3 may begin from a baseline containing this implementation after review and merge.

## Wave 1 shared-foundation amendment — 2026-07-18

The gap-closure branch `codex/inventory-console-gap-closure-wave-1-shared-foundations` supersedes the original boundaries for IC-023 and IC-025:

- IC-023 now has a Console-owned durable saved-view model and migration, personal and manager-published team visibility, version metadata, safe invalid/retired-filter recovery, create/delete APIs, Home management UI, and permission re-evaluation whenever a stored location opens. The Task saved-view model remains separate.
- IC-025 now composes authoritative open/blocked RepairOrder counts, unresolved Parts demand and unreserved quantity, 24-hour Inventory transition and RepairOrder closure throughput, and provider-neutral integration exchange/exception health. Source failures render unavailable; an empty exchange ledger renders `NOT_CONFIGURED`.
- IC-022 now includes governed work items in capability-filtered discovery. Staff searches are limited to assigned work; managers may search team work. Full return-context coverage remains partial.
- IC-026 now exposes system views for My Work, Team, Exceptions, Blocked, and Overdue, but remains partial until cross-domain priority composition, escalation, and deduplication are complete.

The migration is source-controlled only and is not applied by this branch. Pilot, deployment, provider activation, accessibility evidence, and production rollout remain separate gates.

## Wave 6 shared-experience amendment — 2026-07-18

IC-022, IC-024, IC-026, and IC-027 are now repository-complete. Discovery preserves validated internal return context across all authorized result types; the launcher is server-derived and publishes complete intake, validation, confirmation, approval, creation, and recovery contracts; Priority Work applies deduplicated P0/P1/P2 My/Team queues with escalation facts; and contextual decisions carry exact decision, version, policy, and queue-return context. Owning domain commands continue to enforce authority and separation of duties.
