# CRM Next — Technical Architecture

## Platform decision

CRM Next is a bounded module inside the existing Dispatch Board application. Reuse the established stack and shared services unless codebase inspection proves a change is necessary.

## Target layers

CRM Next UI → CRM application services → shared platform services (auth/policies/task engine/activity/appointments/search/notifications) → repositories/integration adapters → PostgreSQL + authoritative external systems.

## Server source of truth

Permissions, status transitions, assignment, case rules, task creation, intelligence state, and activity-event creation are enforced server-side.

## Event-backed design

Significant customer actions create durable events. Timeline, intelligence, reporting, and auditability consume them where appropriate instead of inferring history from UI state.

## Shared capabilities

Reuse authentication/session; staff/roles/permissions; Task Engine; Activity/Event infrastructure; Appointment Command Center interfaces; notifications when implemented; app shell/design system; audit/logging conventions.

## Reliability

Use transactional boundaries for mutations that change domain state plus corresponding activity/work records. Define idempotency for integrations/repeated actions. Provide loading, empty, error, retry, and conflict states.

## Performance

Use purpose-built read models/queries for Command Center and Customer 360. Paginate timelines. Index customer identifiers, ownership, open cases, pipeline stage, attention state, and activity timestamps.

## Observability

Log failed integrations, failed task creation, intelligence failures, permission denials, and migration anomalies with useful context.

## Feature isolation

Develop CRM Next behind a separate route/feature flag so Legacy remains operational until promotion.

