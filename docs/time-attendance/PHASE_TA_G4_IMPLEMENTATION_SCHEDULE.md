# Phase TA-G4 Implementation Schedule — Close and Payroll Handoff

## Branch

`codex/time-attendance-g4-payroll-handoff`

## Phase purpose

Phase TA-G4 turns reviewed time cards into a controlled payroll handoff path. The phase keeps original punches append-only, uses versioned/locked time-card data for payroll, and records every close/export/reconciliation action with manager authority and reasoned evidence.

## Slice checkpoints

| Slice | Status | Implementation target |
| --- | --- | --- |
| TA-040 | Started | Pay-period readiness projection checks card approval, open sessions, blocking exceptions, pending corrections, pending time-off/ESST review, missing manager approval, and existing locked/exported batches. |
| TA-041 | Started | Manager lock/reopen commands create or void controlled export batches with reasoned evidence; source cards are locked only after readiness passes. |
| TA-042 | Started | Export preview builds versioned regular, overtime, and ESST lines with control totals and checksums. |
| TA-043 | Started | Payroll acknowledgment, rejection, and reconciliation decisions are recorded against the batch. |
| TA-044 | Started | Historical batch reproduction returns stored snapshot, lines, checksum, and reproducibility status. |

## Current implementation notes

- The live CCC Time & Attendance page includes the Payroll Handoff panel.
- The server boundary is `/api/time-attendance/payroll-handoff`.
- The implementation is repository-ready but not production-activated.
- Payroll-code mapping is intentionally limited to MVP `REGULAR`, `OVERTIME`, and `ESST` lines until payroll configuration is approved.
- Reopen currently voids the batch with evidence; richer prior-snapshot preservation and separation-of-duties policy remain hardening items.

## Production gates still open

- TA-004 legal/payroll configuration approval.
- TA-015 migrated-runtime application, seed data, and restore drill.
- TA-016 capability and rollout policy.
- Payroll-code/file-format approval.
- External payroll-provider delivery and rejection contract.
- Representative parallel payroll pilot and reconciliation evidence.
