# Shop Dispatch and Technician Execution Implementation Evidence

Milestone 4C completes roadmap cards `VEH-057` through `VEH-062` as a governed shop-floor slice.

## Implemented scope

- Effective-dated, append-only work procedure versions with instructions, safety steps, required evidence, standard time, and QC rules.
- Effective-dated technician skill and certification evidence with verifier and source attribution.
- Explainable fast-track, standard-repair, and diagnostic/heavy lane priority using readiness, promise pressure, safety, duration, and qualification context.
- Location-aware dispatch against the existing scheduling resource catalog for technicians, bays, tools, and equipment.
- One current and one next job per technician, one open assignment per job, appointment/shop overlap checks, and reason-required conflict overrides.
- Re-dispatch lineage, protected booking history, and live ready/active/paused/QC counts.
- Per-technician labor clocks with start, pause, resume, finish, and explicit correction events; the database prevents more than one running clock per technician.
- Technician current/next workspace with procedure, parts, blocker, clock, evidence, and QC-handoff context.
- Completion requires evidence and QC handoff notes and advances work only to `READY_FOR_QC`.

Every mutation uses the Milestone 1 capability, rollout, idempotency, optimistic-version, command, audit, domain-event, and outbox transaction. The additive migration is source-controlled and was not deployed during implementation.

## Deliberate boundaries

This milestone does not claim advisor communications (`VEH-063`), QC inspection/release (`VEH-064`), comeback handling (`VEH-065`), production analytics (`VEH-066`), invoicing, payment, repair-order close/reopen, external payroll, or DMS integration. `READY_FOR_QC` is a handoff state, not permission to release a vehicle.

## Operator surface

`/vehicles/shop-dispatch` is the shared dispatcher and technician workspace. It is linked from the vehicle control tower and complements `/vehicles/shop-planning` and `/vehicles/parts`.
