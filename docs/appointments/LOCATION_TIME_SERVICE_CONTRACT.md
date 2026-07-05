# Location Time Service Contract

**Work package:** EAPT-013  
**Status:** Implemented foundation  
**Scope:** Location time, operating-hours, closures, and timezone services

## Purpose

The location time service is the first E2 scheduling-engine boundary. It converts the location configuration created in EAPT-003 into scheduling-safe facts that later availability, conflict, recurrence, resource, and appointment-command services can trust.

This service does not reserve resources or create appointments. It answers:

```text
What local day is this instant in the location?
What business day is that local date?
Which operating windows are active for that date?
What UTC intervals do those local windows represent?
Does a proposed appointment fit inside open hours?
Does it overlap a location closure?
Is the location active for scheduling?
```

## Implemented Capabilities

The service supports:

- IANA timezone validation
- UTC instant to location-local date conversion
- UTC instant to location-local minute-of-day conversion
- Location-local date to `BusinessDay` resolution
- Location-local date/minute to UTC instant conversion
- Effective-dated operating-window resolution
- Local day start and end resolution, including daylight-saving transition days
- Location closure overlap detection
- Candidate schedule evaluation against:
  - active scheduling status
  - one location-local day
  - active operating windows
  - overlapping closures

## Scheduling Rules

A candidate is schedulable only when:

- The location scheduling status is `ACTIVE`.
- The candidate has a valid start and end.
- The end is after the start.
- The appointment fits within one location-local day.
- The candidate is fully inside an active operating interval.
- The candidate does not overlap a location closure.

The service returns structured reasons when any of those conditions fail.

## Daylight-Saving Contract

The service treats location-local dates as business facts and UTC instants as storage facts.

For `America/Chicago`:

- The first business day after spring-forward resolves 9:00 AM local to 14:00 UTC.
- The first business day after fall-back resolves 9:00 AM local to 15:00 UTC.
- Spring-forward transition day has a 23-hour UTC span.
- Fall-back transition day has a 25-hour UTC span.

These cases are covered by tests so recurrence and availability work can build on the same boundary.

## Current Limits

This slice does not yet:

- Evaluate resource availability
- Evaluate staff availability
- Apply purpose/template duration and buffer rules
- Expand recurrence
- Perform hard-conflict evaluation
- Reserve capacity
- Search for available slots

Those are EAPT-014 through EAPT-021.

## Acceptance Evidence

Focused tests cover:

- Local date, minute, and business-day resolution
- Weekday operating intervals
- Closed weekend behavior
- Candidate acceptance inside active hours
- Candidate rejection outside hours
- Candidate rejection across local days
- Candidate rejection when the location is draft
- Closure overlap blocking
- Spring and fall daylight-saving behavior
