# Slice 2 — Receipt and Custody Workflow Package

**Workflow boundary:** Observed arrival → custody verification → receipt completed → inspection handoff
**Status:** Documentation implemented; policy decisions open; no code, pilot, or activation authorized
**Policy decisions:** `ITF-APR-080`–`089` plus applicable predecessor/global decisions
**Catalog authority:** [`Receipt and Custody Decision and Scenario Catalog`](../RECEIPT_CUSTODY_DECISION_CATALOG.md)

## 1. Outcome

Slice 2 converts a physical arrival into an attributable, evidence-backed receipt without confusing presence with custody, receipt completion, inspection, or frontline readiness. It ends only when:

- the actual vehicle, location, arrival time, receiver and custody are verified;
- keys, documents, accessories, property, condition and restrictions are recorded;
- safety, identity, custody, security and evidence hard gates pass;
- every permitted noncritical discrepancy has an owner, action and review time; and
- Inspection and Triage accepts the handoff or an owned capacity-wait exception remains visible.

Receipt completion does not mean that inspection passed, repairs are approved, title is ready, the vehicle may be advertised, or it is frontline ready.

## 2. Entry contract

Slice 2 may start from an accepted Slice 1 handoff, an authorized receiver's physical observation, a verified onsite/no-transport vehicle, an inter-location arrival, or controlled recovery/backfill. The entry record must identify or explicitly mark unknown:

| Input | Minimum requirement |
| --- | --- |
| Correlation | Canonical vehicle/inventory-unit candidate and movement or acquisition reference |
| Arrival | Claimed or observed time, actual location and evidence source |
| Expected context | Source, destination, ETA, carrier/deliverer, keys, documents, accessories and known condition |
| Custody context | Delivering party, proposed receiver, current physical controller and restrictions |
| Freshness | Source and captured/verified time for each consequential fact |
| Open risk | Known identity, damage, safety, property, document, location or provider exception |

Missing context does not erase physical reality. Staff record the observed vehicle, secure it through an approved route, and open reconciliation without inventing acquisition, transport, custody or receipt facts.

## 3. State model

```text
ARRIVAL_CLAIMED
  -> ARRIVAL_OBSERVED
  -> IDENTITY_VERIFIED
  -> CUSTODY_ACCEPTED_OR_CONTAINED
  -> PROPERTY_AND_CONDITION_RECORDED
  -> DISCREPANCIES_DISPOSITIONED
  -> RECEIPT_GATE_REVIEWED
  -> RECEIPT_COMPLETED
  -> INSPECTION_HANDOFF_OFFERED
  -> INSPECTION_HANDOFF_ACCEPTED | INSPECTION_CAPACITY_WAIT
```

Controlled alternate states are `ARRIVAL_UNVERIFIED`, `AFTER_HOURS_CONTAINMENT`, `IDENTITY_HOLD`, `CUSTODY_DISPUTE`, `WRONG_LOCATION_RECOVERY`, `SAFETY_OR_HAZARD_HOLD`, `RESTRICTED_PROPERTY_HOLD`, `RETURN_OR_REJECTION_REVIEW`, `EVIDENCE_OR_DATA_HOLD`, and `DUPLICATE_OR_INVALID_TRIGGER`.

Every alternate state requires an accountable owner, reason, restriction, next action, target/review time and escalation route. A hold never silently completes receipt.

## 4. Guided decision sequence

| Step | Staff question | Available options | Required result |
| --- | --- | --- | --- |
| 1. Arrival | Is the vehicle physically present? | Observed here; claimed/not observed; not present; different location; unable to verify; duplicate | Record actual presence/location or create owned verification/recovery; a delivery message alone cannot prove arrival |
| 2. Receiver | Is an authorized receiver available? | Named receiver; approved after-hours containment; external party waiting; no secure coverage; unknown acceptor | Assign custody intake or contain/escalate; never infer acceptance |
| 3. Identity | Does physical identity match? | Exact VIN match; VIN unreadable; VIN mismatch; stock reference mismatch; possible duplicate; approved alternate identity | Continue only on verified identity or approved alternate path; mismatch/unreadable is a hard hold |
| 4. Odometer | Is the observation attributable and plausible? | Captured/consistent; captured/conflicting; unreadable; display inoperative; unit uncertain | Preserve observed value/unit/source or create owned discrepancy; never normalize silently |
| 5. Custody | Who transferred and who accepted physical responsibility? | Accepted normal custody; accepted restricted containment; transfer disputed; unattended; unable to identify transferor | Record from/to/time/location and acknowledgement; disputed or unattributable custody blocks normal completion |
| 6. Security | Is the vehicle secured at an eligible location? | Secure receiving; approved temporary; restricted/quarantine; inspection staging; no eligible placement | Record actual placement; unavailable placement creates safety/security escalation |
| 7. Property | What arrived with the vehicle? | Keys/access devices, documents, accessories, personal/sensitive/hazardous property—complete, missing, extra, damaged, unknown | Preserve expected versus observed counts/status and create controlled custody or recovery action |
| 8. Condition | Is required arrival-condition evidence complete and comparable? | Complete/matches; complete/new difference; incomplete; unsafe to capture; no baseline; evidence disputed | Accept evidence, open discrepancy/claim, or hold the evidence gate; do not assign unsupported blame |
| 9. Safety | Can the vehicle be safely accessed or moved for intake? | No movement needed; approved qualified movement; tow/equipment required; unsafe/unknown; emergency hazard | Enforce the approved movement/containment route; internal driving remains excluded under current safe deferral |
| 10. Discrepancies | Can each discrepancy be resolved or safely carried? | Resolved; owned noncritical carry-forward; correction; claim; return/rejection review; critical hold | Critical/unowned discrepancies block receipt; permitted carry-forward requires owner/action/review time |
| 11. Receipt gate | Are all receipt conditions satisfied? | Pass; pass with owned noncritical exceptions; fail with exact reason | Commit one versioned result; failed gates cannot be bypassed by task completion |
| 12. Inspection handoff | Can Inspection accept the complete context? | Accepted; rejected with reason; capacity wait; restricted specialist path | Record producer/consumer, envelope, response, target and restrictions; no unowned queue |

## 5. Required evidence manifest

The proposed minimum manifest is documentation-ready but requires `ITF-APR-082`–`084` approval before operational use:

- physical arrival observation, actual location and attributable timestamp;
- physical VIN or approved alternate-identity evidence;
- odometer value/unit/source or an owned exception;
- custody-from, custody-to, effective time, location and acknowledgement;
- secure placement and current physical custodian;
- expected/observed keys and access devices;
- expected/observed physical documents without claiming legal/title sufficiency;
- expected/observed accessories and equipment;
- restricted chain of custody for personal, sensitive, hazardous or prohibited property;
- policy-complete arrival-condition evidence and pre/post comparison where applicable;
- every damage, safety, evidence, property, identity or custody discrepancy and its disposition;
- immutable receipt-gate snapshot and inspection-handoff snapshot.

Evidence must retain source, capture time, author, classification, freshness, workflow/version correlation and correction lineage. Rejected, missing, quarantined or pending-upload evidence cannot satisfy a hard gate.

## 6. Receipt completion gate

`RC-DEC-070` returns exactly one result:

- `PASS_RECEIPT_COMPLETE`
- `PASS_WITH_OWNED_NONCRITICAL_EXCEPTIONS`
- `FAIL_IDENTITY`
- `FAIL_CUSTODY`
- `FAIL_SAFETY_OR_HAZARD`
- `FAIL_MANDATORY_EVIDENCE`
- `FAIL_LOCATION_OR_SECURITY`
- `FAIL_UNOWNED_DISCREPANCY`
- `FAIL_DATA_CONFLICT`
- `FAIL_PERMISSION_OR_CONCURRENCY`

A pass requires current verified identity, actual location, attributable custody, eligible placement, required property/condition evidence, active restrictions, and valid disposition of every exception. Safety, identity, custody, security and mandatory-evidence hard gates are non-waivable. A permitted noncritical exception must name its owner, action, review time, escalation and downstream visibility.

## 7. Inspection handoff contract

The producer is the approved Receipt/Custody owner; the consumer is the approved Inspection/Triage owner or eligible queue. The offered envelope contains:

| Handoff field | Requirement |
| --- | --- |
| Identity/version | Canonical vehicle and inventory cycle; accepted receipt version |
| Physical control | Actual location, custody owner and placement eligibility |
| Receipt result | Gate result, completion time and decision/evidence references |
| Condition | Arrival evidence, damage observations and known limitations |
| Property | Key/document/accessory status and restricted-property indicator without broad sensitive detail |
| Safety | Active mobility, hazard, access, lift, EV/high-voltage or specialist restrictions |
| Exceptions | Owner, next action, target, escalation and whether Inspection may proceed |
| Inspection request | Applicable proposed class/template, priority reason and target |

Inspection may accept, reject with an exact correctable reason, or accept an owned capacity wait. Rejection returns the handoff to Receipt/Custody without deleting the completed receipt. Capacity waiting preserves safe custody, aging and escalation. Neither response claims inspection completion.

## 8. Authority and segregation

- Brock Harris is the recorded Inventory workflow and receiving/custody operating owner.
- Eli Aswan is the recorded ultimate Operations, safety/insurance, privacy/security/data reviewer and backup.
- Eli-originated actions that require genuine independent review must hold or route to a qualified external/independent authority; Eli cannot satisfy both sides merely because he is the ultimate backup.
- Qualified legal, environmental, EV/high-voltage, emergency, insurance or specialist determinations remain unavailable where the qualified authority/evidence has not been supplied.
- The person reporting a discrepancy is not presumed responsible and cannot be forced to resolve it by accepting an inaccurate fact.

## 9. Failure, recovery and degraded operation

- Replayed triggers return the existing correlated result without duplicate receipt, custody, evidence, tasks or alerts.
- Concurrent completion uses an expected version; one command succeeds and the other receives the current state with recoverable input.
- Corrections supersede rather than overwrite the original fact and re-evaluate dependent gates/handoffs.
- During system or upload failure, the approved paper/offline minimum must preserve identity, actual location, physical custodian, restrictions and captured evidence references; later reconciliation is mandatory.
- Provider claims remain advisory/manual under the current `ITF-APR-063` safe deferral.
- Pausing Slice 2 stops new receipt-completion commands but retains a visible physical-custody roster and controlled manual containment procedure.

## 10. Explicit exclusions

This package does not authorize application code, live integrations, internal driving, autonomous decisions, vehicle rejection/return, claims settlement, legal/title conclusions, inspection completion, repair, spend, publication, frontline release, sale or delivery.

## 11. Completion definition

The documentation package is complete when its workflow, staff choices, evidence, exceptions, receipt gate, handoff, approval gate and tabletop cases are internally consistent. Slice 2 becomes eligible for technical design only after `ITF-APR-080`–`089` and applicable predecessor/global decisions have valid dispositions, exact configuration is supplied, tabletop evidence is accepted, and a separate authorization is signed.
