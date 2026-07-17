# Workshop 1 Decision Session — Charter, Scope, Lanes, and Pilot

**Session:** `SRO-AE0-2026-01`
**Status:** `PASSED — 3 APPROVED / 6 APPROVED_WITH_CHANGE / 0 OPEN`
**Scope:** `SRO-APR-001`–`009`
**Rule:** No row closes until the authorized user accepts the exact policy and supplies required fields or selects an explicit safe deferral

## `SRO-APR-001` — Mission and lexicographic objectives

**Recommended:** `APPROVE`

**Exact proposed policy:** Time Motor Sales adopts the `SRO-1.0` mission hierarchy in this order: people/vehicle safety, law, privacy and environmental protection; customer/financial authority and truthful evidence/communication; promises and inventory commitments; repair quality; flow/capacity/margin/retention; staff fairness and resilience. No lower objective may compensate for a failed higher-order gate.

**Required company fields:** None beyond confirmed organization/location/version.  
**Safe default:** `L0 Observe`; no optimization tradeoff.  
**Authority:** Eli Aswan — confirmed GM/Operations authority; affected policy owners.  
**Dependencies:** AE-0.  
**Affected:** All 37 algorithms; all 50 scenarios; all implementation stages.  
**Operational consequence:** Every ranking, success metric and expansion decision must stop on a higher-order failure.

**Required response:** `001 APPROVE`, or exact changed language / safe deferral / rejection.

## `SRO-APR-002` — Included and excluded capabilities

**Recommended:** `APPROVE`

**Exact proposed policy:** `SRO-1.0` may observe, draft or recommend within the documented Shop Flow, Capacity, Parts/Execution, Pricing, Assistance, Customer Intelligence and Measurement boundaries. It may not independently diagnose; start or expand work; order or purchase; assign an ineligible person/resource; set or change price/discount/refund; send customer communication; pass QC; road-test/release; compensate a customer; take employee action; publish policy; or self-modify. Consequential execution requires the separately approved human authority, exact command, evidence and audit.

**Required company fields:** None for the prohibition baseline; later workshops must define enabled subsets.  
**Safe default:** Consequential actions remain manual and unavailable to optimization.  
**Authority:** Eli Aswan plus each affected domain authority; unnamed domains remain unavailable.  
**Dependencies:** `001`.  
**Affected:** All algorithms/scenarios/stages.  
**Operational consequence:** Planning cannot be construed as automation authority.

**Required response:** `002 APPROVE`, or exact alternative.

## `SRO-APR-003` — Customer-pay lane ownership

**Recommended:** `APPROVE_WITH_CHANGE` after required names are supplied; otherwise `DEFER_SAFE`.

**Exact proposed policy:** Customer-pay work is owned by a named Service Advisor for authorization, estimates, promises and communication and by a named Shop/Fixed Operations owner for readiness, execution and intervention. Conflicts or high-impact exceptions route to Eli Aswan. A backup must be named for each operating role. No work starts without exact customer authorization; no draft is presented or sent without the authorized Advisor.

**Required company fields:** Primary/backup Service Advisor authority; primary/backup Shop owner; after-hours/unavailable route.  
**Safe default:** Customer-pay optimization and assisted communication unavailable; existing manual process only.  
**Authority:** Advisor/Customer + Shop; Eli ultimate reviewer.  
**Dependencies:** `001`, `002`, `006`.  
**Affected:** `ALG-001`–`016`, `020`–`025`, `030`–`034`, `040`–`044`, `050`–`054`; customer-pay scenarios.  
**Operational consequence:** Without names, the lane cannot be staff-facing or used for recommendations.

**Required response:** Supply names and `003 APPROVE_WITH_CHANGE`, or `003 DEFER_SAFE`, or reject/change.

## `SRO-APR-004` — Inventory-recon lane and ITF handoff

**Recommended:** `APPROVE_WITH_CHANGE` after Shop handoff owner is supplied; otherwise approve the boundary with an operational hold.

**Exact proposed policy:** Inventory recon begins only from a valid Inventory-to-Frontline handoff or an independently authorized manual recovery. Brock Harris owns Inventory priority, economics and downstream acceptance; Eli Aswan is ultimate reviewer/backup. A named Shop owner must accept scope/custody for execution. Shop returns a versioned QC-complete handoff with restrictions and evidence; Inventory alone controls downstream frontline decisions. Inventory urgency cannot bypass authorization, skill, parts, safety or QC gates.

**Required company fields:** Named Shop producer/consumer owner and backup; handoff target/acceptance clock; recovery route.  
**Safe default:** Existing manual inventory-recon workflow; no optimization or inferred ITF transition.  
**Authority:** Brock Harris + named Shop owner; Eli ultimate reviewer.  
**Dependencies:** `001`, `002`, `006`, applicable ITF approvals.  
**Affected:** `ALG-001`–`025`, `044`, `060`–`062`; `SCN-002`, `003`, `005`, `020`–`025`, `041`–`050`.  
**Operational consequence:** The Shop cannot declare an inventory unit frontline-ready.

**Required response:** Supply Shop/handoff fields and `004 APPROVE_WITH_CHANGE`, or accept an operational hold, defer, reject or change.

## `SRO-APR-005` — Internal/fleet lane

**Recommended:** `APPROVE_WITH_CHANGE` after exact owner/charge policy; otherwise `DEFER_SAFE`.

**Exact proposed policy:** Internal/fleet work is a separate lane limited to explicitly eligible dealership-controlled vehicles. A named internal owner authorizes scope and changes; a named Shop owner accepts execution; Finance approves internal charge, write-off and recovery treatment. Customer-pay pricing/communication assumptions cannot be silently reused. Safety, evidence and QC gates remain identical unless an explicitly approved stricter rule applies.

**Required company fields:** Eligible vehicle population; internal owner/backup; Shop owner/backup; Finance charge policy; exclusions.  
**Safe default:** Internal/fleet lane unavailable.  
**Authority:** GM/Operations + Shop + Finance.  
**Dependencies:** `001`, `002`, `006`.  
**Affected:** Lane classifier and every enabled downstream algorithm for internal work.  
**Operational consequence:** No internal/fleet recommendation or work-generation behavior until exact policy exists.

**Required response:** Supply fields and `005 APPROVE_WITH_CHANGE`, or `005 DEFER_SAFE`, or exact alternative.

## `SRO-APR-006` — Program roles and separation of duties

**Recommended:** `APPROVE_WITH_CHANGE` only with complete roster; otherwise `DEFER_SAFE` for unnamed scopes.

**Exact proposed policy:** Each consequential decision has a named primary, backup, scope, limit and evidence source. Eli Aswan is ultimate authority/backup only within confirmed scope and cannot independently review his own originating action where genuine independence is required. Repair performer and independent QC, policy author and independent publisher/reviewer, requester and threshold approver, and incident actor and independent incident reviewer remain separated where applicable. Missing authority makes the action unavailable.

**Required company fields:** Names/backups for Shop, Dispatch, Advisor, Parts/Purchasing, QC, Algorithm/Policy, IT/Integration, Customer Experience and qualified specialist/compliance scopes.  
**Safe default:** Current unnamed scopes remain unavailable; Eli cannot fill both sides of independent review.  
**Authority:** Eli Aswan + each represented domain authority.  
**Dependencies:** `001`, `002`.  
**Affected:** All algorithms, permissions, overrides, incidents and workshop decisions.  
**Operational consequence:** This decision controls whether later policies can be exercised, not merely written.

**Required response:** Supply complete roster and `006 APPROVE_WITH_CHANGE`, or `006 DEFER_SAFE` retaining the named exclusions.

## `SRO-APR-007` — Minneapolis pilot cohort and exclusions

**Recommended:** `APPROVE_WITH_CHANGE` after an exact future cohort is supplied; otherwise `DEFER_SAFE`.

**Exact proposed policy:** Any future pilot is limited to one Minneapolis location, a named trained cohort, named lanes and algorithm versions, representative cases, explicit vehicle/work exclusions, a fixed evaluation period/sample, manager-confirmed actions and zero autonomous consequential execution. Pilot entry requires accepted shadow evidence, training, support, monitoring and rollback rehearsal.

**Required company fields:** Named participants/backups; lanes; algorithms; case/vehicle exclusions; minimum sample/period; hours; training owner.  
**Safe default:** No pilot cohort; `NO_GO`.  
**Authority:** Eli Aswan + Shop/pilot/safety/privacy owners.  
**Dependencies:** `001`, `002`, `006`, `008`, `009`, Workshops 2–8.  
**Affected:** All algorithms proposed for future pilot and scenarios `041`–`050` plus representative lane cases.  
**Operational consequence:** Approval defines eligibility only and does not itself authorize a pilot.

**Required response:** Supply fields and `007 APPROVE_WITH_CHANGE`, or `007 DEFER_SAFE`.

## `SRO-APR-008` — Manual, shadow and automatic mode boundaries

**Recommended:** `APPROVE`

**Exact proposed policy:** `L0 Observe`, `L1 Draft`, `L2 Recommend`, `L3 Confirmed Execute`, `L4 Bounded Automatic` and `L5 Autonomous Consequential` remain distinct, versioned modes. The initial state is `L0 Observe`. Movement to any higher level requires a separate named-slice authorization and evidence. `L5` is prohibited. `L4` is limited to separately approved, reversible, deduplicated internal tasks/alerts and cannot perform any consequential domain action.

**Required company fields:** None for baseline; enabled algorithms/modes remain a later decision.  
**Safe default:** `L0 Observe`.  
**Authority:** Eli Aswan + Policy/Data/Safety/Privacy owners as applicable.  
**Dependencies:** `001`, `002`.  
**Affected:** All 37 algorithms and implementation stages.  
**Operational consequence:** No document or code existence automatically raises automation level.

**Required response:** `008 APPROVE`, or exact alternative.

## `SRO-APR-009` — Pilot, pause, rollback and resume authority

**Recommended:** `APPROVE_WITH_CHANGE` after operational backups/responders are named; otherwise policy approval with `NO_GO` hold.

**Exact proposed policy:** Eli Aswan is ultimate pilot, pause and rollback authority. Any authorized staff member may initiate an immediate safety/privacy/security containment pause. A named operational owner executes pause/rollback; named Safety, Privacy/Security, Data and Shop owners investigate. Resume requires corrected/reconciled state, accepted evidence, retraining where applicable and independent review when Eli or another required reviewer originated the affected action. Automatic resume is prohibited.

**Required company fields:** Operational pause/rollback owner and backup; incident responders; notification channel; response target; independent resume reviewer.  
**Safe default:** `NO_GO`; affected capability stays paused; manual workflow continues.  
**Authority:** Eli Aswan + named operational/safety/privacy/data owners.  
**Dependencies:** `001`, `002`, `006`, `008`.  
**Affected:** All algorithms, incidents, shadow/pilot stages and `SCN-041`–`050`.  
**Operational consequence:** Without named responders/reviewer, no shadow or pilot can start or resume.

**Required response:** Supply fields and `009 APPROVE_WITH_CHANGE`, or accept `NO_GO` hold/defer/change/reject.

## Workshop 1 response record

Return one explicit disposition for each ID. Any name not supplied remains absent; any proposed baseline not explicitly accepted remains `OPEN`.

### Submission adjudication — 2026-07-16

| Decision | Submitted | Recorded result | Reason |
| --- | --- | --- | --- |
| `001` | APPROVE | `APPROVED` — `SRO-AE1-APR-001` | Exact text accepted; no missing company field |
| `002` | APPROVE | `APPROVED` — `SRO-AE1-APR-002` | Exact text accepted; prohibited baseline remains controlling |
| `003` | APPROVE_WITH_CHANGE | `APPROVED_WITH_CHANGE` — `SRO-AE1-APR-003` | Brock/Eli ownership accepted; absent Shop backup/after-hours route converted to explicit unavailable scope |
| `004` | APPROVE_WITH_CHANGE | `APPROVED_WITH_CHANGE` — `SRO-AE1-APR-004` | Brock/Eli ownership accepted; missing target/time/recovery converted to operational hold and manual-only route |
| `005` | APPROVE_WITH_CHANGE | `APPROVED_WITH_CHANGE` — `SRO-AE1-APR-005` | Conservative internal/fleet scope, cost and exclusions explicitly accepted |
| `006` | APPROVE_WITH_CHANGE | `APPROVED_WITH_CHANGE` — `SRO-AE1-APR-006` | Named roster and external/independent restrictions explicitly accepted |
| `007` | APPROVE_WITH_CHANGE | `APPROVED_WITH_CHANGE` — `SRO-AE1-APR-007` | Exact future eligibility/sample/exclusions accepted; no pilot authorized |
| `008` | APPROVE | `APPROVED` — `SRO-AE1-APR-008` | Exact automation boundary accepted |
| `009` | APPROVE_WITH_CHANGE | `APPROVED_WITH_CHANGE` — `SRO-AE1-APR-009` | Exact pause/rollback, response and independent-resume restrictions accepted |

```text
001:
002:
003: [include names or DEFER_SAFE]
004: [include Shop/handoff owner fields or operational hold]
005: [include internal/fleet fields or DEFER_SAFE]
006: [include roster or DEFER_SAFE]
007: [include pilot fields or DEFER_SAFE]
008:
009: [include responder fields or NO_GO hold/DEFER_SAFE]

I accept the exact Workshop 1 policy text above for every decision marked APPROVE or APPROVE_WITH_CHANGE: YES / NO
```

## Current workshop result

`3 APPROVED / 6 APPROVED_WITH_CHANGE / 0 OPEN / WORKSHOP PASSED FOR POLICY / NO-GO FOR DESIGN, CODE, SHADOW, PILOT AND ACTIVATION`.
