# Claims Workspace Roadmap and Milestones

**Status:** Planning baseline  
**Implementation approach:** small vertical slices, each useful on its own.

## Roadmap

### Phase 1: Claims Workspace Foundation

Create the basic claim assistant:

- start insurance claim from service intake;
- create durable claim record;
- show claim snapshot;
- show what-we-need checklist;
- attach evidence and documents;
- assign next action and owner;
- show handoff readiness.

### Phase 2: Evidence and Document Depth

Make proof collection more enterprise-grade:

- required photo categories;
- document classification;
- central document library linking;
- customer, vehicle, claim, and repair-order relationships;
- missing evidence indicators;
- staff upload and review states.

### Phase 3: Handoff to Repair Order

Connect claim intake to service execution:

- create or link repair order;
- carry claim context into repair workbench;
- preserve claim documents and evidence;
- show repair status summary inside claim;
- enforce handoff readiness gates.

### Phase 4: Carrier, Supplement, and Communication

Support more complex claims:

- adjuster communication log;
- carrier status;
- estimate uploaded;
- supplement requested;
- supplement approved/denied;
- follow-up due dates;
- aging and blocked indicators.

### Phase 5: Payment and Recovery

Track money without building full accounting first:

- deductible status;
- insurance payment status;
- short-pay / unpaid amount;
- accounting handoff;
- receivable owner;
- recovery follow-up.

### Phase 6: Claims Queue and Management Views

Add operational visibility when volume requires it:

- open claims queue;
- claims by owner;
- waiting on customer;
- waiting on carrier;
- ready for repair order;
- payment follow-up;
- aging and escalation.

## Milestones

| ID | Milestone | Exit result |
| --- | --- | --- |
| CLM-000 | Planning baseline | Architecture, UX, workflow, and roadmap documents approved |
| CLM-010 | Claim assistant shell | Service Intake can open a simple Claims Workspace shell |
| CLM-020 | Durable claim record | Claim record persists with customer, vehicle, owner, stage, and next action |
| CLM-030 | Snapshot and checklist | Staff can see claim snapshot and missing required items |
| CLM-040 | Evidence and documents | Staff can attach photos/documents and classify required evidence |
| CLM-050 | Handoff readiness | Workspace shows repair/payment/customer follow-up readiness and blockers |
| CLM-060 | Repair order link | Claim can create or link a repair order and remain visible from both records |
| CLM-070 | Communication log | Carrier/customer/adjuster communication is recorded with next follow-up |
| CLM-080 | Supplement tracking | Estimate and supplement status can be tracked without overloading intake |
| CLM-090 | Payment recovery | Deductible, carrier payment, and accounting handoff become visible |
| CLM-100 | Claims queue | Staff and managers can view open claims by status, owner, blocker, and age |

## First Production Candidate

The first useful release should end at CLM-050:

```text
service intake
  -> claim workspace
  -> snapshot
  -> required evidence checklist
  -> document attachment
  -> next action
  -> handoff readiness
```

It deliberately excludes carrier integrations, automated estimating, full accounting, and broad management dashboards.

## Standard Milestone Proof

Each implementation milestone should include:

- source-of-truth update if the UX changes;
- server-side validation and policy;
- role-aware permission behavior;
- empty, denied, loading, stale, and error states;
- audit or activity history for important actions;
- tests for workflow rules and handoff gates;
- representative dealership scenario evidence;
- no claim that a capability is live before it is verifiably wired.

## Stop Conditions

Pause expansion when:

- customer or vehicle ownership is ambiguous;
- claim documents are not stored in the central library;
- staff must re-enter the same claim data in repair order;
- a handoff can happen without required evidence or an explicit exception;
- payment status is represented as collected without authoritative proof;
- UI complexity grows into one long form;
- the capability creates a second task, document, customer, vehicle, or repair-order system.

