# DG-G0 — Foundation Gate Review

**Gate:** `DG-G0`  
**Review date:** 2026-07-20  
**Decision:** `APPROVED WITH HOLDS`  
**Authorized next scope:** `DGN-007` through `DGN-009` only

## Decision Summary

The Diagnostics foundation is sufficiently explicit to begin the additive case-core implementation. Architecture, authority, initial scope, source governance, measurement, pilot boundaries, domain contracts, and migration direction are accepted.

This decision does not approve a production pilot, reasoning-engine activation, licensed-data ingestion, diagnosis publishing, autonomous action, or AI. It authorizes only the durable case foundation, create/read behavior, assignment, lifecycle, blockers, escalation, reopen, and abandonment work in DGN-007 through DGN-009.

## Gate Evidence

| Milestone | Accepted evidence | Runtime claim |
| --- | --- | --- |
| [`DGN-001`](DGN_001_DOMAIN_AUTHORITY_AND_DIAGNOSIS_PUBLISHING_CONTRACT.md) | Independent bounded context, authority map, canonical Repair Order diagnosis bridge | None |
| [`DGN-002`](DGN_002_AUTHORITY_SAFETY_AND_ESCALATION_CONTRACT.md) | Roles, capabilities, risk tiers, separation of duties, escalation, denied scenarios | None |
| [`DGN-003`](DGN_003_NO_START_ONTOLOGY_SCOPE_AND_SCENARIOS.md) | Functional-chain ontology, explicit exclusions, initial no-start scope, 24 gold scenarios | None |
| [`DGN-004`](DGN_004_KNOWLEDGE_SOURCE_AND_LICENSE_REGISTER.md) | Source classes, rights/retention/withdrawal controls, first-source dispositions | No ingestion authorized |
| [`DGN-005`](DGN_005_BENCHMARK_MEASUREMENT_AND_PILOT_CONTRACT.md) | Balanced measures, baseline method, evaluation separation, bounded pilot and rollback contract | No benchmark result or pilot approval |
| [`DGN-006`](DGN_006_DOMAIN_COMMAND_SCHEMA_EVENT_AND_MIGRATION_CONTRACT.md) | Exact aggregate direction, commands, events, reason codes, staged schema, publication lineage, algorithm/lab and migration contracts | None |

## Accepted Decisions

- Diagnostics is an independent console and bounded context within Dispatch Board's modular monolith.
- `DiagnosticCase` owns diagnostic workflow detail; Shop Operations retains canonical Repair Order diagnosis authority.
- One Repair Order may have multiple concern-specific cases.
- A dedicated `DiagnosticPublication` relation will provide explicit case-to-`RepairDiagnosisVersion` lineage and case-specific supersession.
- Runtime schema will be additive and staged by vertical slice, beginning with case core only.
- Commands use the enterprise ledger, expected aggregate version, request hash, idempotency, audit, events, and outbox.
- Safety, qualification, source, applicability, data-quality, and separation-of-duty checks are server-side hard gates.
- Deterministic consistency and causal evaluation precede heuristic ranking; AI cannot override hard gates.
- Honest abstention, inconclusive, and no-fault-found outcomes are first-class.
- New Diagnostics rollout controls start `OFF`.

## Holds and Their Release Gates

| Hold | Effect now | Release requirement |
| --- | --- | --- |
| Vehicle-specific OEM procedures, wiring, DTC definitions, scan adapters, and reference waveforms have unresolved rights/applicability entries | No such content may be ingested, stored, derived, or activated | DGN-004 register entry changed from `HOLD` by source/data/legal owners; required before affected DGN-020 knowledge release |
| Numeric parity, quality, and pilot targets have no observed shop baseline | No invented success threshold and no production-readiness claim | Baseline collection and approved scorecard under DGN-005/DGN-038–DGN-040 |
| Runtime capabilities and risk gates do not yet exist | No diagnostic command is operational | Implemented and tested in owning DGN milestones |
| Reasoning, ranking, and conclusion algorithms do not yet exist | No automated diagnostic recommendation | DGN-019 through DGN-027 gates and gold-corpus acceptance |
| Publishing bridge is contractual only | No Diagnostics conclusion may write a Repair Diagnosis | DGN-028 atomicity, replay, supersession, and reconciliation acceptance |
| Verification and closed-loop handoffs do not yet exist | No claim of verified repair or operational optimization | DGN-029 through DGN-034 acceptance |
| AI is explicitly deferred | AI has no diagnostic authority or production role | DGN-048 through DGN-050, separate evaluation and promotion decision |

These holds do not block the DGN-007 case-core migration because that work stores shop-authored case identity and lifecycle records, not held diagnostic knowledge.

## Entry Controls for DGN-007

DGN-007 may implement only:

- additive case-core schema and indexes;
- organization/location/vehicle/Repair Order/concern integrity;
- immutable state-event persistence;
- repository/domain invariants;
- Diagnostics domain event and outbox mappings;
- feature definitions seeded `OFF`;
- migration, isolation, concurrency, audit, and recovery tests.

DGN-007 may not implement evidence, test plans, reasoning, conclusions, publication, repair recommendations, dispatch/parts automation, verification, knowledge ingestion, or AI.

## Mandatory Stop Conditions

Pause the next milestone if implementation requires weakening a foreign key, bypassing the enterprise command path, duplicating another domain's authority, silently backfilling legacy diagnoses, creating a generic mutation endpoint, enabling a feature by default, or storing a source whose rights/applicability status is `HOLD`.

## Gate Disposition

`DG-G0` is closed as **approved with documented holds**. The next recommended branch is:

`codex/diagnostics-dgn-007-009-case-core`

Before moving beyond DGN-009, complete `DG-G1` evidence for the independent console and operational case lifecycle as sequenced by the implementation milestones.
