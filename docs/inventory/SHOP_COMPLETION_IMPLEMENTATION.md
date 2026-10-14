# Advisor, Comeback, and Shop Production Implementation Evidence

This program implements Milestones 4E, 4F, and 4G (`VEH-063`, `VEH-065`, and `VEH-066`) on the existing governed RepairOrder, RepairJob, labor, QC, and release foundations.

## 4E — Advisor service and delivery readiness

- Immutable advisor updates retain service status, promise, contact channel/direction/outcome, customer-safe summary, internal notes, exceptions, next contact, actor, reason, and time.
- Existing estimate versions, authorization decisions, repair jobs, QC, and release evidence appear in one advisor view.
- Delivery-readiness evaluations combine advisor checks with system-owned QC job state, release authorization, and unresolved advisor exceptions.
- A failed check or system blocker produces a visible `BLOCKED` version; readiness cannot be asserted by averaging checks.
- `/vehicles/advisor` provides the protected operational workspace.

## 4F — Comeback and follow-up management

- Every comeback links to a released, QC-passed original RepairJob and its original correction.
- Open-case duplication is prevented for the same original job.
- Concern, category, estimated and actual cost, responsibility, follow-up due/completed time, resolution outcome, and optional same-vehicle follow-up RepairOrder linkage are retained.
- State transitions are controlled and append an immutable event with actor, reason, correlation, responsibility, cost, and outcome.
- Production use is explicitly marked non-punitive; automated employee discipline is prohibited.
- `/vehicles/comebacks` provides the protected queue and review workspace.

## 4G — Shop production projections

- Immutable technician-presence evidence has location, source, time range, approved non-productive time, idle cause, actor, and overlap protection.
- Labor minutes are reconstructed from append-only start/resume/pause/finish/correction events within the controlled reporting window.
- Earned time comes from labor-guide minutes on jobs finished in the window; first-pass and quality-adjusted measures exclude jobs with linked comebacks.
- Snapshots retain the reporting window, source fingerprint, present/clocked/earned/non-comeback minutes, idle causes, all five approved measures, confidence, reason codes, generator, and calculation time.
- Zero denominators return zero, missing inputs lower confidence, and source-identical snapshots deduplicate.
- `/vehicles/shop-production` provides presence capture, snapshot generation, history, confidence, and formula results.

All mutations use the Milestone 1 capability, rollout, idempotency, concurrency, audit, domain-event, and outbox transaction. The additive migration is source-controlled and was not deployed during implementation.

## Deliberate boundaries

Outbound provider delivery, customer portal approval, invoicing, payment, warranty-claim adjudication, RepairOrder close/reopen, payroll, and disciplinary automation remain outside this implementation.
