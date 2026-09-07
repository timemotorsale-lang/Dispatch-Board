# Time Motor Sales Growth Console

**Program ID:** `GROWTH`
**Version:** 0.2 governed logic foundation
**Date:** 2026-09-07
**Status:** Source-of-truth packet plus governed frontend and deterministic domain logic; not approved for live customer sends, ad spend, autonomous audience activation, or CRM mutation
**Target route:** `/growth`
**Parent product:** Time Motor Sales Dispatch Board

## Purpose

The Growth Console is the combined marketing and advertising command center for Time Motor Sales. It connects CRM, inventory, sales, service, diagnostics, appointments, and task signals into one simple operating question:

> Which growth opportunity should we act on next, who should review it, what message or ad should be approved, and how will we know it worked?

Marketing and advertising should live together because they share the same audience, message, offer, consent, budget, attribution, and outcome loop. The console separates the workspaces internally, but staff should not have to guess whether an action belongs in a marketing tool or an advertising tool.

## Governing Document Set

Read these documents in this order before planning or implementing Growth Console work:

1. [ARCHITECTURE.md](ARCHITECTURE.md) - product boundary, source authority, data flow, services, events, permissions, reliability, and integration posture.
2. [WORKFLOWS.md](WORKFLOWS.md) - daily work paths, campaign creation, approval, launch, follow-up, and exception handling.
3. [ALGORITHMS_AND_DECISION_LOGIC.md](ALGORITHMS_AND_DECISION_LOGIC.md) - opportunity scoring, audience readiness, suppression, channel fit, budget recommendation, and attribution logic.
4. [AUTOMATIONS.md](AUTOMATIONS.md) - governed automation catalog, trigger rules, approval controls, quiet hours, throttles, and rollback.
5. [ROADMAP.md](ROADMAP.md) - phased delivery path from frontend review shell to governed live activation.
6. [MILESTONES.md](MILESTONES.md) - implementation slices, dependencies, acceptance evidence, and review gates.
7. [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md) - operating outcomes mapped to screens, workflows, algorithms, milestones, and evidence.

Repository-wide instructions in [../AGENTS.md](../AGENTS.md), [../ARCHITECTURE.md](../ARCHITECTURE.md), [../CURRENT_IMPLEMENTATION_STATUS.md](../CURRENT_IMPLEMENTATION_STATUS.md), [../unified-crm/README.md](../unified-crm/README.md), and [../sales-console/README.md](../sales-console/README.md) remain applicable.

## Product Boundaries

| Domain | Authoritative responsibility | Growth Console use |
| --- | --- | --- |
| CRM / Customers | Customer identity, consent, communication preference, lifecycle, relationship history, tasks, and opportunities | Audience source, personalization source, follow-up destination |
| Inventory | Vehicle facts, readiness, pricing posture, merchandising status, aging, location, and availability | Vehicle promotion opportunities and exclusions |
| Sales | Deal stage, quotes, approvals, delivery outcomes, salesperson ownership, and forecast | Offer context, handoff, attribution, and opportunity follow-up |
| Service / Repair / Diagnostics | Repair order status, estimate readiness, service recommendations, and completed work | Service reminder, repair education, estimate recovery, and retention triggers |
| Appointments | Schedule, availability, appointment outcome, no-show, and reschedule state | Call-to-action timing and appointment conversion tracking |
| Growth | Campaign plan, audience review, message/ad draft, budget recommendation, approval state, launch intent, and performance read model | Growth orchestration truth |

Growth can project source facts from other domains, but it must not create a second customer database, inventory ledger, repair order, sales deal, invoice, or appointment record.

## Benchmark References

The Growth Console borrows proven patterns from current enterprise marketing and advertising platforms, then simplifies them for dealership daily execution:

| Reference product | Pattern to learn from | Growth Console improvement |
| --- | --- | --- |
| Salesforce Marketing Cloud | Campaigns can group journeys for workflow and reporting; journeys use entry sources, activities, and campaign reporting. Source: [Salesforce Help](https://help.salesforce.com/s/articleView?id=mktg.mktg_campaigns_journeys.htm&language=en_US&type=5) | Keep one guided daily path instead of exposing a complex journey canvas at first. |
| HubSpot Marketing Hub | Unified lead generation, segments, personalization, automation, and reporting. Source: [HubSpot Marketing Hub](https://www.hubspot.com/products/marketing?lang=en-US) | Tie every opportunity to dealership records and require clear next action ownership. |
| Mailchimp | Prebuilt automation flows, audience behavior triggers, templates, and performance feedback. Source: [Mailchimp Automations](https://mailchimp.com/features/automations/marketing-automation-flows/) | Present dealership-specific playbooks, not generic campaign templates. |
| Microsoft Dynamics 365 Customer Insights - Journeys | Trigger-based and segment-based journeys, exclusion segments, frequency, and timing controls. Source: [Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/customer-insights/journeys/journey-start) | Make entry, exclusion, timing, and repeat rules visible in plain language before approval. |
| Google Ads Performance Max | Goal-based campaigns use conversion goals, audience signals, creative assets, budget optimization, and conversion value. Source: [Google Ads Help](https://support.google.com/google-ads/answer/14530785?hl=en) | Keep paid activation behind budget approval and show why a vehicle/customer audience was recommended. |
| Meta Ads Manager | Campaigns depend on objective, audience, budget, creative, placement, and measurement discipline. | Consolidate ad setup into the same approval workspace as marketing so staff do not duplicate offers or audiences. |

## Experience Principles

1. Daily-use first: every screen must answer what to do now.
2. One path, optional depth: staff see the next action; managers can inspect logic when needed.
3. CRM is the record, Growth is the action plan.
4. Marketing and advertising share audience, offer, approval, and results.
5. No live send, live ad spend, or customer mutation without approval and backend enforcement.
6. Every recommendation explains the source signals, exclusions, and expected outcome.
7. Every launched campaign writes back measurable outcomes to the right CRM, inventory, sales, service, and task records.

## Initial Frontend Review Boundary

The first implementation is a reviewable frontend foundation only. It should:

- introduce `/growth` as the Growth Console shell;
- show the combined Marketing + Advertising operating model;
- make the daily execution path obvious;
- display opportunity, audience, message/ad, approval, automation, and results sections;
- label live activation as unavailable until backend controls are implemented;
- avoid sample data pretending to be production data;
- give the user room to review the design before adoption.

## Implemented Logic Foundation

The current implementation includes deterministic foundation services for:

- opportunity ranking;
- audience inclusion, exclusion, suppression, and cleanup decisions;
- campaign planning and version preservation;
- message and offer readiness;
- approval and policy checks;
- provider pilot readiness;
- paid advertising activation readiness;
- automation activation readiness;
- workflow stage and next-action decisions;
- outcome attribution tiers;
- optimization recommendations;
- adoption and release readiness.

These services support review and backend design. They do not execute live outreach, live ad spend, provider sends, autonomous CRM mutation, or destructive record changes.

It must not:

- send email, SMS, calls, push messages, mailers, or ads;
- import contacts or sync ad accounts;
- create or delete CRM records;
- spend money;
- overwrite stored estimates, quotes, invoices, customer history, inventory records, or dealership records.
