# Quality Control and Vehicle Release Implementation Evidence

Milestone 4D implements roadmap card `VEH-064` as the governed boundary between technician completion and operational vehicle handoff.

## Implemented scope

- Immutable, versioned quality-inspection evidence for each repair job.
- Snapshot linkage to the work procedure and QC rules used for the inspection.
- Structured completion and safety checks with pass, fail, or not-applicable results, evidence, notes, inspector, and time.
- Mandatory completion evidence; failed individual checks cannot be averaged into an overall pass.
- Mandatory peer verification for diagnostic/heavy work, attributable to an active user other than the executing technician.
- Policy-applicable road-test outcome and evidence without imposing an arbitrary road test on every repair.
- Failed-QC reason codes and rework instructions that return the job to `READY_FOR_REPAIR` and the existing dispatch path.
- Rework-safe labor projection reset that preserves append-only labor events and accumulated minutes.
- `QC_PASSED` per-job projection based only on the latest inspection version.
- Repair-order release authorization only after every non-cancelled job has a latest passing inspection, no labor is running or paused, keys are verified, final-condition evidence exists, and no open exceptions remain.
- Deterministic customer-delivery or inventory-readiness handoff based on repair-order origin.
- M1-backed authorization, rollout, idempotency, optimistic concurrency, audit, domain-event, and outbox controls.
- Protected `/vehicles/quality-control` workspace and APIs for inspection history, rework, readiness, and final release authorization.

The additive migration is source-controlled and was not deployed during implementation.

## Deliberate boundaries

Release authorization is an operational handoff gate, not an invoice, payment, customer delivery signature, RepairOrder close, title/frontline completion, or DMS posting. Advisor delivery workflow (`VEH-063`), comeback handling (`VEH-065`), and shop production projections (`VEH-066`) remain later slices.
