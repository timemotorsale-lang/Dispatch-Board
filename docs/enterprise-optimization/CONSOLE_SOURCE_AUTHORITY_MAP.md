# Console and Source Authority Map

**Status:** Phase 1 source of truth  
**Established:** 2026-07-14  
**Executable mapping:** `src/server/enterprise-optimization/mappings.ts`

## Authority meanings

| Authority | Meaning |
| --- | --- |
| Canonical | The approved system record for the stated subject and scope. |
| Governing | The approved policy or control record that determines allowed behavior. |
| Evidentiary | Immutable or controlled support for facts, actions, and decisions. |
| Derived | A reproducible projection or calculation from disclosed sources. |
| Advisory | A signal that may inform but cannot authorize a decision. |
| Delivery | A transport or execution provider that does not own the business fact. |
| Planned | No implemented source currently has authority for the stated domain. |

## Current Dispatch mappings

| Module | Domain record | Authority | Enterprise interpretation |
| --- | --- | --- | --- |
| Dispatch Board | `BoardDay` | Canonical | Daily board identity and generation state. |
| Tasks and My Tasks | `Task` | Canonical | Current accountable executable-work record. |
| Activity | `ActivityEvent` | Evidentiary | Dispatch activity evidence, not the enterprise audit ledger. |
| Appointments | `Appointment` | Canonical | Appointment lifecycle, schedule, and commitment context. |
| Customers | `Customer` | Canonical | Operational customer identity within the application boundary. |
| Projects | `Task.projectArea` projection | Derived | Task organization; no independent Project source of truth is claimed. |
| Vehicles | `Vehicle` | Canonical | Governed operational vehicle identity. |
| Inventory | `InventoryUnit` | Canonical | Retail inventory lifecycle record. |
| Enterprise history | `EnterpriseDomainEvent` | Evidentiary | Immutable enterprise domain occurrence history. |
| Enterprise audit | `EnterpriseAuditEvent` | Evidentiary | Actor, reason, before, after, and correlation evidence. |

Insights uses derived, reproducible projections from governed domain sources. It does not own or silently rewrite the facts it presents.

These classifications are bounded. For example, the application Customer record does not automatically become authoritative for an external DMS or accounting provider, and an integration response remains subject to its configured authority.

## Planned-console mappings

| Console | Current authority | Phase 1 boundary |
| --- | --- | --- |
| Time and Attendance | Planned | No application record is authorized as the timekeeping or payroll source of truth. |
| People and HR | Planned | No application record is authorized as an HR system of record. |
| Compliance | Planned | Task reminders do not constitute a compliance source of truth. |
| Legal and Accounting | Planned | No application record is an accounting ledger or legal matter source of truth. |
| Library and Training | Planned | Files and tasks do not yet constitute controlled knowledge or competency evidence. |

Insights remains derived from governed sources. Administration governs configuration and control but does not become the canonical owner of every domain fact.

## Mapping rule

A future console cannot become live merely by changing its UI label. Activation requires an approved domain architecture defining identity, authority, permissions, lifecycle, evidence, events, retention, ownership, and outcome verification. Its Phase 1 mapping must then move from `PLANNED` to an accurate authority only after the source exists and passes validation.
