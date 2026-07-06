# Migration, Seed, Rollback, and Compatibility Strategy

**Work package:** EAPT-012  
**Status:** Implemented foundation strategy  
**Scope:** Fresh install, upgrade, seed, rollback/roll-forward, Prisma generation, and compatibility procedures for the Appointment Command Center  
**Related baseline:** `PRODUCTION_OPERATIONS_BASELINE.md`

## Purpose

This strategy makes appointment database changes release-safe. It defines how schema changes, seed data, rollback, restore, and compatibility must work before the Appointment Command Center can be treated as enterprise-ready.

The core rule is:

```text
Appointment data must survive deployment, rollback, restore, retry, and replay without silent loss, duplicate effects, or broken audit history.
```

## Migration Mode

Appointment migrations use an expand-and-contract pattern.

The preferred sequence is:

1. Add new nullable columns, new tables, new indexes, or new enum values.
2. Deploy application code that can read old and new shapes.
3. Backfill or reconcile data with bounded, observable jobs.
4. Make new fields required only after data is complete and verified.
5. Retire old fields or behavior in a later release after compatibility evidence exists.

Do not rename, remove, or repurpose appointment fields in the same release that introduces their replacements.

## Fresh Install Procedure

A fresh non-production environment must pass:

```text
npm run db:migrate:deploy
npm run db:generate
npm run db:seed
npm run db:validate
npm run lint
npm run typecheck
npm test
```

Fresh install evidence must confirm:

- All checked-in migrations apply cleanly.
- Prisma client generation succeeds.
- Seed data runs without real customer, vehicle, appointment, or secret data.
- Minneapolis configuration seed is present.
- General Manager and local development users exist only in local/development seed context.
- Appointment location, resource type, operating-window, and location-access foundations exist.
- The test suite passes against the migrated schema.

## Production Upgrade Procedure

A production-style upgrade must pass:

```text
npm run db:migrate:deploy
npm run db:generate
npm run db:validate
npm run lint
npm run typecheck
npm test
```

Before production upgrade:

- Confirm backup completed.
- Confirm restore point is available.
- Confirm migration has been tested against a production-shaped copy or fixture.
- Confirm incompatible old application versions are not still writing unsupported data.
- Pause high-risk background appointment automation if the migration changes command, reservation, recurrence, or history behavior.

After production upgrade:

- Verify application boot.
- Verify appointment command intake.
- Verify command ledger writes.
- Verify location-access policy checks.
- Verify appointment read/query paths introduced in the release.
- Verify no failed migration or seed step is hidden behind a successful deploy.

## Seed Boundary

The current `prisma/seed.ts` is a development seed. It may create:

- Local users
- Local roles and duties
- Local task templates
- App settings
- Minneapolis appointment configuration
- Resource type definitions
- Local location-access grants

Production seed must be configuration-only unless explicitly approved. It must not create:

- Real customer records
- Real vehicle records
- Real appointments
- Real appointment history
- Real command-ledger entries
- Login users with shared local passwords
- Secrets or external integration credentials

Production configuration seed may include approved:

- Organization shell
- Location shell
- Operating windows
- Resource type definitions
- Purpose/template catalog defaults
- Reason/outcome catalog defaults

Production configuration activation still requires business and operations approval.

## Rollback and Roll-Forward Strategy

Destructive rollback is not allowed for appointment data.

If a migration defect is detected:

1. Stop or disable new appointment command execution if continuing would create unsafe data.
2. Preserve logs, failed state, migration output, and command-ledger evidence.
3. Decide whether the safest recovery is:
   - restore from the approved pre-deploy backup, or
   - roll forward with a corrective migration.
4. Reconcile recovered state before returning to normal operation.

Restore is required when:

- Data shape is corrupted.
- Required history or command evidence is missing.
- Resource reservations cannot reconcile.
- Appointment/task links cannot reconcile.
- The app cannot safely read the migrated data.

Roll-forward is preferred when:

- The deployed app can remain compatible.
- The correction is additive or data-preserving.
- Audit, command ledger, links, and reservations remain intact.
- The corrective migration can be reviewed and tested quickly.

## Recovery Reconciliation Targets

After restore or corrective migration, reconcile:

- Appointments
- Appointment-task links
- Appointment history events
- Appointment command ledger
- Resource requirements
- Resource reservations
- Location access grants
- Reporting counts

The reconciliation must prove that command idempotency keys, correlation IDs, appointment versions, and history timelines remain coherent.

## Compatibility Rules

Appointment compatibility must preserve:

- Appointment IDs
- Appointment numbers
- Appointment versions
- Command idempotency keys
- History correlation IDs
- Task-link identities
- Resource reservation identity
- Customer and vehicle snapshots attached to historical appointments

Future migrations must not:

- Collapse the independent booking, confirmation, attendance, and execution states.
- Rewrite historical purpose snapshots.
- Delete history as a cleanup shortcut.
- Break idempotency replay behavior.
- Replace reason/outcome evidence with free-text-only data.
- Expose restricted customer or vehicle data in seed, logs, URLs, or reporting labels.

## Prisma Client Generation

Any schema change that affects generated Prisma types requires:

```text
npm run db:generate
```

On Windows, Prisma generation can fail if the local development server is holding `query_engine-windows.dll.node`.

If that happens in local development:

1. Stop the Next.js development server.
2. Stop leftover local Node processes if needed.
3. Re-run `npm run db:generate`.
4. Restart the app.

Do not treat a local file-lock failure as a production migration failure. It is a local runtime lock issue, but the release still cannot be signed off until generation succeeds in the target environment.

## Appointment E1 Migration Inventory

The E1 appointment foundation currently includes additive migrations for:

- Organization, location, operating windows, closures, and scheduling access
- Appointment aggregate and lifecycle state dimensions
- Customers, vehicles, participants, resources, requirements, reservations, and resource availability
- Appointment-task links
- Appointment history events
- Appointment command ledger

These migrations establish the foundation only. They do not yet prove the full scheduling engine, lifecycle execution engine, reporting engine, or administration UI.

## Release Gate

E1 migration readiness passes only when:

- Fresh install works.
- Upgrade works.
- Prisma generation works.
- Development seed works without sensitive production data.
- Production seed boundary is documented and approved.
- Backup and restore evidence exists for release qualification.
- Roll-forward and restore procedures are understood.
- Recovery reconciliation targets are defined.
- No destructive rollback is required to recover appointment data.

This strategy closes the E1 foundation gate for migration planning, but E9 must still validate these procedures against production-shaped data and operational recovery exercises.
