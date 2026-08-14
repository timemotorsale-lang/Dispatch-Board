# Unified CRM Product Charter

**Document ID:** `UCRM-CHARTER-001`
**Version:** 1.1 accepted product baseline
**Status:** Accepted for `UCRM-000`; this acceptance does not claim implementation or release
**Date:** 2026-08-14

## 1. Product identity

**Official name:** Dispatch Board Unified CRM Console
**Short name:** Unified CRM
**Navigation label:** CRM
**Target route:** `/crm`

Unified CRM is the customer-relationship and revenue workspace inside Dispatch Board. It gives frontline staff and managers a simple system of action over shared customer, sales, service, vehicle, appointment, task, quote, and operational context.

The business owner accepted the official name, short name, navigation label, `/crm` route, independent-console/shared-platform boundary, user-first operating model, and internal MVP scope on 2026-08-14.

## 2. Product promise

When a user opens Unified CRM, the console should answer within seconds:

1. What needs attention now?
2. What changed since the user last worked?
3. Which customer or opportunity should be handled next?
4. Why is it important?
5. What action is allowed now?
6. Can that action be completed without losing context?

The default operating loop is:

```text
Review priority -> understand context -> take action -> capture evidence -> set the next step
```

## 3. Product position

Unified CRM is:

- an independent console experience inside the existing Dispatch Board app;
- an operational B2B/dealership CRM connecting relationship activity to delivered work;
- a system of action that reduces administrative entry;
- a progressive-disclosure interface over enterprise controls;
- a native bridge between customer intent and Dispatch Board execution.

Unified CRM is not:

- a second customer database;
- a replacement for authoritative Inventory, Appointments, Tasks, Repair, Documents, Finance, or Activity domains;
- an ungoverned automation platform;
- a generic clone of Salesforce, HubSpot, or another vendor;
- a production integration merely because an interface or contract exists;
- an autonomous pricing, credit, financing, communication, or contract authority.

### 3.1 Canonical vocabulary

| Term | Program meaning |
| --- | --- |
| Customer | The canonical person or organization relationship identity owned by the Customers domain. |
| Contact point | A normalized phone, email, address, or approved channel identity with preference and consent evidence; it is not a separate customer. |
| Lead | An intake and qualification record representing expressed or detected interest that has not yet become a governed commercial pursuit. Existing `CustomerLead` semantics require an explicit bridge decision. |
| Opportunity | A CRM-owned active commercial pursuit tied to a customer, owner, pipeline, stage, next action, and due time. |
| Pipeline | A versioned collection of evidence-based opportunity stages for one approved selling motion. |
| Stage | A customer-evidence state changed only through a validated command; it is not a seller mood or arbitrary percentage. |
| Next action | The specific owned action required to progress or resolve a relationship, with a due time. |
| Activity | Safe operational chronology such as an interaction, task change, appointment, or system event. Activity is not the complete security audit. |
| Task | Executable work owned by the shared Tasks domain and linked to CRM context through an approved bridge. |
| Appointment | Scheduled or unscheduled appointment truth owned by the Appointments domain. |
| Job / dispatch work | Operational delivery, repair, service, or other executable work owned by its Dispatch/Repair source domain. |
| Scenario | A versioned commercial option under analysis. A presented scenario is immutable. |
| Quote | A versioned commercial offer with exact terms, expiry, presentation, approval, and response evidence. |
| Approval | A reasoned decision by an authorized actor over an exact subject and version; absence of a decision is not approval. |
| Conversation envelope | CRM-owned channel/thread/draft/delivery correlation; provider delivery truth and Customer-owned contact/consent remain distinct. |
| Read model | A purpose-built, permission-filtered view over authoritative facts with source and freshness; it is not a new system of record. |
| Audit | Immutable accountability evidence for sensitive access, material change, approval, export, administration, or security behavior. |
| Verified | The capability has required automated/manual evidence for an exact commit and environment; it does not by itself mean released. |

## 4. Primary users and jobs

| User | Primary jobs | Default landing |
| --- | --- | --- |
| Salesperson | Work priorities, contact customers, advance opportunities, prepare appointments, create quote requests, record outcomes | My Work |
| Lead coordinator / BDC | Review source-owned lead intake, recover neglected work, and bridge qualified interest into the governed CRM opportunity flow | Lead Operations |
| Sales manager | Review pipeline, forecast, approvals, stalled work, SLA risk, coaching needs, and revenue exceptions | Manager Command |
| Service advisor / customer care | Understand relationship history, manage concerns and promises, coordinate appointments and jobs | Customer Work |
| Office / finance liaison | Review document and handoff readiness without making unauthorized finance decisions | Handoffs |
| Administrator | Configure approved terminology, permissions, policies, views, sources, and rollout controls | Administration |
| Executive / owner | Review trusted outcome metrics and drill into source records | Insights |

Users may hold multiple roles. Navigation and commands are capability-driven, not title-only.

## 5. Experience principles

### 5.1 Action before administration

The home screen is a ranked work queue, not a wall of charts. Every priority item leads to an allowed resolution action.

### 5.2 One obvious next step

Frequent work should normally expose one primary action. Secondary and administrative controls remain nearby through progressive disclosure.

### 5.3 Context without navigation loss

Customer, opportunity, communication, quote, appointment, task, vehicle, and job context should open in panels or purpose-built workspaces without forcing users to reconstruct the relationship across browser tabs.

### 5.4 Capture automatically, confirm consequentially

The system may automatically associate safe activity and prepare suggested updates. Sending communications, changing commercial facts, merging identities, publishing automations, or closing consequential outcomes requires appropriate confirmation and authority.

### 5.5 Explain every recommendation

Risk, priority, forecast, next action, and automation results expose reasons, source freshness, confidence class, and override policy.

### 5.6 Mobile is a work mode

Mobile prioritizes agenda, search, call/message/navigation actions, notes, outcomes, and next steps. It is not a compressed desktop dashboard.

### 5.7 Accessibility is part of correctness

The target baseline is WCAG 2.2 AA, including keyboard operation, clear focus, screen-reader semantics, non-color status communication, accessible charts, reduced motion, and locale/time-zone clarity.

### 5.8 Experience is reviewed live, early, and repeatedly

Before agents deepen a workspace, the business owner reviews its proposed workflow as a live, interactive browser experience at representative desktop and mobile sizes. The review covers navigation, language, information priority, progressive disclosure, primary actions, keyboard behavior, loading/empty/error/denied states, and recovery. Feedback becomes a recorded acceptance decision before dependent UI expands.

An experience preview may use clearly labeled synthetic fixtures to test interaction and composition. It is not implementation evidence. The same workflow must be reviewed again against permission-filtered read models and real server-authoritative commands before a slice can be `VERIFIED`, `PILOT`, or `RELEASED`.

## 6. Initial information architecture

Permanent navigation is intentionally small:

- **Home** — priorities, agenda, changes, alerts, next actions;
- **Work** — role-aware queues, tasks, promises, and approvals;
- **Customers** — search, lists, relationships, and Customer 360;
- **Pipeline** — source-lead bridge, opportunities, board/table/forecast views;
- **Conversations** — approved manual communication history, drafts, templates, and work queues;
- **Insights** — actionable dashboards and traceable reporting;
- **More** — quotes, handoffs, configuration, and less-frequent modules.

Global capabilities:

- permission-filtered universal search;
- global Create action;
- command palette for expert users;
- recent items and favorites;
- grouped, priority-aware notifications;
- contextual, permission-aware assistant;
- visible source and freshness status.

## 7. Day-one capabilities

The first controlled release includes:

1. Customer identity, contact points, ownership, status, communication preferences, archive state, and duplicate candidates.
2. Customer 360 with relationship summary, unified timeline, opportunities, tasks, appointments, documents, vehicles, jobs/repairs, and notes, plus permission-filtered read-only lenses over existing source-owned leads and cases.
3. A safe read/bridge over existing lead intake that can carry approved source context into a governed opportunity without creating a second CRM-owned lead lifecycle.
4. Opportunity pipeline with evidence-based stages, aging, owner, next action, due time, value, expected close, risk, and history.
5. Activity timeline for manually recorded calls, messages, meetings, notes, system events, outcomes, and promises; communication drafts/templates may be prepared, but the CRM does not send or synchronize external communications in the MVP.
6. Task, appointment, vehicle, repair/job, document, and dispatch linkage through native domain bridges.
7. Quote drafts and governed presentation/approval boundaries with immutable presented versions.
8. Role-aware Home, manager queues, pipeline reporting, and record-level drill-through.
9. Server-enforced capabilities, record/field filtering, activity evidence, and sensitive-action audit.
10. A bounded, administrator-assisted pilot data load and rehearsal with validation, deduplication, provenance, reconciliation, and recovery evidence; this is an operational migration activity, not a day-one self-service import product.

## 8. Deferred capabilities

Unless promoted by an approved decision:

- production Gmail/Outlook synchronization;
- SMS, WhatsApp, telephony, recording, and transcription;
- external communication sending or inbox/calendar synchronization from the CRM;
- DMS/DealerCenter or external CRM synchronization;
- a new CRM-owned lead intake/lifecycle engine beyond the accepted source read/bridge;
- a new CRM-owned case workflow beyond the accepted read-only source lens;
- reusable or self-service customer/contact import;
- automated marketing journeys;
- unrestricted custom objects, scripts, and workflow execution;
- customer/partner portals;
- advanced CPQ, lending, underwriting, accounting, or contract execution;
- native mobile applications;
- autonomous outreach, pricing, approval, record merging, or contract actions;
- multi-region active-active deployment and customer-managed keys.

## 9. Success measures

### User outcomes

- A new user understands Home in under one minute.
- An authorized user finds a customer and understands the relationship in under ten seconds at target data volume.
- A call outcome and next step can be recorded in under fifteen seconds.
- An opportunity advances without requiring irrelevant fields.
- A manager can explain every forecast or pipeline movement from source records.
- A user can tell why a recommendation or automation appeared.

### Adoption and data health

- weekly active users by eligible role;
- percentage of active opportunities with owner, stage, next action, and due time;
- overdue follow-up rate;
- activity captured automatically versus manually;
- duplicate-candidate age and resolution rate;
- sync/import failure visibility and recovery time;
- record completeness measured only against role- and stage-relevant fields.

### Business outcomes

- lead response time and SLA attainment;
- lead-to-appointment and appointment-to-opportunity conversion;
- pipeline aging and stage leakage;
- quote turnaround time;
- promise fulfillment rate;
- customer issue recovery time;
- won-to-operational-handoff completion time;
- repeat and reactivation opportunities.

Metrics must define formula, cohort, source, freshness, owner, and drill-through records. Metrics are not authorized for employee discipline without a separate policy decision.

## 10. Product acceptance questions

Before pilot approval, representative users must answer yes to these questions:

1. Can I see what matters without learning the database schema?
2. Can I act without opening several consoles unnecessarily?
3. Does the system capture work I already performed instead of asking me to repeat it?
4. Can I identify the owner and next step for every active relationship?
5. Can I understand and recover from an error or failed synchronization?
6. Do permissions protect sensitive information without making ordinary work confusing?
7. Can a manager intervene without silently rewriting a seller's or customer's history?
8. Can the team keep working safely when optional AI or an external integration is unavailable?

## 11. Release posture

The target is a production-ready internal CRM, not immediate parity with every top-ten CRM suite. Enterprise foundations are built early where retrofitting would be dangerous—identity, authorization, audit, events, data authority, versioning, integration resilience, accessibility, and rollback. Broad suites, external adapters, and advanced customization arrive only after the core workflow demonstrates adoption and trusted data.

The accepted delivery posture is eight weeks for foundation-through-controlled-pilot work, with Weeks 9–10 reserved for evidence-driven correction and release contingency rather than added scope. Existing Customers and Sales consoles remain available through pilot and the accepted fallback period; their retirement is a separate decision.
