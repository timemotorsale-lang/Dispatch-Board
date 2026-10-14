# COO Workbook Backend Engines

Status: supplemental source of truth

Purpose: define the backend brain that supplements the existing workbook algorithms, report logic, and Effectiveness Pilot.

## Engine Set

The workbook brain is composed of six engines:

1. Daily Planning Engine
2. Execution Tracking Engine
3. Risk and Blocker Engine
4. Coaching and Accountability Engine
5. Report Intelligence Engine
6. Workflow Governance Engine

Each engine should return structured output that can be consumed by the read model and UI without exposing noisy internal details.

## Daily Planning Engine

Analyzes whether the day started with enough clarity.

Inputs:

- Daily Focus items
- top three outcomes
- priority
- risk level
- must-close flags
- support-needed notes

Outputs:

- focus score
- planning status
- must-close count
- missing planning prompts
- suggested first action
- staff-facing guidance
- manager-facing summary

## Execution Tracking Engine

Analyzes whether planned and unplanned work moved forward.

Inputs:

- Daily Focus item status
- checklist completion
- checklist updates
- Quick Updates
- task conversions
- carryover-ready state

Outputs:

- execution score
- planned work count
- completed work count
- unplanned work count
- task conversion count
- execution summary

## Risk and Blocker Engine

Analyzes operational risk early enough for action.

Inputs:

- Daily Focus risk level
- checklist yellow/red status
- Quick Update follow-up flags
- missing due windows
- carryovers
- support actions
- operating exceptions

Outputs:

- risk score
- blocker count
- support-needed signals
- blocker queue
- tomorrow carryover candidates

## Coaching and Accountability Engine

Turns signals into supportive staff guidance and direct manager summaries.

Inputs:

- planning output
- execution output
- risk output
- reporting output
- governance output

Outputs:

- coaching prompts
- strength signals
- coaching opportunity signals
- staff summary
- manager summary
- effectiveness score

## Report Intelligence Engine

Turns meaningful activity into report-ready material.

Inputs:

- completed and unresolved Daily Focus items
- checklist updates
- yellow/red checklist items
- Quick Updates
- support requests
- carryovers
- operating exceptions

Outputs:

- report seed candidates
- daily draft inputs
- weekly rollup inputs
- monthly rollup inputs
- source-backed audit trail

## Workflow Governance Engine

Determines lifecycle state, allowed actions, and clean-close guidance.

Inputs:

- workbook status
- planning output
- execution output
- risk output
- reporting output
- carryovers
- support actions

Outputs:

- current workflow stage
- next recommended action
- close readiness state
- blocked close reasons
- allowed actions
- manager review prompts

## Implementation Rule

These engines supplement the existing workbook code. They should not replace the existing database-backed checklist, Quick Update, Report Seed, Daily Report Draft, carryover, support, tool-page, or Effectiveness Pilot behavior.
