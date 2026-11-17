# Repair workflow completion audit — November 14, 2026

## Scope and acceptance

Working branch: `codex/enterprise-general-refinement` in the existing isolated `work/repair-history` checkout. The prior `parts-release` checkout is preserved on `codex/parts-release-preserved-20261114`; no checkout files were replaced. Includes earlier uncommitted history, document, and visual-guide refinements. No push or deployment authorized for this audit.

Staff must be able to:

1. Locate an own saved quote or accessible historical repair from Labor Guide and Deals without altering historical records.
2. Restore the correct customer, vehicle, line items, charges, tax, and discount; edit and save without losing data.
3. Preview/print a preliminary quote and return to the same saved work. An unlinked quote must prompt repair-order selection rather than promise a workbench or show sample data.
4. Attach the intended open repair order, issue the estimate, and record authorization for its exact version and lines.
5. Order/receive approved parts and execute assigned repair work with visible prerequisites and actionable recovery.
6. Record a repair deposit, print its receipt, credit it correctly toward the final invoice, collect the remaining balance, and print the final payment receipt.
7. Respect role/store access, rollout settings, closed records, duplicate requests, and retry behavior throughout.
8. Complete frequent tasks with concise labels, compact forms, visible next actions, keyboard access, and no horizontal overflow on desktop/mobile.

Verification uses synthetic isolated local records for writes. Existing preview schemas and user quotes must be preserved. Each area must be reported as tested, blocked, or unverified; passing unit tests alone does not establish production readiness.

## Confirmed corrections

- Preliminary quote preview previously dropped the saved draft ID and mislabeled an empty-guide destination as Repair Workbench. Preview now saves first, preserves exact draft/source context, and offers repair-order selection for unlinked quotes.
- The blank catalog no longer displays a fictitious Ford identity. It explicitly identifies an unlinked preliminary worksheet.
- Guide lookup supports retry, visual diagnostic selection preserves its mode, standalone parts avoid nonexistent labor references, and invalid tax input produces a field error instead of breaking the worksheet.
- Repair Deals use repair-specific concern, document, handoff, and billing controls. Returned order links are checked against the selected customer and vehicle before being offered.
- Parts receiving restricts bins to the order's site and distinguishes a confirmed receipt from a failed follow-up refresh. Technician start/resume no longer present pause wording.
- Preview document headers and mobile wrapping are tightened without changing issued historical documents.

## Payment scope

Payments record funds already received through the existing supported methods. This change does not add electronic card charging or collect card/bank account credentials. A separate durable deposit ledger now supports exact receipts, application to final invoices, reversals, and refunds. Its additive migration was applied to the local preview schemas F and B and verified in a separate disposable integration schema. Production is unchanged. A production release must apply this migration before enabling deposit use.

## Automated verification

- Related unit regression run: 1,324 tests across 215 files passed.
- Subsequent financial/document regression run: 193 tests across 25 files passed (overlaps the broader run; counts are not additive).
- Real database deposit integration passed: collect, refund, apply, reverse, reapply, unchanged-request replay, changed-request rejection, exact receipt hashes, immutable history, rollback, permissions, concurrent collections/applications, and cash reporting.
- Changed TypeScript files passed lint with zero warnings. Prisma schema validation passed.
- Final Webpack production build passed, including TypeScript and generation of 418 pages. The build caught an empty purchase-order selection type mismatch; it was corrected and the build rerun successfully. Nine focused receiving/QC tests then passed.
- These checks do not establish all production roles or store configurations; the browser matrix below distinguishes actual UI coverage.

## Browser acceptance matrix

Evidence is scoped to synthetic records and named actions, not every role, service, or production configuration. Earlier readiness B seeded completed labor and QC; that run does not establish Repair or QC browser acceptance. The expanded readiness run replaces those completion seeds with normal controls.

| Visible step | Current evidence | Boundary / remaining verification |
| --- | --- | --- |
| Inspect | Actual browser: O saved an inspection version | Customer, vehicle, visit, and open RO are fixture prerequisites. Inspection must be saved through the checklist. |
| Diagnose | Actual browser: O saved diagnosis with evidence | Record explicit symptoms, test result, evidence, cause, and correction through planning. No physical diagnosis is represented. |
| Estimate | Actual browser, run G passed | Saved quote identity, labor, parts, fees, tax and discount restoration; edit/save/reload; archived copy preservation; old-link/import redirect; failed preview save retains work; successful preview retains exact draft and attachment focus. O linked the edited quote and issued exactly one estimate. |
| Authorize | Actual browser: O exact-version approval and retry passed | Exact-version approval, initial planning failure/retry, single submission under rapid clicks. Do not infer all authorization roles. |
| Parts | Actual browser: L and M purchasing case passed | Purchase order, partial and final receipt, correct-store bin, unchanged replay and denied mutation. No seeded purchase/receipt success. |
| Assign | Actual browser: O created job, published procedure and booked technician | Create approved job, publish procedure if needed, book a technician. Staff/resource configuration is seeded, not tested as an administrative workflow. |
| Repair | Actual browser: O START/PAUSE/RESUME/FINISH persisted | Assigned technician starts clock and completes with work/verification/QC evidence. Earlier finished-clock seed is not evidence. |
| QC | Actual browser: O detailed peer-verified QC passed | Submit QC via visible checks and verify immutable inspection. Earlier QC_PASSED seed is not evidence. Quick form peer-verification/error styling defect was corrected by its source owner; O recorded independent peer verification through detailed QC. |
| Handoff | Actual browser: O continuation passed | All 19 final QC checks, release authorization, readiness, receiving person, final odometer and repair closure through UI. |
| Deposits, invoice, payment and print | O collected deposit, issued invoice, applied deposit, collected final balance and replayed exact payment; five exact PDF/print checks passed in O continuation | Collect synthetic deposit, explicit invoice application, pay remaining balance, exact receipt/PDF/print replay, rejected and denied requests. No processor or real funds. |

### Run evidence

- **G: 18/18 passed**, history plus saved visual/preview suites; log `work/repair-workflow-history-preview-g.log`, output `work/repair-workflow-artifacts/history-preview-g`, schema `dispatch_board_e2e_visual_20261114_workflow_g`, port 3109. Desktop/mobile preliminary quote screenshots are in `work/saved-visual-artifacts/dispatch_board_e2e_visual_20261114_workflow_g/`.
- **H: 1 failed, 4 not run**. Test used an inaccessible exact label around the parts formatting toolbar; corrected to the actual textarea placeholder. No business success claimed.
- **I/J/K: failed harness/precondition attempts**, not acceptance passes. I: textarea save timing and duplicate diagnosis label; J: PO already issued and wrapped select label; K: missing synthetic PARTS_OPERATIONS flag and cold quote compilation. Fresh schema `dispatch_board_e2e_readiness_20261114_workflow_i`; log `work/repair-workflow-readiness-i.log`. SQL migrations deploy normally; fixture asserts deposit CHECK constraints and immutable-history trigger exist. Results are superseded by later runs.
- Existing previews 3002/F and 3003/B remain untouched. No production access, commit, push or deployment.

- **L and M: each 1 passed (parts), 1 failed (journey), 3 dependent checks not verified.** L was blocked by the operating-rhythm modal; M reached actual technician completion and exposed the quick-QC peer-verification UX gap. M log: `work/repair-workflow-readiness-m.log`.
- **N: journey failed at an ambiguous pause-field locator; corrected before O**, schema `dispatch_board_e2e_readiness_20261114_workflow_n`, log `work/repair-workflow-readiness-n.log`, output `work/repair-workflow-artifacts/readiness-n`.
- Seeded administrative prerequisites: synthetic identities/open RO/saved quote, enabled organization flags, independently attributed catalog-policy fixture, technician skill and bay service-information capability. No job completion, finished clock, QC pass, purchase order or receiving record is seeded for the expanded browser journey.
- Peirce separately reported `src/tests/integration/repair-deposit-transactions.test.ts` passing against a fresh disposable database with all 192 migrations: collection/refund/application/reversal, immutable hashes, denials, rollback and concurrent collections/applications. This is integration evidence, not browser evidence or a claim of an apply-versus-payment race test.

- **O: 1 failed, 3 dependent checks skipped.** All journey assertions through settled invoice and exact payment replay passed. Handoff expected an obsolete QC toggle; the actual page presents the 19-item Final Frontline QC checklist. Continuation uses existing schema `dispatch_board_e2e_readiness_20261114_workflow_o` without migrations/reset/seeding. Log `work/repair-workflow-readiness-o-resume.log`; handoff and print passed (2); two denial checks first hit the closed-order guard, then passed against the still-open synthetic parts RO (2/2). No permission assertion was weakened. Original O log: `work/repair-workflow-readiness-o.log`. Desktop/mobile linked quote review and detailed QC screenshots are in `work/repair-readiness-artifacts/dispatch_board_e2e_readiness_20261114_workflow_o/`.

### Final browser outcome

- G history/saved-visual/preview: **18/18 passed**. Parts purchasing/partial receiving: **1 distinct passing case**, repeated successfully in L and M.
- O's long journey passed all assertions through settled payment before its obsolete handoff locator failed. O continuation then **passed handoff and exact-document PDF/print (2)**; targeted O-denies **passed permission and rollout checks (2/2, 10.6 seconds)**. This is combined evidence across targeted runs, not a claim of a single clean full-suite run.
- All nine visible workflow stages now have actual browser evidence within the scoped synthetic diagnostic scenario; parts purchasing/receiving uses a separate synthetic repair. No operational completion or QC pass was seeded.
- Print proof covers exact ESTIMATE, DEPOSIT, INVOICE, DEPOSIT_APPLICATION and PAYMENT documents: actual PDF endpoint responses, PDF signatures, exact document links, generated print-frame content and unchanged database hashes. Native OS print dialogs alone were stubbed; no physical printer or external payment processor was exercised.
- Each of those five documents has desktop and 390px screenshots. Automated mobile overflow assertions passed. Deposit desktop and final-payment mobile screenshots were visually reviewed: identity and amounts remain readable, controls visible, no horizontal overflow.
- Final payment was $158.75 after $25.00 deposit credit against the $183.75 invoice; remaining balance $0.00. Frozen original deposit receipt correctly retains its original $25.00 unapplied snapshot.
- Resume used existing schema `dispatch_board_e2e_readiness_20261114_workflow_o`, original repair `cmwhc2fuk0014pjkkbcma23cz`, port 3109. It performed no migration, reset or seeding and preserved existing demo metadata. Runner exited 0 and stopped its owned Next server, restoring generated TypeScript configuration files. Previews 3002/F and 3003/B were not modified.
- Final logs: `work/repair-workflow-readiness-o-resume.log` and `work/repair-workflow-readiness-o-denies.log`. Artifact directory: `work/repair-readiness-artifacts/dispatch_board_e2e_readiness_20261114_workflow_o/`. Scoped readiness TypeScript diagnostics: 0; focused readiness ESLint passed.
- Remaining coverage limits: not every catalog service, role, store configuration, physical repair, parts installation/returns, or external processor. Administrative prerequisites were seeded as listed above. No outstanding blocker remains for this scoped acceptance journey. No production/source edits, commit, push or deployment were performed by the browser-test agent.

### Master rollout regression

Fresh synthetic schema `dispatch_board_e2e_readiness_20261114_master_b`: **1/1 browser regression passed (38.4s)**. Service Advisor uses its actual seeded role defaults, with no extra capability grants. Global MASTER/SHOP/PARTS OFF returns exact `MASTER_DISABLED` on inspection save; no inspection or financial/document snapshot changes. Enabling those flags only at the synthetic repair location allows the same UI save (201), producing exactly one inspection. Sales mutation remains 403. Advisor can read the other store by role (200), but its mutation still returns `MASTER_DISABLED` (400), with zero inspection records. Global flags remain OFF. Initial A run incorrectly expected cross-store read denial; B corrects the role assumption without weakening the rollout or mutation assertions.

Read-only verification of existing preview F after the lead's audited local settings update: repair `e097b9a8-9c8f-4c6c-a5e1-f3a38b9f9d7f` billing GET returned 200, `canManage: true`, `mutationAvailability: { allowed: true, reason: null }`. No user repair mutation was performed. The pre-fix F configuration was independently read by Peirce/lead; this agent reproduced the disabled state only on synthetic data. This focused regression proves inspection-save recovery, not a new full non-manager estimate-to-payment journey.

Log: `work/repair-workflow-master-b.log`. Screenshots: `work/repair-readiness-artifacts/dispatch_board_e2e_readiness_20261114_master_b/master-disabled-advisor.png` and `master-enabled-advisor.png`. Test runner exited 0, stopped port 3109 and restored generated configuration. Existing preview 3002 and its new cache were untouched.

### Blocked billing feedback browser regression

**1/1 passed (12.9s)** against existing isolated O schema. Non-admin explicitly authorized synthetic billing user sees the exact master-rollout blocking reason and saved-document guidance, disabled invoice/deposit controls with accessible reason references, and no unauthorized settings link. At 390px the page has no horizontal overflow. Recheck performs GET only: blocked state remains while OFF, then disappears and eligible fields enable after restoring the original synthetic flag. Captured billing POST count is zero; original repair/document/financial snapshot is unchanged. Flag restored in finally, runner exited 0 and stopped its own port 3109 server. No F grants or user records changed. Peirce owns the separate real-service staff matrix; this check does not duplicate or claim that coverage.

Log `work/repair-workflow-billing-feedback.log`; screenshot `work/repair-readiness-artifacts/dispatch_board_e2e_readiness_20261114_workflow_o/billing-blocked-feedback-390.png`.
