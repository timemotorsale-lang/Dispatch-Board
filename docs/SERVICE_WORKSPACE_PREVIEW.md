# Connected service workspace preview

Open `/prototype/service-workspace` from Repair Explorer's **Customer estimates & RO preview** link. This is the next isolated slice after the brakes execution preview; it is not a second production RO system.

## Existing foundations audited

- `src/server/repair-order/service.ts`: authenticated/capability-checked RO listing, detail, intake and controls; organization scoping, duplicate-open-RO prevention, command idempotency/versioning, task reconciliation and rollout-gated mutations already exist.
- `src/server/shop-planning/service.ts` and `domain.ts`: inspections, diagnosis, versioned estimates, authorization decisions and authorized-job creation already exist. Estimate presentation supports manual labor scope review and expected-version handling.
- `prisma/schema.prisma`: `RepairEstimateVersion` retains commercial scope, totals, expiry and supersession; `RepairAuthorization` binds approved line keys and amount to an estimate; `RepairJob` references that authorization and estimate. These remain the intended production records.
- `src/lib/estimate-revision.ts`: copies commercial scope without structured authorization/review approval. Reused by this preview.
- `src/server/customer-lifecycle/service.ts`: existing customer approval/portal services issue token-based access and record line decisions. Their presence is not a claim of legal adequacy or end-to-end delivery verification.
- Existing `/repair-estimate`, `/portal/estimate/[token]`, `/api/repair-orders/[id]/planning`, and `/api/vehicle-portal/[token]/approvals/[approvalId]` remain unchanged.

## What this slice implements

1. Fictional customer, vehicle and RO move together as one context; no approval carries across context changes.
2. An explicit **Browse existing active ROs (read-only)** action calls the existing authorized listing service. Selecting a record calls the existing RO detail and shop-planning detail read services. Only RO/version, customer display name, vehicle identity/label, concern and latest estimate version reach the preview. No phone, email, tokens or full planning history is sent.
3. Start with front pad/rotor work, optionally add diagnosis, or import the current reviewer's explicitly saved Repair Explorer work. Imports contain work/allowances only, not customer identity or authorization. Vehicle applicability remains staff-reviewed.
4. Present immutable preview revisions with exact work lines, labor/parts pricing, source basis, RO/vehicle identity, version baseline, scope reason and seven-day preview expiry. Prices use integer cents. Contract tests run these lines through the existing production estimate normalizer.
5. Record simulated approve/decline/defer decisions for whole work packages. Labor and parts stay together; partial approval never authorizes only half a package. Decisions bind to one exact current revision. Missing, extra, duplicate, stale and expired decisions are rejected.
6. Prepare assigned preview jobs only for approved packages. Repeated handoff is idempotent within that revision. Declined and deferred work is retained but excluded.
7. Supplemental scope copies commercial scope only, preserving historical snapshots. Every work package must receive a new decision. Earlier approval/handoff is not usable for the draft or new revision; historical preview jobs are not real dispatches.

## Isolation and deliberate limitations

No production writes, migrations, customer delivery, token issuance, signatures, real authorization, invoicing or actual job creation. The loaded RO is only a read-time baseline, not a lock or live synchronization. Existing persisted estimates are not imported or modified. A live read failure shows a generic notice and exposes no record data; fictional context remains clearly labeled.

This workspace is session-only. Refreshing, leaving or switching contexts clears preview work and decisions. It never writes browser storage. The optional import reads the existing per-user Repair Explorer draft. Export is available only for fictional context and is disabled for live context; all decisions are staff-entered simulations, not verified customer actions or tamper-proof evidence. Do not enter real customer information in fictional mode.

Displayed/approved amounts are **subtotals**, not final customer quotes. Taxes, fees, discounts, outside services, supplier prices and final jurisdiction-specific rules are not finalized. Allowances and generic diagrams do not establish vehicle fitment, repair necessity or verified labor standards.

The separate brakes execution preview remains independently reviewable. This slice stops at preview-job handoff and does not dispatch those jobs into that workflow. It does not support post-start scope changes, carried-forward approvals, payments, customer communication or legal e-signature collection.

## Adoption gates

Before enabling any live action, use the existing capability/rollout/idempotency/versioned command boundaries; re-read RO and estimate versions; validate real vehicle configuration, manual labor review, pricing/tax policy and full scope; implement policy-approved customer identity/authorization evidence and delivery/expiry handling; reconcile supplemental approvals with already-executed work; connect existing authorized-job, timing and QC services; verify concurrency, permissions, retention and audit behavior end-to-end. Legal approval wording/retention requirements require jurisdiction-specific review. Do not wire preview decisions directly to live writes.
