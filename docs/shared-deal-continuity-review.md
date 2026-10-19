# Shared customer and vehicle continuity — review build

## Staff workflow

1. Open CRM Next → Deals → Start Deal. **Add new customer** is above search/results. Select an existing CRM customer, or enter a new customer's details once and save it to CRM. Possible duplicates require selecting the existing record, not automatically merging people.
2. Select the existing canonical vehicle by VIN, stock, inventory number or vehicle details. Adding a vehicle checks the VIN and prevents competing create requests from producing another canonical record. Creating a registry vehicle does not invent an acquisition, inventory unit, readiness approval or cost.
3. Work the selected path. All 12 current CRM Next paths use the shared selectors and persist the customer/vehicle references in a typed deal context. Path-specific terms, approvals and issued documents remain separate.
4. For temporary transport from an existing deal, use **Issue loaner** in the saved Deals list. The customer and original-vehicle context carry forward when already linked. Select a different temporary vehicle. Historical name-only deals require explicit CRM selection; names alone are not identity proof.
5. Save and load the vehicle assignment, reserve its dates, generate its exact agreement, and finish the existing Sales Documents review/finalization. Reload the assignment to select the finalized agreement; no internal jacket ID needs to be typed.
6. Record actual handoff with its time, mileage in miles, fuel, condition, recipient, keys/driver verification and evidence references. Extend the expected return when needed. Record actual return separately. An exchange requires returning/cancelling the current assignment before choosing another vehicle and reserving it.
7. Use **Open original deal / delivery** to resume the original agreement after return. Returning a loaner never finalizes, delivers or closes the original lease automatically.

## Integrity and permissions

- The shared customer reader retains existing organization/owner access controls. Narrow vehicle-selection reads require authorized CRM/document access and return only the deal selector's metadata, not unrestricted vehicle-history access.
- New customer creation, new vehicle creation and actual commercial handoff retain their server-side capabilities. Ordinary staff may need an administrator's existing capability grants; this implementation does not grant manager powers or alter production roles.
- Customer creation locks normalized contact identifiers. VIN creation locks identity identifiers; the shared path refuses duplicate quarantine records. Existing registry duplicate-review behavior outside this shared path is retained.
- Active vehicle assignments cannot change customer, vehicle, inventory cycle or parent deal. Once history exists, customer and original-deal provenance require a separate deal to change.
- Reservations and checked-out vehicles use database locking and overlap guards. An overdue checked-out vehicle remains unavailable until its actual return. Assignment requests have stable retry keys and append-only events.
- Actual handoff requires this deal's exact customer/VIN/pathway agreement and an existing finalized checkout version. Printing or generating a document does not release the vehicle. Handoff/return also append canonical custody and odometer observations.
- Existing signed documents and source agreements are not rewritten. No historical customer/vehicle links are guessed or backfilled.

## Local database change

Migration: `20261019010000_deal_continuity`. Creates `DealWorkflowContext`, `VehicleUseBooking` and `DealContinuityEvent`, with foreign keys, scope/lifecycle triggers and concurrency indexes. No existing business rows are updated by this migration.

On October 19, 2026, the approved local/public update followed an isolated-schema test and a verified custom-format backup. Counts before/after remained 30 customers, 46 vehicles, 13 deal drafts and 67 sales-document jackets. There were zero newly backfilled contexts. Backup and migration proof are retained privately under `tmp/database-backups/` and `tmp/deal-continuity/`; do not commit these or test session fixtures.

The ordinary migration-status command encountered pre-existing migration directories without SQL files. Only this migration was deployed using a temporary one-migration configuration and Prisma's normal migration history; the unrelated directories were not deleted or altered. Resolve repository migration-history completeness and branch alignment before any production release.

## Validation and review boundary

- Focused unit tests cover selector placement, request validation, overlap rules, safe errors and existing draft/registry behavior.
- Opt-in integration test: `src/tests/integration/deal-continuity.test.ts`. Requires `RUN_DEAL_CONTINUITY_INTEGRATION=1` and a loopback `deal_staging_<number>` schema. Covers all 12 durable identity links, concurrent creation/reservations, retries, scope refusals, finalized-agreement gating, actual return and unchanged original lease.
- Opt-in browser test: `src/tests/e2e/shared-deal-continuity.spec.ts`. Requires an isolated session fixture and `RUN_DEAL_CONTINUITY_BROWSER=1`. Covers all 12 selectors/saves, linked loaner navigation, compact mobile bounds, manual customer creation/reuse and duplicate recovery. The unrelated daily operating-rhythm reminder is excluded from this CRM test.
- The integration test's finalized agreement is explicitly synthetic; it tests the handoff gate, not real signatures or the full signed-document generation/finalization journey. Existing document requirements and approval policies remain in force.
- Review in CRM Next with `CRM_NEXT=REVIEW` and the customer read feature enabled. Legacy fallback screens are not replaced, and review is not production adoption. No production deployment, merge, push or commit is part of this change.
