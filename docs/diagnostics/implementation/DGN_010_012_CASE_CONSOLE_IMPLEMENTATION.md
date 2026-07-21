# DGN-010–012 — Diagnostic Case Console Implementation

**Status:** Implemented in source; production rollout remains disabled  
**Branch:** `codex/diagnostics-dgn-010-012-case-console`  
**Implemented:** 2026-07-20

## Delivered scope

### DGN-010 — Diagnostics Command Center

- Added the independent `/diagnostics` destination to the Dispatch console hierarchy.
- Added a permission-filtered queue with vehicle, Repair Order, concern source, qualitative confidence, risk, age, blocker, ownership, version, next action, and freshness.
- Added search and status, risk, and ownership filters plus My Active, Waiting, Escalated, and Unassigned summaries.
- Added explicit populated, empty, restricted, stale-capable, rollout-held, loading, and unavailable presentation states.

### DGN-011 — Diagnostic case workspace

- Added `/diagnostics/cases/[caseId]` as the technician-facing concern workspace.
- Implemented the approved Concern → Evidence → Test → Cause → Verify stage shell, authoritative concern, reproduction/condition facts, one dominant next action, ownership, lifecycle commands, consistency/safety controls, traceability, and immutable timeline.
- Assignment and lifecycle commands reuse the DGN-008–009 purpose-specific APIs, idempotency keys, exact expected versions, server-side capabilities, and rollout gates.
- Version conflicts preserve the workspace and direct the technician to refresh before retrying.
- Evidence, hypotheses, scan, live-data, electrical, and waveform modules are visibly staged and never fabricate records before their owning milestones.

### DGN-012 — Repair Order bridge

- Added an Enterprise Diagnostics panel to the authoritative Repair Order Workbench.
- The panel lists governed case summaries and opens the technician workspace.
- When permitted and rollout-enabled, it creates a case from the canonical Repair Order concern through the existing diagnostic command service.
- The bridge does not copy diagnostic evidence, reasoning, conclusions, pricing, authorization, repair, QC, or release authority into the Repair Order UI.
- Restricted and unavailable bridge states do not infer or replace diagnostic facts.

## Authority and safety boundary

The console remains a technician tool. It does not expose advisor pricing, purchasing, customer authorization, QC acceptance, or vehicle release commands. Trouble codes, causes, confidence values, tests, and evidence are not synthesized by this slice. All mutations remain disabled while `DIAGNOSTICS_MASTER` or `DIAGNOSTIC_CASES` is held.

## Verification evidence

- Prisma schema validation passed.
- TypeScript typecheck passed.
- ESLint passed with zero warnings.
- Focused case-console, Repair Order workbench, navigation, domain, and service tests passed.
- The optimized Next.js production build completed and registered `/diagnostics` and `/diagnostics/cases/[caseId]`.
- In-app browser verification confirmed the independent navigation, Dispatch breadcrumb, route, and honest unavailable state against the currently running local process.
- Static rendered UI tests prove the populated queue signals, five-stage workspace, explicit empty evidence/hypothesis states, and absence of numeric diagnostic-confidence claims.

## Remaining gate evidence

`DG-G1` remains open until the DGN-007–009 migration is deployed to a test database, populated desktop/tablet/mobile browser states are exercised against that migrated runtime, keyboard and screen-reader checks are recorded, and technician usability approval is captured. The feature flags remain off by default.

Evidence/test execution, reasoning, conclusions, diagnosis publication, repair handoff, post-repair verification, knowledge ingestion, hardware adapters, the no-start engine, and AI remain outside this slice.
