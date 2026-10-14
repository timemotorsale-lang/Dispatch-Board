# CRM Next — Legacy Migration & Cutover Plan

## Strategy

**Freeze → Audit → Build in parallel → Validate → Migrate valuable capability/data → Promote → Retire Legacy.** Do not redesign Legacy screen-by-screen.

## A — Freeze & inventory

Freeze Legacy information architecture except critical fixes. Inventory screens, routes, data entities, services, integrations, reports, permissions. Classify capabilities KEEP/REDESIGN/MIGRATE/RETIRE/DEFER.

## B — Reuse audit

For each capability decide independently whether UI, business logic, data model, data, integration, tests, and permissions are reusable. A poor UI does not imply poor data; useful data does not justify preserving poor UX.

## C — Parallel build

Build CRM Next behind an isolated route/feature flag while Legacy stays operational. Prefer read-only reuse first; introduce writes only with clear ownership and consistency rules.

## D — Data migration

Create mapping, deduplication, validation, rollback, and reconciliation plans. Preserve identifiers where safe. Never silently discard historical customer activity.

## E — Scenario validation

Compare Legacy and Next using real workflows: new lead, title complaint, appointment/test drive, stalled deal, BHPH attention, service issue, manager attention queue. Measure time, clicks, comprehension, completion, errors.

## F — Promotion gate

Promote only after acceptance criteria pass and no critical Legacy capability is missing.

## G — Cutover

Set CRM Next as default; keep Legacy read-only for a defined rollback/reference period; monitor errors and reconciliation; then retire Legacy routes and dead code deliberately.

## Rollback

Before cutover define trigger thresholds, rollback owner, data-write handling, and method for returning users to Legacy without losing CRM Next transactions.

