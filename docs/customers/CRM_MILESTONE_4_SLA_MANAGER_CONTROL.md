# CRM Milestone 4: SLA and Manager Control

**Status:** Implemented in source; database migration ready to deploy  
**Date:** 2026-07-12

## Delivered

- Versioned, organization-scoped customer-case SLA policies
- Seeded Time Motor Sales policy with America/Chicago business windows and severity targets
- Business-minute calculation across closed hours and weekends
- Case-to-policy version retention so later policy changes do not rewrite historical clocks
- Controlled SLA pause and resume records with allowed reasons, notes, actor, and next review time
- Customer-update promises remain independent and continue aging while an SLA is paused
- Healthy, Watch, At Risk, Breached, and Repeated Breach stages
- Scheduled and manager-triggered SLA evaluation
- Idempotent alert records keyed by case, clock, and stage
- One manager Dispatch task when a case first enters an actionable stage
- Repeated scheduler evaluation updates detection count instead of duplicating alerts or tasks
- Manager queue with Watch, At Risk, Breached, and overdue-update counts
- Cron authorization on the scheduled evaluator

## Initial policy

| Severity | First response | Resolution target | Customer update cadence |
| --- | ---: | ---: | ---: |
| P0 | 15 business minutes | 480 business minutes | 120 minutes |
| P1 | 120 business minutes | 1,440 business minutes | 480 minutes |
| P2 | 480 business minutes | 2,400 business minutes | 960 minutes |
| P3 | 960 business minutes | 4,800 business minutes | 1,920 minutes |

Business windows are Monday through Friday, 9:00 AM to 6:00 PM America/Chicago. These are initial configuration values, not immutable code constants.

## Escalation stages

- `WATCH`: 75% consumed
- `AT_RISK`: 90% consumed
- `BREACHED`: 100% consumed
- `REPEATED_BREACH`: target plus the configured/default post-breach interval

## Exit criteria

| Criterion | Result |
| --- | --- |
| Policy and version are durable | Passed |
| Closed hours do not consume SLA time | Passed |
| Approved pauses subtract from SLA elapsed time | Passed |
| Promised customer updates are not paused | Passed |
| Stage thresholds are deterministic | Passed |
| Re-evaluation does not duplicate alerts or manager tasks | Passed |
| Manager queue exposes SLA and update pressure | Passed |
| Cron endpoint enforces scheduler authorization | Passed |

## Next milestone

Milestone 5 turns Customer 360 into the durable operating record by replacing the preview customer profile, timeline, tabs, and related-record projections with permission-filtered customer data.

The migration is created but is not automatically applied to a shared or production database.
