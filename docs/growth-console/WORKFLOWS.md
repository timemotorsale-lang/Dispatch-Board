# Growth Console Workflows

**Status:** Foundation baseline
**Date:** 2026-09-07

## Daily Growth Home

Goal: help staff and managers know what growth work should happen today.

1. Review the opportunity queue.
2. Open the highest-value eligible opportunity.
3. Confirm the audience and suppressions.
4. Review the message or ad.
5. Request or grant approval.
6. Schedule launch when backend activation is approved.
7. Track results and assign CRM follow-up.

The UI should show this as one visible path, not as separate hidden tools.

## Campaign Creation

1. Choose an opportunity type.
2. Confirm source records: CRM, inventory, sales, service, appointments, or diagnostics.
3. Confirm the business goal: appointment, lead response, quote recovery, vehicle sale, service retention, review request, or reactivation.
4. Review the suggested audience.
5. Remove suppressed or uncertain records.
6. Choose channel fit: email, SMS, phone follow-up, paid ads, social, website, or internal task.
7. Review message/ad content.
8. Review budget and schedule.
9. Submit for approval.
10. Launch only after backend controls and approval exist.

## Marketing Workspace

Marketing handles owned channels and relationship nurture:

- email;
- SMS when approved;
- phone follow-up scripts;
- website calls to action;
- review requests;
- newsletters;
- retention reminders;
- quote recovery;
- customer education.

The simplest UI path is:

1. Pick the audience.
2. Pick the message.
3. Pick the next action.
4. Review safeguards.
5. Submit for approval.

## Advertising Workspace

Advertising handles paid reach and controlled budget:

- vehicle promotion;
- retargeting;
- service specials;
- lead acquisition;
- aged inventory boost;
- brand awareness;
- event promotion.

The simplest UI path is:

1. Pick the goal.
2. Pick the vehicle, offer, or service line.
3. Confirm the audience signal.
4. Review creative.
5. Review budget and duration.
6. Submit for approval.

Paid activation requires budget approval and a provider adapter.

## CRM Connection Workflow

Growth should connect to CRM through governed read and writeback:

1. CRM supplies customer, consent, opportunity, owner, and lifecycle facts.
2. Growth prepares an audience snapshot.
3. Growth records campaign approval and launch intent.
4. Provider results return to Growth.
5. Growth writes approved activity and outcomes back to CRM.
6. CRM owns next tasks, conversations, appointments, and customer history.

## Approval Workflow

An approval must show:

- audience count and exclusions;
- consent and opt-out status;
- message/ad text;
- offer source;
- budget and schedule;
- risk flags;
- expected outcome;
- rollback or pause option;
- owner responsible for follow-up.

## Results Workflow

1. Show delivery and spend.
2. Show engagement and conversion.
3. Show appointments, leads, sales, service outcomes, and follow-up tasks.
4. Show unresolved responses needing staff action.
5. Show suppressed or bounced contacts needing data cleanup.
6. Recommend whether to continue, pause, revise, or retire.

## Exception Workflows

| Exception | User-facing action |
| --- | --- |
| Missing consent | Remove from audience or open CRM consent review. |
| Stale inventory status | Open inventory record before launch. |
| Unapproved budget | Send to manager approval. |
| Message claim not verified | Send to manager or source-owner review. |
| External provider unavailable | Save plan and retry later. |
| High opt-out risk | Lower frequency, change audience, or require manager approval. |
| Duplicate campaign | Merge, pause, or mark as intentional repeat. |

## Review Before Adoption

Each UI pass remains reviewable until the user approves adoption. Approval of the frontend does not approve live sends, backend expansion, external integrations, or automated spend.
