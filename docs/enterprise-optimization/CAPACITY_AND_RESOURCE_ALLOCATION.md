# Enterprise Capacity and Resource Allocation Architecture

**Status:** Foundational planning baseline  
**Version:** 1.0  
**Applies to:** People, teams, bays, vehicles, parts, vendors, locations, budgets, systems, and time windows

## 1. Objective

Recommend feasible ownership, assignment, sequence, and timing that honor qualifications, commitments, capacity, continuity, fairness, and operating resilience.

Capacity is the ability to deliver an outcome in a time window. It is not headcount and it is not the number of tasks assigned.

## 2. Effective capacity

```text
Effective Capacity =
  Scheduled Available Time
  - Existing Commitments
  - Required Administrative Time
  - Approved Leave or Unavailability
  - Expected Interruption Allowance
  - Operational Safety Buffer
  - Capability-Specific Constraints
```

The safety buffer is intentionally preserved so the operation can absorb walk-ins, urgent customer needs, breakdowns, absences, and uncertainty. Production buffer values require measured Time Motor Sales data and management approval.

## 3. Demand representation

Demand must include:

- expected effort and uncertainty range
- required skill, certification, authority, location, equipment, and evidence
- earliest valid start and required completion
- readiness and predecessor state
- continuity benefit
- setup, travel, handoff, and context-switching cost
- class of service and risk

Task count alone is prohibited as a capacity measure.

## 4. Allocation sequence

### Stage 1: Eligibility filtering

Exclude a candidate when any required condition is absent:

- permission or authority
- skill or certification
- working availability
- location or equipment compatibility
- required language or customer relationship where policy requires it
- separation of duties
- safety restriction
- conflicting fixed commitment
- maximum safe work-in-progress condition

### Stage 2: Feasibility

Determine whether the candidate can start and finish the work within required time, dependency, resource, and commitment constraints.

### Stage 3: Suitability ranking

Rank eligible, feasible candidates using approved factors:

- direct duty and skill fit
- continuity with the customer, vehicle, project, or prior work
- available capacity and expected completion
- current work in progress
- setup and context-switching cost
- location and movement cost
- balanced workload and fairness
- quality history for like-for-like work
- development opportunity when risk permits
- confidence in duration and availability data

### Stage 4: Authority and acceptance

Apply manager approval, staff acceptance, claim, or dispatch rules appropriate to the work class and console.

## 5. Work-in-progress control

- Each workflow defines safe concurrent-work limits by resource and work class.
- Starting work requires a realistic path to continued execution.
- Unready work remains queued with an accountable readiness owner rather than occupying execution capacity.
- Excess work in progress triggers rebalancing or blocker resolution, not pressure to mark incomplete work complete.
- Expedite work must identify what it displaces.

The existing Inventory policy of one active and at most one staged next technician job remains a domain-specific example, not a universal employee quota.

## 6. Capacity health bands

Capacity should be reported through evidence-backed bands rather than unsupported precision:

- **Protected:** commitments and buffer are intact.
- **Tight:** buffer is being consumed; monitor incoming demand.
- **At Risk:** expected demand exceeds effective capacity or key skills are constrained.
- **Overcommitted:** accepted commitments cannot all be met under the current plan.
- **Unknown:** data is incomplete, stale, or contradictory.

Thresholds vary by resource type and require explicit policy.

## 7. Fairness and human safeguards

- Allocation must not use protected traits or irrelevant private information.
- Fairness means comparable access to work, support, recovery time, and development—not identical task counts.
- Like-for-like work classes and effort must be used when comparing load or outcomes.
- Repeated concentration of undesirable, risky, or invisible work must surface for review.
- Staff may disclose inability, uncertainty, or a blocker without the assignment engine treating disclosure itself as poor performance.

## 8. Resource substitution and contingency

The engine may recommend alternatives only when substitution is valid:

- alternate qualified person or team
- alternate bay, tool, part, vendor, or location
- schedule change with commitment impact disclosed
- split work with one accountable owner
- defer, cancel, outsource, or reduce scope with authority

Every contingency shows cost, delay, risk, and displaced work.

## 9. Required output

```text
eligibleCandidates and exclusionReasons
feasibleCandidates and expectedCompletionRange
recommendedAssignment and alternatives
capacityHealth and remainingBuffer
workInProgressState
commitmentsAffected
continuity and contextSwitchingFactors
fairnessReviewSignals
confidence and missingInputs
approval or acceptanceRequired
reasonCodes and explanation
```

## 10. Prohibited behavior

- Do not equate availability with permission or skill.
- Do not schedule at assumed 100% productive utilization.
- Do not optimize for individual utilization while increasing end-to-end waiting.
- Do not assign unready work merely to make a queue appear smaller.
- Do not infer misconduct from low utilization or missed targets without complete context.
- Do not autonomously extend shifts, approve overtime, outsource work, or change compensation.

## 11. Calibration measures

- expected versus actual effort
- commitment reliability
- queue wait and blocked time
- work-in-progress age
- assignment acceptance and overrides
- context switches and handoffs
- rework and first-pass quality
- overtime and buffer consumption
- skill bottleneck frequency
- load concentration by comparable work class

