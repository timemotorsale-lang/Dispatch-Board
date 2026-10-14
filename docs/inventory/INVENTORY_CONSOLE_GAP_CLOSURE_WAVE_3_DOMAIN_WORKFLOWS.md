# Inventory Console Gap Closure — Wave 3 Domain Workflows

**Branch:** `codex/inventory-console-gap-closure-wave-3-domain-workflows`  
**Dependency:** Wave 2 lifecycle projections, included through the merged main line  
**Scope:** cross-domain workflow intervention and wholesale outcome calibration  
**Repository completion change:** 52 to 56 complete slices  
**Activation:** no provider, scheduler, notification delivery, deployment, or pilot activation

## Outcome

Wave 3 closes the repository acceptance gaps for IC-058, IC-067, IC-068, and IC-098. It adds `/vehicles/workflow-operations`, a read-only intervention queue over authoritative Acquisition, Frontline, Retail, Shop & Recon, Parts, and Wholesale records. Staff follow each item into its owning governed workspace; the queue cannot mutate workflow state or bypass authorization, expected-version, evidence, approval, separation-of-duty, event, outbox, or audit controls.

## Closed contracts

- **IC-058 — Post-release effects:** the existing suspend/reopen-for-correction path is now visible as owned intervention work. Reinstatement still requires the owning Frontline command and full independent review.
- **IC-067 — Retail reversal and reconciliation:** reconciliation holds and due compensation work now appear in a dedicated intervention queue. Existing commands remain idempotent and retain immutable mismatch and compensation history.
- **IC-068 — Retail completion projections:** Control Tower joins from Wave 2 are complemented by a complete cross-domain intervention view with due clocks, priority, owner, location, state, reason, and authoritative route.
- **IC-098 — Wholesale algorithms and outcomes:** closed acknowledged settlements are linked to expected net for observation count, signed bias, mean absolute variance, and within-tolerance rate. A sample below five is labeled `INSUFFICIENT_SAMPLE`; recommendations remain non-executing.

## Detection and execution boundary

- `DETECTION_ONLY_NO_BACKGROUND_EXECUTION`: due records are detected when the page is requested; no scheduler executes expiry, release, reconciliation, or provider commands.
- `OUTBOX_EVENTS_ONLY_NO_DELIVERY_PROVIDER`: existing accepted commands emit outbox evidence; Wave 3 does not claim email, SMS, vendor, carrier, accounting, or DMS delivery.
- `AUTHORITATIVE_WORKSPACES_ONLY`: every action routes to the owning workspace. The new page is not a generic workflow engine.
- Wholesale calibration reports observed repository facts and never changes price, channel, reserve, offer, or settlement state.

## Verification

- Pure tests cover deterministic exception-first priority and wholesale expected-versus-actual calibration.
- Render tests verify truthful capability labels and authoritative workspace routing.
- R4, R6, R8, R9, and Wave 3 focused regressions pass: 5 files and 36 tests.
- TypeScript and focused ESLint pass.
- The 121-slice audit reconciles at 56 complete, 44 partial, 17 external-evidence-required, and 4 decision-blocked.

## Stop boundary

Wave 3 adds no schema or migration. It does not contact providers, apply migrations, change rollout flags, run background commands, commit, push, merge, deploy, or claim pilot/operational completion. Scheduled execution, real notification delivery, provider replay, configured production thresholds, accessibility/performance evidence, and pilot approval remain in later gates.
