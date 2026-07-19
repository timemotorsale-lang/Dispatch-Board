# Inventory Console Gap-Closure Wave 7 — Lifecycle Automation and Recovery

**Branch:** `codex/inventory-console-gap-closure-wave-7-lifecycle-automation-recovery`  
**Slices:** IC-015, IC-028, IC-047, IC-050 through IC-057  
**Repository disposition:** `REPOSITORY_CONFORMS_EXTERNAL_EVIDENCE_PENDING`  
**Activation:** Repository only; no migration was applied, scheduler deployed, provider contacted, pilot run, or production rollout changed

## Outcome

Wave 7 closes the identified repository behavior for lifecycle automation and recovery. Rollout controls support location-over-global inheritance, scoped pause, and audited exact-version rollback. Inventory-to-Frontline records expose an explicit recovery contract and create deterministic, idempotent overdue escalation work. Receipt, inspection, recon, repair/Parts, failed quality, title, and publication exceptions retain an exact accountable route back to the owning stage. Post-control acquisition reversal requires independent verification and atomically records title, payment, and custody compensation without deleting the InventoryUnit.

The 121-slice ledger remains at 69 repository-complete, 31 partial, 17 external-evidence-required, and 4 decision-blocked. These 11 mixed slices remain partial because their acceptance criteria still require real operational, provider, accessibility, deployment, or pilot evidence. Wave 7 moves them from repository work to the operational-evidence track; it does not manufacture that evidence.

## Slice evidence

| Slice | Repository behavior now present | Residual external evidence |
| --- | --- | --- |
| IC-015 | Location-over-global rollout inheritance, scoped OFF pause, exact-version update, and audited rollback to the immediately prior state | Representative pilot outcome and production pause/rollback exercise |
| IC-028 | Normal, waiting, escalation-due, correction-required, suspended-review, alternate-route, and terminal recovery projection | Independent cross-device accessibility validation |
| IC-047 | Independently verified title/payment/custody compensation and atomic terminal non-destructive reversal | Operational compensation and downstream reconciliation exercise |
| IC-050 | Server-evaluated, owned, deterministic, idempotent transport planning/arrival escalation | Carrier acknowledgement and provider reconciliation |
| IC-051 | Receipt holds preserve exact receipt recovery and accountable re-entry | Receiving tabletop and operational sign-off |
| IC-052 | Safety, identity, title, diagnostic, template, and evidence failures route without duplicate completion | Diagnostic/title tabletop |
| IC-053 | Material scope change invalidates approval and requires amount-authorized reapproval; alternate disposition is explicit | Scope-change and alternate-route tabletop |
| IC-054 | Authoritative RepairJob/Parts completion remains mandatory and overdue execution creates owned recovery | Supplier/custody integration and representative workload |
| IC-055 | Failed critical QC records evidence and returns to authoritative repair execution for rework | Reviewer matrix and failed-QC tabletop |
| IC-056 | Title hold records blocker, owner, external dependency, due time, escalation, and exact re-entry | Title-agency acknowledgement/reconciliation |
| IC-057 | Publication exception records desired/observed state, channel, error, freshness, retry, escalation, and exact re-entry | Listing acknowledgement and production freshness evidence |

## Operating contracts

- `GET` and `POST /api/cron/evaluate-inventory-frontline` expose the deployment boundary for scheduled evaluation. `CRON_SECRET` is required when configured.
- `POST /api/frontline-workflows/escalations` permits an authorized staff-triggered evaluation without impersonating a system actor.
- Scheduled evaluation requires `INVENTORY_AUTOMATION_ACTOR_EMAIL` to resolve to an active Inventory Manager or General Manager. All resulting command, audit, event, and outbox records preserve that actor.
- Each escalation key includes workflow, current version, and escalation code, so retries are stable and conflicting state cannot silently advance.
- Recovery commands return to the recorded owning stage; they do not infer success or skip authoritative domain gates.

## Data boundary

Migration `20260719010000_inventory_console_gap_closure_wave_7` adds the terminal `REVERSED` acquisition status. It is source-controlled only. The migration was not applied to a user, pilot, or production database. No scheduler, provider adapter, credential, webhook, notification channel, or rollout flag was activated.

## Verification and next branch

The Wave 7 conformance registry exhaustively maps all 11 slices and fails closed for missing or incomplete evidence. Prisma schema validation, TypeScript typecheck, repository lint, the focused Wave 7/R5/post-review tests, the authoritative 121-slice audit, and an isolated Next.js production build all pass. The complete repository sweep ran 1,273 tests: 1,259 passed and 14 unrelated Appointment/API tests failed because their fixtures attempted the already-known incompatible Prisma Accelerate datasource; no Wave 7 test failed. The normal `.next` build location was locked by the local OneDrive development process, so the successful production build used an isolated output directory and generated 160 pages.

The next dependency-ordered repository branch is `codex/inventory-console-gap-closure-wave-8-domain-reconciliation`, covering the remaining nine partial slices with identified repository work. The separate 22-slice operational-evidence track has no coding branch.
