# Enterprise Priority and Classes-of-Service Architecture

**Status:** Foundational planning baseline  
**Version:** 1.0  
**Applies to:** All CCC consoles and shared work queues

## 1. Objective

Place the right valid work ahead of other valid work without allowing a numerical score to override mandatory constraints, customer commitments, or authorized emergency handling.

Priority means order of attention. It does not grant permission, guarantee immediate execution, or replace capacity and dependency checks.

## 2. Decision sequence

```text
Data sufficiency
  -> Eligibility and hard constraints
    -> Class of service
      -> Commitment and risk band
        -> Queue placement
          -> Within-queue ranking
            -> Explanation and review
```

## 3. Classes of service

| Class | Use | Entry control |
| --- | --- | --- |
| Critical / Emergency | Active safety, legal, severe customer, financial, security, or business-continuity threat. | Evidence-backed rule or authorized declaration; immediate review. |
| Fixed Date | Work tied to an appointment, filing, payroll cutoff, promised delivery, renewal, or other real commitment. | Verified commitment and governing time. |
| Expedite | An exceptional item intentionally moved ahead of normal work. | Authorized person, reason, scope, expiry, and displaced-work visibility. |
| Standard | Normal operational demand processed by policy, risk, age, and flow value. | Valid intake and ownership. |
| Improvement | Training, documentation, prevention, process improvement, and strategic capability work. | Approved capacity allocation or portfolio commitment. |

An expedite class is scarce. Repeated expedites indicate planning, capacity, or intake failure and trigger review.

## 4. Priority vector

The enterprise engine should preserve a priority vector before producing any display score:

```text
1. hardConstraintState
2. classOfService
3. commitmentBreachRisk
4. safetyLegalFinancialCustomerRisk
5. dependencyUnlockValue
6. queueAgeAndFairness
7. businessOutcomeValue
8. readinessAndExecutionFit
9. effortAndCompletionOpportunity
10. managerApprovedAdjustment
```

The vector prevents an aggregate score from hiding why one item is ahead of another.

## 5. Within-class ranking factors

After eligibility and class assignment, ranking may consider:

- deadline pressure and remaining schedule buffer
- customer, employee, vehicle, cash, legal, or operational impact
- probability and severity of harm if delayed
- number and importance of downstream items released
- current age and time spent waiting
- readiness to execute without interruption
- strategic or manager-approved importance
- expected time to produce a useful outcome
- recovery difficulty if the item is missed
- confidence and missing-data risk

The initial enterprise layer does not prescribe universal weights. Each weight requires a policy owner, evidence, simulation, approval, and a calibration window.

## 6. Time pressure

Where remaining work can be estimated, the engine may use:

```text
Critical Ratio = Time Remaining Until Commitment / Estimated Work Remaining
```

- below `1.0`: current plan cannot meet the commitment without intervention
- near `1.0`: useful buffer is exhausted
- above `1.0`: some scheduling buffer remains

Critical ratio is an input, not a complete priority algorithm. Readiness, safety, skills, dependencies, and authority still govern execution.

## 7. Aging and starvation protection

- Valid standard and improvement work accumulates aging consideration.
- Waiting caused by an unresolved dependency is attributed to the dependency and resolver, not hidden as executor delay.
- Age does not override a failed hard gate.
- Repeatedly deferred low-effort or low-visibility work must surface for review before it becomes operational debt.
- Improvement work receives protected capacity rather than relying only on priority-score inflation.

## 8. Manager adjustment

Authorized managers may raise, lower, or reclassify priority. The record must capture:

- original class and ranking
- selected class and ranking
- reason code and explanation
- displaced commitments or queues
- effective time and expiry when temporary
- actor and authority

## 9. Required output

```text
classOfService
priorityBand and queue
rankWithinQueue
materialFactors
hardRules and commitmentReferences
deadlinePressure
dependencyUnlockSummary
age and waiting attribution
confidence and missingInputs
recommendedReviewBy
reasonCodes and explanation
```

## 10. Prohibited behavior

- Revenue cannot automatically outrank safety, law, payroll, privacy, or a binding customer commitment.
- Small tasks cannot always jump ahead merely because they are easy to complete.
- A manager label cannot permanently hide repeated systemic expedite demand.
- Staff performance cannot be inferred from priority or queue age without accounting for assignment, blockers, dependencies, work class, and capacity.
- Priority recalculation cannot silently erase the prior decision history.

## 11. Initial reason-code families

- `CLASS_CRITICAL`, `CLASS_FIXED_DATE`, `CLASS_EXPEDITE`, `CLASS_STANDARD`, `CLASS_IMPROVEMENT`
- `COMMITMENT_AT_RISK`, `COMMITMENT_BREACHED`, `BUFFER_EXHAUSTED`
- `DEPENDENCY_MULTIPLE_ITEMS_BLOCKED`, `DEPENDENCY_CRITICAL_PATH`
- `AGE_STARVATION_RISK`, `WAITING_EXTERNAL`, `WAITING_INTERNAL`
- `VALUE_CUSTOMER`, `VALUE_VEHICLE_RELEASE`, `VALUE_CASH_RELEASE`, `VALUE_RISK_REDUCTION`
- `PRIORITY_MANAGER_ADJUSTED`, `PRIORITY_LOW_CONFIDENCE`

## 12. Validation scenarios

The priority engine must correctly handle at least:

1. a compliance renewal versus a high-revenue routine task
2. a promised delivery with missing safety evidence
3. an authorized expedite that displaces fixed-date work
4. an old low-value task at risk of starvation
5. one blocker holding multiple vehicle-readiness tasks
6. two equally urgent tasks with different readiness and skill constraints
7. a high apparent priority produced from stale data

