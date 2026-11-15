# Repair workflow readiness review

Scope: Labor Guide and Auto Body saved work, repair-order linking, issued estimates, customer authorization, invoice generation, receipt retrieval, and print/PDF controls. Continue in the isolated `repair-history` worktree based on `codex/enterprise-general-refinement`; preserve the preceding history-retrieval changes. No production deployment or configuration change is part of this review.

## Acceptance criteria

1. A restored unlinked quote can be saved, printed as a clearly marked preliminary quote, and attached to an open repair order without losing its proposed lines. An issued estimate still requires that order and validated pricing.
2. Required input and failed actions are visible and reachable from the button used. Loading and retries have feedback. Failed draft persistence stops estimate issuance; uncertain financial outcomes retain their retry identity.
3. Customer approval is tied to the exact estimate. A transient approval-read failure can be retried. Approval, completed work, QC, and required operational evidence remain prerequisites for invoicing.
4. Authorized staff can prepare/post an invoice, record a verified payment, and retrieve the saved invoice and receipt. Read-only users can print permitted documents without being offered executable billing mutations.
5. Store-specific grants work for that store and do not expose other stores. Explicit denies, financial access, archived records, and historical document integrity remain enforced.
6. Print and PDF retain the selected document version. Archived/closed repair records are printable without reopening or issuing another document.

## Findings addressed

- Unlinked-quote Generate focused a manual-details panel out of view instead of the required repair-order lookup; switching orders could discard the proposed worksheet.
- Footer saves reported status elsewhere on the page, making successful or failed clicks appear unresponsive.
- Estimate issuance did not stop when saving its retry draft failed.
- Auto Body generation recovery and saved-estimate links were not consistently visible after response/refresh failures.
- Approval details had no retry after an initial read failure. Default decision time also discarded seconds and milliseconds, which could incorrectly predate a newly issued estimate; preserve full input precision.
- Billing controls did not explain role, store-rollout, or closed-order restrictions before submission.
- Global prechecks incorrectly rejected users with legitimate store-only repair-view grants.

## Staff access and deployment configuration

Service Advisors can manage repair estimates and authorization within their approved scope. Mechanics can view repair records and prepare personal quotes but need an authorized advisor/manager or explicit management grants to issue estimates. Sales access to personal drafts does not imply repair-order access. Non-GM billing staff need explicit `SERVICE_BILLING_VIEW` and, for writes, `SERVICE_BILLING_MANAGE` at the intended location. General Manager defaults remain subject to explicit denies.

Production still needs its actual grants, approved labor-rate policy, and executable `VEHICLE_OPERATIONS_MASTER` / `SHOP_OPERATIONS` rollout settings verified for the intended stores and staff. Tests use synthetic users and local data; they do not certify every production account. Do not grant organization-wide access to compensate for a store-scoping defect. Do not turn off approval, QC, financial, or idempotency checks to make a button proceed.

## Verification record

- Combined focused unit run: 413 tests across 46 files passed; three additional approval timestamp regressions passed after the chronology fix.
- Changed-file lint: 60 files passed; the approval component and new timestamp test also passed after the final correction.
- Repair readiness browser suite: 4/4 passed in schema `dispatch_board_e2e_readiness_20261114_b`. Verified quote linking, issuance, approval read retry and duplicate-click prevention, invoice posting, payment receipt, actual PDF responses, print-frame contents, read-only integrity, store permissions, and rollout rejection.
- Auto Body: 2/2 browser scenarios and 10 integration tests passed in its separate disposable schema. Verified photo upload with scoped pilot access, uncertain generation recovery, exact frozen estimate/PDF, mobile controls, and preserving the source pre-intake draft.
- Existing user quote on port 3002: authenticated browser confirmed the preliminary print link and Generate moving focus to the open-RO lookup. Existing schema F and quotes are preserved.
- Final production build (Webpack), TypeScript, and static page generation passed. Historical-record regression: 11/11 browser tests passed in isolated schema `_04`; role/store and financial-access expectations remained unchanged. Earlier runner failures were resolved by limiting local database connections and enabling CRM in the test server, not by weakening application guards.

The readiness browser fixture supplied synthetic completed labor and QC evidence after verifying that missing QC blocks invoicing. Technician clock/QC entry screens were not exercised end-to-end in this run. The print-frame call was exercised with only the operating-system print dialog stubbed; physical printer output is not certified. No production data, grants, rollout settings, or deployment were changed.

## Local review

- Existing saved quotes: http://localhost:3002/prototype/labor-guide . This remains the original local schema F; no user quotes were replaced.
- Synthetic open-order demonstration: http://localhost:3003/prototype/labor-guide?experience=explorer&draftId=4f33fa28-5b3c-47cb-8e9d-f7a5db63c2ee . Login `morgan.manager@local.test` / `dispatch123!` (local synthetic credentials only).
- Demo repair-order reference: `readiness-63a08400-DEMO-START-HERE-OPEN`. Click Generate / Print Estimate, search that reference, confirm attachment, then generate. Approval and completed-work/QC requirements still apply before invoicing.
- Preview 3003 uses the tested readiness schema B. The automated test used a different synthetic repair order; this demonstration remains unissued for interactive review.

Changes remain local in the existing `repair-history` worktree, based on `codex/enterprise-general-refinement`. This audit establishes the tested workflow behavior, not every production employee's permissions or all workflows in the application. No push or deployment was performed.