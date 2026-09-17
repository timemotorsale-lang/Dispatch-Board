# Claims Workspace Workflow Catalog

**Status:** Planning baseline  
**Scope:** first release through handoff readiness.

## Workflow 1: Start Insurance Claim

Goal: create a durable claim workspace from a customer/vehicle situation.

Required minimum:

- customer or customer placeholder;
- vehicle or vehicle placeholder;
- loss date or unknown marker;
- claim source;
- current owner.

Optional at creation:

- claim number;
- carrier;
- adjuster;
- deductible;
- loss description;
- initial photos;
- initial documents.

Exit result:

- claim workspace exists;
- next action is assigned;
- missing information is visible.

## Workflow 2: Complete Claim Snapshot

Goal: establish enough claim context for staff to work without guessing.

Capture:

- customer;
- vehicle;
- policyholder if different;
- carrier;
- claim number;
- adjuster contact;
- loss date;
- loss type;
- deductible;
- basic incident description.

Exit result:

- snapshot completeness is visible;
- missing fields are listed as operational gaps;
- claim remains usable even if some fields are unknown.

## Workflow 3: Collect Evidence

Goal: collect and classify claim proof.

Evidence checklist:

- customer authorization;
- damage photos;
- VIN photo;
- odometer photo;
- insurance card or policy reference;
- tow/storage document;
- police report if applicable;
- estimate;
- carrier approval;
- supplement request or approval if applicable.

Exit result:

- evidence is attached to the claim;
- documents are stored in the central library;
- required gates update automatically.

## Workflow 4: Work Next Action

Goal: keep the claim moving.

Next actions:

- call customer;
- contact adjuster;
- request missing photos;
- upload estimate;
- request supplement;
- prepare repair order;
- collect deductible;
- send to accounting;
- close claim.

Exit result:

- owner is clear;
- next due date is clear;
- communication or task history records what happened.

## Workflow 5: Handoff to Repair Order

Goal: move a ready claim into service execution.

Required before handoff:

- customer linked;
- vehicle linked;
- claim number or documented exception;
- carrier or documented self-pay exception;
- loss description;
- required photos;
- authorization status;
- estimate path known or estimate-needed flag;
- owner assigned.

Exit result:

- repair order is linked or created;
- claim remains visible from repair order;
- repair staff can see claim context without re-entering intake data.

## Workflow 6: Handoff to Payment / Recovery

Goal: make deductible, carrier payment, short-pay, and receivable work visible.

Minimum context:

- deductible amount or unknown marker;
- responsible payer;
- payment status;
- carrier approval/payment proof if received;
- accounting owner when applicable.

Exit result:

- payment follow-up is assigned;
- staff can distinguish repair readiness from payment recovery.

## Workflow 7: Close Claim

Goal: close the operational claim cleanly.

Closeout gates:

- final documents attached or exception recorded;
- final photos/delivery proof if required;
- payment status resolved or handed off;
- repair order linked or not-applicable reason recorded;
- customer communication completed;
- owner confirms closeout.

Exit result:

- claim is closed;
- audit history remains available;
- documents remain searchable from claim, customer, and vehicle.

## Standard Staff Questions

Every workflow should help staff answer:

- What is missing?
- Who owns it?
- Who are we waiting on?
- What is blocking handoff?
- What proof do we have?
- Where are the documents?
- What is the next action?

