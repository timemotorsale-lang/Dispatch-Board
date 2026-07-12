# CRM Milestone 6: Calibration and Controlled Rollout

**Status:** Implemented in source; operational sign-off still required  
**Date:** 2026-07-12

## Delivered

- Server-enforced CRM master and capability flags
- Explicit user pilot cohorts and deterministic percentage rollout
- Manager-only rollout changes with reason-required audit history
- One-command emergency rollback that disables all CRM capabilities without deleting records
- Operational metrics for decisions, overrides, confidence, leads, wins, cases, closures, SLA breaches, and customer promises
- Persisted calibration and readiness snapshots
- Calculated override, low-confidence, lead-win, and promise-fulfillment rates
- Readiness blockers for disabled rollout, missing cohort, insufficient decision evidence, and excessive SLA breach rate
- Manager APIs for rollout status, flag updates, rollback, and readiness snapshots

## Feature controls

| Flag | Capability |
| --- | --- |
| `CRM_MASTER` | Master kill switch required by every CRM capability |
| `CRM_LEADS` | Durable lead intake and lead queues |
| `CRM_CASES` | Customer case intake and case queues |
| `CRM_SLA` | SLA evaluation and manager control |
| `CRM_CUSTOMER_360` | Customer 360 reads |

All flags are seeded disabled. Enabling a capability requires the master flag plus either an explicit user cohort or a non-zero deterministic rollout percentage.

## Readiness result

Implementation readiness is complete. Production rollout is not automatically approved because migrations, pilot membership, operator rehearsal, and live metrics require human evidence in the target environment.

## Verification gate

- Prisma schema validates
- TypeScript typecheck passes
- Full automated test suite passes
- ESLint passes with zero warnings
- Rollback preserves persisted CRM records
- Feature decisions are deterministic
- Readiness snapshots are immutable evidence

See `CRM_PILOT_AND_ROLLBACK_RUNBOOK.md` for operational execution.
