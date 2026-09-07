# Growth Console Roadmap

**Status:** Foundation baseline
**Date:** 2026-09-07

## Roadmap Principles

- Build the simple daily execution path first.
- Keep marketing and advertising in one Growth Console.
- Connect to CRM as the relationship record.
- Do frontend review before adoption.
- Add backend controls only after the user approves the workflow.

## Phase G0 - Source Of Truth And Review Shell

Goal: establish the official packet and reviewable frontend foundation.

Scope:

- Growth documentation packet.
- `/growth` route.
- Growth Home overview.
- Marketing and Advertising workspaces.
- Opportunity queue.
- Audience review panel.
- Message/ad approval panel.
- Automation library.
- Results and CRM writeback panels.
- All live activation clearly disabled.

Exit:

- user can review the intended console direction;
- automated render checks pass;
- docs and UI agree on boundaries.

## Phase G1 - CRM-Connected Read Models

Goal: replace static review data with governed CRM, inventory, sales, service, and appointment read models.

Scope:

- read-only opportunity queue;
- consent-aware audience counts;
- inventory promotion signals;
- quote recovery signals;
- service reminder signals;
- CRM writeback preview.

Exit:

- no sample data appears as live data;
- source authority is visible;
- no customer mutation or send behavior.

## Phase G2 - Campaign Planning Commands

Goal: create durable campaign plans and audience snapshots without sending anything.

Scope:

- create campaign plan;
- save audience snapshot;
- edit message/ad draft;
- request approval;
- preserve versions;
- audit events.

Exit:

- campaign plans persist;
- prior versions remain preserved;
- approval state is enforceable.

## Phase G3 - Approval And Policy Engine

Goal: enforce consent, budget, source freshness, offer, and role approval.

Scope:

- server-side policy checks;
- permission model;
- budget approval;
- offer verification;
- suppression rules;
- launch readiness check.

Exit:

- blocked actions fail closed;
- UI explains the needed next action.

## Phase G4 - Provider Adapter Pilot

Goal: connect one low-risk provider and one approved campaign type.

Scope:

- one email or task-based provider pilot;
- no paid ad spend unless separately approved;
- delivery result ingestion;
- pause/retry controls.

Exit:

- pilot cohort approved;
- rollback rehearsed;
- delivery and results reconcile.

## Phase G5 - Advertising Activation

Goal: add paid campaign activation behind budget and inventory controls.

Scope:

- provider account connection;
- budget guardrails;
- vehicle availability checks;
- creative approval;
- performance ingestion.

Exit:

- no spend without approval;
- unavailable inventory cannot launch;
- results are traceable.

## Phase G6 - Automation Activation

Goal: activate approved lifecycle automations.

Scope:

- trigger-based automations;
- segment-based automations;
- pause thresholds;
- owner queues;
- audit and performance dashboards.

Exit:

- automations have owners, throttles, suppression, and rollback.

## Phase G7 - Enterprise Optimization

Goal: optimize growth strategy across CRM, sales, inventory, service, and advertising.

Scope:

- lift measurement;
- budget allocation;
- cohort testing;
- channel optimization;
- AI-assisted but explainable recommendations.

Exit:

- recommendations remain explainable and human-governed.

## Phase G8 - Adoption And Release Readiness

Goal: make the review status obvious before the Growth Console is adopted as the official workflow.

Scope:

- review-ready completion checklist;
- preservation check for CRM, estimates, quotes, invoices, customer records, and inventory records;
- live-send and ad-spend lock confirmation;
- frontend adoption status;
- remaining backend readiness list.

Exit:

- user can clearly see what is complete, what is still locked, and what requires approval before adoption.

## Phase G9 - Real Read Adapter Contracts

Goal: define how Growth safely reads CRM, inventory, sales, service, appointment, and task signals.

Scope:

- source adapter contracts;
- normalized source signals;
- source authority labels;
- source freshness and confidence checks;
- read-only guarantees.

Exit:

- Growth can consume source-domain signals without creating, changing, or deleting source records.

## Phase G10 - Governed Audience Builder

Goal: turn source signals into clear audience decisions before any campaign can be reviewed.

Scope:

- included, excluded, suppressed, and cleanup audience decisions;
- reason codes for every decision;
- opt-out, consent, quiet window, duplicate campaign, stale source, and inventory availability checks;
- frontend-ready audience counts.

Exit:

- every audience record has an explainable status and suppression always wins.

## Phase G11 - Campaign Ledger And Version History

Goal: preserve campaign plan history, audience snapshots, message drafts, approval requests, and launch locks.

Scope:

- campaign ledger records;
- immutable version entries;
- audit events;
- idempotent command handling;
- launch lock evidence.

Exit:

- campaign history is reviewable, duplicate command replay is safe, and launch locks are recorded instead of executed.

## Phase G12 - Enterprise Approval And Permission Gates

Goal: enforce campaign owner, budget, offer, channel, and provider readiness before execution can be considered.

Scope:

- role-specific approval decisions;
- paid budget approval thresholds;
- offer source verification;
- provider readiness checks;
- locked execution result with one next approval.

Exit:

- unsafe or incomplete launches fail closed and explain the exact approval or policy action needed.
