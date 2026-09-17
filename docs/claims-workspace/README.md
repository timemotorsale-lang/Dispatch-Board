# Claims Workspace Planning Pack

**Product area:** Service / Repair Operations  
**Status:** Planning baseline, pre-implementation  
**Primary anchor:** Service Console / Repair Intake  
**Secondary visibility:** Customer 360, Vehicle 360, Repair Order, Document Library  

## Core Decision

The insurance claim capability starts as a **Claims Workspace**, not a heavy standalone claims platform.

The staff experience must stay simple: a guided execution workspace that helps a service advisor or front-office staff member move a claim from first contact to handoff. The backend must still be enterprise-grade from day one: durable records, linked evidence, permissions, status history, auditability, document storage, and future reporting readiness.

## Product Principle

**Simple execution on the surface, enterprise depth underneath.**

The first screen should answer:

- Who is involved?
- What happened?
- What do we still need?
- What evidence is attached?
- Who owns the next action?
- Is this ready for repair, payment, or follow-up handoff?

The interface should not expose claim complexity until the work requires it. A simple claim stays simple. A complicated claim progressively reveals adjuster communication, supplement tracking, deductible/payment recovery, repair order linkage, document gaps, and management escalation.

## Source-of-Truth Order

1. [Architecture](ARCHITECTURE.md)
2. [UX Source of Truth](UX_SOURCE_OF_TRUTH.md)
3. [Workflow Catalog](WORKFLOW_CATALOG.md)
4. [Algorithms and Decision Logic](ALGORITHMS_AND_DECISION_LOGIC.md)
5. [Roadmap and Milestones](ROADMAP_AND_MILESTONES.md)

## Non-Negotiables

- Claims belong primarily under Service / Repair Operations, not sales desking.
- The workspace must link to existing customer, vehicle, document, task, and repair-order foundations.
- It must not create a parallel customer, vehicle, repair, document, or task system.
- Evidence and documents must be stored once, then attached by relationship to the claim, customer, vehicle, and repair order where applicable.
- Required gates must be clear before handoff, but the first implementation must avoid becoming one long form.
- Staff should always see the next best operational action before seeing advanced claim administration.

## Initial Release Shape

The first useful release is a staff-facing **Insurance Claim Assistant** inside the Claims Workspace:

1. Claim snapshot
2. What we need
3. Evidence and documents
4. Next action
5. Handoff readiness

This is enough to help staff execute claims consistently without waiting for a full estimating, accounting, or carrier-integration platform.
