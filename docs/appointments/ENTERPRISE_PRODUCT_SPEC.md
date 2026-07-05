# Enterprise Appointment Command Center Product Specification

**Document status:** Approved direction with implementation details planned  
**Target release:** Enterprise Release 1.0  
**E0 approval date:** 2026-07-05  
**Product owner:** Time Motor Sales  
**Implementation status:** Not started by this document

## 1. Product Charter

The Appointment Command Center is the enterprise scheduling and appointment-operations layer of the Dispatch Board.

It must answer, without requiring users to reconstruct context from separate screens:

```text
Who is meeting?
Why are they meeting?
When and where will it happen?
Who owns the appointment?
Which people and resources are required?
What must be ready beforehand?
Are there conflicts or operational risks?
Did the customer confirm and attend?
What happened?
What work or follow-up is required next?
Who changed what, when, and why?
```

The product contract is:

```text
Appointment = time-bound coordination and outcome record
Task        = unit of operational work
Activity    = immutable operational history
Template    = configurable rules for purpose-specific behavior
Automation  = deterministic, explainable, idempotent action
```

## 2. Enterprise Principles

1. **Operational control before calendar decoration.** Calendar views serve execution and capacity management.
2. **One source of operational truth.** Appointment information, history, reasons, and linked work remain governed inside the Dispatch Board.
3. **Separate state dimensions.** Booking, confirmation, attendance, and execution must not be collapsed into one overloaded status.
4. **Explainable automation.** Every automatic action identifies its trigger, matched rule, outcome, and reason.
5. **No silent conflicts or overwrites.** Resource conflicts, concurrent edits, failed automations, and integration failures must be visible.
6. **Server-enforced authority.** Interface controls reflect permissions, but server-side policy is authoritative.
7. **Configuration over hard-coding.** Appointment purposes, templates, resources, outcomes, durations, buffers, and rules are administrator-managed.
8. **Complete accountability.** Meaningful actions create immutable history; exceptions and outcomes require structured reasons.
9. **Accessible and responsive by default.** Manager, owner, and staff workflows must work across supported desktop, tablet, and mobile sizes.
10. **Integration-ready, not integration-dependent.** Release 1.0 operates fully without external SMS, email, calendar, CRM, or DMS integration.

## 3. Users and Operating Modes

### 3.1 Manager

- Operates the full command center.
- Creates, owns, assigns, reschedules, cancels, and completes appointments.
- Resolves or overrides eligible warnings.
- Reviews automation results and failures.
- Configures templates, resources, availability, and policies when granted administration authority.
- Reviews reports, audit history, and operational exceptions.

### 3.2 Appointment Owner

- Manages appointments they own.
- Updates confirmation, attendance, execution, notes, outcomes, linked work, and follow-up.
- Resolves the underlying condition behind warnings; cannot override a warning reserved for manager authority.
- Cannot use manager-only overrides or administration controls.

### 3.3 Participant or Assigned Staff Member

- Views appointment information allowed by policy.
- Views work assigned to them.
- Cannot change the appointment unless they are also its owner or a manager.
- Updates linked tasks only through existing task permissions.

### 3.4 Viewer

- Views permission-appropriate appointment summaries and schedules.
- Cannot change the appointment or expose restricted customer information.

### 3.5 Appointment Administrator

- Configures purposes, templates, outcomes, resources, locations, operating hours, closures, saved operational policies, and automation rules.
- Administration authority does not automatically grant authority to modify every live appointment unless the user is also a manager or owner.

### 3.6 System Automation

- Performs only actions explicitly authorized by an active, versioned rule.
- Records the trigger, rule version, result, and correlation identifier.
- Creates a draft requiring review whenever required scheduling information is unresolved.

## 4. Day-One Functional Scope

All capabilities in this section are part of Enterprise Release 1.0 unless explicitly marked as an external-integration deferral.

### 4.1 Command Center Views

- Day
- Week
- Month
- Agenda
- Today queue
- My Appointments
- Staff schedule
- Vehicle schedule
- Resource schedule
- Location schedule
- Needs confirmation
- Needs follow-up
- No-show queue
- Waitlist and unscheduled requests
- Automation review and failure queue
- Saved personal and shared views

Views must support permission-aware:

- Search
- Filters
- Sorting
- Purpose and status counts
- Location and resource selection
- Date navigation
- Conflict-only filtering
- URL-restorable view state
- Empty, loading, stale, partial-failure, and error states

### 4.2 Appointment Creation and Management

- Manual appointment creation
- Appointment creation from any task
- Rule-driven automatic appointment creation
- Draft and pending-approval appointments
- Recurring appointments
- Copying an existing appointment
- Rescheduling with complete history
- Cancellation with reason
- Bulk rescheduling for closures, resource outages, or staff absence
- Waitlist placement and promotion
- Ownership assignment and transfer
- Participant and resource assignment
- Notes, internal instructions, and structured operational fields
- Purpose-specific fields, checklists, outcomes, and completion requirements
- Optimistic-concurrency protection
- Idempotent create and command behavior

### 4.3 Appointment Purposes

The system ships with configurable starting purposes:

- Sales Consultation
- Test Drive
- Vehicle Delivery
- Service and Repair
- Customer Issue
- Documentation, Title, and DMV
- Collections and Payment
- Inventory and Vendor
- Marketing, Photos, and Listing
- Internal Meeting
- General or Other

Administrators can add, deactivate, and version purposes without code. Historical appointments retain the purpose and template version used when scheduled.

### 4.4 People and Resources

An appointment can involve:

- One accountable owner
- Additional internal participants
- One or more customers or external participants
- One or more vehicles
- Service bays
- Rooms
- Equipment
- Locations
- Other administrator-defined resource types

Each exclusive resource supports:

- Availability
- Capacity
- Operating constraints
- Preparation and cleanup buffers
- Out-of-service windows
- Location restrictions
- Conflict policy

### 4.5 Locations, Time, and Availability

- Organization and location boundaries
- Location-specific timezone
- Operating hours
- Holiday and closure schedules
- Staff working schedules
- Resource availability
- Duration rules
- Preparation and cleanup buffers
- All-day and timed appointments
- Daylight-saving-safe storage and display
- Recurrence exceptions
- Capacity-aware availability

All timestamps are stored unambiguously and displayed in the relevant location timezone with the timezone visible when ambiguity is possible.

### 4.6 State Model

The appointment uses independent state dimensions:

| Dimension | States |
| --- | --- |
| Booking | `DRAFT`, `PENDING_APPROVAL`, `SCHEDULED`, `CANCELLED`, `COMPLETED` |
| Confirmation | `NOT_REQUIRED`, `NOT_SENT`, `PENDING`, `CONFIRMED`, `DECLINED` |
| Attendance | `EXPECTED`, `CHECKED_IN`, `NO_SHOW` |
| Execution | `NOT_STARTED`, `IN_PROGRESS`, `WAITING`, `FINISHED` |

Rescheduling is an event and history record, not a permanent current state. Detailed transitions are defined in `LIFECYCLE_CONFLICT_MATRIX.md`.

### 4.7 Task Orchestration

- Any task may create a linked appointment.
- A task template or active rule may create an appointment automatically.
- An appointment template may propose or create linked preparation, dependency, during-appointment, approval, and follow-up tasks.
- Task and appointment records retain independent lifecycles.
- Appointment completion never silently completes unfinished linked tasks.
- Required linked work can warn or block appointment transitions according to template policy.
- A task-created appointment retains source-task, rule, and correlation references.
- Reprocessing the same trigger cannot create a duplicate appointment.

### 4.8 Customer and Vehicle Information

Release 1.0 stores appointment information inside the Dispatch Board.

Customer and vehicle records used by appointments must support:

- Stable internal reference
- Operational snapshot retained with the appointment
- Restricted contact or identifying fields
- Searchable non-sensitive identifiers
- Duplicate-detection assistance
- Data-retention policy
- Access and change history
- Future external-source identifiers without depending on an integration

Sensitive values must not be copied into general activity messages, logs, URLs, analytics labels, or error messages.

### 4.9 Outcomes and Reasons

Every completed, cancelled, declined, rescheduled, no-show, overridden, or otherwise exceptional appointment records:

- Structured reason or outcome code
- Human-readable explanation when required by policy
- Actor
- Timestamp
- Previous and resulting state
- Follow-up disposition
- Linked follow-up task or appointment when required

Outcome catalogs are configurable by appointment purpose. Example outcomes include:

- Sold
- Not sold; follow-up required
- Test drive completed
- Vehicle delivered
- Repair approved
- Repair declined
- Issue resolved
- Documentation completed
- Payment completed
- Customer no-show
- Needs manager review
- Rescheduled
- Cancelled

### 4.10 Internal Notifications

Release 1.0 includes in-application notification and work-queue behavior for:

- Ownership assignment
- Upcoming appointment
- Confirmation needed
- Conflict detected
- Preparation task at risk
- Customer checked in
- Appointment waiting
- No-show follow-up
- Outcome missing
- Automation failure
- Manager review required

External SMS, email, external calendar delivery, CRM synchronization, and DMS synchronization are deferred integrations. Internal event contracts must be designed so those integrations can be added without changing core appointment semantics.

### 4.11 Reporting

Day-one operational reporting includes:

- Scheduled volume
- Confirmation rate
- Attendance and no-show rates
- On-time start and completion
- Appointment duration and wait time
- Purpose and outcome distribution
- Sales or service conversion where an approved outcome supports it
- Staff workload and utilization
- Vehicle and resource utilization
- Preparation readiness
- Follow-up completion
- Cancellation and rescheduling reasons
- Conflict frequency and manager overrides
- Automation-created appointments, failures, suppressions, and duplicates prevented
- Location-level and organization-level trends

Every KPI must have:

- A written definition
- Included and excluded records
- Timezone and date-boundary rule
- Permission behavior
- Drill-down path to supporting records
- Reconciliation test

## 5. Automation Safety Contract

Automation is deterministic and explainable.

An automatic appointment is scheduled only when all required facts are resolved:

- Purpose
- Owner
- Start and end
- Location
- Required participants
- Required exclusive resources
- Customer or vehicle context when required
- No hard conflict

Otherwise, the system creates a draft or review item rather than guessing. Automation rules are versioned, testable, pausable, and auditable. Detailed rules are defined in `AUTOMATION_RULES_CATALOG.md`.

## 6. Permission Contract

Only a manager or the appointment owner may mutate the appointment.

This includes:

- Editing appointment information
- Confirmation changes
- Check-in and no-show changes
- Execution changes
- Ownership or participant changes
- Resource changes
- Rescheduling
- Cancellation
- Outcome and follow-up changes

Participants can update their linked tasks under task permissions but cannot change the appointment unless they are also the owner or a manager. Detailed policy is defined in `PERMISSION_MATRIX.md`.

## 7. Audit and History

The following are immutable, queryable history events:

- Creation
- Approval
- Ownership change
- Participant or resource change
- Confirmation change
- Check-in
- Execution change
- Rescheduling
- Cancellation
- Completion
- Outcome change
- Conflict detection and resolution
- Override
- Task link creation or removal
- Automation trigger, match, suppression, success, and failure
- Sensitive-field access when required by policy
- Administrative template or rule changes

History records include actor or system identity, timestamp, source, prior and new values where appropriate, reason, and correlation identifier.

## 8. Enterprise Nonfunctional Requirements

### 8.1 Security and Privacy

- Deny-by-default server-side authorization
- Location- and record-aware access
- Protection against cross-location data leakage
- Secure session handling
- Rate limiting for sensitive and high-volume actions
- Input validation and output encoding
- Sensitive-field redaction
- Audit coverage for privileged operations
- Dependency and vulnerability review
- Security testing before production
- Retention and deletion procedures
- No production customer data in seed or test fixtures

### 8.2 Accessibility and Usability

- WCAG 2.2 AA target
- Complete keyboard operation
- Visible focus and meaningful labels
- Non-color conflict and status indicators
- Screen-reader-compatible structure and live updates
- Touch-friendly essential actions
- No required horizontal scrolling for core mobile workflows
- Plain-language errors with recovery guidance

### 8.3 Performance and Scale

Initial production targets:

- 95th-percentile initial command-center load under two seconds at approved expected load
- 95th-percentile internal mutation response under one second, excluding deferred external providers
- Search and filter interactions remain responsive at approved retention volume
- Large schedules use pagination, windowing, or bounded queries
- Reporting queries do not degrade operational scheduling

Capacity assumptions must be measured and approved during E1. Targets cannot be considered passed using unspecified or toy data volumes.

### 8.4 Reliability

- Idempotent create, reschedule, automation, and bulk operations
- Transactional consistency for appointment changes and history
- Retry-safe background work
- Visible dead-letter or failure queue
- Health checks and structured operational logs
- Error monitoring and alerting
- Automated backups
- Tested restoration
- Documented recovery-time and recovery-point objectives
- Safe deployment and rollback procedure

### 8.5 Observability

Operational monitoring covers:

- Request latency and error rate
- Scheduling conflict rate
- Automation success, suppression, and failure
- Background-job lag
- Notification queue health
- Database and query health
- Permission denials and suspicious access patterns
- Audit-event persistence failures
- User-facing stale-data or concurrency conflicts

## 9. Success Measures

Release 1.0 succeeds when:

- Managers can operate the business day from the command center.
- Owners can manage their appointments without separate tracking tools.
- Required preparation work is visible before the appointment.
- Hard conflicts cannot be silently scheduled.
- Warnings and overrides are measurable and explainable.
- Every appointment has an accountable disposition.
- No-show and unresolved outcomes enter an explicit follow-up path.
- Automation does not create duplicates or unexplained appointments.
- Reports reconcile to underlying appointment records.
- Pilot users complete critical workflows without critical usability failures.
- Enterprise quality gates pass before production rollout.

## 10. Explicit External-Integration Deferrals

The following are not required to operate Enterprise Release 1.0:

- SMS delivery
- Email delivery
- Google or Microsoft calendar synchronization
- CRM synchronization
- DMS synchronization
- Public customer self-booking

These are integration phases, not missing foundations. Release 1.0 must expose stable internal events and identifiers to support them later.

## 11. Product Decisions Still Requiring Configuration, Not Scope Approval

The following E1 configuration is currently known:

- Initial appointment administrator: active General Manager role holder
- Initial location: Time Motor Sales — Minneapolis
- Proposed location timezone: `America/Chicago`, pending E1 confirmation
- Initial enterprise templates: defined in `INITIAL_TEMPLATE_CATALOG.md`

The following do not reopen E0 scope but must still be populated during E1:

- Exact Minneapolis address, operating hours, holidays, and closure rules
- Exact resource inventory and capacity
- Named active General Manager user
- Final approval of initial purpose-template defaults
- Final outcome and reason codes
- Expected user, appointment, and retention volumes
- Recovery-time and recovery-point targets
- Supported browser versions
- Retention period for appointment and audit records

## 12. Product Signoff Gate

This specification is ready to become an implementation source of truth when:

- The permission consequences are accepted.
- Initial configuration inputs have accountable owners.
- Lifecycle and conflict rules are reviewed.
- Automation safety rules are reviewed.
- Acceptance scenarios cover all critical workflows.
- The implementation roadmap maps every requirement to a milestone.
