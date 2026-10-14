# Technician Troubleshooting Console Planning Package

**Status:** Adopted planning package  
**Date:** 2026-07-25  
**Parent source of truth:** [`../TECHNICIAN_TROUBLESHOOTING_CONSOLE_UI_SOURCE_OF_TRUTH.md`](../TECHNICIAN_TROUBLESHOOTING_CONSOLE_UI_SOURCE_OF_TRUTH.md)  
**Target branch:** `codex/technician-troubleshooting-console`

## Purpose

This package defines the architecture, roadmap, milestones, workflows, algorithms, and diagnostic logic needed to build the Technician Troubleshooting Console as an enterprise-grade diagnostic workspace.

The console must help technicians and service teams move from complaint to verified cause through structured evidence, guided test planning, known-issue awareness, and controlled handoff. It must remain useful without AI and become AI-ready later without letting AI bypass evidence, safety, licensing, or human authority.

## Read order

1. [`ARCHITECTURE.md`](ARCHITECTURE.md) — system boundaries, domain modules, data model, integration points, authority model, and source/licensing posture.
2. [`ROADMAP_AND_MILESTONES.md`](ROADMAP_AND_MILESTONES.md) — safe implementation sequence, milestone gates, rollout slices, acceptance criteria, and pilot strategy.
3. [`ALGORITHMS_AND_DIAGNOSTIC_LOGIC.md`](ALGORITHMS_AND_DIAGNOSTIC_LOGIC.md) — deterministic reasoning, symptom normalization, known-issue matching, ranking, test selection, evidence gates, and learning loop.
4. [`WORKFLOWS_AND_RULEBOOK.md`](WORKFLOWS_AND_RULEBOOK.md) — technician, advisor, manager, parts, and verification workflows plus operational rules.

## Non-negotiable product decisions

- The console is evidence-first, not chat-first.
- AI/Master Technician assistance remains gated until explicitly approved.
- Recall, service-bulletin, common-cause, and known-issue matches are clues, not confirmed diagnoses.
- The system must clearly separate raw evidence, technician interpretation, suspected cause, confirmed cause, repair recommendation, and verified repair.
- Licensed service information, OEM diagrams, labor times, part numbers, bulletins, and proprietary procedures require lawful access before production use.
- The console must support multiple diagnostic domains through one engine and many rule packs.

## Target capability standard

The target is not merely “find possible causes.” The target is a governed diagnostic operating console that can:

- structure a vague customer concern;
- identify missing information;
- check known vehicle intelligence;
- propose safe next tests;
- capture measurements and observations;
- explain why a cause is supported, contradicted, or still unknown;
- package advisor-ready findings;
- support training, review, and continuous improvement;
- prepare for future AI assistance without depending on AI for correctness.
