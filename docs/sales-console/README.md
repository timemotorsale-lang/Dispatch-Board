# Time Motor Sales Enterprise Sales Console

**Status:** Planning baseline; documentation only  
**Primary product area:** `/sales`  
**Parent product:** Time Motor Sales Dispatch Board  
**Intended branch:** `codex/sales-console-enterprise-operations`

## Purpose

The Sales Console is the commercial decision and execution layer inside the Time Motor Sales operating system. It connects customer intent, vehicle economics, deal progress, appointments, staff work, approvals, documents, and delivery readiness around one operating question:

> Which person should take which sales action now, for which customer and vehicle, why does it matter, and what evidence will prove the outcome?

The console is not a second customer database, a replacement accounting ledger, an ungoverned finance decision engine, or a visual copy of another sales product. It applies proven patterns from enterprise CRM, workflow, revenue-intelligence, and automotive-inventory systems to the dealership's own operating model.

## Package

Read in this order:

1. [ENTERPRISE_SALES_ARCHITECTURE.md](ENTERPRISE_SALES_ARCHITECTURE.md) — product boundaries, domains, services, commands, read models, events, permissions, integrations, and reliability.
2. [SELLING_OPERATING_MODEL.md](SELLING_OPERATING_MODEL.md) — roles, daily cadence, queue discipline, handoffs, controls, and performance system.
3. [SALES_WORKFLOW_CATALOG.md](SALES_WORKFLOW_CATALOG.md) — end-to-end and exception workflows from lead intake through retention.
4. [SALES_ALGORITHMS_AND_DECISION_LOGIC.md](SALES_ALGORITHMS_AND_DECISION_LOGIC.md) — deterministic scores, ranking, matching, risk, forecast, and governance logic.
5. [ENTERPRISE_SALES_ROADMAP.md](ENTERPRISE_SALES_ROADMAP.md) — phased product path and rollout gates.
6. [SALES_IMPLEMENTATION_MILESTONES.md](SALES_IMPLEMENTATION_MILESTONES.md) — vertical slices, dependencies, evidence, and exit criteria.
7. [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md) — mapping from operating outcomes to workflows, algorithms, services, milestones, and proof.

Build-ready additions for the next implementation pass:

- [SALES_CONSOLE_PRODUCT_REQUIREMENTS.md](SALES_CONSOLE_PRODUCT_REQUIREMENTS.md) - role-based modules, screen requirements, acceptance criteria, permissions, reporting, and release gates.
- [SALES_DATA_MODEL.md](SALES_DATA_MODEL.md) - sales-owned entities, reference objects, event backbone, derived read models, and data-quality rules.
- [SALES_UI_IMPLEMENTATION_PLAN.md](SALES_UI_IMPLEMENTATION_PLAN.md) - navigation, dashboard views, deal desk, inventory intelligence, manager command center, components, and first UI tickets.
- [SALES_CONSOLE_M36_ARCHITECTURE_AUDIT.md](SALES_CONSOLE_M36_ARCHITECTURE_AUDIT.md) - corrective audit comparing the current build to the original enterprise goal, including the multi-lane revenue model and reset roadmap.
- [SALES_CONSOLE_M37_OPERATIONAL_UI_SOURCE_OF_TRUTH.md](SALES_CONSOLE_M37_OPERATIONAL_UI_SOURCE_OF_TRUTH.md) - corrected operational mockup and UI contract for rebuilding the staff-facing Sales Console.
- [SALES_CONSOLE_IMPLEMENTATION_PLANNING_MILESTONES.md](SALES_CONSOLE_IMPLEMENTATION_PLANNING_MILESTONES.md) - no-code implementation waves, milestone gates, release candidate scope, and pilot acceptance planning.
- [SALES_CONSOLE_MVP_MILESTONES_FOR_REVIEW.md](SALES_CONSOLE_MVP_MILESTONES_FOR_REVIEW.md) - MVP-only milestones for review before implementation begins.

Visual approval reference:

- [assets/enterprise-sales-console-review-mockup-v1.png](assets/enterprise-sales-console-review-mockup-v1.png) - enterprise Sales Console mockup used as the visual source of truth for the `/sales` prototype.
- [assets/elite-enterprise-sales-console-source-of-truth-m37.png](assets/elite-enterprise-sales-console-source-of-truth-m37.png) - official elite enterprise Sales Console source-of-truth mockup for the operational rebuild.

## Product boundaries

| Domain | Authoritative responsibility | Sales Console use |
| --- | --- | --- |
| Customers | Customer identity, contact preference, consent, interactions, cases, and Customer 360 | Relationship and communication truth |
| Inventory | Vehicle identity, ownership, lifecycle, location, readiness, market, cost, and disposition signals | Vehicle availability, fit, economics, and readiness |
| Appointments | Scheduling, participants, resources, commitments, outcomes, and conflicts | Showroom plan, confirmation, arrival, and no-show recovery |
| Tasks / Dispatch | Owned work, due time, status, blockers, escalation, and execution evidence | Durable follow-up and cross-department action |
| Documents | Document requirements, receipt, validation, restriction, and readiness | Deal and delivery readiness |
| Sales | Commercial opportunity, deal, quote, approval, forecast, sales play, and sales outcome | Revenue decision and orchestration truth |

Sales may project information from another domain, but it must not silently create an alternate source of truth.

## North-star outcomes

- Every active lead and deal has an accountable owner, explicit stage, dated next action, and freshness status.
- High-intent opportunities receive fast, consistent, policy-compliant attention.
- Managers see material risk and intervention opportunities before revenue is lost.
- Vehicle recommendations balance customer fit, readiness, availability, market demand, and expected economics.
- Quotes, discounts, promises, approvals, and handoffs are attributable and versioned.
- Forecasts are explainable and distinguish seller judgment from system projection.
- Salespeople spend more time selling and less time searching, re-entering data, or reporting status.
- Performance measurement rewards customer progress, profitable outcomes, follow-through, and data quality rather than raw activity volume.

## Planning and authorization boundary

This package establishes a target architecture and implementation sequence. It does not:

- authorize production code or activation;
- approve dealership score weights, SLA targets, pricing authority, compensation rules, or finance policy;
- permit autonomous customer communication, discounting, financing decisions, vehicle reservation, or contract execution;
- establish legal requirements;
- claim an external CRM, DMS, lender, messaging, or market-data integration exists.

Policy-sensitive values remain configuration candidates until dealership leadership assigns an owner, approves the value, records the effective date, and validates it in a controlled pilot.
