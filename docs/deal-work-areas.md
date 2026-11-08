# Transaction work areas

Implemented on `codex/enterprise-general-refinement`; deployment is a separate action.

Open **CRM Next → Deals** (`/crm-next/deals`). The initial view is Working Deals.

| Area | Records shown |
| --- | --- |
| Working Deals | Sales, lease and product preparation, excluding recorded vehicle sales, established lease agreements and completed/inactive work |
| Sold Deals | Recorded vehicle sales, including unfinished paperwork, funding and corrections/unwind review |
| Active Accounts | Established BHPH/lease agreements needing completion or balance/credit review; unknown balances remain visible |
| Rentals & Loaners | Active rental/loaner preparation, checkout and return work |
| Repairs & Services | Active repair intake/handoff records |
| Test Drives | Active test-drive paperwork and return work |
| Archive | Canceled, lost and explicitly archived records; completed operational work and settled completed lease agreements |
| All transactions | Every accessible transaction, including history |

Completed vehicle sales remain in Sold Deals. Lease-to-own agreements are not counted as vehicle sales. Actual ownership transfer requires its own recorded sales transaction.

These are views of the existing saved draft/document jacket. They do not copy customers, vehicles, contracts, documents or money. Sold Deals and Active Accounts can reference the same BHPH transaction; do not add their counts or balances together. Archived duplicate drafts retain their history. Financial summaries continue to deduplicate shared jackets.

## Daily workflow

1. Choose the area. Search and pathway selection remain immediately available.
2. Open **Filters, pathway and personal views** for staff/workspace, detailed status and reporting controls. Dates affect reporting and completed-period filters; ordinary operational lists do not hide older work.
3. Continue the deal or open its packet/actions. Sold rows retain the compact status/next-action layout and recorded sold date. Open the status badge to inspect document, funding, delivery and title checks.
4. Use **Review outstanding checks** inside the status popover, or **Actions → Review completion checks**, to open **Completion**. Managers can record evidence-backed funding, delivery and title verification or an explained exception. The original actor, evidence and audit history are preserved. This does not release custody, pay money, submit DMV paperwork or finalize a packet.
5. In Active Accounts, use **Actions → Review account money** and **Actions → Account follow-up** to open the original transaction's verified entries and exact deal-linked tasks.

**Balance boundary:** Active Accounts is an agreement-review view over existing verified financial entries, not a new installment servicing engine. Missing agreed amounts display **Not recorded**. Draft calculator values are not payment receipts, principal balances, due installments, delinquency or profit. Payment schedules, insurance servicing and amortized loan accounting must come from an authoritative servicing integration before those can be represented as live account facts.

Personal views now retain their work area. The new session filter version avoids restoring old mixed “Current deals” filters as the default. Existing personal views without an area open All transactions with their original filters. Direct links such as `/crm-next/deals?area=sold&pathway=bhph` select an explicit area/pathway.

## Implementation and verification

- `src/lib/deal-work-areas.ts`: shared classification and independent progress labels.
- `src/server/sales-documents/dashboard.ts`: area filtering before pagination; scoped counts, summaries, verified financials and outstanding checks.
- `src/server/sales-documents/dashboard-operations.ts`: title evidence uses the existing authorized, audited, idempotent milestone command.
- `src/features/crm-next/saved-deals-library.tsx`, `deal-row-controls.tsx`, `deal-operations-drawer.tsx`, `deal-saved-summary.tsx`, `deal-draft-workspace.module.css`: work areas, jacket links, compact progress, account review and Completion navigation.
- `src/lib/deal-dashboard.ts`, `deal-dashboard-enterprise.ts`: projection types.
- Unit tests cover classification, unknown versus settled balances, inactive history, pre-pagination filtering/counts, shared-jacket preservation and manager-only title verification.
- `scripts/check-deal-work-areas-ui.mjs`: deterministic synthetic desktop/phone review of real components, original account links, filters, restore/deep links, CSV, layout, browser errors and serious/critical accessibility violations. No customer records are created or changed.
- Existing dashboard/workspace browser specifications are updated for the new navigation. The isolated browser script is the executable UI proof for this change; a full authenticated application E2E run is a separate check.

No schema migration or historical-record rewrite is required.

Verified locally on November 8, 2026: 191 deal regression tests passed across 20 suites; targeted lint and the final production build passed. Desktop (1440px) and phone (390px) component browser checks passed, with no browser errors or serious/critical accessibility findings. Authenticated read-only checks against the running app returned HTTP 200 for all seven primary work areas and the Deals screen. The local review is `http://localhost:3002/crm-next/deals`. This is local verification, not a production deployment or a full installment-servicing acceptance claim.

Compact presentation refinement: independent checks and outstanding-item lists are disclosed in the status popover/Completion drawer. Account shortcuts live in Actions. Customer/date details occupy fewer lines, and view explanations are collapsed under About this view. The original six-column table and primary row action remain.
