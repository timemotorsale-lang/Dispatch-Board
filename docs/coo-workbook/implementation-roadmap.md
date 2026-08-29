# COO Workbook Brain Implementation Roadmap

Status: supplemental implementation roadmap

Purpose: sequence the habit-building backend intelligence layer without replacing prior COO Workbook foundations.

## Guardrails

- Preserve current COO Workbook at `/vehicles/coo-workbook`.
- Preserve Effectiveness Pilot at `/vehicles/coo-workbook/effectiveness-pilot`.
- Supplement existing algorithms instead of replacing them.
- Keep UI changes minimal and comparison-safe.
- Commit each milestone separately.
- Keep generated files out of commits.

## Milestone Sequence

### 1. Guiding Documentation

Create the operating philosophy, lifecycle, engine, scoring, report, and roadmap documents.

### 2. Daily Planning Engine

Implement structured planning output from Daily Focus, priority, risk, must-close, and support data.

### 3. Execution Tracking Engine

Implement structured execution output from planned work, completed work, Quick Updates, task conversion, and carryover readiness.

### 4. Risk and Blocker Engine

Implement structured risk output from blocked/watch items, follow-ups, missing due context, carryovers, support actions, and operating exceptions.

### 5. Coaching and Accountability Engine

Implement supportive staff prompts, manager summaries, strengths, opportunities, and effectiveness rollup.

### 6. Report Intelligence Engine

Refine source-backed Report Seed generation and daily/weekly/monthly report inputs.

### 7. Workflow Governance Engine

Implement lifecycle state, allowed actions, close blockers, and next recommended action.

### 8. Read Model Integration

Expose planning, execution, risk, coaching, reporting, governance, and effectiveness in the workbook read model.

### 9. Pilot UI Integration

Use the new read model inside the Effectiveness Pilot without replacing the current workspace.

### 10. Verification, Merge, Push

Run focused tests, full tests, typecheck, Prisma validation, lint, migration validation if needed, page checks, merge, push, and provide review URLs.

## Success Criteria

The implementation is successful when:

- The backend can explain the day in clear operational terms.
- Staff receive simple guidance that improves habits.
- Managers receive concise accountability summaries.
- Reports are generated from meaningful source-backed signals.
- The UI remains simple enough for daily use.
- The current workbook and pilot can be compared side by side.
