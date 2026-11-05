# Guided Test Drive refinement

The CRM Next Test Drive pathway now uses Driver & Vehicle → Verify → Sign Agreement → Release → Return. This replaces the form/prototype switch in the active workspace. It does not create a sales opportunity or affect balances or ledgers.

## Staff journey

- Select the shared customer and canonical vehicle once. Available contact details prefill empty contact fields. An available last odometer reading can be reused explicitly, then checked against the actual reading.
- Confirm drive type, employee authorization, license validity and coverage together. Unaccompanied drives require no accompanying employee. Entered information is not automatically verified. Changing license or coverage facts clears the applicable verification; changing vehicle clears vehicle-specific checks and evidence selections.
- Generate and open the agreement in a PDF print viewer, then upload the signed copy, license and coverage proof. Staff open and explicitly review each file. Changed agreement facts require updated signatures. Existing documents remain in the archive; unchanged proofs/photos can be reused for the same customer and vehicle.
- Capture five named departure views using a camera or existing image. Progress reflects reviewed durable uploads. Confirm actual key and vehicle handover, then release.
- The active panel displays recorded departure, due time, due-soon/overdue state and scoped customer contact actions. Return tasks use the existing operations task system. Status refreshes every 30 seconds while visible.
- Record actual return time, odometer, fuel, condition, keys and receiving employee. Five return views retain the existing damage/no-damage review requirement. Exceptions keep the vehicle unavailable and the return task open at high priority until staff explicitly record resolution and account for the keys.
- Save & resume later retains the step and entries. Existing autosave, revision conflicts and server errors remain visible. Browser refresh can recover confirmed operations from persisted bookings and audit events.

## Backend and permissions

`/api/crm/v1/test-drives/[id]` uses existing document permissions, customer/owner scope, canonical vehicle access and `COMMERCIAL_HANDOFF_MANAGE` for custody changes. Requests are private/no-store. Mutations reject cross-origin requests.

The server reads saved facts rather than trusting UI readiness. It checks the agreement fingerprint, accepted signed proof for the current generation, distinct reviewed photo documents, vehicle conflicts, mileage/time and handover confirmations. The existing packet finalizer verifies and preserves checkout evidence bytes. A return records physical custody separately from final return-paperwork completion; any remaining document requirements stay in Sales Documents.

Context, operation and vehicle advisory locks serialize mutations. Stable references, payload hashes and booking versions protect retries and concurrent edits. Release, return, task updates and audit events share a transaction. Agreement generation uses a stable archive reference and recovers an already archived generation after an interrupted response.

`RETURNED_REVIEW` is an explicit vehicle-use hold in the existing string status column. Canonical availability and temporary-use conflict checks include it. Resolution records an audited status transition; it does not erase the original exception. No schema migration is introduced by this refinement.

Existing facts are restored using the current draft store. File names from older drafts are not treated as durable, reviewed evidence. Staff can explicitly select matching files already in the saved jacket. Legacy “started” flags without a custody assignment require reconciliation: staff must confirm no actual departure occurred and record why before a new release; actual historical departures require custody reconciliation rather than another departure. The new UI does not silently activate old flags. Existing real bookings remain the authority, including older assignments with no guided-generation event. Historical packets and customer/vehicle links are preserved.

## Review and verification

Application route: `/crm-next/deals/start?new=1&pathway=test-drive` or resume an existing Test Drive with `/crm-next/deals/start?draftId=<id>`.

An isolated fictional-data preview is available with `node scripts/test-drive-preview.mjs` at `http://127.0.0.1:3107`. It renders the actual guided component with a test draft store and mocked document/custody responses; it does not exercise authenticated persistence or write to a database. It is a development test fixture, not a production route.

Run the browser journey with `node_modules/.bin/playwright test --config playwright.test-drive.config.ts`. It covers saved-step resumption, save-failure recovery, verification reset, a complete solo-drive release/exception return/resolution and mobile accompaniment controls. Backend/unit tests in `test-drive-workflow.test.ts` and `test-drive-operations.test.ts` cover actual validation, permissions, concurrency guards, idempotent replays, evidence, timezones and return holds using mocked repositories.

## Deployment after approval

Review and commit the focused refinement on `codex/enterprise-general-refinement`, run relevant tests/type checking/lint and `next build --webpack`, then use the normal approved deployment procedure and restart the application. Existing branch database prerequisites must already be installed; this change adds no migrations. Confirm permanent document storage is available and test staff role permissions in staging with fictional records before rollout. No production deployment, database migration or customer mutation is part of this local implementation.
