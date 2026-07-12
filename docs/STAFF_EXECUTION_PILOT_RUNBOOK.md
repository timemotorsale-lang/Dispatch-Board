# Staff Execution MVP Pilot Runbook

**Module:** DB-ACCOUNTABILITY-059  
**Pilot boundary:** One deployment serving one pilot location  
**Audience:** Pilot manager, operations owner, and release operator

## Release Decision

Enable the engine only after the deployment is isolated to the pilot location. The current Tasks board and `StaffDay` records are not location-scoped, so enabling these flags in a multi-location deployment enables every eligible user in that deployment.

```text
STAFF_EXECUTION_ENABLED=true
STAFF_EXECUTION_START_DAY_ENABLED=true
STAFF_EXECUTION_TASK_ACCEPTANCE_ENABLED=true
STAFF_EXECUTION_AVAILABLE_WORK_ENABLED=true
STAFF_EXECUTION_END_OF_DAY_ENABLED=true
STAFF_EXECUTION_MANAGER_HEALTH_ENABLED=true
```

Keep all flags false outside the pilot deployment. Roll back by disabling the master flag first; persisted records remain available for audit and no data deletion is required.

## Preflight

1. Confirm the pilot manager and staff can sign in.
2. Confirm role and direct duties match each pilot staff member's actual responsibilities.
3. Generate today's board twice and confirm no duplicate tasks or staff-day items.
4. Confirm Manager Review displays Team Execution Health only to managers.
5. Confirm no real customer secrets, payment data, or unnecessary personal information are entered in notes.
6. Record the release version, migration status, operator, location, and enablement time.

## Day-One Workflow

### Start Day

Staff open My Tasks, review responsibilities, acknowledge priorities, and record a useful blocker when one exists. Managers use the same source facts in Team Execution Health.

### Execute and Complete

Staff accept work and review visible completion requirements before acting. Missing checklist, update, dependency, blocker, or waiting evidence prevents completion. Approval-required work moves to Ready for Review.

### Blocked or Waiting Work

Staff record actionable context. Managers open the linked task from Team Execution Health or Manager Review and resolve the workflow condition, not judge the employee.

### Next Work

Staff explicitly choose Find next work. Recommendations must state why the work is eligible. Staff may claim it or decline using Need manager direction, Need more context, Not available, or Other. Do not interpret a decline as a performance score.

### End-of-Day Handoff

Staff prepare the generated draft, confirm accuracy, add missing context, and record tomorrow follow-up. A manager may submit on behalf of staff only with a documented reason.

### Next-Day Carryover

Generate the next board and confirm unfinished work appears once with the same owner, blocker, workflow, references, and next step. Retry generation to confirm idempotency.

## Manager Review Rhythm

- Start of day: acknowledgement gaps and starting blockers.
- Midday: Blocked, Waiting, Ready for Review, and Needs Assignment.
- Day end: Handoff Pending and carryover ownership.
- Use task links and activity events as evidence; do not create rankings, idle timers, or informal employee scores.

## Telemetry and Evidence

Review `ActivityEvent` entries for:

- `staff_day.generated`, `staff_day.started`, and starting blocker events.
- duty completion and reopen events.
- `task.accepted`, readiness rejections, completion overrides, and status changes.
- recommendation claimed and dismissed events.
- `staff_day.handoff_submitted` and next-board generation.

Escalate any authorization error, duplicate ownership, missing audit event, unsupported completion, or duplicate carryover as a release blocker.

## Rollback

1. Set `STAFF_EXECUTION_ENABLED=false`.
2. Confirm the ordinary board, My Tasks, task updates, and Manager Review still operate.
3. Preserve staff-day, recommendation, report, override, and activity records.
4. Record the rollback reason and affected workflow.
5. Re-enable only after the failing browser and authorization gate passes.

## Pilot Exit Criteria

- No unresolved P0 workflow or authorization defect.
- Staff confirm responsibilities, blockers, evidence, and handoff prompts are understandable.
- Managers confirm Needs Assignment and Team Execution Health reduce assignment and handoff gaps.
- Every carryover has one owner and useful next-step context.
- No surveillance labels, rankings, idle timers, or opaque scores are introduced.
- Multi-location expansion remains blocked until board and staff-day location ownership is implemented and tested.
