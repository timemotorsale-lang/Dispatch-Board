# Appointment MVP Day-One Readiness

**Purpose:** Final evidence template for the Appointment Command Center MVP rollout.  
**Current status:** Not ready for final signoff. This template will be completed during `codex/appointment-mvp-day-one-readiness`.

## Release Verdict

- [ ] Approved for MVP rollout.
- [ ] Held for named blockers.

Current provisional verdict: Held until the remaining appointment MVP rollout gates are completed.

## Required Evidence

- [ ] `/appointments` opens successfully for a manager.
- [ ] Appointment Console visual/browser pass completed.
- [ ] Scheduled appointments, unscheduled drafts, and selected detail rail are visible.
- [ ] New appointment draft creation works from `/appointments`.
- [ ] Linked appointment draft creation works from task detail.
- [ ] Eligible draft can be scheduled through the command boundary.
- [ ] Blocked draft cannot be scheduled.
- [ ] Warning-level scheduling requires authorized reason capture.
- [ ] Staff readiness, resource readiness, and schedule readiness are visible to the operator.
- [ ] Linked task context is visible from the appointment detail surface.
- [ ] Appointment history or activity evidence updates after key commands.
- [ ] Manager, owner, participant, viewer, administrator, and system-action boundaries are verified.

## Quality Commands

- [ ] `npm run db:generate`
- [ ] `npm run db:validate`
- [ ] `npx prisma migrate status`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run test:e2e`

## Day-One Operator Notes

- [ ] Supported appointment statuses are documented in operator language.
- [ ] Scheduling disabled states explain the missing requirement or blocker.
- [ ] Warning override behavior is clear.
- [ ] Hard-block behavior is clear.
- [ ] Deferred enterprise scope is listed in release notes.

## Known Deferred Scope

- External calendar, SMS, email, CRM, and DMS integrations.
- Full analytics and executive reporting.
- Full automation-rule builder.
- Broad mobile/native workflows.
- Advanced recurrence, waitlist, and bulk rescheduling beyond accepted MVP paths.

## Signoff

| Role | Name | Status | Notes |
| --- | --- | --- | --- |
| Product owner |  | Pending |  |
| Operations owner |  | Pending |  |
| Engineering owner |  | Pending |  |
