# Time & Attendance Product and Scope

## Product promise

Turn attendance evidence into trusted, payroll-ready time while giving employees visibility and managers an exception-first operating console.

## Users

### Employee

- clock in/out and start/end meals;
- see current state, weekly totals, exceptions, balances, and upcoming leave;
- review the original and corrected timeline;
- request a correction;
- attest to a completed card;
- request, withdraw, or cancel eligible time off.

### Manager

- see clean, attention, attestation, approval, locked, and exported queues;
- review schedule, attendance, breaks, allocations, and exception explanations;
- correct time only with reason and authority;
- approve, return, reopen, and lock within policy;
- review ordinary PTO coverage without receiving protected medical details;
- monitor overtime proximity and unresolved payroll risk.

### Payroll administrator

- configure pay calendars and earning-code mappings;
- inspect calculation lineage;
- close and reopen periods under separation-of-duties policy;
- export, acknowledge, reject, reconcile, and reproduce batches;
- administer approved employee policy assignments.

### HR/authorized leave administrator

- receive protected-leave referrals;
- view only authorized leave-case information;
- provide approved time codes/status back to Time & Attendance;
- keep medical documents outside ordinary manager and time-card views.

## Console information architecture

- **My Time:** current shift, week totals, balances, next schedule, upcoming leave.
- **Time Cards:** employee review, corrections, attestation, history.
- **Time Off:** request, balance impact, status, withdraw/cancel.
- **Manager Queue:** exceptions, approvals, coverage conflicts, reopen requests.
- **Team Calendar:** permission-filtered approved absences and availability.
- **Payroll Close:** period readiness, locks, exports, acknowledgments, reconciliation.
- **Policy & Audit:** restricted policy versions, assignments, source register, and audit explorer.

## MVP capabilities

### Included

- exact-time web capture;
- one active attendance session per employee;
- staff-specific paid and unpaid meal policy profiles;
- paid rest, paid meal, and unpaid meal evidence;
- overnight shifts and location-local workday attribution;
- federal/Minnesota overtime categorization for validated profiles;
- Minnesota break requirement evaluation;
- Minnesota ESST accrual evidence or payroll reconciliation input;
- correction request and authorized correction;
- employee attestation and manager approval;
- controlled period lock/reopen;
- CSV payroll handoff with version and hash;
- ordinary PTO, ESST, and unpaid-time requests;
- Dispatch Board availability bridge;
- organization/location permission enforcement;
- immutable audit, domain event, command, and outbox use;
- exact calculation explanation and replay.

### Deferred

- native mobile apps;
- biometric devices;
- GPS/geofencing;
- general-purpose policy designer;
- payroll taxes or deductions;
- FMLA/Minnesota Paid Leave adjudication;
- medical-document storage;
- union, prevailing-wage, minor, multi-state, or special-industry policy packs;
- predictive discipline, productivity surveillance, or automated adverse action;
- autonomous approval or correction;
- live payroll-provider connector before the CSV contract is proven.

## Time-off ownership

Time & Attendance owns the transaction and operational effects:

`request → eligibility/balance preview → manager or leave-admin routing → decision → availability → time-card entry → payroll handoff`

People & HR owns protected case administration, documents, certifications, accommodations, and restricted communications. The Dispatch Board consumes approved availability only. Payroll consumes approved leave earning codes and quantities.

## Privacy rules

- Ordinary managers see dates, duration, operational coverage, decision status, and the minimum permitted leave category.
- Medical facts, diagnoses, documents, domestic-abuse details, and protected-leave evidence are not stored in manager-visible notes.
- Free-text notes are optional and carry an explicit warning not to enter sensitive medical information.
- A protected reason routes to an authorized administrator without asking the manager to judge medical eligibility.
- Exports contain only fields required by the approved payroll mapping.

## Success measures

- 100% of exported minutes reconcile to approved cards.
- 100% of material changes have actor, reason, timestamp, correlation, and prior/new evidence.
- Zero silent punch overwrites.
- Zero duplicate export effects from retry.
- Unsupported profiles are blocked rather than guessed.
- Managers review exceptions, not every clean line.
- Parallel-pilot totals reconcile before production authority is granted.
