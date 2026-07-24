# Test, Release, and Operations Contract

## Test layers

### Unit/golden cases

- policy resolution and effective-date boundaries;
- federal 40-hour and Minnesota-only 48-hour overtime;
- leave hours excluded from hours-worked thresholds;
- exact-threshold and one-minute-over cases;
- Minnesota paid-rest counts across qualifying meals;
- missing, short, interrupted and duty-performed meal cases;
- ESST cumulative blocks, annual cap and bank cap;
- attendance/allocation under/over reconciliation;
- deterministic replay and checksum.

### Integration

- command idempotency and payload conflict;
- one active session under concurrency;
- correction supersession without raw-event mutation;
- stale card/version rejection;
- audit/domain event/outbox atomicity;
- employee/manager/payroll/location permission boundaries;
- attestation invalidation after correction;
- lock and controlled reopen;
- export retry and payroll rejection reconciliation;
- protected leave data excluded from manager reads.

### Browser workflows

- employee clocks in, records meal, clocks out and reviews card;
- employee disputes a missing punch and sees correction history;
- manager resolves an exception and approves exact version;
- employee requests ordinary PTO and protected leave follows restricted routing;
- payroll previews readiness, locks, exports and records acknowledgment;
- mobile, keyboard, loading, empty, permission, failure and recovery states.

## Required edge cases

- overnight shift;
- shift crossing workweek/pay-period boundary;
- spring-forward and fall-back DST;
- duplicated and out-of-order client submission;
- clock event while projection is stale;
- work before schedule and after clock-out;
- multiple work locations/jurisdictions in one period;
- unsupported employee profile;
- correction after attestation, approval, lock and export;
- interrupted meal;
- no network acknowledgment after a successful command;
- payroll accepts a batch but the client times out;
- retroactive policy proposal.

## Release gates

Production remains blocked until:

- counsel/payroll approves the actual employee cohort and configuration;
- official sources have a current review record;
- all blocking golden cases pass;
- database migration and rollback/restore are proven;
- permissions and privacy pass adversarial review;
- at least one representative parallel pay period reconciles;
- export acknowledgment and rejection paths are proven;
- managers/employees/payroll have training and support ownership;
- monitoring, backups, feature-flag rollback and first-live reconciliation are ready.

## Parallel payroll pilot

The pilot runs Time & Attendance beside the current authoritative process. It does not pay employees directly.

Reconcile:

- source punches;
- daily/weekly worked minutes;
- regular/overtime/leave earning codes;
- corrections;
- break exceptions;
- employee/manager approvals;
- pay-period totals;
- exported and accepted totals.

Any unexplained employee-level or earning-code variance blocks production.

## Monitoring

- active sessions beyond policy duration;
- unpaired events;
- calculation failures;
- unresolved blocking exceptions;
- stale projections;
- attestation/approval staleness;
- lock failures;
- export retries/rejections;
- reconciliation conflicts;
- outbox dead letters;
- policy versions nearing review/expiry;
- unauthorized or unusual access to restricted leave/export data.

## Recovery

- Retry commands with the original idempotency key.
- Rebuild projections from immutable events and exact policies.
- Reconcile outbox and integration ledgers after outage.
- Never repair history through direct database edits.
- Use controlled correction/reversal commands with actor, reason, scope and correlation.
- Restore tests must reconcile event counts, card checksums, approvals, lock manifests and export hashes.

## Operational ownership

| Area | Owner |
| --- | --- |
| Employee classification and legal interpretation | Legal/HR |
| Workweek, pay period, earning codes and final pay | Payroll |
| Staffing coverage and ordinary PTO decision | Manager |
| Protected leave case | Authorized leave administrator |
| Application availability, security, backup and deployment | Application operator |
| Policy implementation and calculation evidence | Time & Attendance product/engineering |

