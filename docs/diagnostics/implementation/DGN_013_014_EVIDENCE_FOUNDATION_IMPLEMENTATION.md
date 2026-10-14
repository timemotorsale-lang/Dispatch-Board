# DGN-013–014 — Diagnostic Evidence Foundation Implementation

**Status:** Implemented in source; migration not deployed and rollout remains disabled  
**Branch:** `codex/diagnostics-dgn-013-014-evidence-foundation`  
**Implemented:** 2026-07-20

## DGN-013 — Observation and measurement foundation

The Diagnostics domain now owns immutable `DiagnosticObservation` and `DiagnosticMeasurement` facts linked to the exact case and concern version.

Each observation records fact class, statement and optional structured value, operating conditions, source, reliability, quality, independence group, time window, observation time, raw-source envelope, author, and one-to-one correction lineage.

Each measurement preserves the entered quantity, decimal value, and unit alongside its normalized decimal value and unit. It also records entered and normalized reference bounds, tolerance, instrument and calibration state, setup, operating conditions, source, reliability, quality, engineering plausibility, independence group, time window, raw-source envelope, author, and one-to-one supersession lineage.

The initial dimensional catalog covers voltage, current, resistance, pressure, temperature, rotational speed, time, frequency, percent, distance, and mass flow. Invalid dimensional combinations and inverted references are rejected. Physically implausible values are retained without clipping and marked `INVALID` / `OUT_OF_RANGE`; this preserves raw evidence while preventing silent use as a valid fact.

Corrections never edit a prior fact. `CORRECT_DIAGNOSTIC_FACT` appends a replacement linked to one prior record. Database triggers enforce immutability and same-tenant/same-case lineage.

## DGN-014 — Governed Vehicle Evidence integration

`DiagnosticEvidenceLink` points to the existing `VehicleEvidenceObject`; it does not copy file bytes or replace Vehicle Evidence authority. Links preserve case, subject type and ID, purpose, relationship, creator, and time.

Server and database validation require:

- the same organization and case vehicle;
- an existing Vehicle Evidence object;
- `AVAILABLE` status and `CLEAN` malware status at link time;
- a valid case, concern, observation, or measurement target;
- diagnostic link permission plus Vehicle Evidence view permission;
- explicit restricted-evidence permission for `RESTRICTED` objects;
- exact case version, idempotency, audit, domain event, and outbox evidence.

The target vocabulary reserves `TEST_EXECUTION`, `HYPOTHESIS`, `CONCLUSION`, and `VERIFICATION`. Those links are deliberately rejected until the corresponding governed aggregates land in their owning milestones; accepting an unresolvable generic ID would violate link integrity.

Deleted or newly quarantined objects remain visible only as governed metadata on existing links and cannot be downloaded. Retention date, legal hold, checksum, malware status, access level, and deletion remain under Vehicle Evidence authority.

## Technician workspace and APIs

The case workspace now shows structured observation and measurement lists, normalization/plausibility signals, correction status, governed attachment metadata, and honest empty/held/unavailable states. Authorized assigned technicians can record an observation, record a measurement, or select a permitted Vehicle Evidence candidate to link.

Purpose-specific endpoints are:

- `POST /api/diagnostics/cases/{caseId}/observations`
- `POST /api/diagnostics/cases/{caseId}/measurements`
- `POST /api/diagnostics/cases/{caseId}/evidence`

There is no generic fact update endpoint.

## Verification evidence

- Prisma schema validation passes.
- TypeScript and ESLint pass.
- Focused tests cover unit normalization, Fahrenheit and pressure conversion, dimensional mismatch, reference ordering, plausibility marking, raw provenance, time windows, deterministic IDs, correction lineage, rollout-off enforcement, quarantined/deleted/restricted/cross-tenant/wrong-vehicle rejection, authorized restricted linking, immutable schema triggers, and tenant foreign keys.
- Existing case-console rendering tests verify honest fact and attachment empty states without activating hypotheses or reasoning.

## Remaining boundaries

The migration is source-controlled but not deployed by this branch. `DIAGNOSTIC_EVIDENCE` remains off by default. Test definitions/plans/executions, adaptive labs, evidence matrix/conflict views, hypotheses, reasoning, conclusions, publication, verification execution, knowledge ingestion, hardware adapters, and AI remain unimplemented.
