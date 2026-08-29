# COO Workbook Workflow Lifecycle

Status: supplemental source of truth

Purpose: define the stages that govern the workbook day and the backend logic that guides staff through daily execution.

## Lifecycle Stages

### START_THE_DAY

The day begins with intentional planning.

Expected inputs:

- Up to three Daily Focus outcomes
- Must-close flags
- Priority
- Risk level
- Support needed

Primary question:

What outcomes would make today successful?

### WORK_THE_DAY

The user executes planned work while using lightweight tools for progress and changes.

Expected inputs:

- Checklist items
- Status changes
- Done/not done
- Update notes
- Task conversions when work becomes formal

Primary question:

What should be worked next, and what has changed?

### ASK_FOR_SUPPORT

The user raises blockers before they become end-of-day surprises.

Expected inputs:

- Support note
- Related focus/checklist/update context
- Requested update flag when a manager needs follow-up

Primary question:

What help is needed to keep the day moving?

### CLOSE_THE_DAY

The user reviews completed and unfinished work before leaving the day.

Expected inputs:

- Done/not done review
- Open risk review
- Follow-up confirmation
- Carryover confirmation
- Report draft generation

Primary question:

Is the day clear enough to hand off, report, and prepare tomorrow?

### PREPARE_TOMORROW

Unfinished work becomes tomorrow-facing context.

Expected inputs:

- Carryover candidates
- Confirmed or dismissed carryovers
- Must-close items not completed
- Quick Updates needing follow-up

Primary question:

What needs ownership tomorrow?

### GENERATE_REPORT

The system creates manager-ready summary from source-backed signals.

Expected inputs:

- Reviewed Report Seeds
- meaningful candidate seeds
- completed work
- blockers
- Quick Updates
- support and carryover signals

Primary question:

What should leadership know, and what evidence supports it?

## Clean Close Rules

A workbook day is not clean when:

- Must-close Daily Focus items are unresolved.
- Red or blocked items are still open without support or carryover.
- Quick Updates need follow-up but lack due context.
- Carryovers are generated but not confirmed or intentionally dismissed.
- Report Seeds exist but have not been reviewed when a report is expected.

The system may still allow close when business reality requires it, but the close state should explain what remains unresolved.

## Allowed Action Principles

- Staff can manage their own workbook.
- Staff can ask for support on their own workbook.
- Managers can view staff summaries and create support actions.
- COO and manager views can see broader operating signals.
- Closed days block edits unless reopened.

## Comparison Safety

The current COO Workbook remains the control version. The Effectiveness Pilot is the place where lifecycle guidance is refined before adoption.
