# Vehicle Workbench Overview and Role Lenses Source of Truth

**Product:** Time Motor Sales Dispatch Board  
**Program:** Inventory Console Optimization  
**Surface:** Inventory Console → Vehicle Workbench  
**Status:** Approved planning and UX source of truth  
**Date adopted:** July 24, 2026  
**Adoption authority:** Explicit project-owner approval  
**Implementation claim:** None. This document approves the planned UX direction, behavior rules, role-lens model, and required enhancement for future implementation planning. It does not activate code, migrations, integrations, pilot use, production rollout, or employee-performance policy.

---

## 1. Approved visual direction

The approved neutral landing direction is:

**Vehicle Workbench — Overview**

This is the master home for one vehicle. It is not a role-specific page and it is not another tab wall. It gives staff a single vehicle-centered starting point before they open deeper work areas or switch role lenses.

The approved inventory-manager role direction is:

**Vehicle Workbench — Inventory Manager View**

This is the official inventory manager landing lens inside the Vehicle Workbench. It prioritizes lifecycle movement, blockers, approval gates, parts readiness, aging/capital risk, frontline readiness, evidence completeness, and manager next actions.

The approved technician role direction is:

**Vehicle Workbench — Technician View**

This is the official technician landing lens inside the Vehicle Workbench. It prioritizes assigned work, current/next position, parts readiness, blocker protection, evidence requirements, comments, and QC handoff.

## 2. Core product model

The Vehicle Workbench follows this principle:

> One vehicle. One home. Many role-based ways to work.

The Vehicle Workbench is the master home for the selected vehicle. Role controls are lenses that rearrange emphasis and permitted actions. They are not separate destinations.

Work-area cards open deeper workspaces only when the user needs detail.

### Role lenses

Role lenses change what the user sees first:

- Overview
- Inventory Manager
- Technician
- Parts
- Sales / Marketing
- Service Advisor
- General Manager

Role lenses must not create duplicate pages that lead staff to the same place under different names.

### Work areas

Work-area cards are actual work destinations or expandable areas:

- Vehicle Lifecycle Workbench / Lifecycle Planning
- Repair Work
- Parts Tracker
- Approvals & Decisions
- Sales / Frontline
- Evidence, Files & Comments
- Customer / Ownership
- Audit / History

The implementation rule is:

> Role buttons change the lens. Work cards open work.

## 3. Return-to-workbench rule

Every deep page opened from the Vehicle Workbench must preserve vehicle context and provide a visible return path:

```text
← Back to Vehicle Workbench
```

Deep links should carry return context where practical:

```text
returnTo=/vehicles/{vehicleId}/workbench
```

This rule applies to parts detail, repair work, lifecycle planning, approval review, QC, audit/history, evidence, frontline checklist, relationship, and other vehicle-centered drill-down pages.

## 4. Required inventory-manager enhancement

The approved Inventory Manager View is adopted with one required enhancement:

**Manager Notes & Decisions**

The inventory manager must have a clear, visible space to comment and record decisions from the Vehicle Workbench.

This requirement is official even if it was not visually prominent in the approved mockup image.

### Required capabilities

The Manager Notes & Decisions area must support:

- quick manager comment;
- record manager decision;
- attach file or photo;
- set note visibility;
- link the note to a lifecycle stage, blocker, approval, parts issue, repair plan, or frontline-readiness item;
- show recent manager notes and decisions.

### Visibility choices

At minimum, the design must support these visibility classifications:

- Internal
- Visible to shop
- Visible to sales/frontline
- Manager-only

The visibility label must not override server-side permissions or evidence classification rules.

### Recommended placement

Implementation should provide both:

1. a compact quick-comment affordance in the right-side manager action rail; and
2. a fuller **Manager Notes & Decisions** card in the main grid near Evidence Completeness.

Manager comments support workflow clarity and decision history. They must not silently replace structured approval, blocker, assignment, purchase, stage movement, or repair authorization commands.

## 5. Behavioral algorithms to document before implementation

Before implementation begins, the branch must document the behavioral algorithms behind the Vehicle Workbench.

Required core algorithm set:

- role lens algorithm;
- next best action algorithm;
- lifecycle movement algorithm;
- parts readiness algorithm;
- approval gating algorithm;
- evidence completeness algorithm;
- role-permission algorithm;
- aging and risk algorithm;
- return-to-workbench routing rule.

Required technician/shop accountability algorithm set:

- assignment readiness;
- technician workload;
- current / next position;
- blocker protection;
- evidence accountability;
- productivity support;
- responsibility routing;
- rework / QC accountability;
- fair time expectation;
- manager dashboard.

The technician/shop design principle is binding:

> The system measures work state and evidence, not personal blame.

The Workbench must not expose opaque employee scores, public rankings, automatic discipline, or surveillance-oriented measures.

## 6. Inventory Manager View behavioral emphasis

The Inventory Manager View must emphasize:

- lifecycle command and stage movement readiness;
- blockers and responsible queue;
- approval gates and pending decisions;
- parts readiness impact;
- aging and capital risk;
- frontline readiness;
- evidence completeness;
- manager notes and decisions;
- explainable next best action.

Blocked work must route to the responsible queue, not to personal blame.

Examples:

- Parts issue → Parts queue
- Approval issue → Manager queue
- Customer authorization → Service Advisor queue
- Bay issue → Shop dispatch/manager queue
- Technician evidence missing → Technician queue
- QC failure → Rework/QC queue with attributable evidence
- Stage movement needed → Inventory Manager queue

## 7. Required technician enhancement

The approved Technician View is adopted with one required enhancement:

**Stalled / Incomplete Work Details**

The technician must have a guided, structured way to explain stalled, incomplete, partially completed, unable-to-complete, further-diagnosis, waiting, safety, or blocked work. This requirement is official even if it was not visually prominent in the approved mockup image.

The goal is operational clarity, better troubleshooting, and fair routing. It is not personal blame.

### Triggering conditions

The Stalled / Incomplete Work Details flow is required when a technician selects or records:

- stalled;
- partially completed;
- unable to complete;
- further diagnosis needed;
- waiting on parts;
- waiting on approval;
- bay unavailable;
- vehicle unavailable;
- safety issue;
- equipment/tool issue;
- need manager decision;
- any other blocker that prevents ordinary completion or QC handoff.

### Required information

The guided flow must capture, as applicable:

- what was attempted;
- what was completed;
- what remains;
- why work cannot continue;
- finding or observation;
- tests performed;
- measurements or results;
- parts condition or parts needed;
- evidence supporting the update;
- recommended next step;
- who should act next;
- whether the vehicle is safe to move;
- whether the vehicle is road-ready;
- whether more diagnosis, approval, parts, equipment, bay, or manager direction is needed.

Free-text comments are allowed, but required workflow data must be structured enough to route responsibility, support troubleshooting, and preserve evidence.

### No empty blocker rule

A blocker cannot be recorded with category alone.

Examples:

- `Waiting parts` requires the affected part, request state, ETA state, substitute/exception state when relevant, and whether the vehicle can safely move.
- `Waiting approval` requires approval type, amount or decision needed, approver/queue, paused work, and any work that can continue.
- `Safety issue` requires the safety concern, immediate restriction, and responsible review queue.

### Technician efficiency and accountability algorithms

Before implementation, the Technician View must document and implement these behavior contracts:

1. **Assignment readiness algorithm** — a technician should only be prompted to start work when the job is assigned, approvals and dependencies are satisfied, required parts are ready or exception-approved, bay/tool/safety requirements are satisfied, and prior dependencies are complete.
2. **Current / next position algorithm** — separates current work, next ready work, waiting work, and blocked work so dispatch can stage work without overloading the technician.
3. **Blocker protection algorithm** — routes blocked work to the responsible queue and changes the work state so technician delay is not inferred from work that cannot proceed.
4. **Evidence accountability algorithm** — requires job-appropriate evidence before completion, exception routing, or QC handoff.
5. **Smart troubleshooting capture algorithm** — captures structured diagnostic data when work is not complete so the next technician, manager, or diagnostic reviewer receives useful context.
6. **Responsibility routing algorithm** — routes parts issues to Parts, approval issues to Manager or Service Advisor, diagnosis uncertainty to diagnostic review, safety issues to manager hold, equipment issues to shop manager, and customer decisions to Service Advisor.
7. **Fair time state algorithm** — separates active touch time from waiting on parts, approval, bay, manager decision, customer decision, QC, or rework.
8. **Rework / QC learning algorithm** — links failed QC or rework to the original job, captures cause category and evidence, and does not automatically blame the technician.
9. **Productivity recommendation algorithm** — recommends next best work from readiness, skill match, bay availability, parts availability, target date, aging risk, and current workload.
10. **Technician comment/evidence rule** — comments explain context, while structured fields drive routing, metrics, and accountability.

### Technician View behavioral emphasis

The Technician View must emphasize:

- current assigned job;
- parts readiness and missing parts;
- blocker reporting and blocker protection;
- required photos, notes, and completion evidence;
- current / next / waiting position;
- QC handoff readiness;
- comments and collaboration;
- explainable next best action;
- fair accountability statement.

The binding technician/shop design principle remains:

> The system measures work state and evidence, not personal blame.

## 8. Change control

The approved visual direction may be implemented as a faithful code-native UI without regenerating the mockup image, provided the required Manager Notes & Decisions and Stalled / Incomplete Work Details enhancements are included.

Material changes to the master Vehicle Workbench hierarchy, role-lens behavior, return-to-workbench rule, manager comment/decision model, technician stalled/incomplete-work model, technician accountability principle, or work-area ownership require explicit product-owner approval and a versioned update to this document.
