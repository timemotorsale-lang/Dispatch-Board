# CRM Milestone 2: Durable Lead Operations

**Status:** Implemented in source; database migration ready to deploy  
**Date:** 2026-07-12

## Delivered

- Durable organization-scoped customer leads and lead-to-Dispatch-task links
- Idempotent intake with canonical request hashing and conflict detection
- Explicit lead lifecycle with guarded transitions and closure reasons
- Versioned lead-priority evaluator using the approved 100-point model
- Contact-restriction hard stop and missing-input confidence behavior
- Versioned intelligent-assignment evaluator with eligibility, capacity, continuity, skill, rotation, and deterministic tie-break rules
- One transactional write for priority decision, assignment decision, lead, Dispatch task, link, and activity event
- Authenticated lead list/intake APIs and owner-or-manager transition API
- Durable recent-leads projection on the Customer Control Center dashboard

## Exit criteria

| Criterion | Result |
| --- | --- |
| Real lead is created against a durable customer | Passed |
| Lead is scored with reasons, confidence, and version | Passed |
| Eligible owner is selected deterministically | Passed |
| Follow-up task has owner, due time, source, and decision context | Passed |
| Intake replay does not duplicate lead or work | Passed |
| Conflicting idempotency reuse is rejected | Passed |
| Lifecycle transitions enforce ownership and valid paths | Passed |
| Customer dashboard recent leads are durable | Passed |

## Operational boundary

This slice replaces only the dashboard's recent-leads collection. Pipeline totals, lead-source analytics, top deals, appointments, and non-lead activity remain preview-backed until their owning slices provide durable projections.

The migration is created but is not automatically applied to a shared or production database.

## Next milestone

Milestone 3 adds durable customer cases, severity evaluation, playbook selection, customer-update promises, case tasks, resolution evidence, and production-backed resolution queues.
