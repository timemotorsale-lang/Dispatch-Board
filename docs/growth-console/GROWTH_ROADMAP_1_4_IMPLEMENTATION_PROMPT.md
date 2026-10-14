# Growth Console Roadmap 1-4 Implementation Prompt

**Purpose:** Use this prompt to implement Growth Console roadmap phases G1 through G4 in clean sequence.
**Status:** Implementation prompt; requires user review before adoption or merge.
**Date:** 2026-09-07

## Prompt

You are implementing the Time Motor Sales Growth Console inside the existing Dispatch Board repository.

Before writing code, read and follow the Growth Console source-of-truth packet:

1. `docs/growth-console/README.md`
2. `docs/growth-console/ARCHITECTURE.md`
3. `docs/growth-console/WORKFLOWS.md`
4. `docs/growth-console/ALGORITHMS_AND_DECISION_LOGIC.md`
5. `docs/growth-console/AUTOMATIONS.md`
6. `docs/growth-console/ROADMAP.md`
7. `docs/growth-console/MILESTONES.md`
8. `docs/growth-console/TRACEABILITY_MATRIX.md`

Also preserve the repository-wide rules in:

- `docs/AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/CURRENT_IMPLEMENTATION_STATUS.md`
- `docs/unified-crm/README.md`
- `docs/sales-console/README.md`

## Non-Negotiable Rules

- Implement roadmap phases in order: G1, then G2, then G3, then G4.
- Commit after each completed milestone or tightly grouped milestone slice.
- Do not merge until the user reviews and approves the final implementation.
- Do not delete, overwrite, migrate away, or corrupt existing estimates, quotes, invoices, customers, CRM history, inventory records, repair orders, appointments, tasks, or dealership records.
- Do not activate live email, SMS, ad spend, phone calls, customer messaging, provider sync, CRM mutation, or automation side effects unless the specific milestone explicitly authorizes it and backend controls are complete.
- UI may guide and prepare work, but server-side policy must remain the authority for consequential actions.
- Every disabled action must tell the user what is needed next.
- Every live or future-live action must have role checks, policy checks, audit intent, failure states, and tests.
- Keep the frontend simple, daily-use friendly, and execution-led. Staff should know what to do next without reading technical explanations.
- Keep marketing and advertising together under Growth Console, while preserving their internal differences.
- CRM remains the relationship record. Growth remains the campaign planning, approval, launch-intent, automation, and results layer.

## Branch And Commit Discipline

Create a working branch:

```bash
git checkout -b codex/growth-console-roadmap-1-4
```

Before each milestone:

1. Check current git status.
2. Confirm no unrelated user changes will be touched.
3. Read the relevant Growth docs again.
4. Implement the smallest complete vertical slice.
5. Run focused tests.
6. Run typecheck and lint when shared types, routes, or components change.
7. Commit only the files related to that milestone.

Suggested commit messages:

- `Implement growth read models`
- `Add growth campaign planning commands`
- `Enforce growth approval policy`
- `Pilot growth provider adapter`

At the end:

1. Do not merge automatically.
2. Provide a review summary with changed files, tests run, known limits, and screenshots or route links.
3. Wait for user approval.
4. Merge only after approval.

## Roadmap Phase G1 - CRM-Connected Read Models

Goal: Replace static review data with governed read-only CRM, inventory, sales, service, appointment, and task signals.

Build:

- Growth opportunity read model.
- Read-only daily opportunity queue.
- CRM relationship context panel.
- Inventory promotion signals.
- Quote and estimate recovery signals.
- Service reminder and appointment recovery signals.
- Audience count preview using governed source records.
- Source freshness and unavailable-state handling.

Do not build:

- campaign persistence;
- live sends;
- provider connections;
- ad spend;
- CRM writes;
- customer record mutation.

Acceptance:

- `/growth` no longer presents static review data as live.
- Each opportunity shows source system, owner, next action, readiness, and reason.
- Missing or unavailable source data fails into a useful user action.
- Existing static review copy is either removed or clearly labeled as fallback/review mode.
- Tests prove the read model preserves source authority and does not mutate records.

Commit after G1.

## Roadmap Phase G2 - Campaign Planning Commands

Goal: Let users create durable campaign plans, audience snapshots, and message/ad drafts without launching anything.

Build:

- Campaign plan domain model or service boundary.
- Save campaign plan command.
- Save audience snapshot command.
- Edit message/ad draft command.
- Request approval command.
- Version history for campaign plan, audience, and content edits.
- Review screen showing the current plan and prior versions.
- Clear draft/saved/approval-needed states.

Do not build:

- provider activation;
- actual delivery;
- paid ad launch;
- autonomous automations.

Acceptance:

- A user can prepare a campaign from a Growth opportunity.
- Campaign versions are preserved.
- Audience snapshots are versioned and do not overwrite customer source records.
- Message/ad drafts can be edited without sending.
- Request approval creates a governed approval state.
- Tests cover command validation, idempotency where retry is possible, and preservation of prior versions.

Commit after G2.

## Roadmap Phase G3 - Approval And Policy Engine

Goal: Enforce consent, suppression, budget, source freshness, offer verification, role permission, and launch readiness.

Build:

- Growth policy service.
- Consent and opt-out gate.
- Frequency cap and quiet-window checks.
- Source freshness gate.
- Inventory availability gate.
- Offer, price, finance, warranty, repair, and service-claim verification gate.
- Budget approval gate for paid campaigns.
- Role-based approval permissions.
- Launch readiness checklist.
- Blocked-state UI that explains the next action.

Do not build:

- real provider launch unless G4 begins and the user has approved G3;
- bypass controls in the frontend.

Acceptance:

- Unsafe or incomplete launch attempts fail closed.
- UI explains exactly what is blocking launch.
- Users can correct or route blockers.
- Server tests prove policy enforcement independent of UI visibility.
- Existing data remains unchanged except approved Growth planning records.

Commit after G3.

## Roadmap Phase G4 - Provider Adapter Pilot

Goal: Connect one low-risk provider or internal task-based pilot after G1-G3 are complete and reviewed.

Recommended first pilot:

- internal CRM/task-based follow-up, or
- one approved email provider in non-production/test mode.

Build:

- Provider adapter interface.
- Provider health readout.
- Dry-run or test-send mode if using an external provider.
- Launch command behind G3 policy checks.
- Delivery/result ingestion for the pilot provider.
- Pause, retry, and failure handling.
- Reconciliation view showing provider result against Growth campaign and CRM follow-up.

Do not build:

- broad live customer sends;
- paid advertising spend;
- multiple provider integrations;
- autonomous campaign launch.

Acceptance:

- Pilot launch is limited, approved, and reversible.
- Provider failures do not duplicate sends.
- Results reconcile to the campaign plan.
- CRM writeback remains governed and auditable.
- Rollback/pause path is tested.

Commit after G4.

## Final Review Before Merge

When G1-G4 are complete:

1. Run the full focused Growth test suite.
2. Run repository typecheck.
3. Run lint.
4. Open `/growth` and verify the user can understand the daily path without explanation.
5. Confirm live customer sends, paid ad spend, and autonomous activation are still blocked unless explicitly approved.
6. Confirm stored estimates, quotes, invoices, customers, CRM history, inventory, repair orders, appointments, and tasks are preserved.
7. Provide a review packet:
   - milestone summary;
   - commits;
   - changed files;
   - screenshots or route links;
   - tests run;
   - known limitations;
   - open approval questions.

Do not merge until the user approves the implementation.

After approval:

```bash
git checkout main
git merge --no-ff codex/growth-console-roadmap-1-4
git push origin main
```

## Done Means

Roadmap 1-4 is done only when:

- each phase has its own commit;
- each phase has passing tests;
- the UI remains simple and execution-led;
- backend controls exist before any consequential action;
- all source-of-truth records are preserved;
- review evidence is delivered;
- the user approves adoption and merge.
