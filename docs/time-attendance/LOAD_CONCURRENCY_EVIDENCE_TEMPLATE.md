# Load and concurrency evidence report

Status: **not run**

Record environment, application revision, database revision, dataset, tool, time window and operator. At minimum exercise duplicate clock-in/out, simultaneous meal/rest transitions, stale expected versions, projection contention, correction versus attestation, approval versus reprojection, lock contention, export retry after client timeout, acknowledgment retry, and outbox recovery.

For each scenario record request count, concurrency, latency percentiles, success/duplicate/conflict/failure counts, database errors, competing current-card count, duplicate export-line count, checksum comparison and evidence location.

Acceptance requires no lost accepted punch, no overwritten immutable evidence, no competing current card, no duplicate payroll line, deterministic checksums, explicit conflicts for stale work, and documented recovery for every induced failure.
