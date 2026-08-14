# Dispatch Board Unified CRM Console

**Program ID:** `UCRM`
**Version:** 1.1 accepted foundation baseline
**Date:** 2026-08-14
**Status:** Foundation accepted; UCRM-010 verified; UCRM-011–013 implemented with final data-isolation and UX acceptance proof pending; nothing in the customer-truth branch merged, piloted, or released
**Target route:** `/crm`
**Parent product:** Time Motor Sales Dispatch Board

## Purpose

This package is the governing source of truth for the Dispatch Board Unified CRM Console. It exists so human contributors and multiple coding agents can build one coherent product without inventing competing models, permissions, workflows, or interface patterns.

Unified CRM is an independent user-facing console inside the existing Dispatch Board application. It is not a second deployment, a second authentication system, or a second source of customer, vehicle, task, appointment, repair, or activity truth.

The console's operating question is:

> What does this customer relationship need next, who owns it, when is it due, and what commercial or operational work must happen?

## Governing document set

Read these documents in this order before planning or implementing Unified CRM work:

1. [`PRODUCT_CHARTER.md`](PRODUCT_CHARTER.md) — product purpose, users, scope, experience principles, outcomes, and non-goals.
2. [`CURRENT_EVIDENCE_BASELINE.md`](CURRENT_EVIDENCE_BASELINE.md) — what the repository proves today and what remains sample-driven, partial, or planned.
3. [`ARCHITECTURE.md`](ARCHITECTURE.md) — system boundary, source authority, domain model, commands, reads, events, integrations, reliability, and architecture decisions.
4. [`SECURITY_AND_PRIVACY.md`](SECURITY_AND_PRIVACY.md) — threat model, permissions, privacy, audit, tenant isolation, secure delivery, and release controls.
5. [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md) — delivery phases, dependencies, release stages, and sequencing.
6. [`MILESTONES.md`](MILESTONES.md) — agent-sized vertical slices and their evidence-backed exit gates.
7. [`AGENT_OPERATING_MODEL.md`](AGENT_OPERATING_MODEL.md) — how coordinating, implementing, reviewing, testing, and security agents collaborate safely.
8. [`TESTING_AND_QUALITY_STRATEGY.md`](TESTING_AND_QUALITY_STRATEGY.md) — required test layers, quality gates, defect handling, and release proof.
9. [`DECISION_REGISTER.md`](DECISION_REGISTER.md) — binding decisions, unresolved decisions, owners, and change control.
10. [`RISK_REGISTER.md`](RISK_REGISTER.md) — program risks, treatment, triggers, owners, and blocking gates.
11. [`TRACEABILITY_MATRIX.md`](TRACEABILITY_MATRIX.md) — product outcomes mapped to architecture, milestones, security, and proof.

Current implementation-review evidence:

- [`UCRM_010_011_IMPLEMENTATION_EVIDENCE.md`](UCRM_010_011_IMPLEMENTATION_EVIDENCE.md) — secure shell and UCRM-UXR-0 browser checkpoint; Product Owner accepted the experience direction, UCRM-010 route-shell evidence is verified, and UCRM-011 data-isolation evidence remains pending before integration disposition.
- [`UCRM_012_013_IMPLEMENTATION_EVIDENCE.md`](UCRM_012_013_IMPLEMENTATION_EVIDENCE.md) — canonical customer read boundary and real read-only Customers list; implementation and initial browser evidence exist, while isolated PostgreSQL proof and UCRM-UXR-1 Product Owner disposition remain pending.

Repository-wide instructions in [`../AGENTS.md`](../AGENTS.md), [`../ARCHITECTURE.md`](../ARCHITECTURE.md), and [`../CURRENT_IMPLEMENTATION_STATUS.md`](../CURRENT_IMPLEMENTATION_STATUS.md) remain applicable. If a Unified CRM document conflicts with a repository-wide safety invariant, the stronger safety, authorization, evidence, or audit rule wins until the conflict is explicitly resolved in the decision register.

## Status language

Every work item and capability must use one of these evidence states:

| State | Meaning |
| --- | --- |
| `PLANNED` | Desired behavior only; implementation proof does not exist. |
| `CONTRACTED` | Interfaces, invariants, acceptance criteria, and ownership are approved for implementation. |
| `IN_PROGRESS` | An assigned branch or work packet contains incomplete work. |
| `IMPLEMENTED_UNVERIFIED` | Code exists, but required checks, review, or evidence remain incomplete. |
| `VERIFIED` | Required automated and manual evidence exists for the exact commit and environment. |
| `PILOT` | Verified capability is enabled only for an approved cohort with monitoring and rollback. |
| `RELEASED` | The capability passed its release gate for the stated cohort. |
| `DEFERRED` | Explicitly outside the current release. |
| `HELD` | A named decision, dependency, authority, risk, or failed gate prevents safe progress or rollout. |

Documents, mockups, types, sample arrays, tests of pure helpers, and disabled controls are not proof of an operational capability.

## Non-negotiable program rules

1. Build vertical slices, not isolated frontend demonstrations.
2. Preserve one authoritative record per business fact.
3. Server policy is authoritative; UI visibility is not authorization.
4. Every active opportunity has an owner, stage, next action, and due time.
5. Meaningful commands are validated, permission-checked, idempotent where retry is possible, and event/audit-backed.
6. Recommendations explain; authorized humans or deterministic commands decide.
7. AI is optional, permission-aware, source-grounded, measurable, and unable to bypass commercial or privacy controls.
8. No production-facing screen may present sample data as live data.
9. No agent may silently revise a shared domain contract while another slice depends on it.
10. A milestone is complete only when its named evidence exists on one commit baseline.
11. User experience leads each slice through an interactive browser checkpoint, but visual approval never substitutes for real routes, server policy, error/fallback behavior, accessibility, tests, or rollback proof.

## Foundation gate

`UCRM-000` through `UCRM-009` in [`MILESTONES.md`](MILESTONES.md) were accepted by the Product Owner on 2026-08-14 for the bounded UCRM-010/011 implementation. Exact opportunity stages, commercial thresholds, retention durations, named pilot users, and external providers remain deferred; their dependent milestones stay `HELD` until separately approved.

The accepted foundation gate requires:

- product charter approval;
- current-state evidence acceptance;
- source-authority and bounded-context acceptance;
- security/privacy baseline acceptance;
- role and permission baseline acceptance;
- testing and release strategy acceptance;
- agent operating model acceptance;
- roadmap and milestone acceptance;
- decision-register owners assigned;
- the first vertical slice selected with explicit acceptance criteria.

## UX review cadence

Each user-facing vertical slice follows this review loop:

1. agree on the user job, simplest path, information priority, and execution target;
2. expose the smallest real route backed by actual authentication, policy, loading, empty, error, unavailable, and feature-off behavior;
3. inspect and interact with it in the in-app browser across representative roles and responsive sizes;
4. record Product Owner feedback as acceptance criteria or a governed change, not as an untraceable visual tweak;
5. complete accessibility, server-policy, regression, and rollback evidence before marking the slice `VERIFIED`.

UX checkpoints are deliberately frequent. They approve direction and usability as work proceeds; they do not authorize sample data to appear live or permit a frontend-only milestone to pass.

## Initial release boundary

The first production-oriented release targets:

- role-aware CRM Home and work queue;
- customer search, list, identity, contacts, and Customer 360;
- leads and opportunities with governed pipeline stages;
- activity timeline, notes, tasks, promises, and appointments;
- quotes and approval boundaries;
- native vehicle, repair/job, task, appointment, and dispatch links;
- actionable dashboards with drill-through;
- server-enforced permissions and audit history;
- safe import foundations and visible data quality;
- manual or app-recorded communication history.

Production email/calendar synchronization, SMS, telephony, DMS/DealerCenter adapters, unrestricted customization, autonomous agents, native mobile applications, and formal multi-region operation are later gated releases unless separately promoted through the decision process.

## Change control

A change to a binding invariant, authority boundary, lifecycle, permission, audit requirement, or milestone exit gate requires:

1. a new or amended entry in [`DECISION_REGISTER.md`](DECISION_REGISTER.md);
2. affected document links;
3. named decision owner;
4. impact on existing data and in-flight branches;
5. migration and rollback consequences;
6. review by Architecture, Security, Quality, and Product roles where applicable.

Until accepted, the existing approved contract remains authoritative.
