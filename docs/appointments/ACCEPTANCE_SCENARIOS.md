# Enterprise Appointment Acceptance Scenario Catalog

**Status:** Planned acceptance source of truth  
**Target:** Enterprise Release 1.0  
**Use:** Product signoff, automated test planning, security review, accessibility review, pilot qualification, and release evidence

## 1. Scenario Standard

Each implemented scenario must retain:

- Scenario ID
- Requirement and milestone link
- Preconditions and approved test identity
- Production-shaped, non-sensitive test data
- Action
- Expected visible result
- Expected persisted state
- Expected history and events
- Expected permission and privacy behavior
- Automated test reference where practical
- Reviewer and evidence

Priority:

- **Critical:** Release cannot launch if the scenario fails.
- **High:** Must pass before release unless the product owner and relevant control owner accept a documented exception.

## 2. Identity, Permissions, and Privacy

| ID | Priority | Scenario | Expected result |
| --- | --- | --- | --- |
| ACC-001 | Critical | Manager opens an appointment in an authorized location | Full manager-authorized view and actions are available |
| ACC-002 | Critical | Manager attempts to access an unauthorized location | Record and search results are denied without leaking existence |
| ACC-003 | Critical | Owner opens and updates their appointment | Authorized update succeeds and creates history |
| ACC-004 | Critical | Participant attempts to change the appointment | Mutation is denied with no partial write |
| ACC-005 | Critical | Viewer uses a direct URL to restricted appointment detail | Access is denied consistently |
| ACC-006 | Critical | Appointment administrator attempts to mutate a live appointment without being manager or owner | Mutation is denied |
| ACC-007 | Critical | Owner attempts to use a manager warning override | Override is denied |
| ACC-008 | Critical | Owner requests ownership transfer | Request is recorded; ownership does not change until manager approval |
| ACC-009 | Critical | Search runs across customer, vehicle, and appointment data | Results contain only authorized locations and fields |
| ACC-010 | Critical | Restricted customer data appears in schedule summary, activity, logs, URL, or analytics label | Sensitive values are masked or absent |
| ACC-011 | High | Participant views an appointment linked to their task | Permitted context is visible; mutation controls are absent |
| ACC-012 | Critical | Bulk operation includes a record outside actor scope | Unauthorized record is excluded or operation fails according to declared atomicity; no unauthorized mutation occurs |
| ACC-013 | Critical | User permissions change while appointment page is open | Next server action applies current permissions and denies stale authority |
| ACC-014 | High | Privileged export is requested | Permission is enforced and export action is audited |

## 3. Appointment Creation and Configuration

| ID | Priority | Scenario | Expected result |
| --- | --- | --- | --- |
| ACC-015 | Critical | Manager creates a complete appointment | Appointment schedules, resources reserve, and history records atomically |
| ACC-016 | Critical | Owner creates an appointment under granted creation policy | Appointment schedules only when owner, location, and required facts are valid |
| ACC-017 | Critical | Required purpose field is missing | Scheduling is blocked with field-specific guidance |
| ACC-018 | Critical | End time is not after start time | Scheduling is blocked |
| ACC-019 | Critical | Purpose requires customer or vehicle context and it is absent | Scheduling is blocked |
| ACC-020 | High | User creates an appointment from a supported purpose template | Duration, buffers, fields, outcomes, and linked-work proposal match the template version |
| ACC-021 | Critical | Administrator changes a purpose template | Existing appointment snapshots remain unchanged; new appointments use new version |
| ACC-022 | Critical | Inactive template is used for a new appointment | Creation is rejected or requires selection of an active version |
| ACC-023 | High | Administrator imports configuration containing invalid references | Import fails safely with row-level or item-level errors and no partial activation |
| ACC-024 | Critical | Automation rule is activated without required simulation evidence | Activation is denied |
| ACC-025 | Critical | Rule is paused | New triggers create no automated effect; prior history remains intact |

## 4. Time, Availability, Resources, and Conflicts

| ID | Priority | Scenario | Expected result |
| --- | --- | --- | --- |
| ACC-026 | Critical | Appointment is scheduled while location is closed | Hard block prevents scheduling |
| ACC-027 | Critical | Exclusive vehicle, bay, room, or equipment is already committed | Hard block prevents overbooking |
| ACC-028 | Critical | Two users concurrently attempt to reserve the final capacity | Exactly one commitment succeeds |
| ACC-029 | Critical | Required resource is unavailable or out of service | Hard block prevents scheduling |
| ACC-030 | High | Staff member has a non-exclusive overlap | Warning appears with supporting context |
| ACC-031 | Critical | Owner attempts to accept a manager-only warning | Commitment is denied |
| ACC-032 | Critical | Manager overrides a warning without a reason | Override is denied |
| ACC-033 | Critical | Manager overrides an eligible warning with a reason | Appointment commits and override is auditable |
| ACC-034 | Critical | Manager attempts to override a hard block | Override is denied |
| ACC-035 | High | Preparation or cleanup buffer overlaps | Approved warning/block policy is applied |
| ACC-036 | Critical | Daylight-saving transition affects appointment | Stored instant and displayed local time remain correct |
| ACC-037 | Critical | Recurring series crosses daylight-saving transition | Each occurrence preserves approved local-time behavior |
| ACC-038 | High | Recurrence contains conflict-free and conflicting occurrences | Preview identifies each affected occurrence before commitment |
| ACC-039 | Critical | User reschedules using stale appointment version | Mutation fails and current changes are presented for reconciliation |
| ACC-040 | High | Availability search proposes a slot | Committing unchanged inputs produces the same valid result |
| ACC-041 | Critical | Closure or resource outage affects future appointments | Affected records enter review; they are not silently moved |
| ACC-042 | Critical | Bulk reschedule is retried after ambiguous client response | Idempotency prevents duplicate effects |

## 5. Lifecycle, Reasons, Outcomes, and Follow-Up

| ID | Priority | Scenario | Expected result |
| --- | --- | --- | --- |
| ACC-043 | Critical | Draft with complete information is scheduled | Valid transition succeeds and reserves capacity |
| ACC-044 | Critical | Pending appointment is approved by manager | Appointment becomes scheduled after fresh conflict evaluation |
| ACC-045 | Critical | Owner attempts manager-required approval | Transition is denied |
| ACC-046 | Critical | Scheduled appointment is cancelled without reason | Cancellation is denied |
| ACC-047 | Critical | Scheduled appointment is cancelled with valid reason | Cancellation succeeds, resources release, and history persists |
| ACC-048 | Critical | Appointment is rescheduled | Prior and new times, reason, conflict result, and task effects are retained |
| ACC-049 | Critical | Customer checks in through authorized manager or owner action | Attendance and timestamp update atomically |
| ACC-050 | Critical | Participant attempts check-in | Mutation is denied under approved owner/manager rule |
| ACC-051 | Critical | No-show is recorded without disposition | Transition is denied |
| ACC-052 | Critical | No-show creates required follow-up | Follow-up task or replacement draft links to original appointment |
| ACC-053 | Critical | Execution moves to waiting without reason | Transition is denied |
| ACC-054 | High | Waiting appointment resumes | Resume event retains waiting reason and duration |
| ACC-055 | Critical | Completion is attempted without outcome | Completion is denied |
| ACC-056 | Critical | Completion outcome requires follow-up | Appointment cannot close without a valid follow-up disposition |
| ACC-057 | Critical | Completed outcome is corrected | Manager reason and prior/new values are retained |
| ACC-058 | Critical | Committed appointment is deleted | Destructive deletion is unavailable; cancellation is required |
| ACC-059 | High | Declined confirmation remains scheduled | System requires cancel, reschedule, or manager-retained disposition |
| ACC-060 | Critical | Invalid cross-dimension transition is attempted | Server rejects it without partial state or history inconsistency |

## 6. Task Linking and Appointment Automation

| ID | Priority | Scenario | Expected result |
| --- | --- | --- | --- |
| ACC-061 | Critical | Manager creates appointment from any task | Relevant task context prefills and bidirectional link is created |
| ACC-062 | Critical | Permitted owner creates appointment from their task | Owner and task permissions are both enforced |
| ACC-063 | Critical | Participant who is not owner attempts appointment creation through a task | Creation is denied unless separate creation policy makes them the owner |
| ACC-064 | Critical | Task rule has complete deterministic scheduling inputs | One scheduled appointment is created and linked |
| ACC-065 | Critical | Task rule lacks owner, time, location, or required resource | Draft/review item is created; no value is guessed |
| ACC-066 | Critical | Same task event is delivered repeatedly | Only one idempotent appointment effect exists |
| ACC-067 | Critical | Automation encounters a hard conflict | Appointment is not scheduled; review/failure record explains why |
| ACC-068 | Critical | Automation encounters an overridable warning | Automation does not override it; review is required |
| ACC-069 | Critical | Appointment template creates preparation tasks | Tasks use the correct blueprint snapshot, link type, owner, and due rule |
| ACC-070 | Critical | Appointment is rescheduled with linked tasks | Rule-owned due-time proposals are previewed; manual task edits are not silently overwritten |
| ACC-071 | Critical | Appointment is cancelled | Linked tasks are retained, cancelled, or reviewed according to explicit blueprint policy; none are deleted silently |
| ACC-072 | Critical | Appointment completes while linked task remains incomplete | Task is not silently completed |
| ACC-073 | Critical | Required preparation task is incomplete | Approved warning or blocking policy is applied |
| ACC-074 | High | Automation rule version changes | Existing execution history references original version |
| ACC-075 | Critical | Automation fails after bounded retry | Failure appears in queue with redacted error and recovery action |
| ACC-076 | Critical | Manager replays failed automation | Reason is required and replay cannot duplicate prior effect |
| ACC-077 | High | Waitlist capacity becomes available | Eligible candidates are surfaced for review and not silently scheduled |

## 7. Command Center and Responsive Experience

| ID | Priority | Scenario | Expected result |
| --- | --- | --- | --- |
| ACC-078 | Critical | Manager opens Day view | Authorized appointments, capacity, conflicts, and current time context are readable |
| ACC-079 | High | Manager switches Day, Week, Month, Agenda, Staff, Vehicle, Resource, and Location views | Selection and filters persist appropriately |
| ACC-080 | Critical | KPI count is selected | Filtered records reconcile exactly to the displayed count |
| ACC-081 | High | Saved shared view is opened by unauthorized location user | View definition cannot expose unauthorized records |
| ACC-082 | Critical | Appointment detail opens from any supported view | Selected context and return path are preserved |
| ACC-083 | Critical | Owner performs core lifecycle on supported phone | Actions, validation, reasons, and confirmation remain usable without horizontal overflow |
| ACC-084 | Critical | Participant opens mobile appointment detail | Read-only status is clear and mutation actions are absent |
| ACC-085 | Critical | Network becomes stale during edit | Interface does not claim success and protects safe unsaved input |
| ACC-086 | High | Filters return no records | Filtered-empty state explains how to recover |
| ACC-087 | Critical | One read dependency fails while other data loads | Partial-failure state is honest and unsafe actions are disabled |
| ACC-088 | Critical | Keyboard-only user completes appointment workflow | Focus, labels, dialogs, errors, and actions satisfy WCAG 2.2 AA evidence |
| ACC-089 | Critical | Screen-reader user encounters status or conflict | Meaning is conveyed without relying only on color or visual position |

## 8. Notifications, Reporting, and Audit

| ID | Priority | Scenario | Expected result |
| --- | --- | --- | --- |
| ACC-090 | High | Ownership, check-in, conflict, no-show, follow-up, or automation failure occurs | Correct internal notification is created once |
| ACC-091 | Critical | Notification event is retried | Duplicate notification is prevented |
| ACC-092 | Critical | Notification contains sensitive customer data | Restricted content is omitted or masked |
| ACC-093 | Critical | Outbound integration contract receives test event | Stable IDs, consent hooks, version, idempotency, and redaction are present |
| ACC-094 | Critical | Scheduled-volume report is reconciled | KPI matches included source appointments under documented timezone rule |
| ACC-095 | Critical | No-show or confirmation report is reconciled | KPI matches underlying state history and exclusions |
| ACC-096 | High | Resource-utilization report is opened | Capacity denominator and exclusions are visible |
| ACC-097 | Critical | Unauthorized export or cross-location report is requested | Access is denied without leakage |
| ACC-098 | Critical | Appointment history is inspected | Actor, time, source, prior/new values, reason, and correlation are complete where required |
| ACC-099 | Critical | Audit or activity persistence fails during mutation | Mutation fails or uses an approved recoverable transactional design; silent unaudited success is prohibited |
| ACC-100 | High | Automation duplicate is prevented | Prevention appears in automation reporting and supporting history |

## 9. Reliability, Recovery, and Operations

| ID | Priority | Scenario | Expected result |
| --- | --- | --- | --- |
| ACC-101 | Critical | Operational load test runs at approved volume | Latency and error targets pass with approved headroom |
| ACC-102 | Critical | Concurrent create, reschedule, and bulk operations run | Capacity and appointment versions remain consistent |
| ACC-103 | Critical | Background worker restarts during automation | Retry is safe and no duplicate effect is created |
| ACC-104 | Critical | Database or dependency failure occurs mid-command | No partial appointment, reservation, task link, or history state remains |
| ACC-105 | Critical | Dead-letter item is replayed | Authority, reason, idempotency, result, and audit are enforced |
| ACC-106 | Critical | Backup is restored into approved recovery environment | Appointment, configuration, links, history, and reporting data reconcile |
| ACC-107 | Critical | Deployment migration fails | Approved rollback or roll-forward procedure restores safe operation |
| ACC-108 | Critical | Monitoring exercise triggers scheduling or automation failure | Alert is actionable and reaches the named owner |
| ACC-109 | High | Retention or deletion procedure runs | Approved data is removed or archived while required audit integrity is preserved |
| ACC-110 | Critical | Security test probes cross-location IDs, restricted fields, and mutation endpoints | No unauthorized access or mutation succeeds |

## 10. Pilot and Release

| ID | Priority | Scenario | Expected result |
| --- | --- | --- | --- |
| ACC-111 | Critical | Production configuration is reviewed before pilot | Locations, hours, resources, purposes, outcomes, permissions, and rules have named approval |
| ACC-112 | Critical | Pilot users complete role-based training | Completion and support paths are recorded |
| ACC-113 | Critical | Pilot cutover rehearsal is performed | Migration/opening balance, monitoring, support, and rollback pass |
| ACC-114 | Critical | Pilot operates through representative business days | Success metrics, defects, conflicts, overrides, and automation are reviewed |
| ACC-115 | Critical | Go/no-go review occurs | Required product, security, workflow, accessibility, data, quality, and operations signoffs exist |
| ACC-116 | Critical | Stabilization exit is proposed | Support metrics are stable, critical defects are closed, and normal ownership is accepted |

## 11. Traceability and Signoff

Before E9 release qualification:

- Every critical product requirement maps to at least one acceptance scenario.
- Every critical scenario maps to automated evidence where technically practical.
- Manual evidence identifies reviewer, environment, date, and result.
- Failed scenarios create tracked defects with severity and milestone impact.
- Deferred external integrations are not falsely marked as passing; only their internal contracts are tested.
- Accepted exceptions identify owner, rationale, exposure, compensating control, and expiration or review date.

Enterprise Release 1.0 cannot pass with a failed Critical scenario.

