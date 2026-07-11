# Customers Console Implementation Milestones

**Document:** Customers Console Implementation Milestones
**Date:** 2026-07-10
**Status:** Codex execution plan
**Roadmap:** [`CUSTOMERS_MVP_ROLLOUT_ROADMAP.md`](CUSTOMERS_MVP_ROLLOUT_ROADMAP.md)
**Architecture:** [`CUSTOMERS_ARCHITECTURE.md`](CUSTOMERS_ARCHITECTURE.md)

---

## 1. Execution Rules

Each milestone is implemented sequentially. A milestone may contain several slices, but only one slice should be active at a time.

Every applicable vertical slice includes:

```text
Migration -> repository -> service -> policy -> validation -> route
-> read model/UI -> activity/audit -> focused tests -> browser proof -> docs
```

Rules:

- Start from the latest merged Customers baseline.
- Keep branch names under `codex/`.
- Do not stack unrelated feature work on an unmerged milestone.
- Use additive migrations and protect existing Appointment customer records.
- Do not bind production workflow to the current dashboard sample constants.
- No UI-only mutation is accepted as a completed slice.
- No API is complete without server policy and validation.
- No milestone is complete without evidence listed in its exit gate.
- Update `CURRENT_IMPLEMENTATION_STATUS.md` after every accepted milestone.

---

## 2. Status Legend

| Status | Meaning |
| --- | --- |
| Implemented | Code and required evidence exist on the current baseline. |
| In progress | The active branch contains incomplete milestone work. |
| Planned | Architecture and acceptance criteria exist; implementation is not claimed. |
| Deferred | Explicitly outside the day-one release. |

---

## 3. Milestone CRM-0 - Readiness And Design Gate

**Branch:** `codex/customers-mvp-readiness-gate`
**Status:** In progress

| Slice | Deliverable | Done when |
| --- | --- | --- |
| CRM-000 | Customers module position | Core docs state Customers is a first-class Dispatch Board module, not a separate deployment. |
| CRM-001 | Front-page source of truth | `/customers` uses the approved dashboard composition with responsive light/dark behavior. |
| CRM-002 | Customer 360 source of truth | Detail-shell composition and future `/customers/[customerId]` route boundary are recorded. |
| CRM-003 | Architecture baseline | Domain ownership, services, policies, commands, read models, events, integrations, and ADRs are accepted. |
| CRM-004 | MVP rollout roadmap | Sequenced milestones, branches, exit gates, deferrals, and day-one definition are accepted. |
| CRM-005 | Browser smoke baseline | Customers route, home summary, right rail, theme switching, and persistence have repeatable proof. |

Milestone exit gate:

- CRM-000 through CRM-005 are complete on one baseline.
- Core architecture links to the Customers planning package.
- Current status distinguishes sample UI from durable workflow.

---

## 4. Milestone CRM-1 - Trusted Customer Foundation

**Branch:** `codex/customers-trusted-foundation`
**Status:** Planned
**Depends on:** CRM-0

| Slice | Deliverable | Acceptance evidence |
| --- | --- | --- |
| CRM-010 | Customer profile schema extension | Additive migration adds owner and approved profile fields without breaking Appointment customer relations. |
| CRM-011 | Customer contact points | Normalized phone/email/address records enforce primary and organization constraints. |
| CRM-012 | Customer validation | Unit tests cover normalization, required identity, status, contact, owner, and cross-field rules. |
| CRM-013 | Customer policies | Manager/staff view and mutation boundaries reject cross-organization access. |
| CRM-014 | Create customer command | Validated create writes customer, contact points, activity, and audit in one transaction. |
| CRM-015 | Update and owner commands | Versioned updates reject stale writes and inactive/unauthorized owners. |
| CRM-016 | Archive command | Archive removes the customer from active workflow without destructive deletion. |
| CRM-017 | Synthetic seed package | Development data contains no real customer personal information and supports browser tests. |

Milestone exit gate:

- Manager can create, edit, assign, and archive a customer through server-authoritative commands.
- Staff behavior matches the accepted permission baseline.
- Prisma, migration, service, route, and policy tests pass.

---

## 5. Milestone CRM-2 - Search, List, And Customer 360

**Branch:** `codex/customers-search-360`
**Status:** Planned
**Depends on:** CRM-1

| Slice | Deliverable | Acceptance evidence |
| --- | --- | --- |
| CRM-020 | Customer list read model | Paginated, organization-filtered list supports status, owner, and source filters. |
| CRM-021 | Customer search service | Search supports number, name, normalized phone/email, VIN, and stock number without field leakage. |
| CRM-022 | Customers list UI | Search, filters, pagination, loading, empty, error, and retry states are usable on desktop/mobile. |
| CRM-023 | Customer 360 route | `/customers/[customerId]` loads a real customer and preserves selected tab in the URL. |
| CRM-024 | Customer 360 overview model | Profile header, contact preference, ownership, relationship counts, and next action are live. |
| CRM-025 | Restricted/not-found behavior | Merged, archived, missing, and unauthorized records have explicit safe outcomes. |
| CRM-026 | Customers home identity metrics | Total customer and ownership metrics use a real read model with freshness. |
| CRM-027 | Search/profile browser gate | Manager and staff search/detail scenarios prove policy and UI states. |

Milestone exit gate:

- Authorized users can find and open durable customers.
- Customer 360 identity and overview contain no sample profile constants.
- Search, detail, and permission tests pass.

---

## 6. Milestone CRM-3 - Customer Memory

**Branch:** `codex/customers-activity-timeline`
**Status:** Planned
**Depends on:** CRM-2

| Slice | Deliverable | Acceptance evidence |
| --- | --- | --- |
| CRM-030 | Interaction/activity schema | Interaction, note, and customer event records retain actor, channel, outcome, source, and correlation. |
| CRM-031 | Log interaction commands | Calls, messages, visits, and notes validate channel, direction, outcome, and occurred time. |
| CRM-032 | Promise and next-action command | Required owner and due time are enforced for promised follow-up. |
| CRM-033 | Consent/contact policy | Restricted channels and opt-out states are rejected server-side. |
| CRM-034 | Timeline read model | Filtered chronology merges customer-owned and approved cross-module events. |
| CRM-035 | Customer 360 Timeline UI | Quick log, filters, empty/error states, and event details are keyboard accessible. |
| CRM-036 | Shared Activity projection | Important customer events appear in the existing Activity Feed with safe payloads. |
| CRM-037 | Customer-memory browser gate | A staff interaction and next action persist and remain visible after reload. |

Milestone exit gate:

- The customer timeline is event-backed and durable.
- Staff can record an outcome and next step without creating inconsistent state.
- Shared Activity projection is correlated and tested.

---

## 7. Milestone CRM-4 - Lead Intelligence And Follow-Up

**Branch:** `codex/customers-lead-follow-up`
**Status:** Planned
**Depends on:** CRM-3

| Slice | Deliverable | Acceptance evidence |
| --- | --- | --- |
| CRM-040 | Lead schema and lifecycle | Lead stores customer, source, stage, owner, priority, vehicle interest, timeframe, and next action. |
| CRM-041 | Lead command service | Create, assign, transition, close, reopen, and set-next-action commands enforce lifecycle rules. |
| CRM-042 | Lead pipeline read model | Pipeline counts reconcile with lead records and respect saved filters. |
| CRM-043 | Lead list/pipeline UI | Managers can switch list/pipeline views and see aging, source, owner, and next action. |
| CRM-044 | Lead exception queues | Unassigned, untouched, overdue, aging, and high-intent queues have explainable membership. |
| CRM-045 | Lead-to-task bridge | Idempotent command creates linked follow-up work with customer/lead correlation. |
| CRM-046 | Lead-to-appointment bridge | Idempotent command creates a customer-linked appointment draft. |
| CRM-047 | Home dashboard lead binding | New Leads, Open Deals, pipeline, sources, and recent leads use live read models. |
| CRM-048 | Lead workflow browser gate | Manager completes intake-to-follow-up while staff completes owned next action. |

Milestone exit gate:

- Every active lead has owner, stage, and dated next action.
- Dashboard and pipeline counts reconcile.
- Task and Appointment bridges are duplicate-safe.

---

## 8. Milestone CRM-5 - Cases, SLA, And Escalation

**Branch:** `codex/customers-case-sla`
**Status:** Planned
**Depends on:** CRM-4

| Slice | Deliverable | Acceptance evidence |
| --- | --- | --- |
| CRM-050 | Case schema | Case stores type, priority, state, owner, source, response target, resolution target, and version. |
| CRM-051 | SLA rule service | Business-hours calculations are deterministic, timezone-safe, and unit tested. |
| CRM-052 | Case lifecycle commands | Create, assign, acknowledge, investigate, wait, escalate, resolve, reopen, and cancel are explicit. |
| CRM-053 | Resolution governance | Resolution code and outcome notes are required; overrides require authority and reason. |
| CRM-054 | Case queue read model | Open, warning, breached, escalated, waiting, and owned queues reconcile with case state. |
| CRM-055 | Cases UI | Customer 360 tab and manager board expose SLA, owner, next action, and safe commands. |
| CRM-056 | Case-to-task bridge | Case execution task retains durable customer and case correlation. |
| CRM-057 | Case activity/audit | State, SLA, escalation, and resolution events are visible and auditable. |
| CRM-058 | Case workflow browser gate | Manager opens, escalates, delegates, and resolves a case with complete evidence. |

Milestone exit gate:

- Every open case has owner, priority, SLA state, and next action.
- Resolution and escalation are governed and tested.
- Case work can move to Tasks without losing context.

---

## 9. Milestone CRM-6 - Dealership Relationship Bridges

**Branch:** `codex/customers-relationship-bridges`
**Status:** Planned
**Depends on:** CRM-5

| Slice | Deliverable | Acceptance evidence |
| --- | --- | --- |
| CRM-060 | Customer-vehicle relationship schema | Relationship type, status, dates, source, and organization constraints are explicit. |
| CRM-061 | Vehicle relationship service/UI | Interest, test drive, trade, purchase, service, ownership, finance, and BHPH context are manageable. |
| CRM-062 | Document requirement schema | Required type, owner, status, due time, source, and completion evidence are durable. |
| CRM-063 | Document tracker UI | Missing, due, overdue, received, waived, and rejected states are visible in Customer 360. |
| CRM-064 | Customer-task durable link | Task relationship replaces text-only authority while preserving historical display context. |
| CRM-065 | Customer-appointment projection | Existing participant/customer snapshots are safely visible from Customer 360. |
| CRM-066 | Document-to-task bridge | Missing-document follow-up creates duplicate-safe operational work. |
| CRM-067 | Relationship browser gate | Customer profile proves vehicle, document, task, and appointment drill-through. |

Milestone exit gate:

- Customer 360 presents a trusted dealership relationship map.
- Cross-module records remain owned by their source modules.
- All bridge writes and reads enforce organization and field policies.

---

## 10. Milestone CRM-7 - Manager Intelligence And Saved Views

**Branch:** `codex/customers-manager-intelligence`
**Status:** Planned
**Depends on:** CRM-6

| Slice | Deliverable | Acceptance evidence |
| --- | --- | --- |
| CRM-070 | Risk flag model | Risk retains type, severity, source, explanation, freshness, and resolution. |
| CRM-071 | Next-best-action rules | Deterministic catalog returns action, reasons, confidence class, freshness, and override policy. |
| CRM-072 | Manager risk queues | Hot leads, overdue follow-up, title/docs, complaint, no-show, and payment-signal queues reconcile. |
| CRM-073 | Customer home live dashboard | KPI, performance, tasks, appointments, activity, and right rail use real read models. |
| CRM-074 | Staff coaching summary | Follow-up timeliness and outcome completeness are visible without opaque employee ranking. |
| CRM-075 | Customer saved views | Private/shared server-backed views enforce owner, manager, and schema-version rules. |
| CRM-076 | Dashboard drill-through proof | Every KPI links to records that reproduce its count and filter definition. |
| CRM-077 | Intelligence browser gate | Manager applies, saves, shares, and acts from a queue with explainable reasons. |

Milestone exit gate:

- No Customer home metric depends on hard-coded presentation values.
- Recommendations are explainable and overridable.
- Shared views are durable and permission-safe.

---

## 11. Milestone CRM-8 - Enterprise Controls

**Branch:** `codex/customers-enterprise-controls`
**Status:** Planned
**Depends on:** CRM-7

| Slice | Deliverable | Acceptance evidence |
| --- | --- | --- |
| CRM-080 | Permission matrix completion | Manager, owner, assigned staff, restricted role, and cross-organization paths are proven. |
| CRM-081 | Field-level projection | Operational, limited, restricted, and audit fields are masked by policy. |
| CRM-082 | Duplicate candidate service | Candidate reasons are deterministic and do not mutate customer identity. |
| CRM-083 | Controlled merge | Preview, stale protection, survivor choice, reason, relationship movement, and audit are transactional. |
| CRM-084 | Customer audit read model | Sensitive changes, merges, exports, and overrides are traceable. |
| CRM-085 | Safe export | Authorized CSV export is field-filtered, bounded, and audited. |
| CRM-086 | Integration identities | External source identities and collisions are modeled without a live adapter requirement. |
| CRM-087 | Feature entitlements | Tier flags are server-enforced and do not fork customer workflow code. |
| CRM-088 | Retention/archive control | Dry-run, hold, archive, and deletion eligibility are explicit and audited. |

Milestone exit gate:

- Permission and field-leak tests pass across all day-one roles.
- Merge, export, and retention have runbooks and audit evidence.
- Future commercial packaging is technically possible without changing MVP truth ownership.

---

## 12. Milestone CRM-9 - Day-One Readiness

**Branch:** `codex/customers-mvp-day-one-readiness`
**Status:** Planned
**Depends on:** CRM-8

| Slice | Deliverable | Acceptance evidence |
| --- | --- | --- |
| CRM-090 | Database release gate | Generate, validate, migration status, deploy rehearsal, and synthetic seed pass. |
| CRM-091 | Code quality gate | Typecheck, lint, unit, integration, production build, and full E2E pass. |
| CRM-092 | Customer browser workflow | Manager and staff complete the accepted day-one scenarios in light and dark modes. |
| CRM-093 | Performance/accessibility gate | Search/profile/dashboard targets and approved desktop/mobile accessibility checks pass. |
| CRM-094 | Permission/privacy gate | Cross-organization, field masking, denied mutation, merge, and export tests pass. |
| CRM-095 | Operations runbooks | Quick start, duplicate merge, SLA escalation, recovery, rollback, and known-limits docs exist. |
| CRM-096 | Rollout rehearsal | Synthetic day-in-the-life exercise records issues, owners, and disposition. |
| CRM-097 | Release verdict | `CUSTOMERS_MVP_DAY_ONE_READINESS.md` records Approved or Held with named evidence. |

Milestone exit gate:

- All CRM-090 through CRM-097 evidence comes from one release baseline.
- Product, operations, and engineering record explicit signoff.
- Deferred scope is visible to operators and stakeholders.

---

## 13. Branch And Merge Sequence

```text
codex/customers-mvp-readiness-gate
  -> codex/customers-trusted-foundation
  -> codex/customers-search-360
  -> codex/customers-activity-timeline
  -> codex/customers-lead-follow-up
  -> codex/customers-case-sla
  -> codex/customers-relationship-bridges
  -> codex/customers-manager-intelligence
  -> codex/customers-enterprise-controls
  -> codex/customers-mvp-day-one-readiness
```

Default merge rule:

1. Complete the milestone exit gate.
2. Review the diff for unrelated changes and docs drift.
3. Run the milestone validation set.
4. Merge the milestone.
5. Create the next branch from the updated shared baseline.

Do not continue stacking when a milestone changes schema, identity, permissions, or cross-module contracts unless the dependency is explicitly reviewed.

---

## 14. Definition Of A Completed Slice

A slice is complete only when:

- requested behavior works through a server-authoritative path
- data ownership and invariants match the architecture
- invalid, unauthorized, duplicate, stale, and retry behavior are addressed
- important state changes create activity/audit evidence
- UI includes relevant loading, empty, error, denied, and success feedback
- focused tests pass
- browser proof exists when the operator workflow changes
- existing Tasks and Appointments regressions are checked
- docs describe implemented behavior accurately

Passing compilation alone does not complete a customer workflow slice.

---

## 15. Deferred Milestone Families

After the MVP release gate, future milestone families may cover:

- CRM-10 external lead-source and DMS adapters
- CRM-11 production communications and templates
- CRM-12 advanced deal/opportunity orchestration
- CRM-13 advanced analytics and forecasting
- CRM-14 custom fields and workflow configuration
- CRM-15 multi-location/tenant commercial administration
- CRM-16 AI-assisted summaries, recommendations, and coaching

These must remain optional adapters or entitlements around the accepted Customer truth model. They must not rewrite the day-one aggregate or make core workflows dependent on external AI or vendor availability.
