# Resource Availability Service Contract

**Work package:** EAPT-014  
**Status:** Implemented foundation  
**Scope:** Resource types, resources, capacity, availability, reservations, and outage evaluation

## Purpose

The resource availability service is the E2 boundary that evaluates whether a concrete schedulable resource has enough usable capacity for a proposed appointment window.

It builds on:

- EAPT-005 resource, reservation, operating-window, and unavailability models
- EAPT-013 location time and timezone service

This service does not yet search for slots across many resources and does not commit reservations. It evaluates one resource candidate deterministically so later conflict, availability search, and atomic reservation services can reuse the same rules.

## Implemented Capabilities

The service evaluates:

- Resource active/inactive/out-of-service status
- Resource effective date range
- Resource operating windows by location-local business day
- Resource operating-window capacity overrides
- Exclusive resource capacity
- Capacity resource availability
- Held and committed reservation overlap
- Reservation preparation and cleanup buffers
- Capacity-reduction windows
- Full-capacity absence, outage, maintenance, and other unavailability windows
- Hard-block versus warning severity from the resource conflict policy
- Same-location-local-day candidate boundaries

## Capacity Rules

Capacity is calculated as:

```text
available capacity =
  effective window capacity
  - overlapping unavailable capacity
  - overlapping held/committed reservation capacity
```

The candidate is available only when available capacity is greater than or equal to the requested capacity.

Reservation statuses that consume capacity:

- `HELD`
- `COMMITTED`

Reservation statuses that do not consume capacity:

- `PROPOSED`
- `RELEASED`
- `CANCELLED`

## Unavailability Rules

Full-capacity unavailability:

- `ABSENCE`
- `OUTAGE`
- `MAINTENANCE`
- `OTHER`

Partial-capacity unavailability:

- `CAPACITY_REDUCTION`

Capacity reductions subtract the configured reduction amount up to the effective window capacity.

## Severity Rules

When a resource is unavailable:

- `HARD_BLOCK` resources produce a hard block.
- `WARNING` resources produce a warning-only result.
- `INFORMATION` resources remain informational for later conflict UX/reporting layers.

The service returns structured reasons instead of throwing for normal scheduling failures. It throws only for malformed date/range/capacity input.

## Current Limits

This slice does not yet:

- Search across multiple candidate resources
- Evaluate resource pools recursively
- Evaluate staff eligibility
- Commit reservations transactionally
- Prevent concurrent overbooking at database-lock level
- Combine location, resource, staff, task, template, and recurrence conflicts into one final scheduling decision

Those are EAPT-015 through EAPT-021.

## Acceptance Evidence

Focused tests cover:

- Active exclusive resource availability
- Held/committed reservation overlap
- Reservation preparation and cleanup buffers
- Proposed/cancelled reservations not consuming capacity
- Capacity resource partial consumption
- Capacity-reduction windows
- Operating-window capacity overrides
- Full resource outages
- Inactive or out-of-service resources
- Effective-date failures
- Operating-window failures
- Same-local-day validation
- Integration with EAPT-013 location-local time conversion
