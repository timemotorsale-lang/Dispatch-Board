# Phase 1 Implementation Decision — Enterprise Vocabulary and Registry

**Status:** Implemented foundational contract  
**Decision date:** 2026-07-14  
**Scope:** Semantic interoperability only  
**Behavioral activation:** None

## Exact use case and outcome

The CCC and its consoles need stable shared meanings for work, commitments, dependencies, evidence, decisions, events, and outcomes. The required outcome is that a record can cross a console boundary without changing meaning or falsely claiming authority.

This phase creates:

- a canonical concept dictionary
- stable CCC console identities and accountable owner roles
- enterprise reason-code and event-type registries
- source-authority mappings for current and planned consoles
- conservative translations from existing Dispatch codes into shared meanings
- deterministic enterprise record references
- validation tests that prevent duplicate or malformed registry identities

It does not rank, score, schedule, assign, escalate, automate, or use AI.

## Domain and policy ownership

The **General Manager** is the enterprise policy-owner role. Each console definition identifies its accountable domain-owner role. Domain owners retain authority over domain-specific lifecycle, event, reason, and evidence meanings. The CCC architecture owner governs enterprise identity, interoperability, and registry compatibility.

Owner roles are used instead of personal names so governance survives staffing changes. Assignment of a person to a role remains an administrative control outside this phase.

## Authoritative inputs

- [`Enterprise Optimization Constitution`](../ENTERPRISE_OPTIMIZATION_CONSTITUTION.md)
- [`Common Work and Service Model`](COMMON_WORK_AND_SERVICE_MODEL.md)
- current Prisma domain models
- existing enterprise command, domain-event, audit-event, and outbox foundations
- approved CCC shell hierarchy and implementation-status record

The executable source mappings are declared in `src/server/enterprise-optimization/mappings.ts`. A mapping labels information as canonical, governing, evidentiary, derived, advisory, delivery, or planned. The enterprise layer does not silently promote a projection or external signal into a source of truth.

## Hard rules and permissions

1. Enterprise identifiers are stable and unique.
2. Existing codes are not repurposed with a different meaning.
3. Deprecated codes remain readable and point to an approved replacement.
4. Planned consoles cannot claim current record authority.
5. Derived projections disclose their authoritative inputs.
6. Domain permissions remain in force; a shared definition grants no additional data access.
7. HR, payroll, legal, accounting, compliance, and protected evidence remain unavailable to a console unless separately authorized.

## Output and explanation contract

The phase returns definitions and mappings, not recommendations. Every registry record contains a stable code, human meaning, lifecycle, and category or identity rule. Every source mapping contains its module, console, domain record, location, authority class, data classification, covered concepts, and boundary note.

## Persistence and audit design

Phase 1 is source-controlled configuration. No database table or migration is added. Changes are reviewed through version control, and future runtime registry administration must preserve immutable change evidence before it can supersede these contracts.

Existing `EnterpriseDomainEvent` and `EnterpriseAuditEvent` records remain the event and audit persistence foundations. This phase does not rewrite prior events.

## UI and failure states

There is no new UI in Phase 1. Future UI consuming these contracts must distinguish:

- unknown code
- deprecated code
- missing mapping
- planned source
- derived or advisory information
- permission-denied information
- stale or conflicting information

An unknown registry code must remain visible as unknown; it must not be relabeled as a familiar value.

## Tests and validation scenarios

Contract tests verify:

- concept, console, reason, event, and mapping uniqueness
- required definitions and identity rules
- code naming rules
- event schema versions
- deprecated-code replacement integrity
- mapping references to known concepts and consoles
- truthful planned-source and derived-project classifications
- deterministic cross-console record references

## Rollout and rollback

The contracts are initially consumed only by new enterprise-optimization work. Existing features continue unchanged. Rollback is removal or reversion of the registry commit; there is no data migration or production state conversion.

## Measures and review window

Phase 1 is accepted when:

- all current target modules have a source mapping
- all planned consoles explicitly disclose the absence of a source of truth
- all registry tests pass
- no existing application behavior changes
- architecture and implementation-status records identify the registry as the semantic baseline

The registry must be reviewed whenever a console is activated, an authoritative source changes, or a stable code is added or deprecated.

## Decision

Adopt a typed, source-controlled semantic registry above existing domain records. Do not create a universal enterprise database record or replace domain-specific registries. Translation into enterprise meanings happens at domain boundaries and must retain provenance.
