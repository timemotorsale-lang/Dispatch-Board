# Enterprise Sales Console Roadmap

## Strategy

Build the smallest trustworthy revenue-execution loop first, then add deal economics, management intelligence, automation, and enterprise scale. Each phase is a usable vertical capability with rollback and evidence—not a collection of disconnected screens.

## Phase 0 — Authority, baseline, and source map

**Outcome:** implementation-ready decisions and a measurable current-state baseline.

- approve product boundary and role/RACI;
- map authoritative sources for customers, vehicles, appointments, documents, pricing, trade, finance, and outcomes;
- define opportunity/deal stages and evidence;
- approve reason-code catalogs;
- measure current lead response, funnel, gross, stage age, and data quality;
- approve privacy, consent, contact-hour, pricing, and approval policies;
- prepare representative acceptance scenarios;
- establish pilot and rollback criteria.

**Gate:** no unresolved authority question can silently become application policy.

## Phase 1 — Sales foundation and Today console

**Outcome:** one governed sales shell and a durable salesperson work loop.

- route shell, navigation, permissions, and feature controls;
- Sales decision-record foundation;
- salesperson Today read model;
- native links to Customers, Tasks, and Appointments;
- loading, empty, denied, stale, and error states;
- baseline audit and operational metrics.

## Phase 2 — Durable lead operations

**Outcome:** every real lead becomes owned, prioritized, and actionable without duplication.

- durable opportunities and lifecycle;
- omnichannel/manual intake contract;
- duplicate-aware identity association;
- deterministic priority and assignment;
- response SLA;
- structured contact outcomes;
- lead queues and manager leakage view;
- idempotent task creation.

## Phase 3 — Pipeline and Shopper 360 sales lens

**Outcome:** managers and salespeople share evidence-backed pipeline truth.

- pipeline read model and saved views;
- stage evidence and aging;
- next-action enforcement;
- customer/vehicle interest projection;
- deal creation;
- Sales lens within Customer 360;
- change history and data-quality recovery.

## Phase 4 — Appointment and showroom execution

**Outcome:** scheduled and walk-in intent flows through an observable showroom journey.

- appointment conversion bridge;
- confirmation/preparation;
- arrival and showroom states;
- wait timers and manager-turn queue;
- no-show recovery;
- outcome-to-follow-up automation.

## Phase 5 — Vehicle discovery, trade, and deal workspace

**Outcome:** each active deal combines customer fit, vehicle truth, trade workflow, and blockers.

- explainable inventory candidate matching;
- exact and alternative recommendations;
- availability/readiness conflict handling;
- trade appraisal handoff;
- deal participants and needs analysis;
- deal health components;
- collaboration and manager intervention.

## Phase 6 — Scenario, quote, and approval governance

**Outcome:** commercial offers are versioned, authorized, attributable, and followable.

- scenario builder;
- authoritative price/fee/trade/finance observation inputs;
- authority matrix;
- approval workflow;
- immutable quote versions;
- customer response and negotiation history;
- expired/stale scenario protection.

## Phase 7 — Finance, documents, delivery, and post-sale handoff

**Outcome:** accepted commercial intent becomes a completed, controlled delivery without hidden obligations.

- finance handoff contract;
- document readiness;
- vehicle/delivery readiness;
- customer promises;
- delivery scheduling and completion;
- post-sale issue routing;
- won versus delivered distinction.

## Phase 8 — Manager control tower and forecasting

**Outcome:** leadership sees recoverable risk, likely revenue, and required intervention.

- deal-health and stall detection;
- manager intervention ranking;
- seller/manager/system forecast comparison;
- forecast submissions and change history;
- funnel, velocity, economics, source-quality, and execution metrics;
- drilldowns and review cadence.

## Phase 9 — Playbooks, automation, and governed AI

**Outcome:** repeatable best practices reduce administrative work without removing human authority.

- versioned playbooks and cadence branches;
- reactivation triggers;
- optional communication capture;
- summaries, fact proposals, drafts, and coaching;
- AI evaluation, confidence, citation, and opt-out;
- automation simulation and sandbox.

## Phase 10 — Enterprise administration and ecosystem

**Outcome:** multi-location operations are governable, supportable, and integrable.

- hierarchical teams and location controls;
- configurable fields/workflows/reasons;
- SSO/provisioning readiness;
- APIs/webhooks and adapter administration;
- integration retry/reconciliation;
- data retention/export controls;
- tenant/location analytics;
- resilience, recovery, and support tooling.

## Phase 11 — Pilot, calibration, and controlled adoption

- shadow scores before automated ranking;
- narrow role/location cohort;
- daily false-positive/false-negative review;
- compare operational and customer guardrail metrics;
- validate rollback and data preservation;
- train from role-specific scenarios;
- expand by capability only after acceptance thresholds pass.

## Success gates

| Gate | Minimum evidence |
| --- | --- |
| Functional | Approved scenarios pass end to end |
| Data | No duplicate/orphan/partial cross-domain writes |
| Security | Organization, location, role, ownership, and field tests pass |
| Reliability | Replay, concurrency, retry, outage, and recovery tests pass |
| Operational | Owners can complete work without shadow spreadsheets |
| Customer | Contact, promise, wait-time, and complaint guardrails do not regress |
| Algorithm | Explanations, calibration, overrides, and scenario coverage pass |
| Adoption | Pilot users demonstrate the daily operating loop |
| Rollback | Capabilities disable without deleting or corrupting records |

