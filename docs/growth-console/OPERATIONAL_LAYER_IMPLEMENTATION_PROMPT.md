# Growth Console Operational Layer Implementation Prompt

**Status:** Next implementation prompt  
**Date:** 2026-09-08  
**Scope:** Build the operational backend layer for the Growth Console after the current review shell and deterministic logic foundation.

## Prompt

You are implementing the next operational layer of the Time Motor Sales Growth Console inside the existing Dispatch Board modular monolith.

Before changing code, read and follow:

- `docs/AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/growth-console/README.md`
- `docs/growth-console/ARCHITECTURE.md`
- `docs/growth-console/WORKFLOWS.md`
- `docs/growth-console/ALGORITHMS_AND_DECISION_LOGIC.md`
- `docs/growth-console/AUTOMATIONS.md`
- `docs/growth-console/ROADMAP.md`
- `docs/growth-console/MILESTONES.md`
- `docs/growth-console/TRACEABILITY_MATRIX.md`

The current Growth Console already has a review-ready `/growth` shell and deterministic foundation services. Your job is to move it from review foundation toward operational use by adding durable data, API routes, source-backed read models, governed commands, approval workflow, and reviewable CRM/task writeback previews.

Do not implement live customer sends, live ad spend, autonomous CRM mutation, external provider execution, inventory mutation, accounting mutation, appointment creation, or destructive record changes unless a later explicit approval milestone authorizes them. The operational layer must prepare, persist, validate, preview, lock, audit, and explain. It must fail closed.

## Product Goal

The Growth Console should answer:

What growth opportunity should we act on next, who owns it, what audience/message/ad should be reviewed, what approvals are missing, what result happened, and what should be written back after approval?

Marketing and advertising remain one console, with separate approval controls for customer outreach, paid spend, offer claims, inventory availability, and source freshness.

## Implementation Milestones

### Milestone 1: Durable Growth Data Foundation

Implement database-backed Growth-owned records.

Add Prisma models and migrations for:

- `GrowthOpportunity`
- `GrowthCampaignPlan`
- `GrowthAudienceSnapshot`
- `GrowthAudienceSnapshotRow`
- `GrowthMessageDraft`
- `GrowthApproval`
- `GrowthCampaignLedgerEvent`
- `GrowthLaunchLock`
- `GrowthResultEvent`
- `GrowthCrmWritebackPreview`

Requirements:

- Preserve versions instead of overwriting campaign plans, audiences, and drafts.
- Use source record references, not copied CRM/inventory/customer records.
- Store actor, role, timestamp, reason, source module, source record ID, and idempotency key for command events.
- Keep launch state locked by default.
- Add indexes for owner, status, source reference, campaign ID, created date, and review state.

Exit evidence:

- Migration exists.
- Prisma client compiles.
- Unit tests prove version preservation, source-reference storage, and no source-record mutation.

### Milestone 2: Source-Backed Growth Read Models

Replace static Growth review data with safe read adapters.

Wire read-only source signals from:

- CRM/customers
- inventory
- sales or quote/recovery records
- service/repair orders
- appointments
- tasks

Requirements:

- Normalize signals using `src/server/growth/source-adapters.ts`.
- Every signal must include source authority, source record ID, freshness, confidence, owner, and review-needed state.
- Stale, low-confidence, missing-consent, unavailable-inventory, or incomplete-source signals must route to review instead of activation.
- No read adapter may write to its source domain.

Exit evidence:

- `/growth` no longer depends only on static sample opportunities.
- The UI labels source authority in plain language.
- Tests prove Growth can read source signals without creating, changing, or deleting source records.

### Milestone 3: Operational Growth API Routes

Add guarded API routes under `/api/growth`.

Implement routes for:

- `GET /api/growth/home`
- `GET /api/growth/opportunities`
- `POST /api/growth/opportunities/:id/dismiss`
- `POST /api/growth/campaigns`
- `GET /api/growth/campaigns/:id`
- `POST /api/growth/campaigns/:id/audience-snapshots`
- `POST /api/growth/campaigns/:id/message-drafts`
- `POST /api/growth/campaigns/:id/approval-requests`
- `POST /api/growth/campaigns/:id/launch-lock`
- `GET /api/growth/results`
- `POST /api/growth/results/import-preview`
- `GET /api/growth/crm-writeback-preview`

Requirements:

- Every POST must validate actor, role, reason, idempotency key, command scope, source authority, and mutation boundary through the Growth command boundary.
- Routes must return clear next action text when blocked.
- Routes must not send messages, spend money, or mutate CRM/inventory/source records.

Exit evidence:

- Route tests cover allowed Growth-only commands, blocked external mutations, idempotent retries, and invalid role failures.

### Milestone 4: Campaign Planning And Review Workflow

Make campaign planning operational but still locked from live execution.

Implement:

- Create campaign from a ranked opportunity.
- Save audience snapshot.
- Edit message/ad draft.
- Request owner approval.
- Show version history.
- Show unresolved blockers.
- Create launch lock when execution is not approved.

Requirements:

- Campaign plans persist across page reloads.
- Audience snapshots and message drafts are versioned.
- Approval request records are auditable.
- Launch lock explains the exact reason live execution cannot proceed.

Exit evidence:

- UI can create and reopen a campaign plan.
- Tests prove stale edit rejection, version history, approval request creation, and launch lock persistence.

### Milestone 5: Approval And Policy Enforcement

Convert approval logic into operational server enforcement.

Implement policy checks for:

- consent and opt-out
- quiet windows
- contact frequency cap
- source freshness
- customer complaint/suppression flags
- inventory availability
- offer/source proof
- budget approval
- role permission
- provider readiness

Requirements:

- Suppression always wins.
- Unknown consent fails closed.
- Paid spend requires GM/Admin budget approval.
- Service claims require service manager approval.
- Inventory promotions require inventory manager confirmation.
- Staff can work assigned follow-ups but cannot approve launch, budget, suppression overrides, or provider activation.

Exit evidence:

- Tests prove unsafe actions fail closed and the UI receives one plain-language next action.

### Milestone 6: Provider Pilot Dry Run

Add one provider pilot adapter in dry-run mode only.

Supported pilot options:

- internal task pilot
- email dry run

Requirements:

- Dry run records provider request intent without sending.
- Provider health, request ID, payload summary, reconciliation state, and rollback readiness are stored.
- Failed policy blocks provider request creation.
- Idempotent retry returns the same result.

Exit evidence:

- Tests prove no live send happens.
- UI shows provider dry-run readiness, reconciliation, and rollback status.

### Milestone 7: Results And Attribution Operational Read Model

Allow reviewed result events to be imported or previewed without CRM mutation.

Implement:

- Result event normalization.
- Attribution tiers: direct, assisted, influenced, unattributed.
- Context-only handling for opens/views.
- Campaign performance summaries.
- Result-to-source reference mapping.

Requirements:

- Do not overclaim attribution.
- Opens/views cannot count as proof by themselves.
- Store imported result events as Growth-owned events.
- CRM writeback remains preview-only until separately approved.

Exit evidence:

- Tests prove attribution windows, proof-event rules, summary counts, and read-only CRM behavior.

### Milestone 8: CRM And Task Writeback Preview

Make writeback preview useful while keeping mutation locked.

Implement preview rows for:

- campaign prepared
- audience approved
- message approved
- approval requested
- launch locked
- reply/result received
- appointment interest
- opportunity follow-up
- task follow-up
- opt-out/suppression update

Requirements:

- Each preview row must show destination, source evidence, locked status, approval needed, and next action.
- `canMutateCrm` must remain false until a later explicit mutation milestone.
- Unattributed events must not be proposed as CRM proof.

Exit evidence:

- UI shows writeback preview rows.
- Tests prove CRM/customer/task records are not changed.

### Milestone 9: Growth Console UI Operational Wiring

Connect the `/growth` UI to the new backend while keeping the first screen clean.

Implement:

- Today queue from source-backed opportunities.
- Campaign detail drawer/page.
- Audience review panel.
- Message/ad review panel.
- Approval state panel.
- Launch lock panel.
- Results panel.
- CRM writeback preview panel.
- Review Controls panel.

Requirements:

- Keep the page simple: staff see the next best action first.
- Details open on demand.
- Every button must either perform a safe backend action, open the right detail, or clearly explain why it is locked.
- No dead buttons.
- No permanent clutter from backend machinery.

Exit evidence:

- UI tests prove primary actions are wired.
- Browser smoke test proves the page loads and core controls respond.

### Milestone 10: Operational Readiness And Adoption Gate

Update the release readiness model to reflect the real operational layer.

Implement checks for:

- durable data migration applied
- source read models connected
- API routes guarded
- campaign planning persists
- approval policy enforced
- provider dry-run locked
- results read model available
- CRM writeback preview locked
- live send locked
- ad spend locked
- user adoption approval pending

Requirements:

- The console must honestly say what is live, what is review-only, and what is locked.
- Adoption is not approved automatically.

Exit evidence:

- Readiness tests pass.
- Documentation, traceability, and UI agree.

## Non-Negotiable Guardrails

- Do not send real customer communication.
- Do not spend ad budget.
- Do not create, edit, or delete CRM/customer/inventory/sales/service/accounting/appointment source records from Growth.
- Do not hide locked states.
- Do not use static sample data as if it is live.
- Do not overwrite campaign history.
- Do not skip idempotency on commands that can be retried.
- Do not bypass consent, suppression, quiet-window, budget, or role checks.

## Expected Files And Areas

Likely areas to modify:

- `prisma/schema.prisma`
- `prisma/migrations/*`
- `src/app/(app)/growth/page.tsx`
- `src/app/api/growth/**`
- `src/features/growth/**`
- `src/server/growth/**`
- `src/tests/unit/growth-*.test.ts`
- `src/tests/unit/growth-*.test.tsx`
- `docs/growth-console/**`

Use existing project patterns for routing, authentication, Prisma access, validation, testing, and UI styling.

## Verification

Run focused tests for Growth plus typecheck:

```bash
npm test -- --run src/tests/unit/growth-*.test.ts src/tests/unit/growth-*.test.tsx
npm run typecheck
```

If route or browser behavior changes, also run the relevant smoke/browser verification used by this repository.

## Final Delivery

At the end, report:

- which milestones were completed;
- which live actions remain locked;
- which files changed;
- which tests passed;
- whether migrations were created but not deployed;
- any remaining approval decisions needed before live activation.

The correct first operational release is not a live marketing machine. It is a safe, auditable Growth command center that can prepare work, guide staff, preserve records, enforce approvals, and show exactly what would happen before anything is allowed to happen.
