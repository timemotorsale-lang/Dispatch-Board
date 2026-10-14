# R0 Code Authorization Resolution

**Decision ID:** `R0-AUTH-001`
**Decision date:** 2026-07-18
**Authorization source:** Explicit direction from the authenticated Time Motor Sales task requester to resolve R0 before continuing the Inventory Console program
**Decision state:** `APPROVED — BOUNDED REPOSITORY IMPLEMENTATION`
**Applies to:** R1, R2, and R3 repository implementation only

## Decision

The prior R0 `NO-GO FOR M1 CODE` is replaced with a bounded repository-development authorization. R1 through R3 may be implemented and verified in dependency order using synthetic fixtures, existing canonical foundations, additive migrations, rollout-disabled behavior, and the Inventory Console execution protocol.

This resolution does not declare the unresolved production decisions approved. It moves actual external systems, production KPI targets, named operational owners, pilot details, deployment, and activation to their proper release gates rather than forcing them to block safe local repository work.

## Accountable authority for this decision

| Authority | Accountable actor | Scope |
| --- | --- | --- |
| Business/product development authority | Authenticated Time Motor Sales task requester | Repository scope, approved UX, sequencing, and stop boundary |
| Architecture/security/data stewardship | Repository maintainers operating under approved architecture, governance, tests, and PR review | Repository conformance only; cannot accept production risk |
| Production release, finance/title, integration, support, and pilot authority | Named people still required | Deployment, real systems/data, pilot, production activation, and risk acceptance |

The task and eventual commit/PR history provide attribution for the development decision. They do not substitute for named production signatures.

## Permitted now

- Implement R1, then R2, then R3 slices in milestone dependency order.
- Change application code, tests, additive schema/migrations, synthetic fixtures, and documentation required by the named slices.
- Run safe local schema, unit, integration, browser, accessibility, performance, security, concurrency, retry/replay, migration, and reconciliation verification.
- Reuse and extend canonical Vehicle, InventoryUnit, RepairOrder, Parts ledger, tasks, review/approval, evidence, policy, audit, event/outbox, projection, search, and reporting foundations.
- Keep new behavior `OFF` or non-executing `SHADOW` unless a later order explicitly authorizes a narrower local test state.

## Not permitted

- Production deployment or activation.
- Applying migrations to production or importing real business data.
- Pilot activation or staff rollout.
- External provider credentials, calls, writes, or live acknowledgements.
- Presenting synthetic values, mockup values, estimates, stale projections, unavailable adapters, or unapproved targets as authoritative.
- Autonomous consequential recommendations or generic state/stage mutation.
- Commit, push, PR, merge, deployment, or release unless separately ordered.

## Deferred decisions and safe implementation treatment

| Previously blocking decision | Development treatment | Must be resolved by |
| --- | --- | --- |
| Actual source systems and field authority | Use internal canonical records and synthetic adapter contracts only; external adapters remain disabled | R11 adapter slice before any real-system connection |
| Production KPI targets/thresholds | Implement approved metric envelopes, quality grades, and synthetic reconciliation; no production target labels | Before KPI publication, alerts, pilot, or production use |
| Named finance/title/integration/support/pilot owners | Do not execute or activate their controlled boundaries | Before applicable high-consequence slice activation and R12 pilot |
| Pilot location/users/volume/duration | No pilot; synthetic/local verification only | IC-126 pilot authorization |
| Production pause/rollback authority | Implement technical pause/rollback controls; do not exercise production release authority | R12 release readiness |
| Actual provider credentials and acknowledgement | Provider-neutral interfaces and fake adapters only | R11 provider pilot authorization |

## Dependency order

```text
R0-AUTH-001
  → R1 / IC-010–IC-017 implementation and exit evidence
  → R2 / IC-020–IC-028 implementation and exit evidence
  → R3 / IC-030–IC-039 implementation and exit evidence
```

R0 authorization does not waive R1 or R2 exit gates. R3 cannot start merely because this resolution exists.

## First executable order

```text
INVENTORY CONSOLE EXECUTION ORDER
Release: R1
Milestone: M1
Slices: IC-010 through IC-017
Mode: IMPLEMENT
Authority: Code authorized for repository implementation; no pilot or production activation
Branch: codex/inventory-console-r1-foundation-implementation
Commit: No unless separately authorized
Push/PR/Merge: No unless separately authorized
Stop boundary: Verified repository-complete R1 foundations behind OFF/SHADOW rollout, with synthetic fixtures and truthful evidence
```

## Conditions that stop implementation

Stop before proceeding if a slice requires a second canonical domain, destructive migration, production data, external credentials/calls, unapproved financial/title/legal policy, deployment/activation, or a materially different source/authority boundary. Identity, quantity, custody, amount, permission, audit, and reconciliation failures also stop the affected slice.

## Resolution result

`R0 CODE GATE RESOLVED FOR BOUNDED REPOSITORY IMPLEMENTATION.`

Pilot and production gates remain closed.
