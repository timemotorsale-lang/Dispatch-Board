# UCRM-024 Task Bridge Checkpoint

**Date:** 2026-08-15

**Implementation baseline:** `3bbfa641+working`

**Branch:** `main`

**Status:** `IMPLEMENTED_UNVERIFIED`; authenticated browser proof and isolated PostgreSQL proof remain pending

## Delivered boundary

- Customer 360 now includes a protected CRM-to-Task bridge that creates a real task in the existing governed task workflow instead of only sending the user to the task intake surface.
- The bridge remains fail-closed and review-only: it does not replace Task as the source of truth, does not send an external message, and does not mutate broader opportunity or dispatch workflows.
- The existing task-intake handoff link remains the safe fallback when the dedicated CRM task bridge mode is off.

## Security and authority

- The command now requires the shared CRM shell review boundary, CRM customer read review boundary, and a dedicated CRM customer task bridge review mode before any write can occur.
- Exact customer authorization is resolved before the bridge commits a task, including organization scope, merged/archived customer rejection, and owner-only restrictions for Sales.
- Idempotency is enforced through the enterprise command ledger and rejects conflicting re-use.
- Task creation remains inside the governed Task service path, preserving the existing task authority boundary rather than creating a second task-write path.
- The task bridge now explicitly requires the CRM mutation capability in addition to the shell, customer-read, and task-bridge review controls.
- The task-bridge route now uses the typed task-bridge error envelope and masks unknown backend failures behind a safe generic `500` response.

## Quality and correctness improvements

- Customer 360 now exposes an honest “Create a protected follow-up task” surface only when the bridge is truly available.
- Successful bridge results return the created task identity and source route so staff can continue in the authoritative task workflow immediately.
- Duplicate replays return the original committed task result rather than creating a second follow-up task.
- When the bridge is unavailable, Customer 360 falls back to the existing safe handoff link instead of implying that a protected write is available.
- When the bridge is unavailable, the Customer 360 command surface remains interactive only as an honest review/fallback handoff and never implies that a task was created.

## Automated evidence

- Focused verification passed on 2026-08-15 for:
  - `src/tests/unit/unified-crm-customer-task-bridge-service.test.ts`
  - `src/tests/unit/unified-crm-customer-task-bridge-route.test.ts`
  - `src/tests/unit/unified-crm-customer-task-bridge-form.test.tsx`
  - `src/tests/unit/unified-crm-customer-360.test.tsx`
  - `src/tests/unit/unified-crm-customer-360-service.test.ts`
- Final focused rerun for this checkpoint: 5 files, 80 focused packet tests passed together with the adjacent interaction and note command surfaces.
- Working-baseline compile verification also passed on 2026-08-15 with `npx tsc --noEmit`.

## Remaining gates

- Authenticated browser proof is still required for keyboard/mobile review of the Customer 360 task bridge, fallback continuity, duplicate replay messaging, denied/off states, and authoritative task-route handoff.
- Isolated PostgreSQL proof is still required before this slice can move beyond `IMPLEMENTED_UNVERIFIED`.
- UCRM-024 is not yet `VERIFIED`, piloted, broadly enabled, or merged as a reviewed production packet from this checkpoint.
