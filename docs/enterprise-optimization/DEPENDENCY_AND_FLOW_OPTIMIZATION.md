# Enterprise Dependency and Flow Optimization Architecture

**Status:** Foundational planning baseline  
**Version:** 1.0

## 1. Objective

Optimize the end-to-end movement of valuable, valid work rather than maximizing isolated activity inside one team or console.

## 2. Dependency graph

Work, commitments, approvals, evidence, resources, and decisions form a directed graph.

Initial dependency types:

- `FINISH_TO_START`
- `START_TO_START`
- `APPROVAL_REQUIRED`
- `EVIDENCE_REQUIRED`
- `RESOURCE_REQUIRED`
- `INFORMATION_REQUIRED`
- `CUSTOMER_RESPONSE_REQUIRED`
- `EXTERNAL_PROVIDER_REQUIRED`
- `FINANCIAL_AUTHORITY_REQUIRED`
- `POLICY_GATE_REQUIRED`

Every active dependency has an owner, state, required time, source, and resolution path.

## 3. Graph integrity

- Circular mandatory dependencies are invalid and require resolution.
- Optional and informational relationships must not be treated as blocking gates.
- Removed or overridden dependencies remain in history.
- Cross-console dependencies retain both originating and resolving owners.
- A downstream record cannot claim readiness while a mandatory predecessor is unresolved.

## 4. Flow clocks

For each work item and workflow, measure:

```text
Total Flow Time = Completion Time - Valid Intake Time
Active Time = Sum of accountable execution intervals
Waiting Time = Sum of dependency, queue, approval, customer, or provider waits
Blocked Time = Sum of intervals where valid progress was impossible
Flow Efficiency = Active Time / Total Flow Time
```

Flow efficiency is diagnostic. It is not an employee score.

## 5. Critical path and unlock value

The engine identifies:

- the longest valid dependency path to an outcome
- items with no schedule buffer
- dependencies blocking several successors
- high-value outcomes waiting on a small resolvable constraint
- cross-console handoffs with unclear ownership
- resource constraints repeated across many paths

Conceptually:

```text
Dependency Unlock Value =
  Downstream Outcomes Released
  * Commitment And Risk Importance
  * Probability Resolution Enables Flow
  / Expected Resolution Effort And Delay
```

This value supports prioritization only after hard constraints and class of service.

## 6. Bottleneck detection

A workflow may be a bottleneck when evidence shows a sustained combination of:

- arrival rate exceeding completion rate
- growing queue length or age
- repeated downstream starvation
- high resource saturation
- long waiting-to-active-time ratio
- repeated rework or failed quality gates
- frequent expedite demand
- concentration around one skill, authority, vendor, system, or approval

One busy moment is not enough to declare a structural bottleneck.

## 7. Queue health

Every material queue should report:

- incoming and completed work over a controlled window
- current work in progress
- oldest and median age
- class-of-service composition
- ready versus unready work
- blocked and waiting reasons
- commitment breach risk
- available resolving capacity
- data freshness and confidence

## 8. Next-best-action architecture

The engine evaluates valid actions such as:

- execute the next ready step
- resolve a blocker
- obtain evidence or approval
- contact a customer or provider
- reassign or rebalance
- substitute a resource
- split scope while preserving accountability
- renegotiate an at-risk commitment with authority
- cancel invalid or duplicate demand
- create prevention or root-cause work

The recommendation must name the outcome released and the dependency resolved.

## 9. Local versus enterprise optimization

- A console may not improve its own completion metric by pushing unresolved work into another console without an accepted handoff.
- Transfer of ownership requires receiving capacity, authority, and acknowledgement.
- Shared bottlenecks are governed at CCC level.
- Domain consoles own detailed state machines and readiness gates.
- Enterprise flow measures follow the outcome across console boundaries.

## 10. Required output

```text
dependencyGraphVersion
criticalPath and scheduleBuffer
blockingDependencies and owners
downstreamOutcomesAffected
queueHealth and bottleneckSignals
active, waiting, blocked, and idleTime
recommendedNextAction and alternatives
expectedUnlockValue
crossConsoleImpact
confidence and missingInputs
reasonCodes and explanation
```

## 11. Prohibited behavior

- Do not break a mandatory dependency to improve speed.
- Do not reset age through reassignment, comment, or queue transfer.
- Do not treat waiting on another team as completed work.
- Do not use flow efficiency alone to judge people.
- Do not create tasks for every signal; correlate root causes first.

## 12. Initial cross-console examples

- Dispatch vehicle delivery waiting on Compliance evidence.
- Payroll handoff waiting on approved Time Card correction.
- Training assignment created from a repeated Dispatch quality failure.
- Legal or Accounting obligation creating a fixed-date Dispatch task.
- Vehicle readiness blocked by a part, approval, title document, or vendor commitment.

