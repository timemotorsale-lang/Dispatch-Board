# Slice 2 Tabletop and Acceptance Packet

**Status:** Prepared; not executed or accepted
**Requirement:** Each case records participants, vehicle/source, exact answers, evidence, decision records, owner, clock, restriction, handoff outcome and gaps

## Execution record template

```text
caseId:
sessionId/date/time/location:
participants/representedAuthority:
vehicle/source/movementScenario:
startingFactsAndFreshness:
staffAnswersAndActions:
evidenceProduced:
stateAndGateResults:
exceptions/owners/targets/escalations:
inspectionHandoffResponse:
expectedVersusObservedResult:
policy/configurationGap:
acceptedBy/authority/evidence:
result: PASS | PASS_WITH_ACCEPTED_CHANGE | FAIL | NOT_RUN
```

## Required cases

| Case | Scenario | Required proof |
| --- | --- | --- |
| `S2-TT-001` | Normal daytime carrier arrival, matching identity and complete property | One attributable custody/receipt result and accepted Inspection handoff |
| `S2-TT-002` | Vehicle already onsite; transportation not required | No invented transport; physical/custody facts still fully verified |
| `S2-TT-003` | Carrier claims delivery but vehicle is not observed | Arrival/custody/receipt remain unverified; owner and clock created |
| `S2-TT-004` | Approved and unapproved after-hours arrivals | Minimum containment succeeds only on approved route; normal receipt remains incomplete |
| `S2-TT-005` | Wrong location, VIN mismatch, unreadable VIN and possible duplicate | Actual location preserved; identity hard stop prevents duplicate or advancement |
| `S2-TT-006` | Missing key/document/accessory and sensitive/hazardous property | Expected/observed truth preserved; restricted custody and recovery authority enforced |
| `S2-TT-007` | New damage with and without comparable baseline; carrier dispute | Evidence and competing claims retained without unsupported fault conclusion |
| `S2-TT-008` | Inoperable, leaking, EV/high-voltage, structural or fire concern | Unsafe access/movement denied; qualified containment/escalation used |
| `S2-TT-009` | No eligible secure/quarantine/inspection placement | Physical custody remains visible; no false placement or receipt completion |
| `S2-TT-010` | Permitted noncritical discrepancy versus critical/unowned discrepancy | Only permitted owned exception can carry; critical/unowned case fails the receipt gate |
| `S2-TT-011` | Duplicate trigger, concurrent completion, correction and evidence upload failure | Idempotency/version/correction lineage protect one truthful result; missing evidence cannot pass |
| `S2-TT-012` | Valid receipt but no Inspection capacity; invalid envelope rejection | Capacity wait remains owned without undoing receipt; invalid handoff returns exact correction reason |
| `S2-TT-013` | Unauthorized user and restricted-evidence access attempt | Consequential command and disclosure are denied; proposal can be safely handed to authority |
| `S2-TT-014` | System/provider outage with controlled offline receipt | Minimum custody facts remain durable; reconciliation/conflict review occurs before authoritative completion |

## Acceptance gate

- [ ] Every case has expected and observed results.
- [ ] All hard stops prevent receipt completion and unsafe movement.
- [ ] Every physical vehicle remains assigned to a real custodian/location during holds.
- [ ] No duplicate receipt, custody event, evidence package, task or alert is created.
- [ ] Corrections preserve original history and invalidate dependent decisions when required.
- [ ] Restricted property/evidence is not exposed in general tasks or notifications.
- [ ] Valid handoffs are accepted or remain in an owned capacity wait; invalid handoffs return a precise reason.
- [ ] All gaps map to an open decision/configuration owner and target.
- [ ] Authorized owners sign the accepted result.

Until these cases are executed and accepted, the packet is verification design—not implementation evidence.
