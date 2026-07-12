# CRM Milestone 3: Customer Case Resolution

**Status:** Implemented in source; database migration ready to deploy  
**Date:** 2026-07-12

## Delivered

- Extended the existing `ConcernCase` aggregate instead of creating a competing case engine
- Durable organization and customer relationships for customer cases
- Versioned 100-point customer-case severity evaluator
- Automatic critical-trigger handling and low-confidence missing-information behavior
- Versioned playbook-selection decision with alignment to available task templates
- Persisted severity and playbook decisions in the same case-creation transaction
- First-response and resolution targets
- Durable customer-update promises with accountable owner and due time
- Owner-or-manager promise fulfillment with notes and activity evidence
- Existing task dependencies, manager review, checklists, escalation, closure proof, and idempotency retained
- Customer-case API aliases for intake, retrieval, promise fulfillment, and resolution
- Production-backed resolution queues, metrics, SLA state, promise context, and case detail selection

## Exit criteria

| Criterion | Result |
| --- | --- |
| Case is linked to a durable customer when supplied | Passed |
| Severity is explainable, versioned, and persisted | Passed |
| Playbook selection is versioned and persisted | Passed |
| Case tasks retain dependencies and closure checks | Passed |
| First-response and resolution targets are durable | Passed |
| Customer update promise has one owner and due time | Passed |
| Promise fulfillment records actor, time, and evidence | Passed |
| Resolution queue reads durable cases rather than preview cases | Passed |
| Case closure still requires tasks, checklist evidence, manager review, reason, and proof | Passed |

## Supported playbook boundary

The currently executable templates are the detailed title-delay playbook and the controlled manager-triage fallback. The decision catalog reserves stable codes for service complaints and missing-document workflows, but it selects only a template that is executable in the current repository. Additional specialized task templates can be added without changing the decision contract.

## Next milestone

Milestone 4 adds configurable SLA policies, business-hours clocks, watch/at-risk/breach stages, idempotent monitoring, manager override queues, and operational health reporting.

The migration is created but is not automatically applied to a shared or production database.
