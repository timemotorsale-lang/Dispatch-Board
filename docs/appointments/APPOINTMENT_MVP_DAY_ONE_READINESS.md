# Appointment MVP Day-One Readiness

**Purpose:** Final evidence template for the Appointment Command Center MVP rollout.  
**Audit date:** July 10, 2026.

**Current status:** Approximately 88% ready. Core functionality passes, but workflow-browser, permission-integration, and formal signoff gates remain.

**Closeout roadmap:** `APPOINTMENT_MVP_ROLLOUT_ROADMAP.md`.

## Release Verdict

- [ ] Approved for MVP rollout.
- [ ] Held for named blockers.

Current provisional verdict: Held until the four closeout milestones in the rollout roadmap are completed.

## Required Evidence

- [x] `/appointments` opens successfully for a manager.
- [x] Appointment Console automated visual/browser smoke pass completed at `1280 x 720`.
- [x] Scheduled appointments, unscheduled drafts, and selected detail rail are visible.
- [ ] New appointment draft creation works from `/appointments`.
- [x] Linked appointment draft creation works from task detail.
- [x] Eligible task-originated draft can be scheduled through the command boundary.
- [x] Server command tests prove a blocked draft cannot be scheduled; browser proof remains in the workflow-browser gate.
- [x] Server tests prove warning-level scheduling requires authorized reason capture; browser proof remains in the workflow-browser gate.
- [x] Staff readiness, resource readiness, and schedule readiness are visible to the operator.
- [x] Linked task context is visible from the appointment detail surface.
- [x] Appointment history and activity evidence are implemented; lifecycle browser verification remains in the workflow-browser gate.
- [ ] Manager, owner, participant, viewer, administrator, and system-action boundaries are verified.

## Quality Commands

- [ ] `npm run db:generate`
- [x] `npm run db:validate`
- [x] `npx prisma migrate status`
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test` - 126 files and 836 tests passed.
- [x] `npm run build`
- [x] `npm run test:e2e` - 4 browser workflows passed.

`npm run db:generate` must be rerun during the final gate with the local development server stopped; the July 10 audit encountered a Windows file lock on the Prisma query engine.

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
