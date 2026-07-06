# Appointment Lifecycle Command Route Execution Contract

**Work package:** EAPT-027 extension  
**Status:** Implemented backend route boundary  
**Scope:** API route orchestration for supported lifecycle commands

## Purpose

The appointment command route previously accepted commands into the command ledger. This slice wires supported lifecycle command types into the planner, transaction executor, and concrete Prisma transaction adapter.

The route remains thin. Business decisions stay in the planner, and persistence stays in the transaction executor/repository.

## Implemented Boundary

`POST /api/appointments/commands` now calls the command execution orchestrator.

For supported lifecycle commands, the orchestrator:

- Submits the command through the existing command ledger boundary.
- Skips execution for duplicates and stale-version conflicts.
- Builds an EAPT-027 lifecycle command plan.
- Executes the plan through the lifecycle transaction executor.
- Uses the concrete Prisma transaction repository by default.
- Returns the execution result in the API response.

Supported lifecycle command types:

- `CREATE_DRAFT`
- `APPROVE`
- `EDIT`
- `SCHEDULE`
- `RESCHEDULE`
- `CANCEL`
- `TRANSFER_OWNER`

Unsupported command types still stop at the command boundary until their later E3 slices are implemented.

## Response Shape

The route response includes:

- `command`
- `duplicate`
- `accepted`
- `conflict`
- `execution`

When a lifecycle command executes successfully, the returned command status is updated to the execution status so callers do not see a stale `PENDING` status.

## Current Limits

This slice does not yet:

- Add UI controls that call the route.
- Build browser workflows for create, schedule, reschedule, cancel, approve, edit, or transfer owner.
- Connect the visible `/appointments` preview board to live refresh after command execution.
- Provide production-like end-to-end database/browser evidence.

## Acceptance Evidence

The boundary is covered by unit tests for:

- Route response shape and status mapping.
- Submit-and-execute orchestration for supported lifecycle commands.
- Duplicate command submissions not re-executing.
- Stale-version conflicts not executing.
- Existing command service authorization and idempotency behavior.
