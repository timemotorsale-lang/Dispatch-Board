# Inventory Console Implementation Execution Protocol

**Product:** Time Motor Sales Dispatch Board  
**Version:** 1.0 planning baseline  
**Date:** 2026-07-18  
**Status:** Reusable implementation-order contract; does not itself authorize code  
**Program:** [`INVENTORY_CONSOLE_IMPLEMENTATION_PROGRAM.md`](INVENTORY_CONSOLE_IMPLEMENTATION_PROGRAM.md)  
**Roadmap:** [`INVENTORY_CONSOLE_IMPLEMENTATION_ROADMAP.md`](INVENTORY_CONSOLE_IMPLEMENTATION_ROADMAP.md)  
**Architecture:** [`INVENTORY_CONSOLE_IMPLEMENTATION_ARCHITECTURE.md`](INVENTORY_CONSOLE_IMPLEMENTATION_ARCHITECTURE.md)  
**Milestones:** [`INVENTORY_CONSOLE_IMPLEMENTATION_MILESTONES.md`](INVENTORY_CONSOLE_IMPLEMENTATION_MILESTONES.md)

## 1. Purpose

This protocol supplies a consistent language for authorizing and controlling implementation at three levels:

- roadmap release (`R0`–`R12`);
- milestone group (`M0`–`M12`);
- vertical implementation slice (`IC-000`–`IC-129`, using only identifiers defined in the milestone catalog).

It cannot guarantee that defects will never occur. It makes scope, dependencies, engineering controls, verification, evidence, and completion claims explicit so unsafe shortcuts fail closed and review remains auditable.

## 2. Recommended command grammar

Use this compact order header:

```text
INVENTORY CONSOLE EXECUTION ORDER
Release: R<n>
Milestone: M<n>
Slices: IC-<nnn> through IC-<nnn> | IC-<nnn>
Mode: PLAN | IMPLEMENT | VERIFY | RELEASE
Authority: Documentation only | Code authorized | Pilot authorized | Production activation authorized
Branch: codex/<approved-branch-name>
Commit: No | After each accepted slice | At milestone completion
Push/PR/Merge: No | Draft PR | Ready PR | Merge only after approval
Stop boundary: <explicit last permitted outcome>
```

Examples:

```text
INVENTORY CONSOLE EXECUTION ORDER
Release: R3
Milestone: M3
Slices: IC-030 through IC-039
Mode: IMPLEMENT
Authority: Code authorized; production activation not authorized
Branch: codex/r3-m3-inventory-lifecycle-control-tower
Commit: After each accepted slice
Push/PR/Merge: Draft PR; do not merge
Stop boundary: Repository-complete Control Tower behind disabled rollout policy
```

```text
INVENTORY CONSOLE EXECUTION ORDER
Release: R8
Milestone: M8
Slices: IC-081
Mode: IMPLEMENT
Authority: Code authorized; integration and production activation not authorized
Branch: codex/ic-081-parts-demand-reservation
Commit: At slice completion
Push/PR/Merge: No
Stop boundary: Demand/reservation vertical slice with live internal data and tests; no vendor adapter activation
```

## 3. Authority meanings

| Authority | Permitted | Not permitted |
| --- | --- | --- |
| Documentation only | Read, analyze, plan, write/update documentation and approved mockups | Application code, schema, migration, dependency, configuration, deployment, external mutation |
| Code authorized | Implement only named slices, tests, migrations, documentation, and safe local verification | Production activation, provider setup, real data migration, external write, merge unless stated |
| Pilot authorized | Enable named slice for specified roles/locations/volume under approved runbook | Wider rollout or general availability |
| Production activation authorized | Activate only named capabilities after all gates | Unlisted domains, locations, roles, commands, integrations, or policies |

Higher authority is never inferred from lower authority. “Finish,” “continue,” or “do not stop” does not broaden scope.

## 4. Master implementation instruction

Attach the following instruction to every `IMPLEMENT` order:

> Execute only the named Inventory Console release, milestone, and slice identifiers using the approved Program, Roadmap, Architecture, Milestones, UX sources, workflow catalogs, algorithm contracts, ADRs, governance policies, and repository conventions as binding inputs. First verify the branch, worktree, current repository evidence, dependencies, and applicable instructions. Do not infer that a milestone marked planned is absent or that repository code is production-active; reconcile documentation claims against actual code, migrations, tests, routes, APIs, rollouts, and integrations. Identify unresolved decisions or dependency failures before mutation.
>
> Implement each slice as an independently reviewable vertical business capability. Include every applicable data change, invariant, tenant/location scope, server-side capability and field/amount authority, separation of duties, idempotency, optimistic concurrency, immutable evidence, audit, domain event, transactional outbox, task/review/approval behavior, stable command/read contract, projection freshness and reconciliation, UI happy and non-happy states, accessibility, observability, tests, migration/rollback or roll-forward strategy, documentation, rollout gate, and support evidence. Reuse canonical Vehicle, InventoryUnit, RepairOrder, Parts ledger, tasks, reviews, approvals, documents, policy, audit, event, integration, search, and reporting foundations; never create a parallel system without an approved ADR.
>
> Hard safety, identity, ownership, custody, title/release, quantity, financial, customer, privacy, permission, and policy rules always run before scoring or optimization. Recommendations remain advisory and must expose sources, freshness, constraints, reasons, alternatives, confidence, expiry, human decision boundary, and outcome linkage. Never autonomously purchase, approve, assign, reprice, reserve scarce stock, adjust inventory, sell, deliver, transfer, dispose, write off, post accounting, or claim external completion.
>
> Commands must fail closed on invalid state, missing evidence, unauthorized scope, stale version, duplicate conflict, exceeded authority, or separation-of-duties failure. Retried identical commands return the original result; conflicting reuse is rejected. Corrections, cancellation, unwind, and reversal preserve immutable lineage. External requests remain pending until authoritative acknowledgement, and mismatch/retry/replay/reconciliation/manual-degraded states remain explicit.
>
> Production KPIs and projections must not be calculated only in UI components. Every value must carry the approved definition/version, organization/location scope, time zone, period/cutoff, unit/currency, freshness, quality/confidence, exclusions, projection version, and permission-equivalent drill-through. Do not use representative mockup data as live facts or describe undeployed schema, disabled rollouts, sandbox/manual paths, or unavailable adapters as operational.
>
> Before implementation, provide a concise dependency and impact assessment plus the slice-by-slice execution order. During implementation, preserve unrelated user changes and stop if completing the slice requires a materially different domain boundary, destructive migration, new external authority, unapproved policy decision, or scope beyond the order. After each slice, run proportionate unit, domain, repository, integration, browser, accessibility, performance, security, concurrency, retry/replay, migration, and reconciliation checks. Fix failures caused by the slice; report unrelated pre-existing failures with evidence rather than masking them.
>
> A slice is complete only when its milestone acceptance statement and every applicable release gate pass, documentation and status are truthful, no required work remains, and the result is demonstrable from authoritative records through the user experience and audit/event history. Do not mark a release or milestone complete because code compiles, a screen renders, a happy-path test passes, or the token/time budget is ending. Do not commit, push, open a PR, merge, deploy, migrate real data, enable a rollout, or contact an external system unless the execution order explicitly authorizes that action.

## 5. Mandatory preflight response

Before changing code, the implementer must report:

```text
Execution target:
- Release / milestone / slices
- Authorized mode and stop boundary
- Current branch and worktree state

Binding sources read:
- Program / roadmap / architecture / milestones
- UX and workflow/algorithm catalogs
- ADRs / repository instructions / governance references

Dependency status:
- Satisfied
- Partial but safely containable
- Blocking

Repository evidence:
- Existing reusable capabilities
- Missing capabilities
- Conflicting or stale documentation claims
- Unrelated working-tree changes to preserve

Execution order:
1. Slice and business outcome
2. Slice and business outcome

Verification plan:
- Tests and reconciliations
- Accessibility/performance/security/recovery checks
- Rollout and honest-state evidence

Stop/escalation conditions:
- Decisions or authority that require user direction
```

Implementation begins only if the target, dependencies, authority, and safe stop boundary are clear.

## 6. Slice execution loop

For each named slice:

1. Re-read its milestone acceptance and linked source contract.
2. Confirm upstream records, permissions, policies, commands, projections, and UI dependencies.
3. Write or update tests for invariants and failure behavior before or with implementation.
4. Implement the smallest complete vertical capability.
5. Validate migration and compatibility where data changes.
6. Validate command, audit/event/outbox, task/approval, and projection behavior.
7. Validate UI happy and non-happy states, keyboard/screen-reader behavior, and responsive layout.
8. Validate concurrency, idempotent retry, reversal/recovery, reconciliation, and observability.
9. Update implementation evidence and milestone status truthfully.
10. Report completion evidence and wait at the authorized commit/PR/merge boundary.

Independent slices may run in parallel only when they do not modify the same aggregate, schema, contract, projection, route, policy, or shared UI component and their merge order is explicit.

## 7. Definition of done checklist

- [ ] Named business outcome and acceptance statement are satisfied.
- [ ] No scope outside the execution order was implemented or activated.
- [ ] Domain invariants and authoritative ownership are preserved.
- [ ] Tenant/location/role/field/amount/delegation/separation rules are server-enforced.
- [ ] Idempotency, optimistic concurrency, immutable history, audit, events, and outbox pass.
- [ ] Tasks, reviews, approvals, notifications, and external acknowledgements are correct and non-duplicative.
- [ ] Projections/KPIs reconcile and expose scope, cutoff, freshness, quality, exclusions, and drill-through.
- [ ] Loading, empty, partial, stale, insufficient, unavailable, denied, conflict, failure, lag, retry, and recovery states work.
- [ ] Accessibility, responsive behavior, performance, security/privacy, observability, and support evidence pass.
- [ ] Migration, rollback/roll-forward, replay, backup/restore impact, and rollout policy are documented.
- [ ] Unit/domain/repository/integration/browser and risk-specific tests pass.
- [ ] Representative or mockup data is not presented as authoritative.
- [ ] Documentation accurately distinguishes repository-complete, deployed, pilot, live integration, and production-active states.
- [ ] Commit/PR/merge/deploy actions match the explicit order.

## 8. Completion report format

```text
Execution result: COMPLETE | PARTIAL | BLOCKED

Completed slices:
- IC-___ — outcome and authoritative evidence

Files and contracts changed:
- Domain/data
- Commands/events/audit
- Projections/APIs
- UI/accessibility
- Tests/operations/docs

Verification:
- Passed checks
- Reconciliation evidence
- Known unrelated failures

Capability truth:
- Repository complete
- Deployment/migration status
- Rollout status
- Integration status
- Pilot/production status

Remaining work or decisions:
- Explicit items

Git/external actions:
- Commit / push / PR / merge / deployment actually performed
```

## 9. Stop conditions

Stop and request direction before proceeding when:

- the order names an undefined or mismatched release/milestone/slice;
- the current branch does not contain required merged dependencies;
- existing user changes overlap materially and cannot be preserved safely;
- an approved source conflicts with an implementation-critical business decision;
- a destructive or irreversible migration lacks approved recovery;
- external access, credentials, provider choice, legal/financial policy, or production authority is missing;
- the slice would require a second canonical identity, lifecycle, ledger, task, approval, or audit system;
- tests expose identity, tenant, quantity, custody, amount, audit, security, or reconciliation failure;
- implementation would misrepresent planned, stale, estimated, requested, or unacknowledged state as complete.

## 10. User order templates

### Execute one slice

```text
Execute Inventory Console R__/M__, slice IC-___, under the Inventory Console Implementation Execution Protocol.
Mode: IMPLEMENT.
Authority: Code authorized for this slice only; no production activation.
Branch: codex/ic-___-<short-name>.
Commit after all acceptance and verification gates pass. Do not push, open a PR, merge, deploy, or contact external systems.
Stop at: repository-complete, rollout-disabled vertical slice with truthful implementation evidence.
```

### Execute one milestone group

```text
Execute Inventory Console release R__ / milestone M__, slices IC-___ through IC-___, under the Inventory Console Implementation Execution Protocol.
Mode: IMPLEMENT.
Authority: Code authorized for the named slices only; no pilot or production activation.
Branch: codex/r__-m__-<milestone-name>.
Implement in dependency order and treat every slice as independently reviewable. Commit after each accepted slice. Do not push, open a PR, merge, deploy, migrate real data, or enable integrations unless separately authorized.
Stop at: repository-complete milestone behind disabled rollout controls, with all gates and evidence reported.
```

### Verify a completed milestone

```text
Verify Inventory Console release R__ / milestone M__, slices IC-___ through IC-___, under the Inventory Console Implementation Execution Protocol.
Mode: VERIFY.
Authority: Read-only inspection and safe local tests; do not change code unless I separately authorize fixes.
Compare repository evidence against every acceptance statement and release gate. Report complete, partial, missing, contradictory, and falsely claimed capabilities with exact evidence.
```

### Authorize a pilot

```text
Prepare—but do not activate—the pilot for Inventory Console R__/M__, slices ______, under the approved pilot and rollback plan.
Mode: RELEASE.
Authority: Pilot preparation only. Pilot activation requires my separate confirmation after the readiness report.
Scope: <locations, roles, users, volume, commands, integrations>.
Produce the go/no-go evidence, monitoring, support, pause, rollback, reconciliation, and outcome checklist.
```

## 11. Change control

Changes to this protocol require versioned program approval. A project-specific order may narrow this protocol but must not silently remove its identity, authorization, idempotency, audit, evidence, reconciliation, accessibility, security, recovery, honest-state, or completion requirements.
