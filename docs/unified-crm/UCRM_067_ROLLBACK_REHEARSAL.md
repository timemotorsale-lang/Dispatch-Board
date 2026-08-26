# Unified CRM Rollback Rehearsal

## Kill Switches

- Confirm CRM review/enablement flags can disable CRM entry points.
- Confirm source Customers, Sales, Tasks, Appointments, and vehicle operations remain available.

## Prior Release Recovery

- Record the prior release commit before pilot enablement.
- Record the migration boundary and rollback/restore owner.
- Confirm release artifacts are retained for rollback review.

## In-Flight Writes

- Rehearse idempotency replay for CRM commands submitted before rollback.
- Confirm stale-version failures are safe and user-readable.
- Do not retry mutating CRM commands blindly after rollback.

## Retained Evidence

- Preserve enterprise command ledger rows.
- Preserve audit/domain events.
- Preserve pilot data-load rehearsal, security, reliability, accessibility, performance, and regression gate outputs.

## Existing Workflow Fallback

- Customers remains the customer/contact source of truth.
- Sales/source workflows remain available for customer follow-up.
- Tasks and Appointments remain available for daily work execution.

## Held Items

- Measured backup/restore timing must be attached from release-candidate rehearsal.
- Product must record rollback trigger authority and communication owner.
