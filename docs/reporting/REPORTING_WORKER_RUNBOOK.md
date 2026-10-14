# Reporting Worker Runbook

The worker entry point is implemented but is not installed as a recurring job. This document is not production activation approval.

## Prerequisites

- Approved target database and deployed reporting migrations/client.
- An explicitly approved active General Manager account for command attribution; do not use a removed, revoked, or unapproved account.
- Approved active reporting calendar, enabled schedules, intended-period/catch-up decisions and recipient access.
- Approved invocation frequency and operating owner. No email, SMS or other external provider is introduced.

## Gates and execution

`REPORTING_WORKER_ENABLED` defaults off. When it is not exactly `true`, `npm run reports:worker` returns DISABLED without resolving an account or processing schedules. Configure `REPORTING_WORKER_ACTOR_EMAIL` only in the approved runtime environment; the worker resolves current database authority each invocation.

`npm run reports:worker` is a dry run. It returns aggregate due-schedule, stopped-job and expired-lease counts. It does not create or retry jobs.

`npm run reports:worker -- --execute` explicitly requests one bounded batch. Existing `REPORTING_SCHEDULES_ENABLED`, active-calendar and recipient/source-access checks still apply. Up to 25 due schedules are considered. Each schedule retains its unique intended-run identity, lease fencing, five-attempt bound, secure in-app result, and transactional command/audit/outbox evidence.

Execution prints only aggregate status/counts. Failure output is generic; actor identifiers, report content, database credentials and source exceptions are not printed. Inspect protected application evidence under existing authority rather than enabling sensitive console logs.

## Recovery and monitoring

- Expired leases may be reclaimed by the existing bounded processor; a stale lease cannot publish a result after another claim.
- Failed deliveries leave submitted reporting revisions unchanged. Current-only sources refuse to reconstruct an old period.
- Dead-letter recovery remains an explicit authorized Library action with a business reason and schedule version. Prior attempts/error are retained in command evidence.
- Monitor dry-run stopped/expired counts and execution failure counts. Configure external alerts only after the operating owner approves the deployment integration.
- An infrastructure scheduler may invoke the command only after calendar, account, invocation and catch-up approval. This implementation does not register cron, change production flags, or automatically activate schedules.

## Rollback

Disable `REPORTING_WORKER_ENABLED` and `REPORTING_SCHEDULES_ENABLED`; remove an operator-approved scheduled invocation if one was installed later. Keep durable jobs, results, submitted revisions and audit evidence. Do not reset a database or delete reporting history to roll back worker execution.
