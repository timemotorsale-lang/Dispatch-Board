# Customer Control Center Pilot and Rollback Runbook

## Preflight

1. Back up the production database and record restore evidence.
2. Apply all CRM migrations in order and regenerate the Prisma client while the application process is stopped.
3. Confirm at least one active General Manager and the intended sales/case owners exist.
4. Confirm the active SLA policy, timezone, business windows, targets, and allowed pause reasons.
5. Run schema validation, typecheck, full tests, lint, and production build.
6. Keep every CRM flag disabled until smoke validation passes.

## Pilot activation

1. Add named pilot user IDs to each required capability flag.
2. Enable the capability flags while leaving percentage rollout at zero.
3. Enable `CRM_MASTER` last.
4. Verify pilot users can access their intended capability.
5. Verify a non-pilot user receives a feature-unavailable response.
6. Complete one lead intake, one customer case, one customer update promise, one SLA evaluation, and one Customer 360 review.
7. Confirm generated work has one owner, due time, decision evidence, and activity history.

## Daily pilot review

Capture a readiness snapshot and review:

- decision count and algorithm versions
- override and low-confidence rates
- lead response and win outcomes
- case closure and reopen behavior
- SLA breaches and repeated breaches
- promised-update fulfillment
- duplicate work or missing ownership
- permission or privacy incidents

Do not change algorithm weights in place. Publish a new algorithm version and preserve prior decisions.

## Expansion gate

Expand the explicit cohort or rollout percentage only when:

- no critical defect is open
- no privacy or cross-organization incident is open
- rollback has been rehearsed
- generated work is not duplicating
- managers can explain and override recommendations
- SLA and promise queues reconcile with source records
- the readiness snapshot returns `READY_FOR_PILOT`

## Emergency rollback

1. Call the manager rollback command with a specific reason.
2. Confirm every CRM flag is disabled and rollout percentages are zero.
3. Confirm existing CRM records remain readable for authorized recovery/audit work outside disabled product routes.
4. Stop scheduled CRM SLA evaluation if the deployment scheduler cannot honor feature controls.
5. Record the incident, affected interval, users, records, and recovery owner.
6. Fix and requalify the affected slice before re-enabling `CRM_MASTER`.

Rollback never deletes customers, decisions, leads, cases, tasks, promises, alerts, or audit history.

## Go/no-go authority

The product owner and General Manager must record either:

- **Approved for controlled pilot**, with date, cohort, enabled flags, and evidence; or
- **Held**, with named blockers and owners.

Implementation completion alone is not production approval.
