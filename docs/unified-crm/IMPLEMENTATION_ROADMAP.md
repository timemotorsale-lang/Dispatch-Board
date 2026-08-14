# Unified CRM Console Implementation Roadmap

**Document:** Unified CRM Console Implementation Roadmap
**Program:** Dispatch Board Unified CRM Console
**Primary route:** `/crm`
**Status:** Planning baseline; no CRM implementation or release is claimed
**Target:** Production-ready internal MVP in 8–10 weeks after the foundation gate is accepted

---

## 1. Outcome

Build an independent CRM operating console inside Dispatch Board while preserving one shared platform and one authoritative version of each customer, vehicle, task, appointment, job, document, and user.

The internal MVP is a coherent operational B2B CRM:

- CRM Home and prioritized work;
- customer search, list, and Customer 360;
- contacts and communication preferences;
- opportunities with governed stages and dated next actions;
- activity timeline, notes, tasks, and commitments;
- visual pipeline and manager forecast view;
- quote workflow with controlled approvals;
- job/dispatch relationships;
- dashboards with drill-through;
- server-enforced permissions and immutable audit evidence.

The MVP does **not** require production email/calendar synchronization, SMS delivery, telephony, external DMS/CRM synchronization, autonomous AI actions, a general workflow builder, or full Salesforce-equivalent breadth.

## 2. Evidence-Based Starting Point

Dispatch Board already contains shared authentication, role-aware workspaces, customer and operational models, Tasks, Appointments, vehicles, activity/audit patterns, Customer 360 foundations, and selected lead/search/pipeline components. Those assets are candidates for reuse, not proof that Unified CRM workflows exist.

The existing Customers area includes meaningful durable capability, while the current Sales Console still contains sample- or adapter-driven surfaces and limited purpose-built backend workflows. Unified CRM must establish an authoritative ownership map before reuse. It must not duplicate records or promote prototype behavior as completed CRM capability.

## 3. Delivery Rules

1. Build one small, reviewable vertical slice at a time.
2. Use stable `UCRM-###` identifiers in branches, tests, evidence, and status updates.
3. Complete applicable layers in this order:

   ```text
   migration -> repository -> service -> policy -> validation -> route/read model
   -> UI -> activity/audit -> focused tests -> browser proof -> docs
   ```

4. A frontend shell, schema, endpoint, or document alone is not an implemented workflow.
5. Every active opportunity must have an owner, stage, dated next action, and evidence-backed history.
6. Every mutation is server-authoritative, permission-checked, validated, correlated, and audited.
7. Shared source records remain authoritative; CRM projections and links must not create competing truth.
8. Optional AI may summarize or recommend, but core workflows must remain deterministic and usable without it.
9. New behavior starts behind a server-enforced feature flag or cohort control until its release gate passes.
10. Merge only evidence-complete slices. Do not stack unrelated work on an unaccepted dependency.

## 4. Status Legend

| Status | Meaning |
| --- | --- |
| `PLANNED` | Desired behavior only; no implementation is claimed. |
| `CONTRACTED` | Dependencies, contracts, ownership, and acceptance evidence are approved; work may begin. |
| `IN_PROGRESS` | A named branch or work packet contains incomplete work. |
| `IMPLEMENTED_UNVERIFIED` | Code exists, but required review, checks, or evidence are incomplete. |
| `VERIFIED` | Required automated and manual evidence exists on the exact baseline. |
| `PILOT` | Verified capability is enabled only for the accepted internal cohort with monitoring and rollback. |
| `RELEASED` | Release gate and named approvals exist for the stated cohort. |
| `HELD` | Work or rollout is stopped by a named decision, dependency, authority, risk, or failed gate. |
| `DEFERRED` | Explicitly outside the internal MVP. |

## 5. Dependency Path

```text
Foundation and authority
        |
        v
Console shell and customer truth
        |
        v
Customer memory and work execution
        |
        v
Opportunity pipeline and dispatch bridge
        |
        +------------------+
        v                  v
Quotes/approvals       Search/dashboards
        \                  /
         v                v
        Hardening -> Pilot -> Internal release
                              |
                              v
               External adapters and enterprise expansion
```

No downstream UI may bypass an incomplete authority, policy, migration, or data ownership gate.

## 6. Phased Roadmap

| Phase | Target window | Milestone range | Outcome | Entry gate | Exit gate |
| --- | --- | --- | --- | --- | --- |
| 0. Foundation | Days 1–3 | UCRM-000–009 | Accepted product boundary, architecture, security, testing, agent operating model, data ownership, flags, and evidence registry | Clean baseline and foundation branch | All foundation decisions linked; unresolved authority is explicitly held |
| 1. Console and customer truth | Week 1 | UCRM-010–019 | Independent `/crm` shell, role entry, customer/contact authority, safe import foundation, policy-safe list and Customer 360 | Phase 0 accepted | Authorized users can enter CRM, find a durable customer, and see source-owned context without sample data |
| 2. Memory and execution | Week 2 | UCRM-020–029 | Timeline, notes, contact outcomes, commitments, and linked tasks | Phase 1 accepted | A user can record an outcome and owned next action; refresh preserves timeline and audit evidence |
| 3. Opportunities and pipeline | Weeks 3–4 | UCRM-030–039 | Durable opportunities, governed stage transitions, visual pipeline, work queue, and job/dispatch linkage | Phase 2 accepted | End-to-end customer-to-opportunity-to-dispatch slice passes policy, audit, retry, and browser proof |
| 4. Quotes and commercial control | Week 5 | UCRM-040–049 | Versioned quotes, line items, approvals, commercial history, and safe conversion boundaries | Phase 3 accepted | Quote presentation is immutable/versioned; approval and denial paths are auditable |
| 5. Search, insight, and manager operation | Week 6 | UCRM-050–059 | Global CRM search, dashboards, drill-through, pipeline health, forecast change history, and manager queues | Phases 3–4 accepted | Metrics reconcile to records, restricted data does not leak, and recommendations explain evidence/freshness |
| 6. Hardening and pilot | Weeks 7–8 | UCRM-060–069 | Accessibility, responsive behavior, performance, migration/recovery, concurrency, security, observability, training, and controlled pilot | MVP workflows implemented | Representative manager/staff workflows pass; rollback rehearsal and pilot go/no-go are recorded |
| 7. Internal production release | Weeks 9–10 contingency | UCRM-070–079 | Pilot corrections, full regression, operational handoff, and explicit internal release decision | Pilot evidence accepted | Named go/no-go record; only accepted flags/cohorts are enabled |
| 8. External communications and integrations | Post-MVP | UCRM-080–099 | Provider adapters for email/calendar, SMS, telephony, e-signature, accounting/DMS, with consent and reconciliation | Internal CRM stable | Each adapter has provider-specific security, retry, reconciliation, failure, and rollback proof |
| 9. Enterprise expansion | Post-MVP | UCRM-100 onward | Advanced customization, territory/field controls, sandboxes, retention, advanced analytics, governed AI, and broader commercial lifecycle | Stable data and operational adoption | Capability-specific enterprise gates; no blanket “enterprise complete” claim |

Weeks 9–10 are contingency and release proof, not permission to add scope. If Weeks 1–8 gates fail, the release is held or reduced by feature flag rather than rushed.

## 7. Internal MVP Release Boundary

Included:

- authenticated, role-aware independent CRM console;
- durable customer/contact views based on authoritative shared records;
- Customer 360 and unified permitted activity history;
- opportunity ownership, stages, next actions, pipeline, and work queue;
- manual communication logging and draft/template preparation;
- tasks, appointments, jobs, and dispatch links;
- versioned quotes and controlled approvals;
- global CRM search and manager dashboards;
- permissions, audit, feature flags, recovery, monitoring, accessibility, and responsive proof.

Deferred:

- live Google/Microsoft inbox and calendar synchronization;
- customer-facing email/SMS/voice delivery;
- recordings and transcription;
- external DMS, accounting, lender, or CRM synchronization;
- e-signature activation;
- unrestricted custom objects/workflow designer;
- advanced territory planning, incentive compensation, and marketing automation;
- autonomous outbound communication, pricing, merging, or stage changes;
- multi-tenant subscription and white-label administration.

Manual logging, drafts, templates, preferences, and consent enforcement may ship internally without activating external delivery.

## 8. Branch, Flag, and Rollback Strategy

- Foundation branch: `codex/unified-crm-console-foundation`.
- Later branches should be scoped, for example `codex/ucrm-030-opportunity-create`.
- Prefer additive, backward-compatible migrations. Destructive cleanup requires a later verified migration and recovery plan.
- Keep existing `/customers` and `/sales` workflows available while `/crm` is piloted.
- Use server-enforced flags at console, workspace, and risky-command level; hiding UI alone is insufficient.
- Define a pilot cohort separately from role permissions.
- Every slice records how to disable it, what data remains after disablement, and how operators recover partial work.
- A rollback must not delete CRM evidence. Prefer disable, route fallback, compensating command, or prior application release.
- External side effects require idempotency, delivery state, retry policy, reconciliation, and kill switch before activation.

## 9. Evidence Required at Every Gate

Each accepted slice must link or record, as applicable:

- migration/schema validation and backward-compatibility result;
- repository/service/policy/validation focused tests;
- permission matrix cases, including denial and cross-organization isolation;
- route/read-model contract and loading, empty, stale, unavailable, and error states;
- activity/audit correlation for mutations;
- idempotency, concurrency, and retry evidence for controlled writes;
- keyboard, responsive, light/dark, and accessibility proof for user-facing work;
- browser proof for the stated persona workflow;
- performance/freshness evidence where the slice adds a queue, search, or dashboard;
- feature flag, rollback, and recovery notes;
- documentation and `CURRENT_IMPLEMENTATION_STATUS.md` update after acceptance.

Evidence must describe the tested environment and commit. Planned tests or screenshots from mock data are not release evidence.

## 10. Release Gates

### Foundation gate

- Product language, canonical records, IDs, statuses, roles, permissions, event ownership, and integration boundaries are approved.
- Security threat model, testing strategy, agent responsibilities, dependency rules, and conflict ownership are documented.
- The current baseline distinguishes reusable implementation from prototypes and plans.

### Vertical-slice gate

- The complete applicable layer chain is present.
- Required success, denial, validation, empty, stale, failure, retry, and audit cases pass.
- The feature can be disabled without corrupting shared workflows.

### Pilot gate

- Representative seeded/sanitized data and named cohort are approved.
- Manager and staff journeys pass on the same release candidate.
- Tenant/organization isolation, authorization, accessibility, performance, migration, backup/restore, and rollback rehearsals have evidence.
- Known limitations, support ownership, monitoring, and incident escalation are published.

### Internal production gate

- Pilot findings are resolved, accepted as known limitations, or removed from enabled scope.
- Full regression and production build pass.
- Product, operations, security, and engineering record an explicit go/no-go decision.
- Flags, cohort, dashboards, alerts, recovery steps, and rollback authority are named.

## 11. Measures of Success

The internal pilot should measure, without opaque employee scoring:

- time to find and understand a customer;
- percentage of active opportunities with owner and non-overdue next action;
- time and clicks to record an outcome and schedule follow-up;
- pipeline/dashboard reconciliation rate;
- duplicate, stale-write, denied-action, and sync/retry outcomes;
- task and dispatch handoff completion;
- page/search latency and read-model freshness;
- accessibility defects and workflow completion by role;
- user-reported friction, correction frequency, and support volume.

Targets are approved during UCRM-006; they are not invented during implementation.

## 12. Change Control

Any proposal that changes a canonical owner, public route, opportunity lifecycle, permission boundary, audit semantics, external side effect, or internal MVP scope requires an ADR or equivalent recorded decision before implementation. New work receives a stable unused `UCRM-###` ID; existing IDs are never renumbered or silently repurposed.
