# Inventory Console R6 Retail Completion Implementation

**Release / milestone:** R6 / M6  
**Slices:** IC-060 through IC-068  
**Implemented:** 2026-07-18  
**Branch:** `codex/inventory-console-r6-retail-completion`  
**Repository result:** `BOUNDED INTERNAL IMPLEMENTATION COMPLETE; MIGRATION, SCHEDULER, EXTERNAL ADAPTERS, PILOT, AND PRODUCTION NOT ACTIVATED`  
**Activation:** Repository only; no migration, CRM/DMS/payment/title/accounting integration, scheduled expiry worker, pilot, or production action was authorized

## Outcome

R6 replaces generic retail lifecycle transitions with one governed `INV-RETAIL` aggregate per InventoryUnit. It begins only from completed R5 post-release verification and current title, price, merchandising, and availability evidence. It then coordinates reservation, exact-price sale approval, delivery readiness, observed custody handoff, external reconciliation, and compensated unwind without taking ownership of customer, CRM, DMS, payment, title, or accounting records.

Staff enter the workspace at `/vehicles/retail-completion` from Inventory Lifecycle, global Inventory navigation, or the Workflow Launcher. The workspace provides an accountable queue, milestone view, purpose-built stage actions, immutable history, capability truth, and references to Inventory-to-Frontline and Customer Lifecycle.

## Slice evidence and bounded status

| Slice | Implemented repository evidence | Remaining activation evidence |
| --- | --- | --- |
| IC-060 | R5 completion, physical/internal/digital availability, current title, approved price, merchandising-package version, and one-per-unit gate | Real publication freshness provider and pilot reconciliation |
| IC-061 | Customer/deal reference boundary, owner, start/expiry, deposit-reference-only handling, one active aggregate per InventoryUnit, event/audit evidence | CRM identity adapter and multi-channel competing-demand tabletop |
| IC-062 | Forward-only extension, explicit release, command-time expiry, stale-version conflict, availability restoration, immutable event | Scheduled expiry worker, notification/task delivery, promise-effect adapter |
| IC-063 | Exact customer/deal/price/payment reference, current R5/title/package check, delegated amount capability, expiry, and four-eyes approval | DMS/payment acknowledgement and approved enterprise amount policy |
| IC-064 | Documents, keys/accessories, custody, location, condition, mileage, promise, payment reference, evidence, and fail-closed hold/resubmit | Representative delivery-hold tabletop and operational sign-off |
| IC-065 | Authenticated actor, recipient/time/location/evidence, observed custody handoff, InventoryUnit `DELIVERED`, and downstream reconciliation hold | Provider-backed delivery acknowledgement and custody pilot evidence |
| IC-066 | Pre/post-delivery unwind request, returned custody/condition, title and financial-effect references, evidence, independent approval, valid frontline re-entry | Title/accounting compensation adapters and complex post-delivery cancellation fixtures |
| IC-067 | Immutable linked compensation snapshot, idempotent command replay, mismatch rejection, reopen through unwind, explicit matched acknowledgement, and a dedicated cross-domain mismatch intervention route | Live adapter replay and provider-outage evidence remain activation gates, not repository acceptance gaps |
| IC-068 | Permission/location-scoped queue, stage totals, clocks/next actions, immutable history, Control Tower projection, cross-domain intervention queue, Inventory Lifecycle navigation, and governed launcher | Approved production KPI baselines remain governed by the R0 decision gate |

## Workflow and authority boundaries

```text
R5 POST_RELEASE_VERIFICATION / COMPLETED
  -> AVAILABLE_FOR_SALE
  -> optional reservation / extend / release / expire
  -> exact sale authorization request
  -> independent authorization
  -> delivery readiness or hold
  -> observed custody handoff
  -> RECONCILIATION_HOLD
  -> matched downstream acknowledgement
  -> DELIVERED_RECONCILED

Any sold/delivery state
  -> unwind request with custody/title/financial evidence
  -> independent approval
  -> FRONTLINE_READY re-entry
```

| Contract | Purpose |
| --- | --- |
| `/vehicles/retail-completion` | Permission-scoped R6 operating workspace |
| `GET/POST /api/retail-completions` | Read projection, eligible options, and governed start |
| `POST /api/retail-completions/{id}/commands` | Stage-aware reservation, sale, delivery, reconciliation, and unwind commands |
| `InventoryRetailCompletion` | One current coordination state and evidence snapshots per InventoryUnit |
| `InventoryRetailCompletionEvent` | Immutable command, decision, delivery, and compensation history |

## Enforced invariants

- Only a completed, unsuspended R5 workflow with current title, price, merchandising, and availability evidence can enter retail completion.
- One retail-completion aggregate exists per InventoryUnit.
- Reservations require customer/deal identity boundaries and future expiry; extensions only move forward.
- Sale requests bind an exact customer, deal, price, payment reference, requester, and expiry.
- Requester cannot approve the same sale; approved price must exactly match the request.
- Price/package/title/R5 changes invalidate sale authorization.
- Delivery readiness fails closed on any required document, key/accessory, custody, location, condition, promise, payment-reference, or evidence gap.
- Delivery requires authenticated observed custody evidence and cannot be future-dated.
- Operational delivery remains in reconciliation hold; an external request alone is never completion.
- Returned downstream deal identity must match the expected deal.
- Unwind requires returned custody/condition, title and financial-effect references, evidence, and an independent approver.
- Unwind and correction never delete history; InventoryUnit re-entry is an explicit compensated transition.
- Commands use optimistic versions, idempotency, audit, domain event, outbox, InventoryUnit history, and retail history atomically.

## Data and migration

Migration `20260718173000_inventory_console_r6_retail_completion` is additive. It adds the retail aggregate, immutable retail events, enums, indexes, and restricted foreign keys. It does not remove or rewrite existing sale events or commercial handoffs. The migration artifact has not been applied to a user, pilot, or production database.

## Verification

- Prisma schema validation: passed.
- Prisma Client generation with `--no-engine`: passed.
- R3–R6 focused domain/UI/launcher regression set: 5 files, 42 tests passed.
- TypeScript typecheck: passed.
- Full repository lint: passed with zero warnings.
- Next.js production build: passed using an isolated output directory; 142 pages generated and the R6 workspace plus both R6 API routes were registered.

## Capability truth and release decision

The internal aggregate, schema artifact, commands, projection, UI workspace, hard gates, InventoryUnit transitions, immutable sale events, audit/event/outbox integration, reconciliation hold, and compensated unwind path are implemented.

CRM, DMS, payment, title-agency, accounting, notification, and provider acknowledgement adapters remain disabled. Automated expiry/escalation, provider retry/replay, dedicated mismatch queues, Control Tower retail projection, approved KPI baselines, representative operational tabletop cases, accessibility/performance evidence, migration deployment, pilot sign-off, and production activation remain pending.

No commit, push, pull request, merge to main, deployment, external mutation, migration application, pilot, or rollout activation was performed by this R6 implementation.
