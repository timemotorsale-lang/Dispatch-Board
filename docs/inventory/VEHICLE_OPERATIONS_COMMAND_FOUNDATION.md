# Vehicle Operations Enterprise Command Foundation

**Implemented:** 2026-07-14  
**Milestone:** M1 (`VEH-010` through `VEH-017`)  
**State:** Implemented in the repository; database migration deployment and production rollout remain pending

## Outcome

Milestone 1 supplies the shared, tenant-safe command path that later Vehicle Operations aggregates must use. It does not create the canonical vehicle registry, inventory, repair-order, parts, or accounting workflows planned in later milestones.

## Implemented architecture

```text
Authenticated API request
  -> organization/location and capability policy
  -> canonical request hash + idempotency key
  -> expected aggregate version check
  -> one database transaction
       command ledger
       aggregate version
       domain event
       immutable audit event
       outbox message
  -> retry-safe response

Outbox worker
  -> atomically claim pending messages
  -> publish
  -> mark published or schedule bounded exponential retry
  -> dead-letter after the configured maximum
```

The implementation is in `src/server/enterprise-command/`, with API boundaries at `POST /api/vehicle-operations/commands` and `GET|PATCH /api/settings/vehicle-operations`. Managers can inspect health and control rollout at `/settings/vehicle-operations`.

## Foundation controls

| Control | Evidence |
| --- | --- |
| Tenant isolation | Every new foundation record carries `organizationId`; location-bearing records verify the organization/location pair in SQL and at command intake. |
| Capability policy | Server-side capability evaluation supports role defaults, location scope, explicit allow/deny, time-bounded delegation, owner-only constraints, and delegated amount ceilings. Explicit deny wins. |
| Idempotency | Organization/domain/command/idempotency key is unique. Reuse with the same canonical request hash returns the original result; reuse with another payload returns conflict. |
| Concurrency | Each subject has an aggregate version. A stale `expectedVersion` produces an HTTP 409 conflict, and the rollout UI reloads current state for recovery. |
| Audit and events | Successful commands atomically write the command result, domain event, audit reason, correlation ID, and outbox message. |
| Outbox | Workers conditionally claim pending rows as `PROCESSING`, retry failures with bounded backoff, and surface dead letters. |
| Rollout | Flags support `OFF`, `SHADOW`, `PILOT`, and `GENERAL`; pilot evaluation supports deterministic percentage cohorts, explicit users, and location-specific overrides. Flag changes require a reason and expected version and create rollout events. |
| Health | A manager-safe projection reports 24-hour commands/failures, pending and oldest outbox work, dead letters, projection failures, and maximum projection lag without exposing credentials. |

## Database objects

- `EnterpriseAggregateVersion`
- `EnterpriseCommandLedger`
- `EnterpriseDomainEvent`
- `EnterpriseAuditEvent`
- `EnterpriseOutboxMessage`
- `VehicleCapabilityGrant`
- `VehicleOperationsFeatureFlag`
- `VehicleOperationsRolloutEvent`
- `EnterpriseProjectionCheckpoint`

The migration defaults the Vehicle Operations master and vehicle registry flags to `OFF`; the enterprise command flag starts in non-executing `SHADOW`. This keeps deployment additive and prevents accidental activation.

## Contract for later milestones

Every M2+ vehicle mutation should call the enterprise command service with a stable command type, subject identity, expected version, unique idempotency key, business reason, and location when applicable. Domain-specific writes must be added to the same repository transaction as the ledger/event/audit/outbox records; calling the generic control command alone does not make a later aggregate durable.

## Verification and remaining release work

Automated coverage protects command validation and hashing, capability decisions, rollout evaluation and versioning, health classification, outbox publish/retry behavior, and Prisma/migration constraints. Before production activation, operators must deploy the migration, run database-backed integration tests, connect a real publisher, schedule the outbox worker, configure alerting, exercise dead-letter replay, and collect pilot evidence under the M0 reliability policy.
