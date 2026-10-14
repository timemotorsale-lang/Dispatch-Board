# Enterprise Vocabulary, Event, and Reason Registry Catalog

**Status:** Phase 1 source of truth  
**Version:** 1.0  
**Established:** 2026-07-14  
**Executable contract:** `src/server/enterprise-optimization/`

## Registry rules

- Codes are stable identities, not display labels.
- A code's meaning cannot be changed after use.
- A retired code is deprecated rather than deleted or reused.
- Domain codes remain valid inside their domains; enterprise codes provide shared meanings at cross-console boundaries.
- Registry membership does not grant permission or authorize action.

## Canonical concepts

The canonical concept identities are:

`BUSINESS_OUTCOME`, `BUSINESS_CAPABILITY`, `SERVICE`, `CONSOLE`, `WORKFLOW`, `WORK_ITEM`, `COMMITMENT`, `RESOURCE`, `DEPENDENCY`, `RISK`, `EXCEPTION`, `EVIDENCE`, `DECISION`, `EVENT`, and `OUTCOME`.

Their binding definitions and identity rules are maintained in `domain.ts` and correspond to the [`Common Work and Service Model`](COMMON_WORK_AND_SERVICE_MODEL.md).

## Console identities

| Code | Console | State | Domain-owner role |
| --- | --- | --- | --- |
| `DISPATCH` | Dispatch Board | Live | Dispatch Operations Owner |
| `TIME_ATTENDANCE` | Time and Attendance | Planned | Payroll and Timekeeping Owner |
| `PEOPLE_HR` | People and HR | Planned | People Operations Owner |
| `COMPLIANCE` | Compliance | Planned | Compliance Owner |
| `LEGAL_ACCOUNTING` | Legal and Accounting | Planned | Legal and Accounting Operations Owner |
| `LIBRARY_TRAINING` | Library and Training | Planned | Knowledge and Training Owner |
| `INSIGHTS` | Insights | Foundational | Reporting and Insights Owner |
| `ADMINISTRATION` | Administration | Foundational | System Administration Owner |

“Foundational” means supporting architecture or surfaces exist; it does not represent a completed operational console.

## Reason-code families

| Family | Meaning |
| --- | --- |
| `DATA.*` | Sufficiency, freshness, consistency, provenance, or authority of inputs. |
| `ELIGIBILITY.*` | Qualification, availability, or scope of a candidate or alternative. |
| `POLICY.*` | Mandatory rule and approval gates. |
| `COMMITMENT.*` | Deadline pressure or breach of a governed promise. |
| `DEPENDENCY.*` | Prerequisite blockage or downstream unlock value. |
| `CAPACITY.*` | Effective-capacity or work-in-progress constraints. |
| `RISK.*` | Mandatory control or materially changed exposure. |
| `AUTHORITY.*` | Actor, system, or human-review authority constraints. |
| `EXECUTION.*` | Failure to verify intended execution. |
| `OUTCOME.*` | Missing verification for a claimed result. |

The initial registry is deliberately small. Domain-specific explanations should remain in domain registries unless the meaning is genuinely shared across consoles.

## Event-type families

| Family | Initial shared events |
| --- | --- |
| `enterprise.work.*` | created, state-changed, owner-changed, blocked, unblocked |
| `enterprise.commitment.*` | recorded, changed, fulfilled, breached |
| `enterprise.dependency.*` | recorded, satisfied |
| `enterprise.evidence.*` | attached, verified |
| `enterprise.decision.*` | evaluated, approved, overridden, executed |
| `enterprise.exception.*` | opened, escalated, resolved |
| `enterprise.outcome.*` | verified |

Each definition has schema version `1`. An evaluation event does not imply approval or execution. A state projection does not replace immutable event or audit evidence.

## Initial domain translations

Existing domain codes are translated only when their meaning is genuinely equivalent:

| Domain code | Enterprise code | Disposition |
| --- | --- | --- |
| Dispatch `TASK_CREATED` | `enterprise.work.created` | Direct |
| Dispatch `STATUS_CHANGED` | `enterprise.work.state-changed` | Direct, retaining prior and next state context |
| Dispatch `DAILY_BOARD_GENERATED` | None | Domain-only workflow event |
| Dispatch `MANAGER_REVIEW_NEEDED` | `AUTHORITY.HUMAN_REVIEW_REQUIRED` | Direct |
| Dispatch duty, role, template-owner, and workflow-area matches | None | Domain-only assignment explanations |

“Domain-only” is intentional. It prevents a local explanation from being promoted into a misleading enterprise rule.

## Change procedure

1. Show that the meaning is shared across domains or required for enterprise coordination.
2. Identify the policy owner and affected domain owners.
3. Define the code, meaning, payload contract, privacy classification, and compatibility impact.
4. Add validation and translation tests.
5. Use a new code or schema version for an incompatible change.
6. Deprecate old codes with a replacement; never repurpose them.
