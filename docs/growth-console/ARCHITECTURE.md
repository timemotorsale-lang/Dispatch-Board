# Growth Console Architecture

**Status:** Foundation baseline
**Date:** 2026-09-07

## Architecture Intent

Growth Console is a module inside the existing Dispatch Board modular monolith. It should become the dealership's growth orchestration layer, not a separate marketing app, CRM clone, advertising account, or analytics warehouse.

The first implementation is frontend-only and reviewable. Backend expansion comes later only after the user approves the interaction model.

## System Boundary

Growth owns:

- campaign plans;
- audience review snapshots;
- message and ad drafts;
- offer packaging;
- approval state;
- launch intent;
- automation policy definitions;
- growth performance read models;
- attribution explanations.

Growth does not own:

- customer identity, consent, or contact preference;
- inventory truth;
- vehicle pricing truth;
- sales deal truth;
- repair order or diagnostic truth;
- accounting, invoices, or payments;
- appointment schedules;
- external ad platform delivery records.

## Source Authority Map

| Fact | Source of truth | Growth behavior |
| --- | --- | --- |
| Customer identity and contact method | CRM / Customers | Read, segment, suppress, and write back approved growth activity only through governed commands. |
| Consent and opt-out | CRM / Customers | Must be checked before every audience activation. UI may warn; backend must enforce. |
| Vehicle availability and retail readiness | Inventory | Read for promotion and exclusion. Never sell or reserve from Growth alone. |
| Vehicle price and merchandising status | Inventory / Sales policy | Display as context. Require approved source record for offers. |
| Deal and quote status | Sales / CRM | Use for recovery campaigns and follow-up. Do not replace quote approval. |
| Service, repair, and diagnostic status | Service / Diagnostics / Repair | Use as trigger context only after source record confirms state. |
| Campaign approval and launch intent | Growth | Growth-owned and auditable. |
| Delivery and spend | External provider adapters | Read through connectors when approved. No direct activation in foundation. |

## Proposed Module Layers

| Layer | Responsibility |
| --- | --- |
| Frontend console | Daily action path, workspace navigation, review cards, approval panels, results readout, and disabled live-launch boundaries. |
| Growth application service | Validate commands, prepare audience snapshots, generate campaign plans, request approvals, and coordinate external providers. |
| Policy service | Consent, quiet hours, frequency caps, budget approval, brand safety, role permissions, and suppression checks. |
| Scoring service | Opportunity priority, audience readiness, channel fit, expected value, and risk scoring. |
| Provider adapters | Email, SMS, ad network, website, analytics, call tracking, and social publishing integrations. |
| Event ledger | Immutable campaign, approval, launch, delivery, engagement, conversion, suppression, and rollback events. |
| Read models | Growth home queue, campaign detail, audience review, automation library, results dashboard, and CRM writeback lens. |

## Core Data Concepts

| Concept | Meaning |
| --- | --- |
| GrowthOpportunity | A recommended business action such as aging inventory promotion, unsold quote recovery, service reminder, or cold lead reactivation. |
| CampaignPlan | The human-readable plan that connects goal, audience, offer, message/ad, schedule, owner, and measurement. |
| AudienceSnapshot | A versioned list of included, excluded, suppressed, and unresolved people or accounts. |
| MessageDraft | Email, SMS, call script, website, social, or ad copy awaiting review. |
| OfferPackage | Vehicle, service, finance, appointment, or quote offer context approved for campaign use. |
| GrowthApproval | Human approval for audience, message/ad, budget, schedule, and launch. |
| AutomationPolicy | A governed trigger, eligibility rule, action, frequency cap, and pause rule. |
| GrowthResult | Delivery, engagement, appointment, opportunity, sale, service, opt-out, spend, and attribution readout. |

## Command Boundary

Future backend commands must be explicit and idempotent where retry is possible:

- `createGrowthOpportunity`
- `dismissGrowthOpportunity`
- `createCampaignPlan`
- `reviewAudienceSnapshot`
- `approveMessageDraft`
- `requestBudgetApproval`
- `scheduleCampaignLaunch`
- `pauseCampaign`
- `recordCampaignResult`
- `writeGrowthActivityToCrm`

Frontend buttons may prepare intent, but server commands must validate role, consent, audience, budget, source freshness, and approval state.

## Permission Model

| Role | Can do |
| --- | --- |
| Owner / General Manager | Approve budget, live launch, automation activation, suppression overrides where legal, and rollout adoption. |
| Marketing Manager | Prepare campaigns, review audience, edit content, request approval, inspect results. |
| Sales Manager | Approve sales offers, assign CRM follow-up, review sales attribution. |
| Inventory Manager | Approve inventory promotion eligibility and vehicle exclusions. |
| Service Manager | Approve service/repair follow-up rules and operational claims. |
| Staff | Work assigned follow-ups and view approved tasks relevant to their role. |

## Reliability And Safety

- Fail closed when consent, source freshness, budget approval, or provider status is unknown.
- Preserve all existing quotes, estimates, invoices, customer records, and dealership inventory records.
- Store campaign versions instead of overwriting prior approved plans.
- Keep external-provider side effects behind approved backend adapters.
- Show unavailable states clearly and route the user to a safe next action.

## Frontend Foundation Slice

The first `/growth` slice may use static review data and disabled live actions. It must present itself as a review foundation, not operational proof.
