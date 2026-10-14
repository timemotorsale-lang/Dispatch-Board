# Unified CRM Current Evidence Baseline

**Document ID:** `UCRM-BASELINE-001`
**Observed baseline:** `a0cd671c` on `main`
**Observation date:** 2026-08-14
**Status:** Repository evidence inventory; not a production-readiness declaration

## 1. Why this document exists

The repository contains mature operational modules, partial CRM foundations, extensive Sales Console planning, prototype-style UI, and focused tests. Agents must not equate the existence of a file, type, mockup, sample record, disabled control, or passing helper test with a complete operational workflow.

This baseline records what was directly observed before the Unified CRM foundation branch began. Every implementation milestone must refresh the affected evidence rather than relying indefinitely on this snapshot.

## 2. Shared platform evidence

Observed existing foundations:

- Next.js App Router, React, TypeScript, PostgreSQL, and Prisma;
- server-side session authentication and role-aware workspace routing;
- organization, location, user, role, duty, task, appointment, vehicle, repair, and activity foundations;
- repository/service/validation patterns across established domains;
- activity event and audit-oriented patterns;
- unit, integration, and Playwright end-to-end test infrastructure;
- feature/rollout controls in several modules;
- migration, seed, build, lint, typecheck, test, and E2E scripts.

These are reusable patterns, not blanket proof that Unified CRM permissions, isolation, audit, performance, or release requirements already pass.

## 3. Customer-domain evidence

Directly observed in the Prisma schema:

- `Customer` with organization scope, customer number, status, owner, contact summary, source, interaction/next-action timestamps, archive, duplicate, merge, and retention fields;
- `CustomerContactPoint` with normalized values, primary state, and consent status;
- `CustomerInteraction`, `CustomerNote`, `CustomerVehicle`, and `CustomerDocumentRequirement`;
- `CustomerLead` and `CustomerLeadTaskLink`;
- CRM decision, SLA, rollout, promise, service, communication-preference, and estimate-approval records in the broader schema;
- durable relationships from customers to appointments, tasks, service visits, and repair orders.

Directly observed application evidence:

- `/customers`, `/customers/[customerId]`, `/customers/customer-360`, and resolution surfaces exist;
- Customer 360 calls a server endpoint and uses a purpose-built read service;
- customer dashboard, lead, SLA, case/resolution, decision, rollout, and activity service/repository files exist;
- focused customer and CRM tests exist.

Limitations that still require milestone proof:

- not every visible quick action is an operational command;
- all fields and tabs have not been proven complete, mutable, or policy-filtered for every role;
- identity merge, field-level security, import rollback, custom fields, and production integration behavior require explicit proof;
- existing customer documentation contains historical planned/implemented distinctions that must be re-audited against the current branch.

## 4. Sales-domain evidence

Observed foundations include:

- extensive Sales Console planning and architecture documents;
- pipeline, Customer 360 integration, search, quote scenario, messaging, permissions, audit, forecasting, finance-handoff, approvals, and workflow modules;
- manager-review request and completed-sale record server paths;
- a `/sales` route and a large operating-console presentation;
- many focused Sales Console unit tests.

Observed limitations:

- the current `/sales` experience imports multiple `live`, `sample`, readiness, and prototype-shaped in-memory sources;
- many visible controls are labeled controlled, source-system, future, or governed rather than backed by a completed command;
- a canonical operational opportunity aggregate and complete route/service coverage must be proven before the new CRM pipeline can be called live;
- search, pipeline, work queues, quotes, communications, forecasting, and manager command cannot be accepted based only on presentation modules or pure helper tests;
- prior architecture audit identified the backend as the largest Sales Console gap and recommended workflow-first reconstruction.

Unified CRM should reuse accepted domain logic and tests where valid, but must not wrap the existing Sales UI and call the migration complete.

## 5. Test and repository health evidence

Observed on 2026-08-14:

- approximately 530 files exist under `src/tests`;
- a focused five-file CRM/customer/sales test run passed 38 tests;
- the recently committed Diagnostics-focused test run passed 12 tests;
- focused lint for that Diagnostics change passed;
- the working tree and `origin/main` were synchronized before this branch was created.

Known baseline issue:

- `npm run typecheck` fails in `src/app/api/service-close-parts/route.ts` because the code accesses `duplicate` on a union member that does not declare it.

The known failure is outside Unified CRM scope, but the CRM foundation must record it. No CRM milestone may claim a green repository-wide quality gate until the baseline is repaired or an explicitly approved, time-bounded exception exists.

## 6. Reuse classification

| Classification | Meaning | Examples |
| --- | --- | --- |
| `REUSE` | Mature shared capability should be consumed through its existing contract | authentication, users/roles, tasks, appointments, vehicle/repair identities, activity patterns |
| `EXTEND` | Existing domain is authoritative but needs additive CRM behavior | Customer identity, contact points, leads, Customer 360, promises, audit projections |
| `REBUILD_WORKFLOW` | Concepts or presentation exist, but an operational vertical slice must replace sample/local behavior | CRM Home, opportunity pipeline, global CRM search, Revenue/Quote workspace, manager CRM command center |
| `ADAPT` | Existing source domain remains authoritative; CRM receives a purpose-built projection or command bridge | Inventory, Dispatch, Appointments, Tasks, Repair, Documents, Finance handoff |
| `DEFER` | Do not activate in the initial release | external messaging/telephony, DMS sync, unrestricted workflow builder, autonomous actions |

## 7. First implementation audit requirements

Before schema or UI implementation, `UCRM-010` must produce a fresh capability map that identifies for each planned capability:

- authoritative source;
- current schema and migration evidence;
- repository and service evidence;
- route or command evidence;
- policy and validation evidence;
- live, sample, local-only, disabled, or missing UI state;
- unit, integration, E2E, accessibility, and security evidence;
- migration/reuse/rebuild disposition;
- owner and next milestone.

## 8. Evidence rule

A capability may move to `VERIFIED` only when the current baseline proves all applicable layers:

```text
migration -> repository -> service -> policy -> validation -> route/command
-> read model/UI -> activity/audit -> focused tests -> browser proof -> docs
```

If a layer is intentionally unnecessary, the milestone evidence must say why. Silence is not evidence.
