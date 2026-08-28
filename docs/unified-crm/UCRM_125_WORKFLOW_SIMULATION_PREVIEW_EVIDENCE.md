# UCRM-125 — Workflow simulation preview evidence

Status: `IMPLEMENTED_UNVERIFIED`

## Scope

UCRM-125 extends the workflow/approval designer readiness boundary with deterministic simulation previews.

## Safety posture

- Simulation is enabled.
- Publishing is disabled.
- Live workflow execution is disabled.
- Every preview has `liveExecutionEnabled: false`.
- Simulations do not create tasks, move opportunities, approve quotes, notify staff, or contact customers.

## Verification

- Focused workflow designer tests cover simulation state, live-execution disabled posture, preview count, and blocked actions.
- Existing route tests cover access and safe errors.
- Full TypeScript typecheck passed.

## Remaining review

Workflow limits, loop protection, observability, sandbox publish, Product Owner authority, browser/admin UX proof, and rollback rehearsal remain required before this milestone can be marked `VERIFIED`.
