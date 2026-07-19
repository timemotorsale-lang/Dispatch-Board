# Inventory Console Gap Closure — Wave 2 Lifecycle Projections

**Branch:** `codex/inventory-console-gap-closure-wave-2-lifecycle-projections`  
**Dependency:** Wave 1 shared foundations, included by fast-forward  
**Scope:** R3 lifecycle and Control Tower read projections only  
**Repository completion change:** 46 to 52 complete slices  
**Activation:** No provider, pilot, deployment, or production activation

## Outcome

Wave 2 closes IC-031, IC-032, and IC-034 through IC-037. The Control Tower now composes existing authoritative InventoryUnit, state-event, RepairOrder, Parts, workflow, cost, task, audit, command, outbox, checkpoint, and conflict records. It remains a read projection and cannot become a generic workflow mutation endpoint.

## Closed projection contracts

- **IC-031 — Stage and clocks:** 30-day entries/exits, median/p90 observed duration, current sample size, active/waiting/idle/blocked populations, target breaches, exposure, owners, and stage drill-through.
- **IC-032 — Cross-lane dependencies:** Inventory Recon RepairOrders only, explicit customer-repair exclusion, open and QC-passed jobs, unresolved and unreserved Parts demand, earliest governed offer ETA, readiness confidence, and QC-handoff readiness.
- **IC-034 — Decisions and recommendations:** exact workflow/case versions, approval and recommendation stage, expiry, owning next action, recommendation explanation/confidence snapshot, approval snapshot, and completion/outcome snapshot.
- **IC-035 — Capital and aging:** actual versus estimated USD exposure, category and confidence components, excluded currency/void entries, policy aging bands, and reconciliation to total recorded exposure.
- **IC-036 — Selected asset:** vehicle/unit/lifecycle, Shop orders, Parts demand, costs, blockers, tasks, decisions, audit, commands, permitted destination actions, and explicit field/command restrictions.
- **IC-037 — Health:** projection lag/failure, open integration conflicts, dead letters, affected panels, assigned owner when present, manual operating path, and recovery action.

## Truth and authority boundaries

- Customer RepairOrders never contribute to Inventory Recon dependency totals.
- Missing provider ETA lowers readiness confidence; it is not represented as on time.
- Recommendations remain advisory snapshots and never execute disposition.
- A Control Tower action opens its owning governed workspace; it does not bypass that workspace’s command authorization, version, evidence, or approval rules.
- Health attention does not erase internal evidence or infer external completion.
- Empty authoritative populations render zero; a failed source causes the page request to fail rather than inserting representative facts.

## Verification

- Pure projection tests cover event distributions, cross-lane separation, Parts ETA/confidence, QC handoff, capital reconciliation, and health/recovery.
- Control Tower rendering tests cover connected facts and selected-asset restrictions.
- TypeScript typecheck passed.
- ESLint passed with zero warnings.
- Full regression passed: 220 files and 1,243 tests.
- The 121-slice audit passed at 52 complete, 48 partial, 17 external-evidence-required, and 4 decision-blocked.
- The production build could not start because the active local Next.js process holds a generated `.next/static` artifact open (`EPERM unlink`). No user process was stopped. This is an environment lock, not a reported compile failure; build verification remains pending after the development server stops.

## Stop boundary

No schema or migration is added by Wave 2. The Wave 1 migration remains source-controlled and unapplied. This branch does not contact providers, change rollout flags, execute workflow commands, commit, push, merge, deploy, or claim operational/pilot completion.
