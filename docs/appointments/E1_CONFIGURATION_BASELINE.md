# E1 Appointment Configuration Baseline

**Status:** Partially populated from currently available business information  
**Baseline date:** 2026-07-05  
**Purpose:** Record known production configuration and isolate inputs that still require confirmation  
**Implementation status:** Location and operating-hours foundation implemented; administration UI remains planned

## 1. Approved Known Configuration

### 1.1 Organization

| Field | Value | Status |
| --- | --- | --- |
| Organization name | Time Motor Sales | Known |
| Primary operating area | Minneapolis, Minnesota, United States | Known |
| Appointment operating model | Internal enterprise Appointment Command Center | Approved |
| External CRM/DMS source | None required for Release 1.0 | Approved |
| External SMS/email/calendar delivery | Deferred integration | Approved |

### 1.2 Initial Location

| Field | Value | Status |
| --- | --- | --- |
| Location code | `TMS-MSP-01` | Recommended stable code |
| Display name | Time Motor Sales — Minneapolis | Recommended |
| City | Minneapolis | Known |
| State | Minnesota | Known |
| Country | United States | Known |
| IANA timezone | `America/Chicago` | Approved |
| Street address | 1101 E. Lake Street | Supplied 2026-07-05 |
| Postal code | 55407 | Supplied 2026-07-05 |
| Main telephone | +1 (612) 724-3631 | Supplied 2026-07-05; stored canonically as `+16127243631` |
| Standard operating hours | Monday-Friday, 9:00 AM-6:00 PM | Supplied 2026-07-05 |
| Weekend operating hours | Closed Saturday and Sunday | Derived from the supplied Monday-Friday schedule |
| Holiday calendar | Not yet supplied | Required before scheduling can be activated |
| Closure authority | General Manager | Recommended |
| Default appointment language | English | Recommended; confirm during E1 |

The supplied location values are initial configuration, not hard-coded scheduling behavior. The location remains in draft scheduling status until closures, eligible owners, templates, resources, conflict rules, and the remaining production gates are approved.

### 1.3 Initial Appointment Administrator

| Field | Value | Status |
| --- | --- | --- |
| Administrator assignment | Active user holding the General Manager role | Approved |
| Configuration scope | Organization-wide and Minneapolis location | Recommended |
| Live appointment authority | Manager authority under the approved Permission Matrix | Approved |
| Template administration | Allow | Approved by administrator designation |
| Resource administration | Allow | Approved by administrator designation |
| Automation rule administration | Allow | Approved by administrator designation |
| Automation activation | Allow with simulation evidence and explicit confirmation | Approved enterprise control |
| Reporting access | Organization and location reporting | Approved |
| Sensitive-data access | Subject to separately granted sensitive-field capability | Enterprise safeguard |
| Audit administration | View operational audit; security-audit access remains a separate capability | Enterprise safeguard |

The administrator assignment is role-based rather than tied to a hard-coded person. A General Manager role change must update effective access without rewriting historical actor records.

### 1.4 Appointment Administration Surface

The implementation will include `Admin -> Appointment Settings` so approved administrators can change configuration without code. Planned settings areas include:

- Location identity, address, telephone, timezone, and operating hours
- Holidays, planned closures, and emergency closures
- Purpose templates, categories, colors, and administrator-defined tags
- Owners, participants, resources, capacity, and availability
- Conflict policies and warning-override rules
- Automation rules and simulation
- Reason, outcome, and follow-up catalogs
- Configuration draft, activation, effective dates, and change history

Administrator-defined tags may extend categorization and reporting, but governed lifecycle states remain fixed system states so permissions, automation, and reporting remain reliable.

## 2. Initial Resource-Type Baseline

The following resource types are approved for Enterprise Release 1.0 and are now seeded as configurable type definitions. Actual physical resource records and capacities remain E1 configuration work.

| Resource type | Scheduling behavior | Initial availability source |
| --- | --- | --- |
| Staff member | Named resource; may have skills, roles, work hours, absences, and capacity | User profile plus work schedule |
| Customer/external participant | Participant, not an internal capacity resource by default | Appointment context |
| Vehicle | Usually exclusive named resource | Vehicle appointment resource record |
| Service bay | Exclusive or capacity-controlled resource | Location resource configuration |
| Room | Exclusive or capacity-controlled resource | Location resource configuration |
| Equipment | Exclusive or quantity/capacity-controlled resource | Location resource configuration |
| Resource pool | Capacity container allowing specific assignment later | Pool configuration and membership |
| Location | Operating boundary with hours, closures, timezone, and policies | Location configuration |
| Other configured resource | Administrator-defined with explicit exclusivity and capacity | Resource-type configuration |

## 3. Enterprise Configuration Hierarchy

Appointment behavior resolves in this order:

```text
Organization policy
  -> Location policy
  -> Appointment category
  -> Appointment purpose template
  -> Active template version
  -> Resource and owner constraints
  -> Appointment-specific authorized values
```

An appointment-specific value cannot weaken a hard organizational rule. A location override can narrow availability or requirements but cannot remove required audit, permission, or reason controls.

## 4. Enterprise Pattern Decisions

The initial configuration adopts these established enterprise patterns:

| Pattern | Appointment Board decision |
| --- | --- |
| Category and reason mapped to location | Appointment purposes and reasons can be activated by location |
| Reusable work/service templates | Purpose templates define duration, buffers, requirements, tasks, outcomes, and policies |
| Task/work-order-driven appointment creation | Any task can create an appointment; active rules can create one automatically |
| Requirement separate from booking | An unscheduled or incomplete requirement can exist before a capacity-committing appointment |
| Capacity methods | Named exclusive resource, fixed slot capacity, pool capacity, and rule-calculated availability are supported |
| Manual versus automatic acceptance | Templates declare draft/review, manager approval, or deterministic auto-scheduling behavior |
| Operating hours and territories/locations | Availability is location- and timezone-specific |
| Resource skills and eligibility | Templates can require role, duty, skill, or resource characteristic |
| Buffers and availability horizon | Templates define preparation, cleanup, minimum notice, and maximum booking horizon |
| Waitlist and drop-in support | Templates declare scheduled, walk-in, waitlist, or group eligibility |
| Historical template version | Every appointment retains the template version used when scheduled |

## 5. Configuration Required Before E1 Gate

The following inputs remain open:

### 5.1 Location Operations

- Holiday schedule
- Known annual closures
- Who can approve an emergency closure
- Whether appointments can be scheduled outside public business hours

### 5.2 Staff and Skills

- Active General Manager user record
- Initial staff users eligible to own appointments
- Role, duty, or skill tags for each eligible staff member
- Normal working schedules
- Absence-entry process
- Maximum concurrent appointment capacity by role or person

### 5.3 Physical Resources

- Vehicles eligible for appointment reservation
- Service-bay count and identifiers
- Rooms and capacities
- Shared equipment requiring reservations
- Resource pools
- Out-of-service and maintenance process

### 5.4 Appointment Policy

- Default grace period before no-show
- Default minimum booking notice
- Maximum booking horizon
- Standard start-time interval
- Final default durations and buffers for each template
- Which templates require manager approval
- Which preparation tasks hard-block execution
- Which warnings can be overridden

### 5.5 Enterprise Operations

- Expected daily and peak appointment volume
- Number of concurrent users
- Appointment and audit retention period
- Recovery-time objective
- Recovery-point objective
- Supported browsers and minimum device sizes
- Pilot users and pilot success thresholds

## 6. Activation Controls

The Minneapolis location cannot be marked production-schedulable until:

- Address and timezone are confirmed.
- Operating hours and closures are configured.
- At least one General Manager administrator is active.
- At least one appointment owner is eligible.
- Initial purpose templates are active.
- Required resources and capacities are configured.
- Conflict rules are tested.
- No-show, cancellation, rescheduling, outcome, and follow-up reasons are active.
- Automation rules have passed simulation.
- Permission tests pass.
- Backup, monitoring, and rollback procedures are ready for the release stage.

## 7. Baseline Change Control

Changes to the following require General Manager approval and audit history:

- Location activation
- Operating hours and closures
- Appointment administrator assignment
- Template activation or retirement
- Automation activation or pause
- Resource capacity
- Hard-block policy
- Reason and outcome catalog activation

Routine resource unavailability and staff absences can follow delegated operating procedures, but the identity, effective window, actor, and reason remain auditable.
