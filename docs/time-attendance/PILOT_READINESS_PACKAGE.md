# Time & Attendance pilot readiness package

This is a procedure and checklist package. Empty evidence fields mean the gate has **not passed**.

## Security and privacy review

- [ ] Confirm employee access is limited to their own cards, events, requests and notifications.
- [ ] Confirm Attendance Manager, Leave Administrator, Policy Administrator, Payroll Administrator, lock/reopen and export/reconciliation are separately granted.
- [ ] Verify explicit deny overrides role and allow grants.
- [ ] Verify protected leave reason is never returned to ordinary manager views, logs, notifications or exports.
- [ ] Attempt unauthorized card approval, correction apply, leave decision, lock, export, download and reopen.
- [ ] Review restricted-access audit records and alert ownership.
- Reviewer / date / evidence link: _not supplied_

## Backup and restore drill

1. Record the database backup identifier and application revision.
2. Capture source counts and checksums for events, sessions, breaks, cards, exceptions, corrections, attestations, approvals, leave requests/balances, batches and lines.
3. Restore into an isolated non-production environment.
4. Run migrations and deterministic card replay without changing immutable evidence.
5. Reproduce every exported handoff file byte-for-byte.
6. Reconcile counts, card checksums, batch checksums and stored file bytes.
7. Record every variance and resolution. Do not mark the gate complete with an unexplained variance.
- Backup / restore timestamps: _not run_
- Evidence report: _not supplied_

## Retention approval

- [ ] Punch/event evidence retention approved.
- [ ] Correction, attestation and approval retention approved.
- [ ] Protected leave data classification and retention approved.
- [ ] Payroll files and reconciliation retention approved.
- [ ] Legal-hold exception and authorized deletion procedure approved.
- Approver / date: _not supplied_

## Accessibility audit

- [ ] Keyboard-only capture, correction, time-off, attestation, manager decision and payroll close.
- [ ] Screen-reader names, state changes, errors and recovery guidance.
- [ ] 200% zoom and reflow without lost actions.
- [ ] Status meaning does not depend on color.
- [ ] Representative phone, tablet and desktop viewports.
- [ ] Timeout, duplicate, stale-version and unavailable-service recovery.
- Auditor / conformance result / evidence: _not supplied_

## Support and escalation

1. Employee first checks current state and last accepted punch before retrying.
2. Attendance Manager handles ordinary missing-punch/correction issues.
3. Leave Administrator alone handles protected leave decisions.
4. Payroll Administrator handles readiness and file creation; lock/reopen and reconciliation use their distinct authorities.
5. Projection failure, dead letter, repeated failed command, restricted access or unexplained payroll variance escalates to the application owner.
6. Never repair history by editing/deleting punch evidence.
- Named owners and response targets: _not supplied_

## Rollback procedure

1. Record reason, affected cohort and exact time.
2. Set Time & Attendance rollout to `OFF` through governed policy administration.
3. Preserve all accepted events and pending evidence; do not delete or rewrite records.
4. Complete payroll in the current authoritative process.
5. Reconcile punches accepted before rollback.
6. Correct the issue in isolation, replay deterministically, and repeat readiness review before reactivation.
- Rollback drill evidence: _not run_

## First-live reconciliation

- [ ] Every pilot employee appears in both rosters.
- [ ] Every accepted punch matches exact source time.
- [ ] Open sessions, exceptions, corrections, disputes and leave are resolved.
- [ ] Each exported card has exact-version employee attestation and manager approval.
- [ ] Regular, overtime, PTO, ESST, unpaid and holiday minutes reconcile by employee.
- [ ] File control totals and checksum match the stored handoff artifact.
- [ ] Provider acknowledgment is recorded only from real provider evidence.
- [ ] Every variance has owner, explanation and resolution.
