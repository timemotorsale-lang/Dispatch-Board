# Time Motor Sales Reporting Operating Rulebook Draft

Prepared October 4, 2026. This rulebook specifies the proposed calendar, obligations, lifecycle, calculations, access, and operational controls for reporting. It supports [the catalog](report-catalog.md) and [the console design](report-console-design.md). All organizational policy choices below are proposed defaults pending business review.

## Reporting calendar

The organization has a versioned reporting calendar. Locations may override timezone, working days, and closing times. Departments may override submission expectations. Individual exceptions cover leave, changed shifts, temporary assignments, and delegated reviewers.

| Rule | Proposed default | Required behavior |
| --- | --- | --- |
| Timezone | America/Chicago for the initial location | Store instants in UTC; calculate boundaries in the reporting timezone, including daylight-saving changes |
| Business day | Local calendar day unless an overnight shift is configured | Overnight shifts belong to the date on which the shift starts; retain actual event times |
| Week | Monday through Sunday | Coverage stays fixed even when a due date moves for a holiday |
| Month | Calendar month | Fiscal calendars are a later configuration, not an implicit substitute |
| Daily preparation | Begin before shift end; suggested 30 minutes | Draft remains editable and incorporates subsequent work until submission |
| Daily due | Scheduled shift end; suggested 30-minute grace | Locations without shift data require a configured close time; do not infer one |
| Weekly due | First working day after week-end at 10:00 local time | Shift to the next working day when closed |
| Monthly due | Second business day after month-end at 12:00 local time | Business-day calculation uses the configured holiday calendar |
| Daily review | By 12:00 on the next reviewer working day | Route to a configured backup during reviewer absence |
| Weekly review | By end of the next reviewer working day after due date | Preserve actual review lateness |
| Monthly review | By end of the third business day after month-end | A delayed submission does not erase its original deadline |

Every expected report resolves to a concrete covered period, submission deadline, reviewer deadline, subject, calendar version, and timezone. Use start-inclusive/end-exclusive coverage boundaries. A holiday moves the deadline, not the report's covered dates.

## Expectations by role

| Role | Proposed required submissions | Automatically available summaries | Reviewer |
| --- | --- | --- | --- |
| Frontline staff and technicians | Daily on assigned working days | Weekly and monthly individual summaries | Direct supervisor or delegated reviewer |
| Department supervisors | Daily exception close and weekly department review | Monthly draft | Department lead or GM |
| Department leads | Weekly department review and monthly assessment | Daily operating brief | GM |
| GM or operations leadership | Weekly leadership review and monthly operating review | Daily leadership brief | Configured authorized leadership reviewer |

If a person fills several roles, consolidate overlapping requirements unless the policies explicitly require separate subjects. A daily individual submission may contain the supervisor exception section; do not create duplicate daily paperwork.

Weekly and monthly individual submissions can be enabled by department when their assessment is useful. Generating a summary does not create a submission obligation.

Create expectations only for applicable assignment periods. A late joiner receives a marked partial period. Approved leave may excuse an expectation with a recorded reason. Deactivation stops future expectations but preserves prior history. Retroactive calendar changes require an explicit recalculation preview; never silently rewrite deadlines or excuse overdue work.

## Report lifecycle

| Current state | Action | Result | Authority and conditions |
| --- | --- | --- | --- |
| Draft | Submit | Submitted revision | Author or explicitly authorized delegate; required fields and evidence checks pass |
| Submitted | Approve | Approved revision | Assigned reviewer with scope access; cannot approve own submission by default |
| Submitted | Return with comment | Needs revision | Assigned reviewer; reason required |
| Needs revision | Edit and resubmit | New submitted revision | Author; prior submission and review remain intact |
| Submitted or approved | Request correction | Linked correction draft | Authorized requester; reason required; accepted report remains intact |
| Correction draft | Submit | Correction pending review | Author/delegate; identifies prior revision |
| Correction pending review | Approve | New accepted revision; earlier revision superseded | Authorized reviewer; audit records the replacement relationship |

Return of a pending correction leaves the previously accepted report effective. Approved reports are retained automatically; archival is not another employee action. An authorized administrative void requires a reason and preserves the audit trail. No silent deletion or overwrite of submissions.

Timing flags are separate from lifecycle: due soon, overdue, submitted late, review overdue. Expectation disposition is separate too: required, not required, excused. An absent submission is shown as missing; an existing draft can also be overdue.

The system saves drafts continuously and prepares content, but only a human's explicit action submits or approves. Use revision checks to prevent approval of a changed report. Retried submissions must return the same successful result rather than create duplicates.

## Evidence and historical preservation

A submission freezes the report's rendered content, structured facts, authorized evidence excerpts, source identifiers, calculation version, source cutoff, and calendar version. Preserve the original facts needed to explain its totals even if a source record changes later. Source links open the current record under current access permissions; label that distinction.

Keep separate times for occurrence, recording, source cutoff, submission, and review. A correction arriving after cutoff does not mutate an approved snapshot. Offer a restated revision and identify which facts changed.

Retention is configured by report and evidence class. Business, legal, and personnel owners must approve durations before production archival; this design does not invent a universal retention term. Deletion under an approved policy must cover dependent exports, attachments, and search indexes and leave appropriate permitted audit metadata.

## Report preparation algorithm

1. Resolve the subject, covered period, authorized location scope, calendar, and active definition version.
2. Read qualifying source facts using the report's time basis and cutoff. Include outstanding commitments at cutoff even when created before the period.
3. Normalize source identities and link equivalent task, vehicle, appointment, customer, and repair-order records.
4. Remove duplicate events using stable source identity and event identity. Multiple messages about one completed task do not become multiple completions.
5. Attribute facts to actor, accountable owner, department, and location as applicable at occurrence. Keep contribution separate from outcome ownership.
6. Classify meaningful outcomes, progress, promises, blockers, decisions, and carryover. Routine navigation and inconsequential edits stay out of narrative sections.
7. Calculate metrics from structured facts and retain contributing records, exclusions, numerator, denominator, and missing-data counts.
8. Rank exceptions using explicit rules and explain each reason. Suggested starting order: overdue customer commitments, work blocked past its target, overdue approvals, then other aging work; financial materiality requires a configured threshold.
9. Prepare relevant sections and identify unverified notes, missing sources, and incomplete periods.
10. Preserve user edits during refresh. Present new or changed source material for reconciliation rather than replacing the user's assessment.

Operationally urgent exceptions must also route through existing task/approval workflows immediately. They must not wait for the next report submission.

## Metric contracts

| Metric | Calculation and eligibility | Important exclusions or qualifications |
| --- | --- | --- |
| Delivered units | Distinct eligible delivery identities with effective delivery time in period | Voided deliveries excluded; return/reversal treatment shown explicitly under the selected ledger definition |
| Open pipeline | Eligible open opportunities as of cutoff, grouped by stage | Historical views need transition history; current state alone cannot reconstruct an earlier cutoff |
| Lead conversion | Distinct converted opportunities in a defined lead-created cohort divided by eligible opportunities in that cohort | Display outcome observation window and cohort maturity; missing linkage is reported, not guessed |
| Appointment attendance | Attended eligible occurrences divided by attended plus no-show eligible occurrences | Canceled, superseded/rescheduled, future, and unresolved outcomes shown separately |
| Follow-up coverage | Eligible active opportunities with a valid next action divided by eligible active opportunities | Completed next actions do not satisfy future coverage; permission scope applies to both numerator and denominator |
| Inventory age | Local calendar-day difference between receipt date and cutoff date for eligible on-hand stock | Keep frontline age separate; a stock re-entry follows an explicit receipt-cycle rule |
| Recon elapsed time | Completion instant minus accepted recon-start instant for completed eligible repair orders | Report open-order age separately; calendar elapsed hours are not active labor hours |
| Parts delivery timeliness | Fully fulfilled lines by promised deadline divided by eligible lines due in period with a known promise | Missing promises reported separately; canceled lines excluded; later receipt does not move an overdue line into a later denominator |
| QC first-pass rate | Distinct first inspections passed divided by eligible completed first inspections | Reinspections tracked separately; unresolved inspections excluded and counted visibly |
| Task completion | Distinct tasks with qualifying completed transitions in period | Multiple completion transitions of a reopened task count once in this metric; rework is a separate measure |
| Carryover | Eligible unresolved work assigned to the subject at cutoff and requiring future action | Daily carryover is a stock count; weekly unique carryovers deduplicate task identities |
| Approval elapsed time | Decision instant minus qualifying request instant, with request type retained | Open request age shown separately; clock-pause policies require explicit stage evidence |
| Recorded hours | Valid clock intervals less recorded unpaid breaks, after authorized adjustments | Flag overlaps and missing punches; do not infer missing time or certify payroll |
| Cost per qualifying outcome | Attributable eligible spend divided by distinct qualifying outcomes under the declared attribution model | Requires complete compatible spend and outcomes; zero outcomes produce unavailable ratio, not zero cost |

Monetary values use fixed decimal or integer minor-unit arithmetic, declared currency, and explicit posted/estimated/authorized categories. Do not combine financial categories or currencies without an approved conversion rule.

## Weekly and monthly calculations

Recompute counts and amounts from underlying facts covering the full period. End-of-period inventory is the inventory at the final cutoff; it is not the sum of daily inventory counts. Average inventory, if offered, specifies whether it is daily-snapshot or time-weighted and reports observation coverage.

Rates aggregate numerators and denominators. For example, 1 of 2 and 9 of 10 produces 10 of 12, or 83.3 percent, not the unweighted average of 50 and 90 percent. Medians and percentiles are recalculated from eligible observations, not averaged across days.

Compare complete periods to comparable complete periods. Label month-to-date comparisons, compare equal elapsed business-day coverage where appropriate, and distinguish actual values from forecasts. An absent baseline or zero baseline yields no percentage-change claim.

Approved lower-period reports provide context and evidence, not additional counts. Missing daily submissions do not remove verified source outcomes from weekly metrics. Clearly separate source-data completeness from submission completeness.

## Access and delivery

| Audience | Proposed access |
| --- | --- |
| Employee | Own authorized reports and source details; no private manager coaching notes |
| Supervisor | Reports for assigned team and permitted departments/locations |
| Department lead | Department reports and authorized supporting individual reports |
| GM | Authorized organizational operational reports; personnel and financial fields require explicit entitlements |
| Reporting administrator | Definitions, schedules, and job health; administration alone does not grant report-content access |
| Auditor | Explicit read-only scope with export permission separately assigned |

Apply record and field authorization before aggregation, record detail, search, export, and delivery. Do not expose unauthorized counts in search suggestions. Delegation is time-bounded and audited; coaching annotations have a separate visibility boundary.

Share links require authentication and current entitlement. Snapshot access must not remain available solely because the user had access when it was created. Scheduled jobs evaluate access when they execute, and recipients are evaluated independently. Default sensitive delivery to secure links; attachments require an explicit permitted delivery policy.

Exports preserve selected filters, cutoff, quality status, calculation version, currency, and authorized fields. Large exports run in background with expiry, audit, and retry-safe generation. Cancellation and download do not bypass existing controlled-export policy.

## Reminders and failure handling

Proposed reminders: one before the deadline, one after grace expires, and a consolidated supervisor digest of overdue obligations. Suppress reminders for submitted, excused, and not-required expectations. Persistent overdue items enter the review queue; configure escalation timing rather than sending repeated identical alerts.

Track preparation, delivery, and export jobs separately from report state. A failed delivery does not undo submission. A preparation failure preserves the last successful result and labels it stale. Users can retry safely; administrators can inspect the failure without automatically receiving sensitive report contents.

## Policy decisions to settle

Confirm shift and location closing rules, holiday calendar, role obligations, weekly/monthly individual submission requirements, reviewers and deputies, exception thresholds, qualifying business statuses, financial definitions, retention classes, and external delivery policy. Until confirmed, the defaults in this document are design assumptions, not enforced requirements.
