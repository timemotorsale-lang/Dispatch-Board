# DGN-017–018 Technician Workspace and Evidence Review Implementation

**Status:** Implemented in source; rollout disabled by default; technician usability validation pending  
**Branch:** `codex/diagnostics-dgn-017-018-technician-workspace`  
**Date:** 2026-07-21

## Delivered Scope

The approved `/diagnostics/cases/[caseId]` technician workspace now includes a shared-context laboratory environment and a permission-filtered evidence reconstruction model.

### DGN-017 — Shared-context technician labs

- Systems Explorer, Scan, Live Data, Electrical, Waveform, Mechanical, Hypothesis, Test Navigator, Intermittent, and Verification lab shells share the same case, concern, Repair Order, vehicle, plan, and aggregate version.
- Test Navigator displays the active immutable plan, definition version, procedure, prerequisites, hazards, tools, evidence requirements, risk tier, and execution state.
- Qualified users can start, pause, resume, complete, invalidate, repeat, and cancel tests through the DGN-016 purpose-specific commands.
- Start and repeat require explicit prerequisite and hazard confirmation; server-side definition, qualification, applicability, risk, and concurrency gates remain authoritative.
- Running and paused tests recover from persisted execution history after refresh or reconnection; the browser does not fabricate completion.
- Hardware-neutral lab shells disclose unavailable streaming, capture adapters, hypothesis reasoning, and verification functions instead of simulating results.
- Responsive controls, horizontally scrollable lab navigation, 48-pixel mobile actions, compact desktop panels, semantic labels, and accessible current-state attributes support shop-floor and expert review.

### DGN-018 — Evidence reconstruction and comparison

- The server builds a permission-filtered combined timeline for observations, measurements, governed attachments, and test-execution revisions.
- Measurement matrices retain normalized units, sample counts, range, latest value, and quality.
- Expected/actual comparison uses recorded normalized reference bounds and distinguishes within, above, below, invalid, and no-reference states.
- Review flags identify invalid, suspect, corrected, superseded, and implausible evidence without deleting it.
- Procedure-source freshness and rights status are derived from the immutable definition source envelope.
- Provenance shows raw-source, correction, measurement supersession, execution revision, and repeat lineage.
- The browser initially renders the latest 25 timeline events with explicit expansion for larger cases.
- Restricted evidence remains absent from the projection unless the viewer has the required capabilities.

## Honest Boundaries

This slice does not implement hardware adapters, live PID streaming, scan-tool control, waveform interpretation, hypotheses, automated consistency reasoning, calibrated confidence, conclusions, repair estimates, or post-repair verification authority. Those capabilities remain in their owning milestones.

DGN-019 remains responsible for the complete server-side data-quality, evidence-completeness, independence, applicability, instrument, safety, and test-readiness evaluator. The present UI surfaces DGN-015–016 gates but does not claim DGN-019 completion.

The approved visual direction remains provisional. Source implementation is not production approval and does not replace representative technician, accessibility, degraded-connectivity, or populated mobile/tablet browser validation.

## Verification

- Focused Diagnostics verification: 10 files and 37 tests passed.
- TypeScript validation passed.
- Lint passed with zero warnings.
- The optimized Next.js production build passed and generated all 172 static pages.
- Full repository suite: 250 files passed and 2 pre-existing Inventory Control Tower files failed; 1,379 tests passed and 2 pre-existing tests failed (1,381 total).
- The compiled `/diagnostics` route was reviewed in the local browser with no client console warnings or errors. The route failed closed with the documented service-health state because the DGN-007-009 `DiagnosticCase` migration is not applied to this local database; no diagnostic data was inferred. Populated desktop, tablet, mobile, accessibility, degraded-connectivity, and representative-technician validation therefore remain rollout gates.
