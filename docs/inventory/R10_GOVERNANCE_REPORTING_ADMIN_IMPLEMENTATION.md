# R10 Governance, Reporting & Administration Implementation

Status: bounded repository implementation complete; activation pending  
Roadmap release: R10  
Milestone: M10  
Slices: IC-100 through IC-109

## 1. Outcome

R10 connects Reviews, Approvals, Reports, and Administration through one permission-scoped read contract at `GET /api/inventory-governance`. The release composes authoritative records from Tasks, Acquisition, Inventory-to-Frontline, Retail Completion, Shop, Parts, Disposition & Wholesale, Vehicle 360, enterprise commands/events, evidence governance, policies, roles, capabilities, rollout flags, and projection health.

R10 does not create a generic approval engine or alternate operational state. Queue actions return staff to the owning domain command so exact-version, policy, amount, location, authority, and separation-of-duties rules remain server enforced.

## 2. Enterprise experience

| Destination | Route | Implemented behavior |
| --- | --- | --- |
| Reviews | `/manager-review?scope=inventory&view=reviews` | Evidence, exception, readiness, blocker, owner, age, due time, version, and authoritative return context |
| Approvals | `/manager-review?scope=inventory&view=approvals` | Exact proposal, version, policy, amount, evidence, owner, expiry/due state, and contextual decision route |
| Reports | `/reports?scope=inventory` | Governed KPI facts, definition version, cutoff, timezone, authorized cohort, quality, lifecycle/shop cohorts, and drill-through |
| Administration | `/administration` | Policy/rollout, access/authority, audit, background operations, data health, and retention workspaces |

Inventory Lifecycle and Control Tower now identify the R7, R8, R9, and R10 workspaces as connected rather than displaying stale pre-release unavailability messages.

## 3. Slice conformance

| Slice | Repository implementation |
| --- | --- |
| IC-100 | Global Reviews composes review-ready Tasks plus Acquisition, Frontline, Retail Completion, and Disposition exceptions. It preserves role/location scope, evidence labels, owner, age, due/overdue state, exact subject/version, action, and return context. |
| IC-101 | Global Approvals composes approval-waiting Tasks, Acquisition authorization, Retail sale authorization, Disposition channel/price/reserve, and Parts purchase orders. It exposes exact version, policy and amount while leaving decisions in independently governed domain commands. |
| IC-102 | The existing permission-aware Vehicle 360 service remains the relationship authority for vehicle identity, InventoryUnit cycles, Shop, Parts, appointments, customer context, documents, costs, decisions, timeline, graph, and field-level access. R10 links governance rather than duplicating this graph. |
| IC-103 | Reports expose versioned KPI codes/definitions, cutoff, timezone, authorized location cohort, quality, lifecycle/shop cohorts, and drill-through. Wave 4 adds durable closed-period snapshots and independently approved restatement records with prior/proposed content hashes. |
| IC-104 | Controlled CSV exports require General Manager authority, an allowlisted resource and fields, authorized location cohort, reason, cutoff, a 1–500 row bound, watermark, content hash, 24-hour expiry, authenticated delivery, and immutable creation/download events. |
| IC-105 | Administration projects existing versioned policy records and feature rollout state. The established policy workbench retains draft, simulation, independent approval, pilot, activation, outcome, and rollback commands. |
| IC-106 | Administration projects roles, user counts, duty counts, effective capability grants, constraints, locations, effects, and validity. Existing Team administration remains the assignment command surface. |
| IC-107 | Audit explorer projects immutable enterprise audit events with actor, subject, domain, event, location, reason, correlation and occurred time. The existing bounded API continues to support server-side filters and limits. |
| IC-108 | Background Operations projects failed commands, outbox attention, projection state, lag and errors. Wave 4 adds owned, severity-coded incidents, resolution evidence, optimistic versions, and General-Manager-authorized dead-letter requeue into the internal outbox. Provider acknowledgement is never inferred. |
| IC-109 | Retention projects due evidence and legal-hold/deletion rules. Wave 4 adds owned privacy/support cases, approved runbook references, independent deletion review, and resolution evidence; deletion still executes only through the evidence service. |

## 4. Governance boundaries

- Review and approval are distinct queues and cannot substitute for each other.
- Queue presence does not grant decision authority.
- No generic state-change or generic approve endpoint exists in R10.
- All consequential decisions return to the exact owning aggregate and command.
- Delegated managers see location-bound domain records only where active location access exists; General Managers retain enterprise scope.
- KPI values carry definition versions, cutoff, quality and cohort context.
- Recommendations remain advisory and do not appear as approvals.
- Audit, outbox, retention, policy, role and rollout sources remain authoritative in their existing services.

## 5. Capability truth

- Contextual domain decisions: connected.
- Controlled CSV export: activated for General Managers with allowlisted fields, bounded rows, expiry, watermark, content hash, and delivery audit; print remains unavailable.
- Policy publication: existing four-eyes domain commands only.
- Background provider operations: internal dead-letter requeue only; provider delivery remains unclaimed.
- Cross-console reporting: current projection plus durable closed-period snapshots and independently approved restatements.

## 6. Verification evidence

- TypeScript typecheck: passed.
- Focused R10 and regression tests: 3 files, 20 tests passed.
- Full lint: passed with zero warnings.
- Prisma schema validation: passed.
- Production build: passed; 147 pages generated, including `/manager-review`, `/reports`, `/administration`, and `/api/inventory-governance`.
- R10 introduces no Prisma schema migration; it composes existing authoritative sources.

## 7. Activation boundary

Repository completion does not authorize production activation. The following remain pending:

- approved role/location/field/amount/delegation assignments and representative authorization table tops;
- controlled print, external delivery and independently reviewed production export exercises;
- production-period snapshot retention, approved target baselines and representative restatement exercises;
- policy-administration simulation and rollback evidence across every Inventory domain, not only established policy owners;
- provider-side replay acknowledgement and representative incident/recovery verification;
- evidence-service deletion, legal-hold and support runbooks exercised against representative data;
- accessibility, performance, security, recovery, training, pilot and business sign-off.

Until these gates pass, R10 is a bounded governance/read implementation with contextual domain decisions and no claim that export, provider recovery, or enterprise policy activation is generally available.

## Wave 6 authority amendment — 2026-07-18

IC-106 is now repository-complete. General Managers have an audited, idempotent, exact-version command surface for allow/deny capability grants with effective dates, location scope, single and cumulative amount limits, field allowlists, own-resource constraints, and independent-approval requirements. The command writes the authoritative grant, enterprise command receipt, domain event, audit record, and outbox message. Operational assignment approval, representative authorization table tops, and production activation remain separate gates.
