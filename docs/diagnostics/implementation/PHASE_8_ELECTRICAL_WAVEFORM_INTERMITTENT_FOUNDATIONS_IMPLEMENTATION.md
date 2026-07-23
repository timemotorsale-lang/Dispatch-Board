# Phase 8 - Electrical, Waveform, and Intermittent Foundations Implementation

**Status:** Implemented in source; shadow foundations only, not live execution  
**Branch:** `codex/diagnostics-phase-8-electrical-waveform-intermittent-foundations`  
**Gate:** `DG-G9` candidate coverage group

## Outcome

This grouped Phase 8 slice starts the next advanced diagnostic coverage group:

- electrical circuit diagnosis;
- waveform analysis;
- intermittent fault investigation.

The implementation follows the governed advanced-family pattern: generic topology, authorized-source requirements, safety-first rules, explicit exclusions, and initial measurement-first test definitions. It does not add scenario proof corpora, next-test readiness, technician review UI, acknowledgement capture, persistence, pilot evidence, production rollout, or AI activation.

## Implemented Source

- `src/server/diagnostics/phase-8-electrical-waveform-intermittent-foundations.ts`
- `src/server/diagnostics/index.ts`
- `src/tests/unit/diagnostics-phase-8-electrical-waveform-intermittent-foundations.test.ts`

## Coverage

The slice creates three governed knowledge packages:

1. `ELECTRICAL_CIRCUIT_FOUNDATION`
2. `WAVEFORM_ANALYSIS_FOUNDATION`
3. `INTERMITTENT_FAULT_FOUNDATION`

It also creates nine initial test definitions:

- electrical safe-state and visual inspection;
- electrical voltage drop under load;
- electrical continuity and isolation check;
- waveform scope setup and capture;
- waveform timing correlation capture;
- waveform transducer comparison capture;
- intermittent reproduction plan;
- intermittent trigger data capture;
- intermittent controlled wiggle or thermal screen.

## Authority Boundary

This grouped slice does not authorize:

- live test execution;
- high-voltage live work;
- airbag or pyrotechnic circuit probing/service;
- module programming;
- vehicle-specific wiring or known-good waveform claims without licensed source;
- uncontrolled road tests;
- customer-unapproved extended monitoring;
- harness damage inducement;
- repair authorization, dispatch, customer-facing conclusions, controlled pilot, production rollout, or AI activation.

## Verification

Focused tests verify:

- all three knowledge packages are created with governed checksums;
- all nine initial test definitions are created;
- vehicle-specific limits remain required for interpretation;
- source rights fail closed;
- independent review is required before shadow release;
- electrical, waveform, and intermittent hazards and exclusions remain explicit.
