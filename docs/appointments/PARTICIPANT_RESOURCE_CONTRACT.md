# Participant, Customer, Vehicle, and Resource Contract

**Work package:** EAPT-005  
**Status:** Implemented foundation  
**Effective date:** 2026-07-05

## Purpose

This contract defines who and what can participate in an appointment, how minimum customer and vehicle identities are retained, how location eligibility is granted, and how resource requirements remain separate from concrete capacity reservations.

The implementation does not create a general-purpose CRM or invent physical dealership inventory. It establishes governed internal references and administrator-configurable resource types.

## Location Eligibility

`UserLocationAccess` is the authoritative location-scoped grant for:

- Schedule visibility
- Appointment participation
- Appointment ownership
- Appointment management
- Limited customer and vehicle detail

An appointment role alone does not grant cross-location authority. Manager actions require both manager identity and appointment-management access for the location. Ownership requires owner eligibility and participation eligibility.

The non-sensitive development seed grants active development users Minneapolis visibility, participation, and ownership eligibility. Only the General Manager development role receives location-management and limited-data grants. Production assignments remain administrator-managed configuration.

## Customer Identity

The Customer record stores only the minimum internal appointment identity:

- Organization-scoped customer number
- Display name
- Optional telephone and email
- Lifecycle status
- Optional future external reference
- Opaque duplicate-detection key
- Merge target
- Optional retention date

Customer merges must identify a different surviving customer in the same organization. Payment credentials and unrelated CRM data are prohibited.

## Vehicle Identity

The Vehicle record supports:

- Organization-scoped vehicle number
- Optional VIN and stock number
- Year, make, model, color, and license plate
- Lifecycle status
- Optional future external reference
- Opaque duplicate-detection key
- Optional retention date

VIN values are normalized and validated. A vehicle may be linked to multiple appointments, while each appointment link retains its own historical vehicle snapshot and role.

## Participant Cardinality

Appointment participants are one of:

- `INTERNAL_USER` — exactly one internal user reference
- `CUSTOMER` — exactly one customer reference
- `EXTERNAL` — no internal user or customer reference

Every participant retains:

- Role code
- Display-name snapshot
- Optional restricted contact snapshot
- Required/optional designation
- Primary designation
- Attendance requirement

The database allows at most one primary participant per participant type for an appointment. Participants do not receive mutation authority merely by being attached to an appointment.

## Appointment Vehicles

An appointment can reference multiple vehicles with purpose-specific role codes such as subject vehicle, test-drive vehicle, delivery vehicle, service vehicle, or trade-in.

Every link retains a vehicle snapshot. Only one vehicle may be marked primary for the appointment. A context link does not itself reserve the vehicle; exclusive reservation remains an explicit resource commitment.

## Resource Types and Resources

The initial configurable resource-type catalog contains:

- Staff
- Vehicle
- Service bay
- Room
- Equipment
- Pool
- Location capacity
- Other configured resource

Each type defines:

- Resource kind
- Exclusive or capacity mode
- Default capacity
- Conflict policy
- Visibility classification
- Optional validated attribute schema

Each concrete resource is location-scoped and defines its own effective dates, status, capacity mode, capacity, conflict policy, optional staff or vehicle identity, and administrator-defined attributes.

Exclusive resources always have capacity `1`. Staff defaults to capacity behavior with warning conflicts; vehicles, bays, rooms, and equipment default to hard-blocking exclusivity.

## Requirements and Reservations

`AppointmentResourceRequirement` describes what is needed:

- Resource type
- Required capacity
- Required or optional behavior
- Assignment timing
- Hard-block behavior
- Required characteristics

`AppointmentResourceReservation` describes what has actually been selected or committed:

- Concrete resource or pool
- Time window
- Capacity units
- Preparation and cleanup buffers
- Reservation lifecycle

This separation permits a pool or requirement to exist before a named resource is assigned. Optional requirements cannot hard-block scheduling.

## Pools and Availability

Resource pools use effective-dated memberships and positive capacity contributions. A resource cannot be a member of itself.

Resources support:

- Effective-dated weekly operating windows
- Capacity overrides
- Absence, outage, maintenance, capacity-reduction, and other unavailability windows
- Documented reasons and actors for unavailability

The authoritative availability and conflict engine is implemented in E2. EAPT-005 provides the normalized data and database invariants it will consume.

## Privacy Classification

| Class | Examples | Schedule behavior |
| --- | --- | --- |
| Operational | Customer number, vehicle number, stock number, year/make/model, public resource label | May appear when schedule access permits |
| Limited | Customer name, telephone, email, VIN, license plate | Requires an explicit limited-data grant |
| Restricted | Duplicate keys, contact snapshots, sensitive notes | Never included in general schedule summaries |

Schedule-summary projections mask customer names and remove telephone, email, VIN, and license plate. Search and detail services must apply organization, location, and field-level filters before returning results.

## Implemented Evidence

- Additive Prisma participant, customer, vehicle, location-access, and resource models
- Additive SQL migration with cardinality, merge, identity, capacity, window, and reservation constraints
- Server-side normalization and invariant validation
- Location-scoped appointment authorization policies
- Privacy classification and safe schedule-summary projections
- Approved resource-type seed definitions
- Focused unit and schema-constraint tests

## Next Boundary

EAPT-006 adds versioned appointment purposes, templates, outcomes, reasons, and the initial administrator-approved enterprise template catalog.
