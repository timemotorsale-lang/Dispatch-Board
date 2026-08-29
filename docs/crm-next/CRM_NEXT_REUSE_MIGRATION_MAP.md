# CRM Next — Reuse, Migration, Retirement, and Deferral Map

**Status:** CRMN-004 / CRMN-005 planning baseline  
**Purpose:** Decide what CRM Next should reuse, redesign, migrate, retire, or defer before implementation begins.

## Treatment vocabulary

| Treatment | Meaning |
|---|---|
| Reuse | Bring the existing implementation forward substantially as-is. |
| Reuse + refine | Keep the foundation but tighten naming, permission, UX, tests, or contracts. |
| Redesign | Replace the user experience while retaining useful source data/services. |
| Migrate | Move capability/data into the CRM Next experience through a governed mapping. |
| Retire | Do not bring forward as a final CRM Next behavior. |
| Defer | Keep out of the first CRM Next release until a later decision/gate. |

## Reuse map

| Existing asset | CRM Next use | Treatment | Notes |
|---|---|---|---|
| `Customer` aggregate | Customer 360 source identity | Reuse | Do not create a CRM Next customer master. |
| `CustomerContactPoint` | Contact display, preference, communication readiness | Reuse + refine | Add/verify consent and field-level projections before live communication. |
| `CustomerInteraction` | Manual touchpoint history | Reuse | Good foundation for activity and communication timeline. |
| `CustomerNote` | Internal customer context | Reuse | Preserve visibility/restricted access behavior. |
| `CustomerVehicle` / `VehicleRelationship` | Ownership, service, trade, and vehicle context | Reuse | Vehicle facts stay source-owned. |
| `CustomerDocumentRequirement` | Title/document support workflow | Reuse + refine | CRM Next should show it as a Support/Case execution item. |
| `CustomerLead` | Sales lead and follow-up | Migrate | Needs CRM Next pipeline/workbench UX. |
| `Task` engine | CRM execution work | Reuse | CRM Next must open/create/link shared tasks, not duplicate them. |
| `Appointment` engine | Scheduling and attendance context | Reuse | CRM Next may initiate, but Appointment Command Center owns scheduling truth. |
| `ActivityEvent` | Unified activity/timeline evidence | Reuse | Must remain event-backed and safe. |
| `UnifiedCrmOpportunityRecord` | Pipeline/opportunity foundation | Reuse + refine | Preserve backend; simplify UI and lifecycle presentation. |
| `UnifiedCrmQuoteRecord` / `UnifiedCrmQuoteVersion` | Quote/version foundation | Reuse | Keep guarded; do not activate presentation until authority gates pass. |
| `UnifiedCrmCommercialApproval*` | Approval boundary | Reuse | Keep separation-of-duty and audit model. |
| `UnifiedCrmSavedView` | Saved queue/filter views | Reuse + refine | Adapt to CRM Next IA and permission language. |
| Unified CRM integration contracts | Provider readiness | Reuse as planning/control layer | Not proof of live integrations. |
| Release/pilot verification services | Promotion gate evidence | Reuse + refine | Useful for CRM Next release discipline. |

## Redesign map

| Existing experience | CRM Next destination | Treatment |
|---|---|---|
| `/customers` chart-heavy dashboard | Command Center | Redesign |
| `/customers/customer-360` tab-heavy 360 | Customer 360 grouped as Overview/Sales/Ownership/Support/Activity | Redesign |
| `/customers/resolutions` queue/detail | Cases + Workbench | Redesign |
| `/crm` review shell | CRM Next shell/Command Center | Redesign |
| Opportunity preview/review panels | Pipeline + Opportunity Workbench | Redesign |
| Quote review surface | Commercial Workbench / Quote tool | Redesign presentation, reuse backend |
| Communication readiness pages | Universal actions + Activity | Redesign as simple user actions |

## Retire map

| Existing behavior | Retirement reason |
|---|---|
| Sample-looking dashboard metrics as final UI | Risks false confidence and does not satisfy live operational CRM Next. |
| Multiple equal customer tabs | Conflicts with CRM Next grouped Customer 360. |
| Frontend-only action affordances | CRM Next requires meaningful backend response or honest disabled state. |
| Duplicate CRM navigation between `/customers` and `/crm` | CRM Next should become one coherent experience after cutover. |
| Synthetic review copy as default user copy | Useful for build review; not suitable for production operators. |

## Defer map

| Capability | Deferral condition |
|---|---|
| Live SMS sending | Defer until provider, consent, opt-out, quiet-hours, rate/cost controls, delivery audit, and rollback are approved. |
| Live telephony/VoIP | Defer until provider, recording/consent, retention, transcription, failure, and legal controls are approved. |
| Email/calendar sync | Defer until provider selection, scopes, revoke, reconciliation, and privacy controls are approved. |
| AI receptionist live operation | Defer until communication and consent foundations are live and human escalation is proven. |
| DMS/accounting sync | Defer until authoritative system and field ownership are approved. |
| Workflow designer/custom fields production publishing | Defer until core CRM Next workflows are stable. |
| Advanced forecasting/AI coaching | Defer until deterministic CRM Next signals and feedback events are reliable. |

## Data ownership map

| Business fact | Authoritative owner | CRM Next behavior |
|---|---|---|
| Customer identity and merge state | Customers domain | Read/display/invoke customer-owned commands. |
| Contact points and preferences | Customers domain | Read/display with policy; communication commands check consent. |
| Executable work | Tasks domain | Create/link/open shared task records. |
| Appointments and schedule state | Appointments domain | Display and invoke Appointment commands; no separate CRM calendar. |
| Vehicle identity, custody, recon state | Inventory/Vehicles domain | Display permitted context and open source workspaces. |
| Repair/job state | Inventory/Repair/Dispatch source domains | Link and display; do not overwrite from CRM. |
| Customer activity timeline | Customer + Activity events | Assemble from event-backed sources. |
| Opportunities/quotes/approvals | Unified CRM commercial domain | Reuse records, simplify operator experience. |
| Communications provider delivery | Future integration adapter | Not live until approved. |
| BHPH/payment/accounting facts | Finance/accounting/source owner | Display permitted context only until authority is mapped. |

## Recommended migration posture

Build CRM Next in parallel using read-only projections first, then add write commands only where source ownership is already clear. Every migrated capability must prove:

- same or better permission behavior;
- same or better data integrity;
- no duplicate source-of-truth;
- clear fallback to Legacy/source workspace;
- route-level rollback;
- scenario proof against real workflows.

