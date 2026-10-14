# Unified CRM Pilot Operations Package

## Cohort

- Internal pilot only until UCRM-069 approval.
- Management and sales participants must be named before enablement.
- External customer communications remain disabled unless separately approved.

## Feature Flags

- Keep Unified CRM behind review/enablement controls.
- Treat held verification gates as release blockers.
- Disable CRM by reverting the release candidate or disabling CRM feature flags.

## Training

- Quick-start topics: CRM Home, global search, opportunity stages, saved views, manager gates, and source-system authority.
- Staff should know CRM coordinates work but does not replace source-domain truth.
- Managers review holds before pilot execution.

## Support

- Support owner triages pilot defects.
- Data correctness issues take priority over workflow questions.
- Each support item should include record ID, timestamp, expected behavior, and actual behavior.

## Known Limits

- Full regression remains held by UCRM-065 until release-candidate proof.
- External integrations remain deferred.
- Advanced forecasting/backtesting remains UCRM-105.

## Monitoring

- Watch CRM route errors, latency, and dashboard freshness.
- Review dashboard reconciliation before pilot sessions.
- Attach observability evidence before go/no-go.

## Incident Escalation

- Pause pilot for suspected data leak, incorrect mutation, or irreversible workflow issue.
- Escalate security issues to security-review owner.
- Record incident timeline and recovery action before resuming.

## Privacy

- CRM read models expose only needed operational fields.
- Do not export pilot CRM data without approved export controls.
- Source systems remain authoritative for customer/contact truth.

## Backup

- Run database backup before live pilot data load.
- Record backup checksum and restore estimate.
- Dry-run rehearsal must pass before live load.

## Rollback

- Rollback authority remains administrator-assisted.
- Keep Customers/Sales/source workflows available as fallback.
- Complete UCRM-067 rollback rehearsal before UCRM-069 go/no-go.
