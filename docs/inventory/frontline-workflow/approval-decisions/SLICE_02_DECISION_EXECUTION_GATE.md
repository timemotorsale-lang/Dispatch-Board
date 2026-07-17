# Slice 2 Decision Execution Gate

**Slice:** Observed arrival → custody verification → receipt completed → inspection handoff
**Status:** 10 decisions open; documentation implemented; technical design and code not authorized

## Decision gate

Only a valid record in the [`Decision Signature Journal`](DECISION_SIGNATURE_JOURNAL.md) can close a row. Documentation, recommended dispositions and a repository change are not dealership approval.

| Decision | Required Slice 2 outcome | Recommended | Required authority/configuration | Approval record | State |
| --- | --- | --- | --- | --- | --- |
| `ITF-APR-080` | Keep arrival observed, physical control, custody acceptance, intake completion and receipt completion distinct | APPROVE | Inventory/Receiving workflow authority explicitly adopts state meanings | — | OPEN |
| `ITF-APR-081` | Name receivers/backups and exact receiving, secure, quarantine and after-hours locations/hours/procedure | APPROVE_WITH_CHANGE | Roster, location/capability map and after-hours procedure | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-082` | Approve identity, odometer, arrival, location, custody, receiver, time and evidence requirements | APPROVE_WITH_CHANGE | Receipt evidence manifest with allowable exceptions/freshness | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-083` | Define key, document, accessory and personal-property inventory/custody/recovery | APPROVE_WITH_CHANGE | Expected-property rules, restricted handling and recovery/value authority | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-084` | Define comparable arrival-condition evidence by source, method, vehicle and risk | APPROVE_WITH_CHANGE | Condition evidence matrix and safe alternate capture | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-085` | Define limited movement and safety/EV/environmental/hazard containment | APPROVE_WITH_CHANGE or DEFER_SAFE | Qualified movement and hazard procedure; excluded scopes explicit | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-086` | Define secure, temporary, restricted, quarantine and inspection placement eligibility | APPROVE_WITH_CHANGE | Placement/capability matrix and movement restrictions | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-087` | Define discrepancy materiality, correction, claim, return/rejection, expiry and authority | APPROVE_WITH_CHANGE | Taxonomy, authority thresholds, clocks and escalation | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-088` | Require current identity, custody, location, property, condition, restrictions, evidence and accepted exceptions for receipt completion | APPROVE | Inventory/Receiving authority adopts non-waivable gate and allowed exception rule | — | OPEN |
| `ITF-APR-089` | Name Inspection handoff producer/consumer, envelope, acceptance/rejection, target and capacity wait | APPROVE_WITH_CHANGE | Handoff roles, target, queue/capacity rule and escalation | — | OPEN_REQUIRED_INPUT |

## Predecessor/global dependency gate

Slice 2 also depends on applicable open decisions from `ITF-APR-013`, `015`, `020`–`025`, `040`–`045`, `050`, `053`–`055`, `062`, `065`, and `074`. Existing safe deferrals `051`, `052` and `063` exclude internal driving and authoritative live-provider integration. Those exclusions remain active in Slice 2.

## Closure checklist

- [ ] `ITF-APR-080`–`089` each have a valid attributable disposition.
- [ ] Exact receivers, backups, coverage, locations and after-hours procedures are approved.
- [ ] Evidence, condition, property, placement and discrepancy configuration is approved.
- [ ] Qualified safety/movement authority approves or safely excludes every applicable mode/hazard.
- [ ] Receipt gate and permitted noncritical exceptions are exact and non-waivable critical gates remain protected.
- [ ] Inspection producer/consumer, target, rejection and capacity-wait behavior are approved.
- [ ] Applicable predecessor/global decisions are closed or safely deferred with enforceable prevention.
- [ ] Required tabletop cases pass with evidence and authorized acceptance.
- [ ] Separate technical-design/implementation authorization is signed.

**Current result:** `NO-GO FOR TECHNICAL DESIGN / CODE / SHADOW / PILOT / ACTIVATION`.
