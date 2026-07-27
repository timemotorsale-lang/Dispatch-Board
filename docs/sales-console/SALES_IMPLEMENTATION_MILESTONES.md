# Sales Console Implementation Milestones

Milestones are vertical slices. Each must include schema where required, server policy, commands, read models, UI states, audit/events, tests, observability, documentation, and rollback controls.

| ID | Milestone | Depends on | Exit result |
| --- | --- | --- | --- |
| SAL-000 | Authority and program gate | None | Source, policy, RACI, baseline, pilot, and code authorization are recorded |
| SAL-010 | Sales module foundation | SAL-000 | Protected `/sales` shell, capabilities, feature controls, decision/audit conventions |
| SAL-020 | Salesperson Today read model | SAL-010 | One permission-filtered queue over existing eligible work |
| SAL-030 | Durable opportunity lifecycle | SAL-010 | Opportunity intake, owner, stage, next action, outcome, concurrency |
| SAL-040 | Lead priority and assignment | SAL-030 | Explainable priority, eligible assignment, acceptance/reassignment |
| SAL-050 | Response workspace and SLA | SAL-040 | Structured attempt/outcome, response clocks, escalation, next action |
| SAL-060 | Pipeline and saved views | SAL-030, SAL-050 | Evidence-backed pipeline, aging, change history, manager views |
| SAL-070 | Shopper 360 sales lens | SAL-060 | Sales context composed from authoritative Customer and related records |
| SAL-080 | Appointment conversion bridge | SAL-050 | Opportunity-to-appointment and outcome-to-follow-up continuity |
| SAL-090 | Showroom execution | SAL-080 | Arrival, wait, demo/write-up/manager-turn/outcome operational view |
| SAL-100 | Deal aggregate and workspace | SAL-060 | Durable deal lifecycle, participants, blockers, milestones |
| SAL-110 | Vehicle match bridge | SAL-100 | Explainable eligible inventory candidates and alternative fit |
| SAL-120 | Trade appraisal bridge | SAL-100 | Attributable request, authoritative appraisal state, freshness controls |
| SAL-130 | Deal health and interventions | SAL-100–120 | Component risk, stall detection, manager action and result |
| SAL-140 | Scenario versioning | SAL-100, SAL-120 | Immutable commercial scenarios with authoritative inputs |
| SAL-150 | Approval workflow | SAL-140 | Version-bound authority requests, decisions, expiry, escalation |
| SAL-160 | Quote and negotiation history | SAL-150 | Presented quote versions and structured customer responses |
| SAL-170 | Finance handoff | SAL-160 | Accepted version packaged and acknowledged by authorized workflow |
| SAL-180 | Promise and delivery readiness | SAL-170 | Owned promises, readiness gates, delivered/completed distinction |
| SAL-190 | Forecast foundation | SAL-060, SAL-130 | Seller, manager, deterministic views and forecast history |
| SAL-200 | Performance and source intelligence | SAL-190 | Governed funnel, velocity, economics, attribution, drilldowns |
| SAL-210 | Cadence/playbook engine | SAL-050 | Versioned steps, branching, suppression, exit, simulation |
| SAL-220 | Lost/nurture reactivation | SAL-110, SAL-210 | Triggered eligible recovery with continuity and attempt controls |
| SAL-230 | Governed AI assistance | SAL-130, SAL-210 | Cited summaries/proposals/drafts with approval and fallback |
| SAL-240 | Integration control plane | SAL-030 | Idempotent adapters, mapping, freshness, retry, reconciliation |
| SAL-250 | Enterprise administration | SAL-200, SAL-240 | Multi-location policy, configuration, SSO/API/export readiness |
| SAL-260 | Pilot and calibrated rollout | All enabled scope | Cohort rollout, guardrails, acceptance, rollback, signed expansion |

## Standard milestone proof

Every milestone requires:

- domain and authority review;
- additive migration and rollback/forward-fix plan where applicable;
- unit tests for rules and algorithms;
- integration tests for transaction, policy, idempotency, and concurrency;
- browser tests for primary, empty, denied, stale, conflict, and error states;
- accessibility checks for interactive surfaces;
- operational metrics and structured logs;
- representative dealership scenario evidence;
- update to `docs/CURRENT_IMPLEMENTATION_STATUS.md`;
- no statement that planned behavior is implemented before proof passes.

## First production candidate

The first useful release should end at SAL-050:

```text
real lead
  -> trusted customer association
  -> owned opportunity
  -> explainable priority
  -> eligible assignment
  -> durable response work
  -> structured outcome
  -> next action or controlled closure
```

It deliberately excludes desking, autonomous outreach, predictive AI, external finance decisions, and broad system replacement.

## Milestone stop conditions

Stop expansion when:

- authority or source ownership is unresolved;
- a cross-domain command can partially complete;
- duplicate/replay behavior is unsafe;
- users can bypass consent or pricing authority;
- algorithm explanations cannot reproduce the result;
- material cohort bias or perverse incentive appears;
- the capability cannot be disabled while preserving evidence;
- users require an untracked side process to complete the core workflow.

