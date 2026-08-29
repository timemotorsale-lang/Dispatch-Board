# CRM Next — Legacy Capability Audit

**Status:** CRMN-002 / CRMN-003 audit baseline  
**Scope:** Existing Dispatch Board Customers, Unified CRM, Tasks, Appointments, Activity, Vehicle/Inventory, and related CRM-adjacent implementation  
**Instruction:** This is an implementation-readiness audit only. It does not authorize production CRM Next code changes.

## Executive finding

CRM Next should replace the Legacy customer/CRM user experience, not the whole working foundation. The current repository contains valuable customer identity, task, appointment, activity, opportunity, quote, permission, rollout, and integration-readiness foundations that should be reused or migrated behind a cleaner CRM Next experience.

The most important distinction:

- **Replace:** scattered Legacy UX, review-only screens, sample/dashboard-style presentation, excessive tabs, and unclear action paths.
- **Reuse:** durable records, server-side policies, source-domain services, bridge models, activity/timeline infrastructure, and tests where they match CRM Next rules.

## Existing surfaces observed

| Surface | Current role | Audit result |
|---|---|---|
| `/customers` | Customer console/dashboard surface | Useful visual and some backend wiring, but not the CRM Next command center. Redesign. |
| `/customers/customer-360` | Legacy/customer 360 route | Reuse read-model lessons; replace tab-heavy UX with CRM Next grouped 360. |
| `/customers/[customerId]` | Customer detail route | Keep as source/legacy route during parallel build; evaluate for reuse. |
| `/customers/resolutions` | Customer case/SLA resolution surface | Reuse case/SLA concepts and services; redesign into Support/Cases/Workbench flow. |
| `/crm` | Unified CRM console/review shell | Reuse contracts and source integrations; likely not final CRM Next UX. |
| `/crm/opportunities/*` | Opportunity review/create/transition routes | Reuse models/services; redesign user-facing flow around Pipeline/Workbench. |
| `/crm/quotes/*` | Quote/review/version routes | Reuse quote/version/approval foundations; keep operational activation gated. |
| `/api/customers/*` | Customers APIs | Reuse selectively; some routes mix live/hybrid/sample projections. |
| `/api/crm/v1/*` | Unified CRM APIs | Reuse contracts, guards, bridge services, release gates, and integration readiness. |

## Schema and data inventory

Observed durable models include:

- `Customer`
- `CustomerContactPoint`
- `CustomerInteraction`
- `CustomerNote`
- `CustomerVehicle`
- `CustomerDocumentRequirement`
- `CustomerLead`
- `CustomerLeadTaskLink`
- `CustomerSlaPolicy`
- `CustomerSlaPause`
- `CustomerSlaAlert`
- `CustomerCrmFeatureFlag`
- `CustomerCrmRolloutEvent`
- `CustomerPromise`
- `UnifiedCrmOpportunityRecord`
- `UnifiedCrmOpportunityTaskLink`
- `UnifiedCrmOpportunityAppointmentLink`
- `UnifiedCrmOpportunityDispatchLink`
- `UnifiedCrmOpportunityStageEvent`
- `UnifiedCrmQuoteRecord`
- `UnifiedCrmQuoteVersion`
- `UnifiedCrmCommercialApprovalRequest`
- `UnifiedCrmCommercialApprovalDecision`
- `UnifiedCrmForecastSnapshot`
- `UnifiedCrmSavedView`
- `Task`
- `Appointment`
- `ActivityEvent`
- `Vehicle`
- `VehicleRelationship`

## Capability classification

| Capability | Current evidence | CRM Next treatment |
|---|---|---|
| Customer identity | Durable model exists with contacts, owner, status, merge/archive fields | **Reuse** |
| Customer contacts | Contact points exist and some masking/read policy exists | **Reuse + refine** |
| Customer 360 | Legacy and Unified CRM read models exist | **Redesign UX, migrate read model** |
| Customer dashboard | Hybrid read model; some hardcoded/sample values remain | **Retire as final UX; reuse useful queries only** |
| Customer search/list | Unified CRM customer read/search foundations exist | **Reuse service/policy; redesign CRM Next presentation** |
| Global search | Unified CRM global search covers customers, contacts, opportunities, quotes, tasks, appointments, vehicles, dispatch | **Reuse and adapt** |
| Leads | `CustomerLead` and lead services/routes exist | **Migrate into CRM Next Sales/Pipeline** |
| Opportunities | Unified CRM opportunity models/services/routes exist | **Reuse backend; redesign UX and lifecycle copy** |
| Pipeline | Existing preview/review surfaces exist | **Redesign into simple stage + attention view** |
| Quotes | Versioned quote and approval foundations exist | **Reuse; keep presentation/approval gates governed** |
| Tasks | Shared `Task` domain is mature | **Reuse; never duplicate** |
| Appointments | Appointment command/read foundations exist | **Reuse; CRM invokes source authority** |
| Activity/timeline | `ActivityEvent` and customer timeline assembly exist | **Reuse; consolidate into unified CRM Next timeline** |
| Cases/SLA | Customer resolution and SLA foundations exist | **Reuse backend, redesign into Support/Cases** |
| Documents/titles | Customer document requirements exist | **Reuse; redesign as resolution-oriented Support workflow** |
| Vehicles/ownership | Customer-vehicle and vehicle/inventory foundations exist | **Reuse source authority** |
| BHPH/payments | Some service/customer status/payment-adjacent models exist | **Preserve/defer deeper writes until authority is clear** |
| Communications | Manual call disposition, email draft, SMS templates, consent/guardrail contracts exist | **Reuse foundation; defer live sending** |
| Telephony/SMS/email integrations | Contracts and readiness services exist; provider activation held | **Defer operational activation** |
| AI receptionist | Requirements and simulator foundations exist | **Defer live assistant; reuse simulator/requirements later** |
| Saved views | Server-backed Unified CRM saved views exist | **Reuse/adapt** |
| Release/pilot gates | Security, reliability, accessibility, rollback, pilot services exist | **Reuse as CRM Next promotion model** |

## Main risks

1. **UX fragmentation:** `/customers` and `/crm` currently create two CRM mental models.
2. **Sample-data confusion:** Some dashboard/read-model values are still synthetic or hybrid.
3. **Route inconsistency:** Some linked routes are source workspaces, some are CRM review routes, and some are placeholders.
4. **Feature-flag overlap:** Existing `CRM_MASTER` and `UNIFIED_CRM_*` controls may conflict with a clean CRM Next rollout unless mapped first.
5. **Provider temptation:** Communication foundations exist, but live SMS/phone/email must remain deferred until provider, consent, audit, and cost controls are approved.
6. **Overbuilding:** The repo already contains many enterprise contracts. CRM Next should simplify the user path, not expose every contract as navigation.

## Audit conclusion

The current implementation is backend-rich but UX-fragmented. CRM Next should be built as a new guided experience that reuses authoritative data and services while keeping Legacy available until promotion.

