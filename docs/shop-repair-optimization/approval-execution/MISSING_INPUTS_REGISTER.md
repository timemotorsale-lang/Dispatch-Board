# SRO Missing Inputs Register

**Status:** All eight input packets open
**Rule:** These packets organize required facts; they do not replace the 79 individual decisions

| Packet | Decisions | Exact inputs required | Safe restriction until supplied | Owner required |
| --- | --- | --- | --- | --- |
| `SRO-IN-01` Charter/authority | `001`–`009` | Confirm mission/scope, lane owners, role roster/backups, separation, location/cohort, modes, pilot/pause/rollback authorities | `L0 Observe`; no pilot | GM/Operations + program owners |
| `SRO-IN-02` Operating model | `010`–`019` | Current/target states, classes, queues, WIP values, readiness inputs, blocker/interruption rules, commitment effects, manual runbook | Existing manual operating process | Shop + Dispatch + staff owners |
| `SRO-IN-03` Capacity/dispatch | `020`–`029` | Calendars, skills/certifications, equipment matrix, buffer, duration data, ranking/weights, risk thresholds, fairness/measurement definitions | No algorithmic dispatch or promise | Shop/Dispatch + qualification/resource/data owners |
| `SRO-IN-04` Parts/quality | `030`–`039` | Parts state definitions, sources/ETA, interchange authority, scope-change process, sublet controls, evidence/QC/road-test templates, recovery policy | No readiness/release recommendation | Parts + Shop + QC/Safety + Finance |
| `SRO-IN-05` Pricing/finance | `040`–`049` | Current cost/price sources, parts curves, labor matrices, floors/ceilings, attributes, tax/fee rules, presentation, limits, reapproval and reconciliation | Existing authorized manual pricing only | Finance/Controller + qualified compliance |
| `SRO-IN-06` AI/evidence/privacy | `050`–`059` | Use cases, consent/jurisdiction, schema, sources, human review, provider/security/retention, incidents and fallback | AI/recording/provider processing off | Privacy/Security + IT + Shop/Evidence |
| `SRO-IN-07` Customer intelligence | `060`–`069` | Signals/bands, owner/targets, correction, compensation authority, message purposes, mileage/OEM sources, prediction validation, consent/suppression | No automated flag, prediction or outreach | Customer/Advisor + Privacy/Compliance + Data |
| `SRO-IN-08` Data/pilot/activation | `070`–`079` | Field source map, freshness/conflict/degraded rules, integration ownership, KPIs, shadow thresholds, acceptance owners, first slice, training, monitoring and final signers | `NO_GO` | All domain, pilot and activation authorities |

## Cross-packet critical gaps

- Exact Shop Manager, dispatcher/foreman, Advisor, Parts, QC, algorithm, IT/integration, customer-experience and qualified compliance authorities are not supplied.
- Eli Aswan's prior ultimate authority and Brock Harris's prior Inventory authority require explicit Shop/Recon scope confirmation.
- Genuine independent QC, financial, safety, privacy and policy reviews cannot be satisfied by self-review.
- Exact location resources, staff qualifications, financial matrices/limits, safety procedures, consent rules, provider contracts and source mappings are absent.
- No tabletop participant/acceptance roster, shadow threshold, implementation slice or activation evidence exists.

Each gap preserves the associated ledger safe default.
