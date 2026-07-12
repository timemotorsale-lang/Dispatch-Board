# CRM Milestone 5: Durable Customer 360

**Status:** Implemented in source; database migration ready to deploy  
**Date:** 2026-07-12

## Delivered

- Durable customer owner, preferences, language, address, source, interaction, next-action, and archive fields
- Customer contact points with normalized value, primary state, and consent status
- Customer interactions and internal notes with actor evidence
- Customer-to-vehicle relationships with effective dates and relationship meaning
- Customer document requirements with status, owner, source, and due time
- Durable customer links on generated lead and case Dispatch tasks
- Permission-filtered Customer 360 repository
- Selected-customer route at `/customers/[customerId]`
- Durable Overview, Timeline, Leads and Deals, Cases, Appointments, Documents, Vehicles, Communications, Collections, and Notes panels
- Cross-module summaries for leads, cases, appointments, tasks, documents, SLA risk, and lead score
- Next-best-action rail driven by decision records
- Linked-vehicle rail driven by customer-vehicle relationships
- Contact information and VIN masking for viewers who are neither managers nor the customer owner
- Empty-state support for tabs without records

## Data boundaries

- Customer 360 reads app-owned customer, lead, case, task, appointment, vehicle, document, interaction, note, and decision records.
- Collections remains an empty permission-filtered panel until a durable collections adapter or aggregate is introduced; no financial status is fabricated.
- Lifetime value is displayed as not calculated until an approved relationship-value implementation exists.
- Merged and archived customers are excluded from default Customer 360 selection.

## Exit criteria

| Criterion | Result |
| --- | --- |
| Route selects a durable customer | Passed |
| Profile identity is server-authoritative | Passed |
| Timeline combines cross-module records | Passed |
| All tabs return durable or explicit empty data | Passed |
| Summary metrics contain no fixed customer values | Passed |
| Next action uses persisted decision evidence | Passed |
| Contact and vehicle-sensitive fields are permission-filtered | Passed |
| Missing customer returns a not-found response | Passed |

## Next milestone

Milestone 6 adds rollout controls, operational metrics, feature flags, pilot readiness, calibration reports, and rollback procedures.

The migration is created but is not automatically applied to a shared or production database.
