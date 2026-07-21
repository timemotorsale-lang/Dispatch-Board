# Automotive Diagnostic Ontology and Knowledge Graph

**Version:** 1.0 governing planning baseline  
**Status:** Official pre-implementation specification; no graph behavior activated  
**Date:** 2026-07-20

## 1. Mission

Create a configuration-aware semantic model that lets the Diagnostics Console reason from a concern through systems, functions, components, failure modes, evidence, tests, causes, corrections, and verification without reducing diagnosis to code lookup or keyword matching.

```text
Vehicle configuration -> System -> Function -> Component -> Path
  -> Failure mode -> Effect/Symptom/DTC -> Evidence -> Test
  -> Interpretation -> Cause -> Correction -> Verification
```

## 2. Authority and Boundary

- Vehicle Registry remains authoritative for identity and installed configuration.
- Vehicle Evidence remains authoritative for governed files and captures.
- Repair Order remains authoritative for service/commercial lifecycle.
- Diagnostics owns diagnostic concepts and versioned semantic relationships.
- External/OEM facts retain their original authority; graph ingestion does not make them app-owned facts.
- The graph is initially implemented inside the modular monolith. A graph database is not required until measured query or scale needs justify it.

## 3. Canonical Concept Families

| Family | Required examples |
| --- | --- |
| Vehicle applicability | Year, make, model, engine, transmission, market, equipment, module, calibration, retrofit. |
| System/function | Starting, charging, combustion, cooling, braking, communication, restraint, ADAS, HVAC. |
| Physical entity | Component, connector, terminal, splice, ground, fuse, relay, line, hose, bus, gateway, fluid path. |
| Behavior/state | Commanded, actual, enabled, inhibited, awake, asleep, open/closed loop, fallback, learned. |
| Failure mode | Open, resistance, short, leakage, restriction, stuck, biased, noisy, intermittent, mechanical loss, configuration error. |
| Effect/evidence | Concern, symptom, DTC, observation, measurement, freeze-frame, waveform, image, scan session. |
| Diagnostic action | Test definition, prerequisite, hazard, test point, expected result, interpretation, discriminated hypothesis. |
| Resolution | Confirmed cause, correction, procedure, operation, verification, recurrence/comeback. |
| Governance | Source, license, version, applicability, approval, owner, effective date, withdrawal. |

## 4. Relationship Vocabulary

Required typed relationships include:

- `PART_OF`, `DEPENDS_ON`, `SUPPLIES`, `GROUNDS`, `CONNECTS_TO`, `COMMUNICATES_VIA`;
- `COMMANDS`, `FEEDBACK_TO`, `ENABLES`, `INHIBITS`, `PRECEDES`, `CAUSES_EFFECT`;
- `CAN_FAIL_AS`, `CAN_PRODUCE`, `CAN_TRIGGER_DTC`, `CAN_MASK`, `SHARES_COMMON_CAUSE`;
- `TESTS`, `MEASURES`, `DISCRIMINATES`, `SUPPORTS`, `CONTRADICTS`, `REQUIRES`;
- `CORRECTED_BY`, `VERIFIED_BY`, `APPLIES_TO`, `SUPERSEDES`, `DERIVED_FROM`.

Direction and semantics are explicit. Correlation relationships are never labeled causal without an approved causal model.

## 5. Knowledge Assertion Contract

Every node/edge assertion retains:

- stable identity and version;
- source owner/type, document/revision, field/page reference where permitted;
- license and redistribution classification;
- applicability expression and exclusions;
- effective/withdrawal dates;
- fact, expert-authored, derived, statistical, or inferred classification;
- author/reviewer and approval state;
- confidence meaning and evidence basis;
- checksum, import time, supersession, and affected-case path.

Assertions cannot silently merge when sources disagree. Conflicts remain queryable and require an approved resolution or source-specific presentation.

## 6. Query Capabilities

The graph must support:

- symptom/DTC/system entry to applicable failure modes;
- upstream/downstream dependency and common-cause analysis;
- power/ground/network/shared-resource tracing;
- candidate expected-effect generation;
- tests that distinguish selected hypotheses;
- component-to-procedure/specification/wiring/source navigation;
- affected vehicles/cases after source withdrawal;
- similar verified cases constrained by configuration and evidence;
- explanation paths suitable for technicians and audit.

## 7. Quality and Release

Release states: `DRAFT -> REVIEW -> APPROVED -> SHADOW -> ACTIVE -> SUSPENDED -> RETIRED`.

Quality gates require schema validation, referential integrity, applicability tests, cycle/contradiction checks, source/license review, qualified technical review, scenario traversal, explanation readability, performance bounds, and rollback. Safety-critical assertions require independent approval.

## 8. Initial Scope

The first graph slice covers starting, charging, and no-start functions, including battery energy, positive/ground paths, starter control and mechanical rotation, start request/interlocks, basic fuel/ignition/compression/synchronization branches, and network/security escalation boundaries.

## 9. Acceptance Gate

The ontology is implementation-ready when one approved no-start case can be traversed from exact vehicle configuration through system/function, competing failure modes, evidence, discriminating tests, conclusion, correction, and verification with complete source/version lineage and no unsupported causal edge.

