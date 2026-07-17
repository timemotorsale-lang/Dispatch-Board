# Approval Workshop 02D - Timing, Escalation, Notification, and Coverage Matrix

**Workshop status:** Decision-ready planning draft; not conducted  
**Decision state:** All decisions remain `OPEN` until authorized sign-off  
**Covers:** `ITF-APR-040`-`045`; supports all lifecycle clocks and exceptions  
**Program:** Inventory-to-Frontline  
**Pilot scope:** Time Motor Sales - Minneapolis, subject to Workshop 1 approval  
**Prepared:** 2026-07-16  

## 1. Workshop outcome

This packet continues Workshop 2 by defining how the Inventory-to-Frontline workflow measures time, calculates commitments and variance, assigns overdue ownership, escalates risk, delivers actionable notifications, and maintains safe coverage during absences, overload, closures, after-hours events, and channel failures.

This packet does not:

- approve any numeric service target, warning threshold, pause interval, escalation delay, quiet-hour window, or staffing schedule;
- promise a customer, carrier, seller, vendor, agency, or employee a completion time;
- treat a forecast, estimate, appointment, provider ETA, or system recommendation as a binding commitment;
- allow time pressure to bypass authority, evidence, identity, custody, safety, legal, privacy, financial, QC, title, public-content, price, or release gates;
- permit escalation to auto-approve, auto-complete, silently reassign, or invent an external outcome;
- activate messaging, email, SMS, push, telephony, on-call, or provider integrations.

Required output:

- approved timezone, business calendars, closure, holiday, and after-hours source;
- approved acquisition-validation and transport request/confirmation targets by segment;
- approved pickup/delivery monitoring and variance thresholds;
- approved clock start, warning, due, overdue, stop, cancel, and invalidation events;
- approved pause reasons, approval authority, maximum review intervals, and non-pausable age views;
- approved escalation levels, recipients, acknowledgement, response, resolution, and backup targets;
- approved notification channels, urgency, quiet behavior, delivery evidence, retry, and fallback;
- named business-hours and after-hours owners for every live pilot risk;
- safe behavior when calendars, recipients, channels, providers, or clocks are unavailable or conflicting.

## 2. Timing principles

1. **Time starts from an authoritative event:** a task view, comment, assignment, or screen visit does not create or reset lifecycle age.
2. **Original commitments remain visible:** new estimates, retries, reassignment, resubmission, rework, or package rebuild do not erase original targets.
3. **Calendar and elapsed time are distinct:** retain calendar age, approved business-time age, active work, waiting, blocked, pause, and unexplained idle time.
4. **Waiting remains owned:** external dependency, provider, customer, seller, agency, parts, title, or capacity waiting always has an internal owner and next review.
5. **Pause is controlled:** only approved, evidenced reasons pause an eligible service-objective clock; total age and risk monitoring continue.
6. **Forecast is not commitment:** revised forecasts explain expected outcome but do not rewrite the original promise or target.
7. **Escalation is action-oriented:** each escalation identifies what happened, who can act, response time, consequence, and safe next path.
8. **No alert multiplication:** reminders and escalations correlate to one case/exception instead of creating duplicate tasks and messages.
9. **Acknowledgement is not resolution:** opening, receiving, or acknowledging an alert does not complete the underlying work.
10. **Delivery evidence is not human awareness:** sent/delivered/read states are distinct and do not replace required acknowledgement.
11. **Quiet hours do not suppress critical containment:** urgency rules determine immediate delivery versus queued digest; privacy and least privilege still apply.
12. **Coverage is proven before routing:** off-duty, absent, ineligible, overloaded, or out-of-scope recipients are not treated as available.
13. **Time cannot create authority:** deadline expiry may escalate, restrict, or invalidate; it cannot auto-approve or waive a gate.
14. **System time is auditable:** occurrence, recording, processing, delivery, acknowledgement, and action timestamps remain distinguishable.

## 3. Timing vocabulary

| Term | Meaning | Must not be confused with |
| --- | --- | --- |
| Occurred at | When the real-world/business event happened | When it was entered or received |
| Recorded at | When the workflow durably recorded the event | Proof the event occurred at that instant |
| Processing at | When automation evaluated/routed the event | Actor acknowledgement |
| Calendar age | Continuous elapsed time from start event | Business-time target |
| Business age | Time within an approved operating calendar | Active hands-on work |
| Active work time | Time eligible work is actively being performed | Total stage age |
| Waiting time | Time awaiting a named dependency/outcome | Approved pause automatically |
| Blocked time | Time a known condition prevents progress | Unowned idle time |
| Approved pause time | Time an eligible target is paused under approved reason | Erasure of total age/risk |
| Unexplained idle | Time with no valid active/waiting/blocked/pause state or next action | Staff fault by inference |
| Target | Policy objective for an exact segment/outcome | Guarantee or legal/customer promise |
| Commitment | Attributable promise accepted by authorized parties | Forecast or recommendation |
| Forecast | Current best estimate based on known facts | Original target/commitment |
| Warning | Pre-due signal that action may be needed | Failure or escalation by itself |
| Due | Target response/outcome time | Automatic completion/failure |
| Overdue | Due time passed without qualifying outcome | Permission to bypass controls |
| Variance | Difference between committed/expected and observed timing | Causal attribution |
| Acknowledgement | Eligible recipient accepts awareness/ownership | Corrective response or closure |
| Response | Required action/decision begins or is supplied | Final resolution |
| Resolution | Underlying condition is verifiably closed or routed | Notification dismissal |

## 4. Calendar and timezone contract

Every clock rule must identify:

- organization and location;
- IANA timezone and approved source;
- business days and operating windows;
- receiving, shop, office/title, merchandising, manager, and on-call coverage windows as distinct calendars where needed;
- holidays, planned closures, special hours, emergency closures, and effective versions;
- daylight-saving transition behavior;
- cutoff, rounding, and partial-day rules;
- event occurrence versus recorded-time handling;
- behavior when calendar version is missing, stale, or changes after a clock starts;
- whether the target uses calendar, business, coverage, provider, or hybrid time;
- who approves/publishes calendar changes and how active clocks are affected.

Proposed pilot direction remains `America/Chicago`, Monday-Friday 09:00-18:00 as a planning hypothesis, but Workshop 1 notes that the repository location calendar is `DRAFT`. No numeric target may rely on it until Operations approves receiving and role-specific coverage, holidays, closures, special hours, and after-hours containment.

### Calendar change rules

- preserve the rule/calendar version used to calculate each original target;
- apply corrections prospectively unless policy explicitly requires recomputation and impact review;
- never use a later calendar change to hide an already missed target;
- emergency closure may adjust forecast/eligible business time while calendar age, custody risk, commitments, and critical monitoring remain visible;
- conflicting calendar sources route to Operations rather than selecting the most favorable target.

## 5. Clock rule contract

Every clock rule defines:

| Field | Required definition |
| --- | --- |
| Rule ID/version | Stable identifier and approved version |
| Purpose/segment | Exact response/outcome being measured |
| Scope | Location, source, acquisition type, distance, method, vehicle class, risk, provider, stage, route |
| Calendar/timezone | Approved calendar and clock type |
| Start event | Authoritative event and required facts |
| Warning event/time | Threshold and recipient/action |
| Due event/time | Target and required qualifying outcome |
| Overdue event/time | Escalation threshold and restriction if applicable |
| Stop event | Exact verified outcome that stops the clock |
| Cancel/terminal event | Authorized route that terminates the objective without false success |
| Pause eligibility | Reasons, authority, evidence, maximum review, expiry |
| Invalidation/restart | Material event that creates a new segment while preserving original history |
| Owner/backup | One accountable owner and eligible fallback |
| Escalation ladder | Levels, recipients, acknowledgement/response/resolution targets |
| Notification policy | Channel, urgency, quiet, retry, fallback, delivery evidence |
| Commitment linkage | Customer/provider/internal commitment and consequence |
| Metrics | Calendar/business/active/waiting/blocked/pause/idle/variance views |

Missing values do not default to zero, unlimited, never due, or silent. The affected automated target/escalation remains inactive and visible as a policy gap.

## 6. Clock lifecycle

```text
NOT_STARTED
-> RUNNING
-> WARNING
-> DUE
-> OVERDUE
-> STOPPED_OUTCOME

RUNNING/WARNING/DUE/OVERDUE may also be:
PAUSED_APPROVED
WAITING_OWNED
BLOCKED_OWNED
SUSPENDED_BY_TERMINAL_OR_POLICY_EVENT
```

Rules:

- `WAITING_OWNED` and `BLOCKED_OWNED` describe work state; they pause only clocks whose policy explicitly allows it;
- an approved pause has a review clock that cannot itself be indefinitely paused;
- overdue remains overdue until the exact outcome, authorized terminal route, or approved correction occurs;
- reassignment transfers ownership but preserves start, due, and history;
- retries/resubmissions create attempt clocks linked to the original objective clock;
- rework/reinspection creates cycle clocks while preserving original stage and vehicle age;
- provider ETA changes revise forecast but not original provider commitment/variance history;
- a stale or future-dated event is quarantined/reconciled before it controls timing.

## 7. Required clock families

### First implementation slice

- acquisition validation;
- vehicle location confirmation;
- destination approval;
- transport request;
- quote/approval where applicable;
- provider confirmation;
- release-requirement readiness;
- pickup commitment and variance;
- in-transit monitoring and arrival variance;
- receipt-handoff acceptance;
- total acquisition-to-receipt;
- unexplained idle time.

### Later lifecycle families

| Stage | Required timing coverage |
| --- | --- |
| Receipt/Custody | Arrival response, identity/custody observation, discrepancy, secure placement, handoff acceptance |
| Inspection/Triage | Intake, assignment, start, completion, evidence review, finding routing, specialist/diagnosis dependency, handoff |
| Recon Planning/Approval | Diagnosis, estimate/quote, economics review, approval, reapproval, executable-job creation, handoff |
| Parts/Repair | Source/quote/order/acknowledgement/receipt, reservation, dispatch, labor, pause, changed scope, completion, QC handoff |
| Quality/Safety | QC intake, assignment, inspection, peer verification, road test, failed-QC rework, reinspection, release review, downstream acceptance |
| Title/Documents | Requirement selection, request/receipt, verification, correction, lien/payoff/release, provider/agency states, original transit, constrained review, readiness/handoff |
| Merchandising/Pricing | Physical/media readiness, capture/upload/review, fact correction, content approval, price analysis/approval, channel request/ack/live reconciliation, correction, package/handoff |
| Frontline Release | Handoff, package, correction, exception, reviewer assignment/decision, transition, placement, availability, sales acceptance, post-release verification, suspension/correction/reinstatement |

## 8. Acquisition validation target (`ITF-APR-040`)

Target segmentation may consider only approved, measurable dimensions:

- acquisition source/type and authority completeness;
- onsite versus remote vehicle;
- canonical identity status;
- organization/location and intended inventory route;
- standard versus nonstandard/special-case acquisition;
- required office/title/safety consultation;
- business calendar and coverage;
- source/integration availability and freshness.

Required rule decisions:

- start event: authoritative acquisition received and eligible for evaluation;
- stop event: acquisition validated for the approved route or explicitly rejected/deferred to a safe alternate;
- warning/due/overdue values by segment (`TBD`);
- owner acknowledgement and evidence-request targets (`TBD`);
- critical identity/authority conflict behavior;
- after-hours receipt of acquisition event;
- duplicate/late/corrected source event handling;
- customer/provider/financial commitment linkage where applicable.

Recommended direction: preserve one total validation clock plus subclocks for missing identity, authority, location, and route dependencies. Missing facts do not silently pause total age; they remain owned waiting or blocked time.

## 9. Transport request and confirmation targets (`ITF-APR-041`)

Segment by approved dimensions such as:

- no-movement/already-onsite, seller delivery, approved carrier, or tow/trailer;
- source and pickup readiness;
- distance/geography band;
- standard, inoperable, oversized, specialty, or hazard handling;
- standard versus urgent/custody-risk movement;
- quote/financial approval requirement;
- provider contract/availability and business hours;
- release/document requirements;
- destination/receiving coverage.

Keep separate clocks for:

1. plan ready for sourcing;
2. first eligible request sent;
3. required quotes received/exception resolved;
4. exact financial/method approval;
5. provider confirmation or approved alternate;
6. pickup commitment recorded;
7. plan handed to monitoring.

Provider acknowledgement is not confirmation unless the approved mapping says it represents an exact accepted commitment. Timeout creates reconciliation and escalation; it must not blindly retry a potentially accepted request.

## 10. Pickup/delivery monitoring and variance (`ITF-APR-042`)

Each movement must preserve:

- original pickup and arrival target/commitment;
- current forecast and source;
- last verified status/as-of time;
- warning, material variance, severe variance, and unknown-status thresholds;
- monitoring owner and provider contact path;
- vehicle/custody/location and release/receiving readiness;
- downstream receipt coverage and consequence;
- attempts, acknowledgements, changed commitments, and reason codes.

### Variance classes

| Class | Meaning | Response direction |
| --- | --- | --- |
| `ON_TRACK` | Current verified forecast within approved tolerance | Continue monitoring |
| `AT_RISK` | Leading signal may miss commitment | Owner action; verify source/alternate |
| `MATERIAL_VARIANCE` | Approved threshold exceeded or commitment likely missed | Manager/dependency coordination; revise forecast |
| `SEVERE_VARIANCE` | Custody, safety, customer, financial, receiving, or prolonged unknown risk | Operations escalation/containment |
| `STATUS_UNKNOWN` | No sufficiently fresh authoritative status | Reconcile; do not claim on-track/in-transit/delivered |
| `MISSED_COMMITMENT` | Observed outcome passed commitment threshold | Record variance/reason/recovery; preserve original |

Arrival after hours does not auto-complete receipt. It follows approved secure-containment and on-call behavior; formal receipt remains owned until eligible coverage accepts it.

## 11. Pause reasons and review intervals (`ITF-APR-043`)

### Pause contract

A pause requires:

- eligible clock and structured reason code;
- requesting/approving actor and authority;
- detected facts/evidence;
- dependency and internal owner;
- pause start and maximum duration/review interval;
- next review and expected outcome;
- permitted/prohibited work while paused;
- customer/provider/financial/custody/safety impact;
- automatic expiry/escalation behavior;
- resume/cancel/terminal criteria.

### Candidate pause families requiring approval

| Family | Possible eligible use | Cannot pause |
| --- | --- | --- |
| Awaiting external provider | Carrier/seller/agency/vendor action after valid request | Total age, custody/safety monitoring, review clock |
| Awaiting customer/seller document/action | Exact required dependency with valid request | Hard-gate status or internal follow-up ownership |
| Awaiting approved part/resource | Confirmed dependency after authorized action | Vehicle age, safety restriction, follow-up review |
| Awaiting qualified reviewer/approval | Eligible request in correct queue | Authority expiry, evidence freshness, total age |
| Approved closure/no coverage | Calendar closure where target uses business time | Critical incident/containment and calendar age |
| Force majeure/provider outage | Verified event under approved policy | Reconciliation, risk monitoring, maximum review |
| Legal/insurance/claim hold | Qualified authority directs constrained wait | Custody, privacy/security, hold review |
| Customer-authorized deferment | Only where customer/workflow scope permits | Inventory hard gates unless policy explicitly applies |

Not valid by themselves: “busy,” “forgot,” “manager unavailable,” reassignment, comment, schedule pressure, missing owner, unknown reason, vendor called, new ETA, or trying to avoid an overdue result.

Pause expiry never auto-completes. It resumes the eligible clock or escalates to review according to policy.

## 12. Escalation model (`ITF-APR-044`)

| Level | Trigger direction | Primary recipient | Required outcome |
| --- | --- | --- | --- |
| `E1 OWNER_ATTENTION` | Warning/due, missing acknowledgement, stale status | Current owner and eligible backup | Acknowledge, act, or request help |
| `E2 STAGE_MANAGER` | Missed acknowledgement/due, material variance, owner unavailable/overloaded | Stage manager/service owner | Reassign eligible coverage, remove blocker, approve/escalate |
| `E3 CROSS_FUNCTIONAL` | Dependency spans receiving, shop, title, office, safety, finance, provider, channel | Named dependency owners plus case owner | Coordinated plan with one accountable owner |
| `E4 OPERATIONS_CRITICAL` | Critical custody/safety, high exposure, severe variance, repeated failure, reversal/policy exception | GM/Operations and incident authority | Contain risk, authorize bounded response, pause scope if needed |
| `E5 EXECUTIVE_EXTERNAL` | Highest dealership boundary, law/insurer/law enforcement/counsel/provider executive requirement | Named executive/external authority with internal monitor | Qualified external/executive response and internal reconciliation |

Each escalation rule defines:

- trigger, severity, evidence, and deduplication key;
- owner, recipient eligibility, backup, and on-call resolution;
- acknowledgement target;
- response target;
- resolution/next-review target;
- available commands and prohibited actions;
- next escalation level and maximum dwell;
- notification channel/urgency/fallback;
- customer/provider/internal communication owner;
- closure verification and audit.

Escalation does not remove the current owner until an eligible receiver accepts transfer. Multiple recipients do not create shared accountability.

## 13. Acknowledgement, response, and resolution

| Event | Required proof | Clock effect |
| --- | --- | --- |
| Notification sent | Provider/system accepted request for delivery | No owner acknowledgement |
| Delivered | Approved channel reports delivery to endpoint | No proof of human awareness |
| Read/opened | Approved channel reports open/read where available | Not an operational acknowledgement |
| Acknowledged | Eligible recipient explicitly accepts awareness/ownership | Stops acknowledgement subclock only |
| Responded | Eligible action/decision/update meets rule | Stops response subclock only |
| Resolved | Underlying outcome passes closure verification | Stops resolution/exception clock |
| Transferred | Eligible new owner explicitly accepts | Ownership changes; original clocks persist |

Silence, dismissal, read receipt, comment, or status emoji cannot close an escalation.

## 14. Notification policy (`ITF-APR-045`)

### Notification content contract

Every actionable notice includes:

- concise event/vehicle context without unnecessary sensitive data;
- severity and why it matters now;
- current owner and recipient role;
- evidence/source summary and freshness;
- exact permitted action or authenticated deep link;
- acknowledgement/response deadline;
- consequence of no action and next escalation;
- correlation identifier so reminders remain one thread.

Restricted evidence, full personal identifiers, sensitive document contents, secure key/location details, and privileged information must not appear in ordinary message bodies.

### Channel classes

| Channel | Intended use | Control boundary |
| --- | --- | --- |
| In-app My Work | Primary durable operational queue | Requires authentication; source of actionable state |
| In-app Manager Review | Approvals, exceptions, capacity, critical risk | Exact authority/role filtering |
| In-app banner/badge | Awareness of current condition | Cannot be sole critical delivery path |
| Email | Approved summaries/digests or action notice | Minimal data; authenticated deep link; delivery not acknowledgement |
| SMS/push | Urgent minimal call-to-action where approved | No restricted details; consent/device/security/quiet policy |
| Voice/on-call | Critical after-hours or failed digital escalation | Named procedure and call outcome record |
| Provider/webhook | System-to-system event | Mapped delivery/ack states, idempotency, reconciliation |
| Digest/huddle report | Nonurgent grouped awareness | Must not delay urgent/critical action |

### Delivery states

```text
QUEUED
SENT
DELIVERED_OR_PROVIDER_ACCEPTED
FAILED_RETRYABLE
FAILED_TERMINAL
SUPPRESSED_BY_POLICY
QUEUED_FOR_QUIET_END
ACKNOWLEDGED_BY_ELIGIBLE_ACTOR
```

Provider acceptance, delivery, and human acknowledgement remain separate.

## 15. Quiet hours and urgency

| Urgency | Quiet behavior | Example direction |
| --- | --- | --- |
| Routine | Queue for next coverage window/digest | Healthy status, future reminder |
| Time-sensitive | In-app immediately; external channel per consent/policy | Approaching approval/provider target |
| Urgent operational | Notify eligible on-duty/on-call role; bypass ordinary digest | Material pickup variance, receiver risk |
| Critical containment | Immediate approved channels and fallback until eligible acknowledgement | Safety/custody/security incident |

Quiet-hour bypass requires an approved urgency rule, not sender preference. Repeated notifications use backoff and escalate recipient/level rather than continuously contacting the same person. Staff personal-channel use, consent, compensation/on-call policy, and labor/privacy obligations require qualified approval outside this packet.

## 16. Coverage, absence, and overload

Before routing, verify:

- active role/capability/qualification and organization/location scope;
- schedule, time off, closure, on-call assignment, and current availability;
- conflict/separation-of-duty eligibility;
- workload/capacity threshold and active critical work;
- channel availability and recent delivery failure;
- delegation/backup validity and expiry.

### Coverage behavior

- planned absence transfers open work with receiver acceptance before departure;
- unexpected absence routes to an eligible backup/stage manager without pretending the original target reset;
- overload stops new assignment at approved thresholds and escalates capacity/priority;
- no eligible coverage contains the affected action and escalates to the service/operations owner;
- shared queue aids discovery, but claimed work resolves to one owner;
- provider/external dependency never becomes the internal accountable owner;
- after-hours arrivals use only approved containment location, receiver/on-call authority, and evidence path.

Coverage gaps are operational risks and pilot admission constraints. The system must not lower qualification, evidence, independence, or authority because staffing is limited.

## 17. Alert correlation and fatigue controls

Use one correlation key for the same vehicle/cycle, condition, target, dependency, and escalation chain. A correlated alert record maintains:

- original detection and current severity;
- current owner/recipients and delivery attempts;
- acknowledgements/responses;
- reminders and backoff;
- related clock/exception/commitment;
- changed facts and severity transitions;
- closure/reopen evidence.

Suppress or combine redundant low-value notices, but never hide a distinct critical condition. Track alert usefulness, acknowledgement, duplicate, false-positive, suppressed-critical, stale-recipient, and notification-failure rates during shadow/pilot. Staff need “snooze” only as a controlled next-review action, not indefinite dismissal.

## 18. Customer and external communication boundaries

- only approved roles communicate customer/provider commitments;
- internal target changes do not automatically alter an external commitment;
- messages distinguish confirmed fact, provider-reported fact, forecast, risk, and unknown;
- customer/provider communication records channel, actor, time, content/version, recipient, delivery, response, and follow-up owner as policy requires;
- do not expose internal sensitive evidence, personnel details, blame, or unsupported cause;
- missed commitment triggers truthful update ownership without promising an unapproved remedy;
- external silence remains an internally owned dependency and escalation.

## 19. Staff and manager experience

### My Work

Each item shows:

- one primary due/response target and clock type;
- elapsed calendar/business time and meaningful active/waiting/blocked state;
- urgency reason, original commitment, and current forecast where relevant;
- next action, owner, dependency, and consequence;
- pause/review status and expiry;
- help options: blocked, no authority, unavailable dependency, unsafe, cannot meet target.

### Manager Review

Prioritize:

- unacknowledged critical/urgent items;
- overdue critical-path work;
- severe provider/pickup/arrival variance;
- expiring pause/approval/evidence;
- unexplained idle and unowned/coverage gaps;
- overloaded roles and repeated reassignment;
- cross-functional blockers;
- failed/suppressed notification delivery;
- customer/financial/custody commitments at risk.

Managers must see both original and revised targets. A “change due date” action requires authority, reason, impact, and audit; it creates a revised forecast/target version and does not erase historical variance.

## 20. Degraded and failure behavior

| Condition | Safe behavior |
| --- | --- |
| Calendar unavailable/conflicting | Preserve occurrence/calendar age; do not invent business target; escalate policy owner |
| Clock processor delayed | Recompute from authoritative events idempotently; do not shift targets by processing delay |
| Notification provider unavailable | Preserve durable in-app item; retry/backoff/fallback per urgency; record failure |
| Recipient invalid/inactive | Resolve eligible backup; do not mark delivered/acknowledged |
| All channels fail | Escalate through approved fallback/on-call; preserve one correlated incident |
| Duplicate event/notification | Deduplicate by idempotency/correlation; preserve distinct material facts |
| Out-of-order event | Reconcile occurrence/version; do not regress verified current state silently |
| Device/user clock differs | Use approved server/source time; retain reported occurrence with provenance |
| Provider ETA/status stale | Mark status unknown/stale and escalate monitoring; do not claim on-track |
| Escalation worker unavailable | Durable due work remains queryable; recovery evaluates missed escalations without flooding |
| Ownership transfer races with escalation | Expected-version check; reload current owner and preserve history |
| After-hours arrival lacks containment | Planned movement should not proceed; if reality occurs, protect people/property and escalate Operations |

## 21. Metrics and governance

Measure by segment and role without using timing alone to infer employee fault:

- acquisition-to-validation and acquisition-to-receipt age;
- transport request/quote/approval/confirmation time;
- pickup/arrival commitment variance and unknown-status duration;
- business/calendar/active/waiting/blocked/pause/idle time;
- pause frequency, reason, duration, expiry, and overdue review;
- acknowledgement/response/resolution time by severity;
- escalation count, level, repeat/reopen, and effectiveness;
- recipient eligibility/coverage failure and overload;
- notification queued/sent/delivered/failed/suppressed/acknowledged;
- duplicate, false-positive, stale-recipient, and alert-usefulness rate;
- original versus revised target/forecast accuracy;
- critical condition contained without gate bypass.

Targets are operating hypotheses until shadow/pilot evidence supports them. Management must review for perverse incentives such as premature completion, invalid pauses, under-reporting blockers, unsafe speed, or excess alerts.

## 22. Decision recommendations

| Decision | Recommended outcome | Required authority | State |
| --- | --- | --- | --- |
| `ITF-APR-040` | Approve segmented acquisition-validation clocks with authoritative start/stop, one total age, owned dependency subclocks, and no reset by reassignment/correction | Inventory + Operations/service owner | OPEN |
| `ITF-APR-041` | Approve separate plan/request/quote/approval/confirmation/pickup-commitment clocks by movement segment; provider acknowledgement is not assumed confirmation | Inventory/Transport + Finance/Operations | OPEN |
| `ITF-APR-042` | Approve pickup/arrival warning, material/severe variance, stale/unknown status, monitoring, reconciliation, and after-hours receipt behavior | Inventory/Receiving + Operations | OPEN |
| `ITF-APR-043` | Approve only structured evidenced pauses with owner, permitted/prohibited work, maximum review, expiry/escalation, and continuing total-age/risk views | Operations + affected stage owners | OPEN |
| `ITF-APR-044` | Approve five-level escalation with eligible primary/backup/on-call recipients and separate acknowledgement, response, resolution, transfer, and dwell targets | GM/Operations + role/incident owners | OPEN |
| `ITF-APR-045` | Make authenticated My Work/Manager Review the durable source; approve minimal-data channel/urgency/quiet/retry/fallback/delivery rules and correlated notifications | Operations + Security/Privacy + communications owners | OPEN |

## 23. Clock-policy capture sheet

| Field | Required entry |
| --- | --- |
| Rule ID/version | `TBD` |
| Purpose/segment/scope | `TBD` |
| Calendar/timezone | `TBD` |
| Start/stop/terminal events | `TBD` |
| Warning/due/overdue values | `TBD` |
| Clock type | `TBD` |
| Pause reasons/authority/max review | `TBD` |
| Owner/backup/coverage | `TBD` |
| Escalation ladder/dwell | `TBD` |
| Acknowledgement/response/resolution targets | `TBD` |
| Notification channel/urgency/quiet/fallback | `TBD` |
| Commitment/variance linkage | `TBD` |
| Missing/degraded behavior | `TBD` |
| Approver/publisher/effective/review dates | `TBD` |

## 24. Coverage and notification capture sheet

| Field | Required entry |
| --- | --- |
| Responsibility/severity | `TBD` |
| Business-hours primary/backup | `TBD` |
| After-hours/on-call primary/backup | `TBD` |
| Qualification/authority scope | `TBD` |
| Capacity/overload threshold | `TBD` |
| In-app/email/SMS/push/voice eligibility | `TBD` |
| Quiet hours/bypass | `TBD` |
| Retry/backoff/fallback | `TBD` |
| Delivery/acknowledgement evidence | `TBD` |
| Transfer/escalation | `TBD` |
| Privacy/minimal content | `TBD` |
| Owner/review date | `TBD` |

## 25. Required timing stress tests

Workshop 2D does not pass until participants can determine clocks, owner, recipients, pause, escalation, channels, and safe outcome for each case:

1. An acquisition event arrives Friday after the approved operating window.
2. Two source events report different acquisition times.
3. A VIN conflict blocks validation beyond target.
4. A carrier request times out after the provider may have accepted it.
5. A quote expires while approval is pending.
6. The original pickup commitment changes three times.
7. Provider status is stale and the vehicle's location is unknown.
8. The carrier arrives after hours with no approved receiver.
9. A coordinator marks “waiting on vendor” without evidence or next review.
10. A legitimate external dependency exceeds maximum pause review.
11. Brock is absent when an urgent transport exception escalates.
12. The eligible approver is online but above approved workload capacity.
13. A critical notification is delivered but not acknowledged.
14. SMS fails while in-app delivery succeeds during quiet hours.
15. All configured channels fail for a custody incident.
16. A task is reassigned immediately before becoming overdue.
17. A manager changes a due date after it was missed.
18. The escalation processor is down for two hours and recovers.
19. A duplicate provider event would create a second escalation.
20. A customer appointment creates pressure to bypass a release gate.
21. Daylight-saving change occurs during an in-transit movement.
22. Emergency closure is published after active clocks started.
23. A provider reports delivery before arrival evidence/receipt exists.
24. Staff repeatedly snooze a warning without changing the underlying condition.

Expected behavior: preserve authoritative/original time, one accountable owner, honest waiting/variance, actionable escalation, minimal secure notification, safe fallback, and every hard gate.

## 26. Workshop agenda

### Before the meeting

Bring approved/draft location calendars, role schedules and on-call coverage, representative acquisition/transport timelines, provider commitments/ETAs, current reminders/messages, customer communication practices, closures/holiday rules, and alert/response history.

### In the meeting

1. Approve timezone/calendar authority and coverage calendars.
2. Approve time vocabulary and clock contract.
3. Segment and set exact acquisition-validation targets.
4. Segment and set exact transport request/confirmation targets.
5. Set pickup/delivery warning and variance thresholds.
6. Approve pause reasons, authority, and maximum review.
7. Name escalation recipients/backups/on-call and targets.
8. Approve channels, urgency, quiet, content, retry, fallback, and delivery evidence.
9. Review staff/manager experience and alert-fatigue controls.
10. Run stress tests and assign gaps.
11. Record `ITF-APR-040`-`045` dispositions.

## 27. Exit criteria

Workshop 2D is complete only when:

- `ITF-APR-040`-`045` have complete dispositions and metadata;
- timezone, business/coverage calendars, closures, holidays, special hours, and after-hours behavior are approved;
- all first-slice clocks have exact segmented start/warning/due/overdue/stop/terminal rules;
- pickup/delivery monitoring distinguishes commitment, forecast, observed status, variance, and unknown;
- pauses are evidenced, bounded, reviewed, and cannot erase total age/risk;
- every escalation has eligible primary/backup/on-call recipients and acknowledgement/response/resolution targets;
- notifications minimize sensitive data, correlate reminders, respect approved quiet rules, and have failure fallback;
- absence/overload/no-coverage states contain or escalate rather than weaken controls;
- dashboards retain original and revised targets and explain timing states;
- stress tests pass or have safe non-execution behavior with owners and dates.

## 28. Next Workshop 2 packet

Workshop 2 continues with the **Source Authority, Integration, Freshness, and Reconciliation Matrix**, covering `ITF-APR-060`-`065`: authoritative sources by field, identity, location/custody, provider mappings, freshness/staleness, conflict precedence, idempotency, degraded mode, manual fallback, and reconciliation.

Timing approval does not make the first implementation slice ready for code. Applicable role, authority/financial, evidence/security, source/integration, pilot, and stage-specific decisions must also be approved or safely deferred, and activation remains separately gated.
