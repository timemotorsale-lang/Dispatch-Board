# Growth Console Milestones

**Status:** Foundation baseline
**Date:** 2026-09-07

## Milestone Table

| ID | Name | Status | Dependencies | Exit evidence |
| --- | --- | --- | --- | --- |
| GROWTH-000 | Foundation documentation packet | Planned | None | README, architecture, workflows, algorithms, automations, roadmap, milestones, and traceability files exist. |
| GROWTH-001 | Frontend review shell | Planned | GROWTH-000 | `/growth` renders a simple combined marketing + advertising console with live activation disabled. |
| GROWTH-002 | Daily opportunity queue | Planned | GROWTH-001 | UI shows ranked opportunities with clear next actions and source context. |
| GROWTH-003 | Audience review panel | Planned | GROWTH-001 | UI shows included, excluded, suppressed, and unresolved audience counts. |
| GROWTH-004 | Message and ad approval panel | Planned | GROWTH-001 | UI shows editable plan sections and approval checklist without live sends. |
| GROWTH-005 | Automation library shell | Planned | GROWTH-001 | UI shows automation playbooks with states, owners, triggers, and review actions. |
| GROWTH-006 | Results and CRM writeback shell | Planned | GROWTH-001 | UI shows attribution tiers and planned CRM writeback events. |
| GROWTH-010 | Read-only CRM and inventory signals | Held | User approval of frontend direction | Real read models replace static review data without live activation. |
| GROWTH-020 | Durable campaign plans | Held | GROWTH-010 | Campaign plans and versions persist with audit history. |
| GROWTH-030 | Approval and policy enforcement | Held | GROWTH-020 | Server-side consent, budget, source, and permission checks block unsafe actions. |
| GROWTH-040 | Provider pilot | Held | GROWTH-030 | One approved provider pilot launches with reconciliation and rollback. |
| GROWTH-050 | Paid advertising pilot | Held | GROWTH-030 and budget approval | Paid campaigns require budget, inventory, creative, and provider proof. |
| GROWTH-060 | Governed automations | Held | GROWTH-040 or GROWTH-050 | Approved automations run with throttles, owners, pauses, and audit. |
| GROWTH-070 | Optimization recommendations | Held | GROWTH-040 or reviewed outcome imports | Recommendations explain value, readiness, risk, and next action without autonomous changes. |
| GROWTH-080 | Adoption and release readiness | Held | GROWTH-001 through GROWTH-070 review | UI shows completion, locks, preservation, and approval status before adoption. |
| GROWTH-090 | Real read adapter contracts | In progress | GROWTH-080 | Source adapters normalize CRM, inventory, sales, service, appointment, and task signals without mutation. |
| GROWTH-100 | Governed audience builder | In progress | GROWTH-090 | Audience decisions explain included, excluded, suppressed, and cleanup records with reason codes. |
| GROWTH-110 | Campaign ledger and version history | In progress | GROWTH-100 | Campaign plans, snapshots, messages, approvals, and launch locks preserve versions and audit events. |
| GROWTH-120 | Enterprise approval and permission gates | In progress | GROWTH-110 | Role, budget, offer, channel, and provider gates fail closed with exact next approval. |
| GROWTH-130 | Results and attribution foundation | In progress | GROWTH-120 | Result events normalize into direct, assisted, influenced, and unattributed summaries without CRM mutation. |
| GROWTH-140 | Operator UI simplification | In progress | GROWTH-130 | Landing page shows Today, Campaigns, Needs Attention, Results, and Review Controls without exposing backend machinery. |
| GROWTH-150 | Backend command boundary | In progress | GROWTH-140 | Growth commands validate actor, role, reason, idempotency, scope, and mutation boundary before workflow execution. |
| GROWTH-160 | Source-backed opportunity orchestration | In progress | GROWTH-150 | Read-only source signals become ranked Growth opportunities with source IDs, authority, review routing, and explanations. |
| GROWTH-170 | Campaign lifecycle application service | In progress | GROWTH-160 | Campaign plan, audience, message, approval, policy, provider dry-run, and launch lock are orchestrated without live execution. |
| GROWTH-180 | CRM writeback preview boundary | In progress | GROWTH-170 | Prepared CRM/task writeback events are reviewable while `canMutateCrm` remains false. |

## GROWTH-001 Acceptance Criteria

The first implementation must:

- use the term `Growth Console`;
- make the relationship to CRM obvious;
- combine Marketing and Advertising without hiding their differences;
- show a simple execution path;
- show clear next actions;
- mark live launch as unavailable until backend approval;
- avoid claiming provider integrations exist;
- preserve all existing stored estimates, quotes, invoices, customer records, and inventory records;
- be ready for user review before adoption.

## Review Gate

After each implementation batch, the user reviews the implementation. Adoption is not assumed until the user approves it.

## Backend Expansion Guardrail

Backend milestones may prepare, validate, preview, lock, audit, and dry-run Growth work. They may not send messages, spend advertising budget, mutate CRM records, mutate inventory, change sales/service/accounting records, create appointments, or alter stored estimates, quotes, invoices, or customer history until a later milestone explicitly adds approved backend mutation controls.
