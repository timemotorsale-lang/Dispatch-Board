# Shop Planning Core Implementation Evidence

Milestone 4B implements `VEH-052` through `VEH-056`.

## Delivered

- append-only DVI versions with template snapshot, pass/advisory/fail/not-applicable results, measurements, notes, evidence references, author, and timestamps;
- append-only diagnosis versions retaining concern, symptoms, tests/results, evidence, cause, uncertainty, recommendation, proposed correction, technician, and lineage;
- immutable presented estimate and change-order versions with structured labor/part/fee lines, server-calculated subtotals, tax boundary, tax, discount, options, expiry, channel, author, and presentation time;
- attributable authorization decisions for accepted, partial, declined, deferred, expired, and revoked outcomes tied to one exact estimate version and line scope;
- RepairJobs that require an accepted authorized estimate line and retain work type, correction, labor guide, skills, certifications, bay/tools, priority, dependencies, amount, and readiness reasons;
- promotion of unassigned 5A part demand to RepairJob, with `WAITING_PARTS` or `READY_FOR_REPAIR` determined from complete reservation evidence;
- controlled RepairOrder stage advancement and evidence-bearing regression for estimate change orders or newly introduced waiting work;
- M1 optimistic command, audit, immutable state event, domain event, and outbox integration plus protected APIs and `/vehicles/shop-planning`.

## Deferred

`VEH-057` work templates/procedures, labor time, lane priority, resource booking, dispatch, technician execution, advisor workspace, QC, comeback, production analytics, invoicing, close, and reopen remain later slices. The migration is checked in but not deployed during implementation.
