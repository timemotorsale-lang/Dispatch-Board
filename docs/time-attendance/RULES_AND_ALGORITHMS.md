# Rules and Algorithms

## Design rules

- Deterministic: the same events and policy versions produce the same output.
- Explainable: every result includes inputs, steps, rule IDs, source IDs, and reason codes.
- Replayable: historical output can be reconstructed.
- Fail-closed: missing or conflicting authority blocks payroll readiness.
- Minute-based: calculated quantities use integer minutes; raw instants retain precision.
- Non-destructive: calculations never alter raw evidence.
- No hidden optimization: rules protect pay and workflow; they do not score employee performance.

## Policy resolution

```text
employee + work instant + work location
  -> active employment profile
  -> federal/state/local coverage
  -> collective bargaining / special rule checks
  -> organization policy inheritance
  -> exact effective policy versions
```

Resolution must return one policy bundle or a blocking conflict. Policy priority cannot weaken a controlling law.

## Event normalization

1. Order by occurrence instant, then durable sequence.
2. Deduplicate by accepted command/event identity, never by similar timestamps.
3. Validate allowed state transition.
4. Pair starts and ends without inventing the missing side.
5. Emit gaps, overlaps, impossible order, open session, and source-conflict exceptions.
6. Split intervals at location-local day and configured workweek boundaries.
7. Retain each output segment's source event IDs.

## Overtime classification

For an approved threshold `T` and eligible worked minutes `W` in one fixed workweek:

```text
regular = min(W, T)
overtime = max(0, W - T)
```

MVP thresholds:

- `US_FLSA_NONEXEMPT`: `T = 2,400` minutes.
- `MN_MFLSA_ONLY_NONEXEMPT`: `T = 2,880` minutes.
- unsupported or unresolved: no totals; blocking exception.

Hours not legally treated as worked remain separate leave/nonworked categories. Dollar calculation is deferred to payroll.

## Tardiness and payroll time

```text
tardy_minutes = max(0, actual_start - scheduled_start)
paid_work_minutes = exact compensable intervals actually worked
```

Tardiness is an attendance fact. It does not round or reduce paid work. A seven-minute late arrival is seven minutes late; it is not converted into 15 unpaid minutes. The raw punch remains unchanged.

## Scheduled paid-time planning

The schedule planner can assign different meal-pay policies by staff policy profile.

```text
scheduled_span = scheduled_end - scheduled_start
unpaid_meal = expected_meal_minutes only when the assigned meal policy is unpaid
scheduled_paid = scheduled_span - unpaid_meal
```

Examples:

| Staff policy | Scheduled span | Meal policy | Scheduled paid time |
| --- | ---: | --- | ---: |
| Standard office 9am-6pm | 540 minutes | 60-minute unpaid meal | 480 minutes |
| Paid-lunch staff 9am-6pm | 540 minutes | 30-minute paid meal | 540 minutes |

A paid meal can still satisfy the meal-opportunity rule when it is long enough and the employee is completely relieved. Paid versus unpaid changes payroll math; complete relief and duration determine whether the meal qualifies as a meal opportunity.

## Minnesota break evaluation

Inputs are an actual shift interval, recorded paid-rest intervals, recorded meal intervals, duty-interruption attestations, and the active break-policy version.

Algorithm:

1. Validate all intervals lie within the shift and do not have impossible overlap.
2. A recorded meal of at least 30 minutes splits consecutive work when marked completely relieved, whether paid or unpaid.
3. Determine consecutive work blocks around qualifying meals.
4. For each block, require one paid rest opportunity for every completed 240 minutes of consecutive work.
5. When a shift reaches the approved six-hour meal threshold, require a qualifying meal opportunity.
6. Mark a short or interrupted unpaid meal as compensable; do not deduct it.
7. Compare required opportunities with recorded/attested evidence.
8. Emit exceptions without reducing recorded worked time.

Initial exception codes:

- `MN_REST_BREAK_MISSING`
- `MN_REST_BREAK_SHORT`
- `MN_REST_BREAK_LATE`
- `MN_MEAL_MISSING`
- `MN_MEAL_SHORT`
- `MN_MEAL_INTERRUPTED`
- `BREAK_EVIDENCE_CONFLICT`

Because fact patterns and collective-bargaining agreements can change application, the engine exposes the calculation and routes ambiguous cases for authorized review.

## ESST standard accrual

For standard accrual:

```text
completed_30_hour_blocks = floor(cumulative_eligible_work_minutes / 1,800)
earned_minutes_before_caps = completed_30_hour_blocks * 60
annual_earned = min(earned_minutes_before_caps, annual_cap)
available_bank = min(previous_bank + newly_earned - used, bank_cap)
```

Initial statutory minimum configuration:

- annual accrual cap: 2,880 minutes;
- bank cap: 4,800 minutes;
- accrual input: eligible hours actually worked, including overtime hours worked.

The engine also returns uncredited eligible work minutes so later periods continue the cumulative calculation. Front-load methods use a different algorithm and policy ID.

## Attendance/allocation reconciliation

Attendance answers **when the employee worked**. Allocation answers **what work received the time**.

```text
unallocated = max(0, attendance_worked - allocated)
overallocated = max(0, allocated - attendance_worked)
```

Allocation cannot increase or decrease paid attendance automatically. A mismatch creates an operational exception.

## Time-card readiness

A card is payroll-ready only when:

- policy profile and versions resolve;
- source event stream is closed and internally consistent;
- all blocking exceptions are resolved with authorized evidence;
- calculations reconcile;
- employee attestation is current when required;
- manager approval references the current card version;
- the period is open for the action;
- no later event invalidates the projection.

## Workflow reason codes

- `MISSING_CLOCK_OUT`
- `MISSING_CLOCK_IN`
- `OVERLAPPING_SESSION`
- `OPEN_MEAL`
- `UNSCHEDULED_WORK`
- `OVERTIME_APPROACHING`
- `OVERTIME_REACHED`
- `UNALLOCATED_TIME`
- `OVERALLOCATED_TIME`
- `POLICY_REVIEW_REQUIRED`
- `POLICY_VERSION_CONFLICT`
- `CORRECTION_REATTESTATION_REQUIRED`
- `LOCKED_PERIOD_REOPEN_REQUIRED`
- `EXPORT_RECONCILIATION_REQUIRED`

## Invariants

- A person has at most one active attendance session.
- End is always after start.
- Paid segments do not overlap.
- A minute is classified once within one calculation dimension.
- Regular plus overtime worked minutes equal eligible worked minutes.
- Raw time events and audits are not updated or deleted.
- Approval refers to an exact card version/checksum.
- Lock refers to exact approved card versions.
- Export refers to exact locked card versions.
- Replaying an idempotent command has no additional effect.
- Replaying events with the same policy versions produces the same checksum.
