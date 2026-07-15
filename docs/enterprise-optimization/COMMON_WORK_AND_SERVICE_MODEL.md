# Enterprise Common Work and Service Model

**Status:** Foundational planning baseline  
**Version:** 1.0  
**Constitution:** [`../ENTERPRISE_OPTIMIZATION_CONSTITUTION.md`](../ENTERPRISE_OPTIMIZATION_CONSTITUTION.md)

## 1. Purpose

This model gives every CCC console a shared operating language without forcing all domains into one oversized record.

```text
Business Outcome
  -> Service or Capability
    -> Console
      -> Workflow
        -> Work Item
          -> Resource, Customer, Vehicle, Commitment, Dependency, Risk, Evidence
            -> Decision
              -> Event
                -> Outcome
```

## 2. Canonical concepts

| Concept | Meaning |
| --- | --- |
| Business Outcome | The measurable result the company intends to produce or protect. |
| Business Capability | A durable ability such as Dispatch Operations, Payroll, Compliance, or Training. |
| Service | A defined value-delivery relationship with an owner, consumer, commitment, and measures. |
| Console | The operational command center responsible for a bounded business domain. |
| Workflow | A versioned sequence or state model that delivers an outcome. |
| Work Item | An accountable unit of work, decision, review, exception, or follow-up. |
| Commitment | A customer, legal, financial, payroll, appointment, delivery, or internal promise. |
| Resource | A person, team, bay, vehicle, part, vendor, location, budget, system, or time window used by work. |
| Dependency | A typed prerequisite or downstream relationship between work, decisions, evidence, or resources. |
| Risk | A possible event or condition with likelihood, impact, exposure, owner, and response. |
| Exception | Evidence that actual or expected operation differs materially from policy, plan, or commitment. |
| Evidence | A document, event, observation, approval, measurement, or source record supporting a fact or decision. |
| Decision | A versioned evaluation and authorized disposition of alternatives. |
| Event | An immutable statement that something occurred at a specific time and scope. |
| Outcome | The verified result, including benefit, harm, cost, quality, timing, and confidence. |

## 3. Canonical work envelope

Every console must be able to map operational work to the following conceptual fields:

```text
identity: organization, location, console, workflow, workItemId
purpose: outcome, title, description, workType, source
ownership: accountableOwner, assignee, collaborators, requestingParty
context: customer, vehicle, appointment, project, service, relatedRecords
time: createdAt, availableAt, dueAt, promisedAt, startedAt, completedAt
classification: classOfService, priorityBand, riskBand, confidentiality
effort: estimatedDuration, uncertaintyRange, requiredSkills, requiredResources
state: status, lifecycleStage, readiness, blocker, pauseReason
dependencies: predecessors, successors, approvals, evidenceRequirements
policy: authority, hardRules, serviceObjective, retention, separationOfDuties
decision: recommendation, confidence, reasons, reviewRequirement, override
outcome: actualDuration, waitingTime, rework, quality, cost, verifiedValue
```

Domain records remain authoritative. The common envelope is an interoperability contract, not permission to duplicate sources of truth.

## 4. Relationship rules

- Every work item has one accountable owner, even when multiple people collaborate.
- A work item may have multiple predecessors and successors.
- A dependency must have a type, source, state, and responsible resolver.
- A commitment must identify who made it, who receives it, the promised result, and the governing time.
- A risk and an active issue are different records; realized risks become issues or exceptions.
- Evidence must retain source, capture time, subject, integrity metadata, and access classification.
- A recommendation must point to the exact normalized inputs and policy version used.
- Completion requires the domain's completion gate; a status label alone is insufficient evidence.

## 5. Facts, calculations, estimates, and predictions

Every material value is classified as one of:

- **Authoritative fact:** recorded by the system of record or verified evidence.
- **Observed signal:** directly measured but not necessarily authoritative for the domain.
- **Calculated value:** deterministically derived from disclosed inputs.
- **Estimate:** human or algorithmic expected value with uncertainty.
- **Prediction:** probabilistic future assessment with model and confidence.
- **Recommendation:** proposed action that still requires policy and authority evaluation.

The UI, APIs, audit trail, and reports must not blur these categories.

## 6. Time and clocks

The enterprise model distinguishes:

- calendar time
- business time
- active work time
- approved waiting time
- blocked time
- idle or unexplained time
- customer-wait time
- approval-wait time
- system-processing time

Clock pauses require explicit, versioned reasons. A comment or routine update does not reset age.

## 7. Event contract

Material lifecycle, ownership, commitment, decision, approval, exception, and evidence changes create immutable events containing:

```text
eventId, eventType, occurredAt, recordedAt
organizationId, locationId, console
actor or system source
subjectType, subjectId
priorState, nextState
correlationId, causationId
policyVersion or algorithmVersion when applicable
evidenceReferences
```

Current state may be optimized for reading, but event history remains the audit foundation.

## 8. Data-quality contract

Material inputs carry:

- source and authority
- observed or effective time
- freshness expectation
- completeness
- consistency state
- confidence
- missing-input codes
- conflict-resolution status

Stale, conflicting, or missing required data must reduce decision authority or stop automation. It must never be silently replaced with a fabricated default.

## 9. Ownership and authority

The common model distinguishes:

- service owner
- workflow owner
- accountable work owner
- assigned executor
- approver
- evidence custodian
- risk owner
- exception resolver
- algorithm owner
- policy owner

One person may hold several roles, but the roles remain explicit so separation-of-duties rules can be enforced where required.

## 10. Console integration contract

Every console must:

1. declare its capabilities, services, workflows, and owners
2. map domain records to the canonical work envelope
3. publish material events using stable meanings
4. consume shared identity, permissions, policy, and organizational context
5. preserve domain-specific sources of truth
6. expose data freshness and failure states
7. return outcomes for enterprise measurement
8. use Tasks for accountable executable work unless an approved domain reason requires a different record

## 11. Initial Time Motor Sales mapping

| Console | Example services and outcomes |
| --- | --- |
| Dispatch | Daily work allocation, execution visibility, blocker removal, manager review. |
| Time and Attendance | Accurate time capture, correction, approval, and payroll handoff. |
| People and HR | Controlled employee operations, records, onboarding, and required actions. |
| Compliance | License, permit, renewal, inspection, and evidence readiness. |
| Legal and Accounting | Obligation, request, document, reconciliation, and follow-up control. |
| Library and Training | Controlled forms, procedures, acknowledgements, and competency evidence. |

## 12. Acceptance gate

A new console or workflow is not enterprise-integrated until its identities, owners, states, commitments, dependencies, risks, evidence, events, permissions, and outcomes can be mapped without ambiguity.

