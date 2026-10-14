# Workshop 2 Slice Readiness Matrix

**Status:** Documentation assessment; no slice approved for code or activation  
**Prepared:** 2026-07-16  
**Parent:** [`APPROVAL_WORKSHOP_02F_CONSOLIDATED_DECISION_READOUT.md`](APPROVAL_WORKSHOP_02F_CONSOLIDATED_DECISION_READOUT.md)  

## 1. Purpose

This matrix applies the global Workshop 2 decisions and gaps to all nine Inventory-to-Frontline slices. It prevents a strong catalog from being mistaken for policy, technical, pilot, or activation readiness.

## 2. Readiness dimensions

Each slice must independently pass:

| Dimension | Required result |
| --- | --- |
| Scope/handoff | Approved start, outcome, predecessor, consumer, cancellation/reversal boundary |
| People | Named owner/executor/approver/verifier/backups with qualification and coverage |
| Authority | Exact capabilities, separation, limits, exceptions, and non-waivable boundaries |
| Evidence/security | Approved requirements, criticality, source, freshness, access, retention, correction |
| Timing/coverage | Approved clocks, pauses, escalation, notification, after-hours/overload behavior |
| Data/integration | Canonical identity, field authority, provider mappings, conflict, degraded/fallback/reconciliation |
| Slice policy | Applicable slice-specific Approval Register decisions resolved |
| Acceptance | Scenarios trace to tests/evidence owners and pass |
| Pilot/activation | Cohort, training, monitoring, incident, pause/rollback, authorization |

## 3. Consolidated slice result

| Slice | Lifecycle boundary | Workshop 2 dependencies | Slice-specific decisions | Current result |
| --- | --- | --- | --- | --- |
| 1 | Acquisition/Transportation → Receipt handoff | `020`-`065`, especially all first-slice decisions | Workshop 1 `001`-`015`,`070`-`075`; later applicable first-slice decisions | `DOCUMENTATION_READY_FOR_APPROVAL`; `NO-GO FOR CODE` |
| 2 | Receipt/Custody → Inspection handoff | Roles, custody/identity, evidence/access, timing, sources | `080`-`089` | `CATALOG READY`; `NO-GO FOR WORKSHOP 3 APPROVAL` |
| 3 | Inspection/Triage → Recon/alternate handoff | Inspector roles, evidence, safety, timing, identity/source | `090`-`099` | `CATALOG READY`; `NO-GO FOR WORKSHOP 3 APPROVAL` |
| 4 | Recon Planning/Approval → executable jobs | Financial authority, economics, roles, evidence, clocks, source | `100`-`109` | `CATALOG READY`; `NO-GO FOR TECHNICAL DESIGN` |
| 5 | Parts/Repair Execution → QC handoff | Purchase authority, parts/technician roles, evidence, timing, integrations | `110`-`119` | `CATALOG READY`; `NO-GO FOR TECHNICAL DESIGN` |
| 6 | Quality/Safety Verification → operational release/handoff | Independent QC, road test, safety evidence, rework/release authority | `120`-`129` | `CATALOG READY`; `NO-GO FOR TECHNICAL DESIGN` |
| 7 | Title/Document Readiness → downstream handoff | Qualified legal/title roles, restricted evidence, records, provider sources | `130`-`139` | `CATALOG READY`; `NO-GO FOR TECHNICAL DESIGN` |
| 8 | Merchandising/Pricing → Frontline review | Content/price authority, evidence/privacy, channels, reconciliation | `140`-`149` | `CATALOG READY`; `NO-GO FOR TECHNICAL DESIGN` |
| 9 | Frontline Release Review → availability/suspension | Independent release, all-source freshness, atomic transition, reconciliation | `150`-`159` | `CATALOG READY`; `NO-GO FOR TECHNICAL DESIGN` |

## 4. Slice 1 — Acquisition and Transportation

### Required before technical design

- Workshop 1 program, scope, pilot, trigger, location/method, hard-gate, and rollback decisions resolved;
- Workshop 2 `020`-`065` applicable decisions approved or safely deferred;
- named case owner, coordinator, transport authority, monitor, receiver, backups, and after-hours path;
- exact currency/limits/quotes/reapproval/aggregation/emergency/economics rules;
- acquisition/transport clocks and escalation/notification coverage;
- all 16 evidence requirements approved;
- internal driving either fully approved or absent;
- acquisition, identity, location/custody, and provider field mappings approved;
- handoff envelope and Receipt acceptance/rejection contract designed;
- `AT-ACC-001` onward acceptance owners assigned.

### Current blockers

`W2-GAP-001` through `033` as applicable. All 32 Workshop 2 decisions remain open. Result: `NO-GO FOR CODE`.

## 5. Slice 2 — Receipt and Custody

### Additional required decisions

- `ITF-APR-080` distinction among arrival, observation, intake, custody acceptance, receipt completion;
- `081` roles/coverage/temporary containment;
- `082` identity/odometer/arrival/custody evidence;
- `083` keys/documents/accessories and custody;
- `084` arrival-condition evidence;
- `085` movement/safety/EV/hazard boundaries;
- `086` discrepancy taxonomy/materiality;
- `087` correction/claim/return/risk authority;
- `088` completion gate;
- `089` inspection handoff/target/capacity waiting.

### Workshop 2 dependencies

Identity, receiving/custody roles, restricted evidence, location/custody sources, calendars/after-hours, conflict/quarantine, notifications, and provider arrival mapping.

Result: ready to prepare Workshop 3 decisions; not ready to approve while predecessor authorities remain unresolved.

## 6. Slice 3 — Inspection and Triage

### Additional required decisions

- `ITF-APR-090` performed versus accepted versus assigned distinction;
- `091` templates/applicability/publisher;
- `092` roles/qualifications/independence;
- `093` identity/custody/safe-access prerequisites;
- `094` inspection execution/interrupt/transfer;
- `095` item results/measurements/tolerances/evidence;
- `096` critical finding/containment;
- `097` finding routes/alternate/disposition authority;
- `098` correction/reinspection/supersession/invalidation;
- `099` completion/handoff/targets.

### Workshop 2 dependencies

Qualified inspectors, safety evidence, data classification, measurement provenance, clock/coverage, identity/location sources, correction/conflict controls.

Result: Workshop 3 catalog exists; approval waits on Workshop 2F and qualified Workshop 3 participation.

## 7. Slice 4 — Recon Planning and Approval

Requires `100`-`109` plus approved diagnostician/estimator/planner/approver roles, financial limits, cumulative exposure, economics thresholds, quote sources, changed-scope/reapproval, evidence, clocks, and source freshness. Result: `NO-GO FOR TECHNICAL DESIGN`.

## 8. Slice 5 — Parts and Repair Execution

Requires `110`-`119` plus parts custody/purchase/substitution authority, technician qualifications, procedure sources, resource/dispatch coverage, labor/parts evidence, changed scope, vendor integration, and QC handoff. Result: `NO-GO FOR TECHNICAL DESIGN`.

## 9. Slice 6 — Quality and Safety Verification

Requires `120`-`129` plus independent QC/peer/road-test coverage, templates/tolerances, critical-failure non-averaging, immutable dispositions, rework/reinspection, operational-release authority, and downstream recovery. `W2-GAP-034` is a direct blocker. Result: `NO-GO FOR TECHNICAL DESIGN`.

## 10. Slice 7 — Title and Document Readiness

Requires `130`-`139` plus qualified legal/compliance applicability, trained coordinator/reviewer separation, restricted access, original custody, retention/hold/export, provider mapping, external dependency clocks, and no-generic-override policy. `W2-GAP-035` is a direct blocker. Result: `NO-GO FOR TECHNICAL DESIGN`.

## 11. Slice 8 — Merchandising and Pricing

Requires `140`-`149` plus verified vehicle facts, media/privacy standards, content/claim separation, customer-price/floor authority, channel mappings, desired-versus-observed publication, and suspension/correction. `W2-GAP-036` is a direct blocker. Result: `NO-GO FOR TECHNICAL DESIGN`.

## 12. Slice 9 — Frontline Release Review

Requires `150`-`159` plus independent release reviewer/authority, exact critical dimensions, frozen source versions, permitted noncritical exceptions, atomic authorization/projection, placement/digital/sales reconciliation, post-release verification, suspension, and full-package reinstatement. `W2-GAP-036` and every unresolved critical upstream gap block readiness. Result: `NO-GO FOR TECHNICAL DESIGN`.

## 13. Workshop 3 entry gate

Workshop 3 is **Receipt, Custody, Inspection, and Safety**, covering `ITF-APR-080`-`099`.

### Documentation entry

Met: the Receipt/Custody and Inspection/Triage catalogs exist and the Workshop 2 control packets/readout/gaps/readiness artifacts are prepared.

### Approval entry

Not met. Before Workshop 3 may approve operational policy:

- Workshop 1 must have an explicit disposition for scope/location/method/pilot dependencies;
- Workshop 2F must record dispositions for all global decisions applicable to slices 2-3;
- critical gaps affecting identity, custody, safety, evidence, privacy, roles, sources, timing, and escalation must be closed or safely exclude the affected action;
- qualified receiving, inspection, safety, privacy/data, and Operations authorities must attend;
- exact handoff producer/consumer and current policy versions must be identified.

### Technical-design entry

Not met for any slice. Workshop 3 approval alone will not authorize code; each slice must pass its independent documentation-to-code gate.

## 14. Current formal result

| Gate | Result |
| --- | --- |
| Workshop 2 documentation | COMPLETE |
| Workshop 2 authorized decisions | NOT COMPLETE — 32 OPEN |
| Workshop 2 gaps | 36 OPEN_CONTAINED |
| Workshop 3 documentation preparation | ALLOWED |
| Workshop 3 policy approval | NO-GO pending applicable Workshop 1/2 resolution |
| Slice 1 technical design | NO-GO |
| Slices 2-9 technical design | NO-GO |
| Pilot/activation | NO-GO |
