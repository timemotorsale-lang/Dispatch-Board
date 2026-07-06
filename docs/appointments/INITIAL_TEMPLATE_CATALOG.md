# Initial Enterprise Appointment Template Catalog

**Status:** Proposed E1 starting catalog  
**Target location:** Time Motor Sales — Minneapolis  
**Approval owner:** General Manager  
**Implementation status:** Planning only  
**Source approach:** Adapt established enterprise scheduling patterns to dealership operations; do not copy vendor-specific implementation

## 1. Enterprise Template Model

Enterprise scheduling products consistently separate reusable service definitions from individual bookings. This catalog adopts that approach:

```text
Category
  -> Purpose Template
      -> Scheduling Requirements
      -> Eligibility and Resources
      -> Required Data
      -> Linked Task Blueprints
      -> Conflict Policy
      -> Outcomes and Follow-Up
      -> Automation Policy
  -> Versioned Appointment Snapshot
```

Each template contains:

| Section | Required template controls |
| --- | --- |
| Identity | Code, name, description, category, version, effective dates, active state |
| Availability | Location eligibility, operating hours, minimum notice, booking horizon, start interval |
| Time | Default duration, allowed duration range, preparation buffer, cleanup buffer |
| Mode | Scheduled, walk-in, waitlist, group, in-person, phone, or future virtual mode |
| Ownership | Eligible roles, duties, skills, default owner policy, approval policy |
| Participants | Required internal and external participant types, attendee limits |
| Resources | Required and optional resource types, exclusivity, capacity, pools |
| Context | Required customer, vehicle, task, complaint, payment, document, or inventory fields |
| Work | Preparation, dependency, during-appointment, approval, and follow-up task blueprints |
| Confirmation | Whether required and internal reminder timing |
| Lifecycle | Start, completion, blocking, cancellation, rescheduling, and no-show rules |
| Outcomes | Allowed outcome codes and required follow-up dispositions |
| Automation | Eligible triggers, missing-input behavior, idempotency boundary, review behavior |
| Governance | Data sensitivity, audit events, reporting dimensions, template approver |

## 2. Template Inheritance

Templates inherit the enterprise base policy:

- Only manager or appointment owner can mutate the appointment.
- Hard conflicts cannot be overridden.
- Warning overrides are manager-only and require a reason.
- Every meaningful action creates immutable history.
- Exceptions and terminal outcomes require structured reasons.
- Automation never guesses missing owner, time, location, participant, or exclusive resource.
- External communications remain deferred; internal confirmation state remains available.

Location-specific values can narrow template availability or add requirements. They cannot weaken the base permission, audit, or hard-conflict policy.

## 3. Proposed Starting Defaults

These are configuration starting points, not yet final business commitments:

| Setting | Proposed default |
| --- | --- |
| Location | Time Motor Sales — Minneapolis |
| Timezone | `America/Chicago` |
| Appointment start interval | 15 minutes |
| Minimum booking notice | 30 minutes for internal; template may require more |
| Maximum booking horizon | 180 days |
| No-show grace period | 15 minutes |
| Confirmation reminder queue | 24 hours before start when confirmation is required |
| Resource selection | Named resource when known; approved pool when assignment can occur later |
| Missing automation input | Create draft/review item |
| Waitlist promotion | Manager-reviewed |

## 4. Initial Template Summary

| Code | Template | Category | Proposed duration | Buffers | Approval default |
| --- | --- | --- | --- | --- | --- |
| `APT-SALES-CONSULT` | Sales Consultation | Sales | 45 minutes | 10 before / 10 after | Owner can schedule |
| `APT-TEST-DRIVE` | Test Drive | Sales | 45 minutes | 15 before / 15 after | Owner can schedule when vehicle is valid |
| `APT-VEHICLE-DELIVERY` | Vehicle Delivery | Delivery | 60 minutes | 30 before / 15 after | Manager approval recommended |
| `APT-SERVICE-INTAKE` | Service and Repair Intake | Service | 30 minutes | 10 before / 10 after | Owner can schedule |
| `APT-CUSTOMER-ISSUE` | Customer Issue Resolution | Customer Service | 45 minutes | 10 before / 15 after | Manager approval for escalated issues |
| `APT-DOCS-DMV` | Documentation, Title, and DMV | Administration | 30 minutes | 10 before / 10 after | Owner can schedule |
| `APT-COLLECTIONS` | Collections and Payment | Collections | 30 minutes | 10 before / 10 after | Owner can schedule; restricted data |
| `APT-INVENTORY-VENDOR` | Inventory and Vendor | Inventory | 45 minutes | 15 before / 15 after | Owner can schedule |
| `APT-MARKETING-ASSET` | Marketing, Photos, and Listing | Marketing | 60 minutes | 15 before / 15 after | Owner can schedule |
| `APT-INTERNAL-MEETING` | Internal Meeting | Internal | 30 minutes | 5 before / 5 after | Owner can schedule |
| `APT-TASK-MEETING` | Task-Required Meeting | Cross-Workflow | 30 minutes | 10 before / 10 after | Rule-dependent |
| `APT-GENERAL` | General or Other | General | 30 minutes | 10 before / 10 after | Review required until classified |

## 5. Template Specifications

### 5.1 `APT-SALES-CONSULT` — Sales Consultation

**Purpose:** Coordinate an in-person or phone consultation with a prospective or existing customer.

**Required context**

- Customer reference and preferred contact method
- Appointment owner
- Location or approved phone mode
- Sales topic or customer need
- Source task or lead context when applicable

**Eligible ownership**

- Salesperson
- Sales Manager
- General Manager

**Resources**

- Owner required
- Meeting area optional
- Vehicle optional until a specific vehicle is discussed

**Preparation tasks**

- Review customer context
- Confirm relevant vehicle availability when a vehicle is identified
- Prepare requested information

**Outcomes**

- Next appointment scheduled
- Test drive scheduled
- Purchase process started
- Follow-up required
- Not proceeding
- Unable to reach
- Needs manager review

**Automation**

- A sales task marked `requiresMeeting` can create this template.
- Complete time and owner inputs can schedule automatically when no conflict exists.
- Missing time or owner creates a draft.

### 5.2 `APT-TEST-DRIVE` — Test Drive

**Purpose:** Reserve a customer, owner, and vehicle for a controlled test-drive appointment.

**Required context**

- Customer reference
- Vehicle reference
- Owner
- Start and end
- Minneapolis location
- Driver eligibility confirmation field

**Required resources**

- Named vehicle as an exclusive resource
- Eligible owner

**Preparation tasks**

- Vehicle availability confirmation
- Safety/readiness inspection
- Fuel or charge check
- Keys and route readiness
- Customer confirmation

**Hard blocks**

- Vehicle already reserved
- Vehicle unavailable or out of service
- Missing customer or vehicle
- Location closed

**Warnings**

- Readiness task incomplete
- Confirmation pending near start
- Owner overlap

**Outcomes**

- Test drive completed; purchase process started
- Test drive completed; follow-up required
- Test drive completed; not proceeding
- Vehicle changed
- Customer no-show
- Cancelled or rescheduled

**Automation**

- A qualified sales follow-up task can propose a Test Drive.
- Automation schedules only when the customer, owner, vehicle, and explicit time are present.

### 5.3 `APT-VEHICLE-DELIVERY` — Vehicle Delivery

**Purpose:** Coordinate the final vehicle handoff with all required preparation complete.

**Required context**

- Customer
- Sold vehicle
- Owner
- Delivery location
- Deal or delivery reference
- Required documentation status

**Required resources**

- Named vehicle
- Delivery owner
- Delivery area when configured

**Preparation tasks**

- Final inspection
- Detail completed
- Fuel or charge
- Paperwork ready
- Payment or funding confirmation
- Keys, manuals, and promised items

**Blocking policy**

- Vehicle unavailable is a hard block.
- Missing required delivery documentation blocks completion.
- Incomplete final inspection blocks execution unless the General Manager records an approved exception policy.

**Outcomes**

- Delivered and accepted
- Delivery partially completed; follow-up required
- Customer declined delivery
- Rescheduled
- Customer no-show
- Needs manager review

**Automation**

- A sold-vehicle-prep task outcome can create a delivery draft.
- Manager approval is recommended before committing the delivery slot.

### 5.4 `APT-SERVICE-INTAKE` — Service and Repair Intake

**Purpose:** Receive a customer or internal vehicle, document the concern, and begin service work.

**Required context**

- Customer or internal-inventory designation
- Vehicle
- Complaint or requested service
- Owner
- Location
- Arrival method

**Resources**

- Service advisor or eligible owner
- Intake area optional
- Service bay is not required at intake unless the location policy requires it

**Preparation tasks**

- Confirm complaint
- Review prior notes
- Prepare intake checklist
- Identify immediate safety concern

**Generated work**

- Intake and inspection task
- Diagnosis task when required
- Estimate/approval task when required

**Outcomes**

- Vehicle accepted for diagnosis
- Repair approved
- Repair declined
- Parts or further information required
- Vehicle returned
- Needs manager review

**Automation**

- Service-related tasks requiring customer arrival can create this template.
- Missing complaint, vehicle, or arrival time creates a draft.

### 5.5 `APT-CUSTOMER-ISSUE` — Customer Issue Resolution

**Purpose:** Coordinate a structured conversation or inspection for a customer-reported issue.

**Required context**

- Customer
- Issue summary
- Related vehicle or transaction when applicable
- Owner
- Severity
- Prior task or complaint reference

**Eligible ownership**

- General Manager
- Sales Manager
- Service advisor or office role when configured

**Preparation tasks**

- Review issue history
- Gather supporting records
- Identify decision authority
- Prepare proposed resolution path

**Outcomes**

- Resolved
- Resolution offered; customer follow-up pending
- Referred to service
- Referred to documentation
- Escalated
- No agreement

**Automation**

- Escalated customer-issue tasks can create a manager-review appointment.
- High-severity issues default to pending manager approval.

### 5.6 `APT-DOCS-DMV` — Documentation, Title, and DMV

**Purpose:** Complete or review documentation with a customer, vendor, or government-related party.

**Required context**

- Customer or external party
- Vehicle or transaction reference when applicable
- Document-purpose reason
- Owner
- Required document checklist

**Preparation tasks**

- Validate required documents
- Identify missing signatures or information
- Prepare copies and submission details

**Outcomes**

- Documents completed
- Submitted
- Missing information
- Customer signature pending
- Rejected or correction required
- Follow-up appointment required

**Automation**

- Documentation tasks requiring a signature or in-person review can create this appointment.

### 5.7 `APT-COLLECTIONS` — Collections and Payment

**Purpose:** Conduct an authorized payment or collections meeting while minimizing sensitive-data exposure.

**Required context**

- Customer reference
- Account or transaction reference using a non-sensitive identifier
- Reason category
- Owner
- Restricted-note classification when needed

**Security**

- Payment credentials are never stored in appointment fields.
- Shared schedule cards mask collections details.
- Access and export follow restricted-field policy.

**Outcomes**

- Payment completed
- Arrangement established
- Partial resolution
- Follow-up required
- Unable to resolve
- Manager review

**Automation**

- Collections tasks can create a draft appointment.
- Automatic scheduling requires an explicit authorized time and owner.

### 5.8 `APT-INVENTORY-VENDOR` — Inventory and Vendor

**Purpose:** Coordinate vehicle inspection, pickup, drop-off, parts, vendor, or inventory-related activity.

**Required context**

- Vendor or external participant
- Vehicle or inventory reference
- Activity reason
- Owner
- Required resource or location

**Resources**

- Vehicle when applicable
- Service bay, staging area, or equipment when required
- Vendor participant

**Outcomes**

- Work accepted
- Vehicle or item received
- Vehicle or item released
- Vendor work completed
- Inspection failed
- Follow-up required

**Automation**

- Inventory or vendor tasks with an external handoff can create this template.

### 5.9 `APT-MARKETING-ASSET` — Marketing, Photos, and Listing

**Purpose:** Reserve vehicles, staff, locations, and equipment for photography, video, listing, or marketing work.

**Required context**

- Vehicle or campaign reference
- Requested deliverable
- Owner
- Location

**Resources**

- Vehicle when applicable
- Photography area
- Camera or equipment when configured
- Marketing staff

**Preparation tasks**

- Vehicle clean and staged
- Required vehicle information available
- Shot or content list ready

**Outcomes**

- Assets captured
- Listing ready
- Retake required
- Vehicle unavailable
- Information missing
- Follow-up required

**Automation**

- Vehicle-ready-for-photos or listing tasks can create this appointment.

### 5.10 `APT-INTERNAL-MEETING` — Internal Meeting

**Purpose:** Coordinate an internal operational discussion linked to one or more tasks when appropriate.

**Required context**

- Owner
- Internal participants
- Agenda or purpose
- Location or internal phone mode

**Resources**

- Participants
- Room optional

**Outcomes**

- Decision recorded
- Action items created
- Follow-up meeting required
- Escalated
- Cancelled

**Automation**

- Blocked, review, or escalation tasks can propose an internal meeting when a configured rule matches.

### 5.11 `APT-TASK-MEETING` — Task-Required Meeting

**Purpose:** Provide a universal enterprise template when any task requires meeting a customer, vendor, employee, or other person.

**Required context**

- Source task
- Meeting reason
- Owner
- Participant type
- Explicit start and end for automatic scheduling

**Inheritance**

- The source task template can override duration, buffers, required participants, resources, outcomes, and approval.
- If a more specific appointment purpose is known, the system should recommend or require that purpose instead.

**Outcomes**

- Meeting completed; task can continue
- Decision required
- Additional work created
- Follow-up meeting required
- Participant no-show
- Cancelled or rescheduled

**Automation**

- This is the default target for a task marked `requiresMeeting` when no specific appointment purpose is configured.
- Missing scheduling facts create a draft review item.
- One active appointment per source task and rule version is the default idempotency boundary.

### 5.12 `APT-GENERAL` — General or Other

**Purpose:** Capture legitimate appointments that do not yet fit an approved purpose without losing governance.

**Required context**

- Owner
- Detailed reason
- Participant
- Location
- Start and end

**Policy**

- Requires review before scheduling until a General Manager approves the classification.
- Repeated use reasons are reviewed for promotion into a dedicated template.

**Outcomes**

- Completed
- Follow-up required
- Reclassified
- Cancelled
- No-show

## 6. Template-to-Task Link Blueprint

Every task blueprint attached to a template defines:

| Field | Example |
| --- | --- |
| Link type | Preparation, dependency, during appointment, approval, follow-up |
| Creation timing | On draft, approval, scheduling, check-in, outcome, or completion |
| Owner selection | Appointment owner, named role, source-task assignee, or manager review |
| Due rule | Relative to appointment start/end or explicit |
| Blocking effect | None, warning, blocks start, blocks finish, or blocks completion |
| Reschedule behavior | Propose due-time change, retain, or review |
| Cancellation behavior | Retain, cancel rule-owned task, or review |
| Completion requirements | Checklist, update fields, approval, or status |
| Idempotency identity | Appointment, template version, and blueprint code |

## 7. Availability Methods

Each template selects one method:

| Method | Appropriate use |
| --- | --- |
| Named exclusive resource | Specific vehicle, bay, room, equipment, or person must be reserved |
| Fixed appointments per slot | Front-desk or intake capacity is known by slot |
| Capacity pool | Interchangeable resources can be assigned later |
| Rule-calculated availability | Eligibility depends on skills, roles, task context, or multiple resources |

The authoritative scheduling operation always reevaluates the selected method immediately before commitment.

## 8. Template Approval Checklist

The General Manager approves each template only after confirming:

- Business purpose and owner eligibility
- Location eligibility
- Duration, buffers, start interval, minimum notice, and horizon
- Required participants and resources
- Required customer and vehicle fields
- Preparation and follow-up tasks
- Hard blocks, warnings, and manager overrides
- Confirmation requirement
- Allowed outcomes and reasons
- No-show, cancellation, and rescheduling behavior
- Automation triggers and missing-input behavior
- Sensitive-data classification
- Reporting dimensions
- Simulation examples

## 9. Enterprise Pattern References

The design was informed by current official product documentation:

- [ServiceNow Appointment Booking](https://www.servicenow.com/docs/r/employee-service-management/employee-experience-foundation/appointment-booking.html) — categories, reasons, locations, channels, and workspace-based appointment management.
- [ServiceNow Appointment Booking application configuration](https://www.servicenow.com/docs/r/field-service-management/field-service-scheduling/appt-booking-create-app-config.html) — task-driven configuration, availability methods, capacity, manual/automatic acceptance, and day/week views.
- [Salesforce Scheduler work types](https://help.salesforce.com/s/articleView?id=ls_create_work_types.htm&language=en_US) — reusable work-type templates, operating hours, duration, start intervals, buffers, horizons, categories, group limits, skills, and territory mapping.
- [Salesforce Scheduler standard flow templates](https://help.salesforce.com/s/articleView?id=sf.ls_provided_flows.htm&language=en_US&type=5) — booking, attendee management, and waitlist workflow patterns.
- [Microsoft Dynamics 365 Universal Resource Scheduling](https://learn.microsoft.com/en-us/dynamics365/common-scheduler/schedule-anything-with-universal-resource-scheduling) — separation of resource requirement from booking and schedule-board operation.
- [Microsoft Dynamics 365 resource pools](https://learn.microsoft.com/en-us/dynamics365/common-scheduler/resource-pools) — capacity pools and later assignment of a specific resource.

These references support pattern analysis only. Time Motor Sales retains its own terminology, domain model, permission rules, lifecycle, templates, and implementation.

