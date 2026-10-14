# Workshop 2 Decision Session — Operating Model, WIP, and Readiness

**Session:** `SRO-AE0-2026-01`
**Status:** `PASSED FOR POLICY — 10 CLOSED`
**Scope:** `SRO-APR-010`–`019`
**Predecessor:** Workshop 1 passed for policy

## `SRO-APR-010` — Shop state model and terminal handoffs

**Recommended:** `APPROVE`

**Exact proposed policy:** A repair order/job progresses through distinct facts: `INTAKE`, `SCOPE_PROPOSED`, `AUTHORIZED`, `READY`, `ACTIVE`, `BLOCKED_OR_WAITING`, `REPAIR_COMPLETE_PENDING_QC`, `QC_IN_PROGRESS`, `QC_FAILED_REWORK`, `QC_PASSED`, and `OWNER_HANDOFF_ACCEPTED`. Authorization is not readiness; repair completion is not QC pass; QC pass is not customer delivery or Inventory frontline release. Corrections and reversals preserve history.

**Required fields:** None.  
**Safe default:** Existing authoritative workflow; no inferred advancement.  
**Authority:** Eli as Shop/Operations owner; affected handoff owners.  
**Dependencies:** `001`, `002`, `006`.  
**Affected:** `ALG-001`–`006`, `020`–`025`, `044`, `060`–`062`; all execution/QC scenarios.  
**Consequence:** Every queue, clock and recommendation must use the current verified state.

## `SRO-APR-011` — Class-of-service policy

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Classes are: `SAFETY_CRITICAL_CONTAINMENT`, `CUSTOMER_WAITING`, `PROMISE_RECOVERY`, `INVENTORY_COMMITMENT`, `STANDARD`, and `PLANNED`. Safety containment is a restriction/response class, not permission to start normal work. Readiness and eligibility always precede ranking. Within valid ready work, Eli owns policy/override; Brock may classify customer-pay and Inventory-Recon intake. Every change records prior/new class, reason, actor, evidence and commitment effect.

**Required fields:** Accept these six classes and Eli/Brock authority or provide replacements.  
**Safe default:** Manager classifies manually; class cannot bypass gates.  
**Dependencies:** `003`–`006`, `010`.  
**Affected:** `ALG-001`,`002`,`013`–`015`; `SCN-001`–`005`,`017`,`018`.  
**Consequence:** Class affects ranking only among valid work.

## `SRO-APR-012` — Queue definitions and ownership

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Canonical queues are `INTAKE_OR_SCOPE`, `WAITING_AUTHORIZATION`, `READY`, `ACTIVE`, `BLOCKED_PARTS`, `BLOCKED_RESOURCE_OR_TECHNICAL`, `BLOCKED_CUSTOMER_OR_INTERNAL_DECISION`, `REPAIR_COMPLETE_PENDING_QC`, `QC_REWORK`, and `OWNER_HANDOFF`. Eli owns Shop/Dispatch queues; Brock owns customer/inventory decision follow-up and is Parts backup; Eli owns Parts primary. Each entry/exit requires reason, owner, event time and source. One job cannot appear as active in conflicting queues.

**Required fields:** Accept queue set/ownership or provide exact changes.  
**Safe default:** Existing manual queues; no algorithmic placement.  
**Dependencies:** `006`, `010`, `011`.  
**Affected:** `ALG-003`–`006`,`013`–`015`,`020`; waiting/blocker scenarios.  
**Consequence:** Every wait becomes visible and attributable.

## `SRO-APR-013` — WIP limits and exceptions

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Each technician may have at most one `ACTIVE` job and one verified `READY` next job. Each productive bay may hold at most one active vehicle and may not be occupied by work that cannot begin, except an approved safety containment or Eli-authorized interruption/recovery. Exceptions record reason, affected commitments, owner, expected review event and removal plan. WIP excess creates review; it never silently changes state or assignment.

**Required fields:** Accept this resource-relative limit; no undisclosed numeric shop-wide limit is inferred.  
**Safe default:** No automatic enforcement; Eli manages existing work manually.  
**Dependencies:** `010`–`012`, future resource decision `022`.  
**Affected:** `ALG-004`–`006`,`013`,`015`,`016`; `SCN-016`,`019`,`043`,`045`.  
**Consequence:** Finish-before-start is enforceable without inventing bay counts.

## `SRO-APR-014` — One-current/one-next technician policy

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** A technician has one current active job and at most one staged next job that already passes readiness. No third job may be staged. Diagnostic collaboration does not transfer primary ownership unless recorded. Exceptions are limited to safety containment, unavoidable wait after safe stop, or Eli-approved resequencing under `017`; every exception preserves ownership, time, evidence and impact.

**Required fields:** Accept baseline and exception classes or change them.  
**Safe default:** Existing human dispatch; no automated stacking.  
**Dependencies:** `010`, `013`, `015`, `017`.  
**Affected:** `ALG-003`,`004`,`010`–`016`; `SCN-016`,`018`,`019`.  
**Consequence:** Recommendations cannot overload a technician to improve utilization.

## `SRO-APR-015` — Job-start readiness gate

**Recommended:** `APPROVE`

**Exact proposed policy:** A job is `READY` only when current executable scope and authorization, canonical vehicle/RO identity, eligible technician skill, required safety/procedure information, usable reserved parts or approved no-part scope, eligible bay/lift/tools/equipment, physical vehicle/custody/location, required evidence, and no blocking conflict are verified. Missing, stale, disputed or revoked prerequisites fail readiness. Eli may resolve facts but cannot waive a mandatory authorization, safety, qualification or evidence gate.

**Required fields:** None; later workshops configure exact sources/templates.  
**Safe default:** Job remains unready.  
**Dependencies:** `001`,`002`,`010`; later `020`–`022`,`030`,`035`–`037`,`070`–`072`.  
**Affected:** `ALG-003`,`010`,`011`,`020`; `SCN-004`–`016`,`022`,`049`.  
**Consequence:** Priority, margin or promise cannot manufacture readiness.

## `SRO-APR-016` — Blocker, pause, and resume contract

**Recommended:** `APPROVE`

**Exact proposed policy:** Every block/pause records exact reason code, description, owner, next action, review event/time, customer or Inventory commitment effect, restrictions and source evidence. Resume requires the blocking condition to be verified resolved against current version; it records actor, evidence and dependent revalidation. A status change, reassignment or elapsed time cannot erase blocker age or automatically resume work.

**Required fields:** None for contract; later timing decisions set numeric targets.  
**Safe default:** Block remains active and visible.  
**Dependencies:** `010`,`012`,`015`.  
**Affected:** `ALG-003`–`006`,`014`,`015`; all waiting/outage/scope scenarios.  
**Consequence:** Every wait has an accountable recovery path.

## `SRO-APR-017` — Interruption and resequencing authority

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Brock may propose resequencing for customer-pay or Inventory-Recon commitments; Eli alone confirms disruptive interruption/resequence. Valid reasons are safety containment, authorization loss/change, required part/resource failure, verified absence/resource conflict, approved emergency insertion, or documented promise recovery after readiness review. The action records original sequence, alternatives, current safe-stop state, impacts, reason and expected recovery. Ineligible or unsafe work remains unavailable.

**Required fields:** Accept Eli/Brock authority and reason catalog or provide changes.  
**Safe default:** Static human-confirmed sequence; no algorithmic interruption.  
**Dependencies:** `011`–`016`, `009`.  
**Affected:** `ALG-013`–`015`; `SCN-008`,`009`,`017`–`021`,`045`.  
**Consequence:** Urgency cannot create a silent disruption.

## `SRO-APR-018` — Customer and Inventory commitment effects

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Customer promises and Inventory target dates are separate attributable commitments. They may affect ranking only after readiness, eligibility, safety and authorization pass. Forecasts are ranges, not guarantees. Brock owns customer-pay/Inventory commitment context; Eli resolves cross-lane conflicts. Any material forecast or sequence change identifies affected commitment, reason, confidence and required human communication/review. Neither lane automatically outranks safety-critical containment.

**Required fields:** Accept ownership/precedence or provide exact changes.  
**Safe default:** Commitments displayed for manual decision only.  
**Dependencies:** `003`,`004`,`010`–`017`; future `024`–`027`.  
**Affected:** `ALG-002`,`012`–`015`,`050`,`051`; `SCN-002`,`004`,`017`,`018`,`033`,`034`.  
**Consequence:** Optimization cannot promise an unsupported completion time.

## `SRO-APR-019` — Degraded/manual workflow

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** When the application or a consequential source is unavailable, Eli declares degraded mode. Staff use a numbered controlled paper/local roster containing RO/vehicle identity, lane, verified state, owner, current authorization, active safety restrictions, assigned technician/resource, blocker/next action and event time. No unavailable fact is guessed. On restoration, Eli or an uninvolved delegate reconciles each entry by idempotent correlation; conflicts quarantine advancement; normal mode resumes only after reconciliation evidence and approval. No approved after-hours degraded operation is implied.

**Required fields:** Accept minimum roster, Eli control and staffed-hours boundary or provide exact changes.  
**Safe default:** Existing safe manual process; optimization/integration unavailable.  
**Dependencies:** `009`,`010`–`018`; later `070`–`072`,`078`.  
**Affected:** All algorithms; `SCN-032`,`041`–`044`,`049`,`050`.  
**Consequence:** Outage recovery cannot create duplicates or false state.

## Workshop 2 acceptance response

Accepted 2026-07-16 through the controlled Codex session; exact time not captured:

| Decision | Accepted disposition | Journal record |
| --- | --- | --- |
| `010` | APPROVE | `SRO-AE2-APR-010` |
| `011` | APPROVE_WITH_CHANGE | `SRO-AE2-APR-011` |
| `012` | APPROVE_WITH_CHANGE | `SRO-AE2-APR-012` |
| `013` | APPROVE_WITH_CHANGE | `SRO-AE2-APR-013` |
| `014` | APPROVE_WITH_CHANGE | `SRO-AE2-APR-014` |
| `015` | APPROVE | `SRO-AE2-APR-015` |
| `016` | APPROVE | `SRO-AE2-APR-016` |
| `017` | APPROVE_WITH_CHANGE | `SRO-AE2-APR-017` |
| `018` | APPROVE_WITH_CHANGE | `SRO-AE2-APR-018` |
| `019` | APPROVE_WITH_CHANGE | `SRO-AE2-APR-019` |

```text
010:
011:
012:
013:
014:
015:
016:
017:
018:
019:

I accept the exact Workshop 2 policy text for every decision marked APPROVE or APPROVE_WITH_CHANGE: YES / NO
```

You may answer `APPROVE`, `APPROVE_WITH_CHANGE — accept proposed baseline`, `DEFER_SAFE`, or `REJECT` for each ID. A change must include exact replacement language.

## Current result

`3 APPROVED / 7 APPROVED_WITH_CHANGE / 10 CLOSED / 0 OPEN / PASSED FOR POLICY`.

This policy pass does not authorize technical design, code, shadow use, pilot, activation, or application adaptation.
