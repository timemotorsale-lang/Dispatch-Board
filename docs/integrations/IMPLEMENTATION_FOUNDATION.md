# Integration Implementation Foundation

## Objective

Build outside-tool integrations as a provider-neutral platform first, then add named providers one at a time. The first implementation work should strengthen contracts, configuration, health, audit, and source authority before any real external side effects are enabled.

The integration program should move progressively. Start with simple integrations that support daily work, avoid automatic writes, and are easy to explain to staff. Add complexity only after the simpler layer is reliable, useful, and understood.

## Non-Goals

- Do not connect a live vendor by default.
- Do not store real provider credentials in source, fixtures, screenshots, or documentation.
- Do not add direct provider calls inside UI components.
- Do not treat provider data as canonical without an explicit source-authority decision.
- Do not enable communication, payment, accounting, document, or record mutation without consent, audit, idempotency, and rollback.

## Architecture Shape

Every provider should pass through the same layers:

1. Provider registry: name, family, environment, status, owner, scopes, rate limits, and kill switch.
2. Credential reference: environment-managed secret or encrypted token reference, never plaintext in business rows.
3. Adapter contract: `health`, `pull`, `push`, webhook verification, idempotency, correlation, retryability, and lineage evidence.
4. Mapping layer: versioned conversion between provider records and Dispatch Board domain records.
5. Authority layer: field-level source of truth, direction, freshness, conflict rule, and owning domain.
6. Command boundary: all consequential writes go through existing domain services, not direct database edits.
7. Audit and reconciliation: every provider event gets correlation, source, result, conflict state, and replay posture.
8. User surface: health, held states, degraded states, manual fallback, and safe action buttons.

## Implementation Order

### Phase 0: Daily-use documentation and decisions

- Choose one or two simple daily-operation use cases before any broad integration program.
- Prefer read-only lookup, safe links, manual import/export, or draft-only workflows first.
- Complete provider intake templates for the first target tools.
- Fill the source-authority matrix for affected records and fields.
- Decide read-only, write-back, sync, or action-only behavior per provider.
- Define consent, privacy, retention, and human-approval rules.

### Phase 1: Read-only and manual-assist foundation

- Normalize integration family names across CRM, Inventory, Sales, Appointments, and Tasks.
- Add or confirm provider registry records and feature flags.
- Confirm adapter contract tests cover idempotency, retryability, lineage, tenant isolation, and safe failure.
- Confirm integration health and recovery surfaces can show held/degraded/failed states.
- Confirm audit records do not store secrets or unnecessary payload content.
- Show provider status and source context in the app before allowing any provider write.

### Phase 2: Sandbox provider shell and lookup

- Add one provider shell with fake/sandbox credentials only.
- Implement health checks and read-only discovery before any write action.
- Add webhook signature verification before accepting inbound events.
- Add dry-run mapping preview before persisting provider-derived data.
- Keep the first usable workflow limited to lookup, copy/reference, or user-confirmed intake.

### Phase 3: Draft-only or human-confirmed pilot

- Enable a narrow, role-limited workflow behind a feature flag.
- Use small bounded datasets and explicit organization/location scope.
- Let the integration prepare drafts, recommendations, or provider-ready packets before sending or writing.
- Require browser proof, rollback rehearsal, and reconciliation evidence.
- Keep manual fallback visible.

### Phase 4: Supervised write-back

- Approve provider terms, scopes, retention, incident paths, and data-processing obligations.
- Rotate production credentials through the approved secret manager.
- Confirm alerting, support ownership, runbooks, and kill switches.
- Enable provider writes only when staff explicitly confirms the action and can see what will change.
- Reconcile every write result back to an internal command/audit record.

### Phase 5: Production activation and automation

- Promote only after tests, security gates, and operational signoff pass.
- Allow background sync or automation only for workflows that have already succeeded as supervised actions.

## Required Adapter Behaviors

Every adapter must:

- accept organization, correlation ID, idempotency key, and mapping version;
- return a lineage ID for every success or failure that reaches the provider boundary;
- classify errors as retryable or final;
- never expose secrets in errors, logs, audit, or UI;
- support a health check that does not mutate provider state;
- use bounded timeouts and rate-limit awareness;
- fail closed when credentials, scopes, tenant mapping, consent, or feature flags are missing;
- preserve enough evidence for replay and reconciliation without storing unnecessary sensitive payloads.

## Runtime States

| State | Meaning | User posture |
| --- | --- | --- |
| `PLANNED` | documented but not implemented | show as future/held only |
| `SANDBOX` | provider shell or sandbox behavior exists | allow testing only |
| `PILOT` | limited real workflow for approved cohort | show warnings and manual fallback |
| `ACTIVE` | approved production workflow | show health, audit, and support path |
| `DEGRADED` | partial outage or stale provider | block risky actions, allow safe fallback |
| `PAUSED` | kill switch or release pause active | no provider side effects |
| `RETIRED` | no longer used | preserve history, block new work |

## Release Blockers

An integration must not ship if any of these are unresolved:

- missing source-authority decision for a field being written;
- provider credentials handled outside the approved secret path;
- webhook signature or replay protection missing;
- no idempotency key for provider-side mutation;
- no conflict rule for duplicate or mismatched external identity;
- communication path can bypass consent or suppression;
- provider write can bypass existing domain permissions or audit;
- rollback would delete accepted internal facts or hide audit evidence;
- provider failure can silently mark work complete;
- tests do not cover denied, stale, duplicate, retry, and revoked-credential behavior.

## First-Code Recommendation

When we move from docs to code, start with platform hardening rather than a named provider:

- an integration registry/read model,
- provider-family configuration,
- source-authority records,
- health/readiness UI,
- adapter harness tests,
- audit/reconciliation event shapes.

Named providers should come only after this foundation is visible and testable.
