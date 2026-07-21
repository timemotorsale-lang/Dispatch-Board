# DGN-046–048 — Console Workflow Integration Implementation

**Status:** Implemented in source  
**Branch:** `codex/diagnostics-dgn-046-048-console-workflow-integration`  
**Date:** 2026-07-21  
**Scope:** Diagnostic Console front-door integration, left-sidebar workflow navigation, advisor review landing page, autobody estimate landing page, and technician-to-advisor workflow visibility without production execution authority.

## Implemented Source

- `src/features/diagnostics/diagnostics-command-center.tsx`
- `src/features/diagnostics/advisor-review-console.tsx`
- `src/features/diagnostics/autobody-estimate-console.tsx`
- `src/app/(app)/diagnostics/advisor-review/page.tsx`
- `src/app/(app)/diagnostics/autobody-estimate/page.tsx`
- `src/components/layout/navigation.ts`
- `src/tests/unit/diagnostics-case-console.test.tsx`

## What DGN-046–048 Adds

DGN-046–048 turns the Diagnostics area from a case queue plus isolated pages into a clearer reviewable console experience.

It adds:

- a proper Diagnostics Command Center landing surface;
- workflow cards for Case Queue, Labor Guide, Advisor Review, Autobody Estimate, and Pilot Gate;
- left-sidebar Diagnostics navigation for Advisor Review and Autobody Estimate;
- an advisor review landing page for diagnosis-to-estimate handoff packets;
- an autobody estimate landing page for photo intake, damage mapping, insurance-quality draft planning, supplement risk, refinish, structural, and ADAS gates;
- explicit non-production authority boundaries on every new landing surface.

## DGN-046 — Console Runtime Integration

The existing `/diagnostics` runtime route now operates as the front door for the diagnostic console, not only as a queue.

The page still uses the existing server-side command-center model and preserves:

- permission-filtered case visibility;
- rollout hold messaging;
- case queue filters;
- links into governed technician case workspaces.

## DGN-047 — Advisor Review Workflow

The new `/diagnostics/advisor-review` page establishes the advisor review lane.

It exposes the intended flow:

1. confirmed diagnosis;
2. repair package;
3. estimate intelligence;
4. advisor decision.

It also names downstream DGN-044 review packet boundaries for repair estimate, parts, dispatch/capacity, customer/insurance review, and quality control.

## DGN-048 — Technician-to-Advisor and Autobody Workflow Visibility

The new `/diagnostics/autobody-estimate` page establishes the bodywork estimate review lane.

It includes:

- photo intake placeholders;
- damage-zone mapping;
- insurance-quality draft builder;
- body labor, refinish, structural, supplement, and ADAS gate language;
- a visible notice that photo-to-estimate, insurer submission, final estimate, and authorization request behavior remain gated.

## Authority Boundary

DGN-046–048 does not enable:

- customer-facing estimate presentation;
- insurer submission;
- official estimate mutation;
- final labor-time authority;
- parts ordering or reservation;
- technician dispatch or scheduling;
- QC closure;
- AI or photo-analysis authority.

## Verification

Tests verify that:

- the Diagnostics Command Center renders the new landing cards;
- existing case queue and technician workspace rendering remain intact;
- the Advisor Review page exposes DGN-044 downstream review packets and blocked actions;
- the Autobody Estimate page exposes photo intake, insurance-quality draft builder, ADAS gate, and insurer-submission block.
