# Repair team preview correction

Branch: `codex/enterprise-general-refinement`, existing isolated `work/repair-history` checkout. Local preview: http://localhost:3002/prototype/repair-explorer. Includes prior uncommitted repair work. No commit, push, deployment, or production changes.

## Causes and repairs

1. The actual preview database had Vehicle Operations Master, Shop Operations, and Parts Operations OFF. Enabled only the Minneapolis location through the audited settings endpoint; organization defaults and other stores are unchanged.
2. Four non-manager preview accounts lacked repair/billing capabilities. User confirmed Eva is Evelyn and explicitly authorized all five staff to issue estimates and record deposits/payments. Added 13 missing Minneapolis-scoped grants through the authority endpoint; roles were not promoted or passwords changed.
3. The authority endpoint used `oldValue` instead of the schema's `priorValue` in its audit insert. This caused the permission transaction to roll back. Corrected the field, then successfully replayed the same authorized commands.
4. The inventory banner claimed Live based on the route. It now uses effective default rollout information and shows neutral store-varying status when location overrides prevent an accurate single status.
5. Guide actions now explain rollout blocks, retain draft saving, focus missing prices, and identify the repair-order linking action explicitly. Billing shows a clear blocker, authorized settings link, and Recheck billing access action.
6. Regression work found master SHADOW/PILOT restrictions were not consistently enforced on child features. Both master and feature must now permit execution, including Diagnostics, with location overrides preserved.
7. Restarted the local preview with a fresh dedicated cache after stale client/server bundle evidence and stalled requests. Existing quote, repair, invoice, and payment records were preserved.

## Staff scope

| Local account label | Existing role | Requested access at Minneapolis |
|---|---|---|
| Brock | Inventory / service management | Estimates, billing, deposits and payments |
| Ancilla | Office / operations | Estimates, billing, deposits and payments |
| Baraka | Sales | Estimates, billing, deposits and payments |
| Eva / Evelyn | Collections | Estimates, billing, deposits and payments |
| Eli | General Manager | Existing estimate and billing access retained |

These are the existing local demo identities. Production accounts were not changed. The current capability model groups repair estimate management with authorization/job-management access, and billing management with adjustments/refunds; it does not expose a separate estimate-only or payment-only grant. Store boundaries, explicit denials, required authorization, invoice readiness, and payment integrity remain enforced.

## Verification

- Exact master-disabled reproduction: blocked save leaves data unchanged; enabling the location permits the same staff workflow; unauthorized sales and other-store writes remain blocked.
- Final focused unit run: 150 tests across 14 files passed.
- Final production Webpack build, TypeScript checks, changed-file lint, and whitespace checks passed. Generated build configuration changes were restored; the preview cache is excluded from version control.
- All five preview accounts passed read-only browser checks: billing HTTP 200, manage permission true, mutations allowed, and exact linked guide accessible without MASTER_DISABLED.
- Four real-database role-matched tests passed: Inventory Manager, Operations Coordinator, Salesperson, and Collections issued reviewed estimates, collected deposits, posted invoices, recorded payments, and retrieved exact receipts. Missing grants, financial cross-store access, explicit denials, and receipt access were tested. Actual authority commands verified audit prior values, idempotency, outbox creation, and rollback.

No real customer repair was issued, authorized, completed, invoiced, or paid during testing. Mutation tests use synthetic records. Payment recording does not process electronic charges.
