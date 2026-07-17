# Workshop 4 Decision Session — Parts, Repair Execution, Quality, and Recovery

**Session:** `SRO-AE0-2026-01`  
**Status:** `PASSED FOR POLICY — 10 CLOSED`  
**Scope:** `SRO-APR-030`–`039`  
**Predecessor:** Workshops 1–3 passed for policy  
**Authorization boundary:** Policy decisions only; no design, code, shadow, pilot, activation, purchase, repair authorization, QC release, road test, or application adaptation

## `SRO-APR-030` — Parts availability, reservation, and kit readiness

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** A required part is `IDENTIFIED`, `SOURCE_PENDING`, `ORDERED`, `RECEIVED_UNVERIFIED`, `USABLE_AVAILABLE`, `RESERVED`, `BINNED_TO_JOB`, `INSTALLED`, `RETURNED`, or `UNAVAILABLE`; those states are not interchangeable. `USABLE_AVAILABLE` requires verified part identity, quantity, condition, fitment evidence when applicable, custody/location and no conflicting reservation. A kit is `COMPLETE` only when every currently authorized required part is usable and reserved/binned to that exact repair order; otherwise it is `PARTIAL`, `UNAVAILABLE`, or `UNKNOWN`. Eli is Parts primary and Brock backup. Unknown, partial, damaged, disputed or multiply reserved parts cannot make a job ready.

**Required fields:** Actual bins/locations and system-of-record mappings remain required before implementation.  
**Safe default:** Eli or Brock verifies parts manually; unknown parts do not satisfy readiness.  
**Authority:** Eli Parts primary; Brock Parts backup; technician reports installed/condition facts.  
**Dependencies:** `006`, `012`, `015`, `016`, `019`, `022`.  
**Affected algorithms:** `SRO-ALG-003`, `020`, `044`; parts-readiness and partial-kit scenarios.  
**Operational consequence:** An ordered or physically observed part is not automatically usable, reserved, or a complete kit.

## `SRO-APR-031` — Parts sources and ETA confidence

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Parts source options may be compared only from a current Eli-approved manual source roster. Every option shows exact part identity, source, quote/event time, landed cost components, availability claim, low/expected/high ETA, confidence, return/warranty terms and conflicts. Eli selects and authorizes the source within separately approved financial authority; Brock may collect evidence or act as Parts backup but cannot invent provider facts. A vendor estimate is advisory until confirmed through the authoritative provider or current human verification. Conflicting, stale or unavailable provider data is `UNKNOWN`, blocks automated selection and requires manual reconciliation. No authoritative-provider integration is represented as available.

**Required fields:** Approved source roster, financial limits, freshness intervals and authoritative integration mappings remain required before affected implementation.  
**Safe default:** Source selection and provider confirmation remain manual; ETA is advisory.  
**Authority:** Eli as Parts/Purchasing/Finance authority; Brock evidence/backup scope.  
**Dependencies:** `005`, `006`, `019`, `024`, `030`; later `040`–`049`, `070`–`072`.  
**Affected algorithms:** `SRO-ALG-020`, `021`, `030`–`036`; delayed-ETA and source-conflict scenarios.  
**Operational consequence:** A recommendation cannot place an order, select a vendor, or convert an unverified ETA into a promise.

## `SRO-APR-032` — Substitute and interchange review

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** A substitute or interchange candidate remains `NOT_ELIGIBLE` until a qualified technical reviewer verifies exact vehicle/application fitment, specifications, safety, procedure effects, required modifications, warranty implications and evidence; Eli separately confirms price, source, authorization and financial effect. The candidate record preserves original part, proposed substitute, evidence source/version, reviewer, restrictions and decision. Brock may gather evidence but cannot provide qualified technical approval unless independently qualified for that exact review. Missing technical or financial approval makes the substitute unavailable. An algorithm may compare candidates but cannot approve, order or install one.

**Required fields:** Qualified technical-review route and applicable warranty/source evidence remain required; until supplied, substitution is unavailable.  
**Safe default:** Use the exact authorized part through the existing approved manual process or keep work blocked.  
**Authority:** Qualified technical reviewer plus Eli as Parts/Finance/authorization authority.  
**Dependencies:** `006`, `015`, `021`, `030`, `031`; later financial decisions.  
**Affected algorithms:** `SRO-ALG-022`, `023`, `030`–`036`; wrong-part/interchange scenarios.  
**Operational consequence:** Price or apparent fit cannot substitute for qualified technical approval.

## `SRO-APR-033` — Changed scope and reauthorization

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** A new finding, failed component, quantity change, procedure deviation, substitute proposal, labor change or newly required operation creates a new immutable scope/estimate version. Affected work safely stops before exceeding current authority. The new version shows prior and proposed scope, evidence, parts/labor/tax and fee effects when applicable, forecast/promise effect, safety/QC implications and alternatives. Brock obtains attributable customer or Inventory-workflow authorization within his recorded lane scope; Eli resolves Shop, internal/fleet, cross-lane and financial conflicts. Work resumes only after current authorization, readiness and dependencies are reverified. Silence, prior general approval, technician completion, urgency or algorithm output cannot authorize changed scope.

**Required fields:** Exact customer communication/consent channel and financial presentation rules remain Workshop 5/6 inputs; current manual authorized route controls meanwhile.  
**Safe default:** Stop affected work and preserve the last authorized scope.  
**Authority:** Brock for attributable customer/Inventory authorization routing; Eli for Shop/internal/cross-lane/financial decisions.  
**Dependencies:** `003`–`006`, `010`, `015`–`018`, `024`, `030`–`032`.  
**Affected algorithms:** `SRO-ALG-023`, `044`, `050`–`052`; changed-scope and revoked-authorization scenarios.  
**Operational consequence:** Scope creep cannot become retroactive authorization.

## `SRO-APR-034` — Internal versus sublet execution

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Internal work is eligible only when authorization, current skill, procedure, equipment, capacity and QC routes are verified. Sublet is eligible only through an existing Eli-approved manual vendor route with current service scope, qualification evidence where required, price/authorization, custody transfer, insurance/safety requirements, promised range, evidence deliverables, QC responsibility and recovery contact. Eli selects and authorizes the execution path; the application may compare documented options but cannot select, purchase, transfer custody or represent a vendor as qualified. No vendor, limit, credential, service level or integration is inferred. If either path lacks required evidence, that path is unavailable.

**Required fields:** Actual approved vendors, credentials, insurance/custody procedure, financial limits, service levels and recovery route remain required before application support.  
**Safe default:** Existing approved manual route only; otherwise keep work blocked.  
**Authority:** Eli as Shop/Purchasing/Safety/Finance authority; qualified specialist verification remains independent where required.  
**Dependencies:** `005`, `006`, `015`, `020`–`024`, `031`–`033`.  
**Affected algorithms:** `SRO-ALG-024`, `013`–`015`; sublet-capacity and custody scenarios.  
**Operational consequence:** Capacity pressure cannot create an unapproved vendor or unsafe custody transfer.

## `SRO-APR-035` — Repair completion evidence

**Recommended:** `APPROVE`

**Exact proposed policy:** A technician may submit `REPAIR_COMPLETE_PENDING_QC` only after recording current authorized scope version, attributable procedure/reference version where required, parts installed/removed and disposition, measurements and findings, performed operations, deviations, unresolved restrictions, completion time and required supporting evidence. Submission asserts completion of recorded work only; it does not pass QC, certify safety, authorize changed scope, release the vehicle or prove customer delivery/frontline readiness. Missing, contradictory or invalid required evidence keeps the repair incomplete.

**Required fields:** None for the evidence contract; exact templates and source mappings remain controlled configuration inputs.  
**Safe default:** Repair remains incomplete and cannot enter QC.  
**Authority:** Performing technician submits; Eli owns Shop evidence policy; QC remains separate.  
**Dependencies:** `002`, `010`, `015`, `016`, `021`, `022`, `030`–`034`.  
**Affected algorithms:** `SRO-ALG-023`–`025`, `044`; completion-evidence scenarios.  
**Operational consequence:** A checked task or elapsed labor time cannot manufacture completion.

## `SRO-APR-036` — QC applicability, independence, and failure routing

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Every repair reaches a versioned QC template selected from current scope, safety class, procedure, changed scope, road-test applicability and prior failure/comeback history. Each mandatory item records pass/fail/not-applicable with reason, evidence, verifier identity, qualification and independence. Brock may verify only when uninvolved in the repair decision/work and qualified for the exact QC; otherwise a qualified independent external reviewer is required. Eli cannot review both sides of an Eli-originated or genuinely independent decision. Any missing verifier, failed mandatory item, missing evidence or disputed result produces `QC_FAILED_REWORK` or `QC_BLOCKED`, never pass or release. The application may show completeness and risk but cannot pass QC.

**Required fields:** Actual QC templates, applicability rules and qualified independent-review roster remain required; affected QC/release remains unavailable until supplied.  
**Safe default:** No QC pass or release.  
**Authority:** Qualified uninvolved QC verifier; Eli owns routing but cannot waive qualification or independence.  
**Dependencies:** `006`, `010`, `021`, `033`, `035`.  
**Affected algorithms:** `SRO-ALG-025`, `044`; failed-QC, missing-verifier and repeat-failure scenarios.  
**Operational consequence:** Repair completion, management urgency or algorithm confidence cannot become QC approval.

## `SRO-APR-037` — Road-test controls

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** A road test occurs only when the current QC/procedure requires or permits it and a qualified authorized driver, valid licensing/insurance confirmation, safe vehicle condition, authorized custody, approved route/operating boundary, suitable weather/road conditions and test plan are verified. The record includes pre-test condition, purpose, route boundary, start/end, mileage, observations, incidents, evidence and post-test restrictions. Failed preconditions prohibit the road test; an algorithm cannot authorize driving. Because no exact driver qualification, insurance confirmation, route or after-hours process is recorded, road testing remains unavailable under this policy until those inputs and any required independent review are accepted.

**Required fields:** Qualified driver roster, insurance verification, approved route/boundary, weather/condition rule and incident route.  
**Safe default:** No road test; vehicle remains restricted and follows the existing qualified manual route only if independently authorized outside this program.  
**Authority:** Eli as Safety/Insurance operational owner plus qualified driver/QC verifier; independent review where required.  
**Dependencies:** `006`, `009`, `021`, `022`, `035`, `036`.  
**Affected algorithms:** `SRO-ALG-025`, `044`; road-test and safety-release scenarios.  
**Operational consequence:** Road testing is an expressly gated safety activity, not an ordinary workflow transition.

## `SRO-APR-038` — Rework, comeback, and warranty recovery

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** `QC_REWORK` is correction before accepted handoff after QC failure; `COMEBACK_REVIEW` is a repeat or related concern after accepted handoff; `WARRANTY_REVIEW` is an eligibility investigation, not a warranty determination. Each record preserves original/current scope, custody, evidence, suspected relationship with uncertainty, safety restrictions, owner, customer/Inventory impact, financial hold and recovery plan. Eli opens and owns manager/quality review; a qualified uninvolved verifier determines technical/QC findings. No automatic technician blame, payroll/compensation effect, warranty decision, customer admission, concession or charge occurs. Recovery closes only after current authorization, repair evidence, independent QC where required and accepted handoff.

**Required fields:** Warranty authority, customer-remedy authority and financial allocation rules remain Workshop 5/company inputs; until supplied, those determinations are held.  
**Safe default:** Manager/quality review with safety and financial holds; no blame or automatic remedy.  
**Authority:** Eli as Shop/Finance recovery owner; qualified uninvolved QC reviewer; Brock handles authorized customer/Inventory context.  
**Dependencies:** `006`, `010`, `016`, `028`, `033`, `035`–`037`; later `040`–`049`.  
**Affected algorithms:** `SRO-ALG-025`, `040`–`043`, `060`–`062`; rework/comeback scenarios.  
**Operational consequence:** Repeat work becomes a controlled recovery and learning loop rather than an unsupported fault judgment.

## `SRO-APR-039` — Parts and quality outcome measures

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Approved measures are usable-part fill rate, complete-kit-at-ready rate, reservation conflict rate, ETA interval coverage/calibration, wrong/damaged/returned part rate, changed-scope frequency, repair-evidence completeness, QC first-pass rate, mandatory-item failure by attributable reason, rework rate, comeback-review rate, road-test restriction rate and recovery completion time. Every measure defines numerator, denominator, lane/scope exclusions, source, freshness, uncertainty and policy version. Measures are reviewed only among comparable work and cannot independently determine staff fault, compensation, discipline, vendor action, warranty, QC release or expansion. Safety, authorization, evidence integrity and independent QC are protected outcomes. Targets and action thresholds require Workshop 8 approval.

**Required fields:** Exact sources, targets, thresholds and final acceptance owners remain Workshop 8 inputs.  
**Safe default:** Descriptive measurement only; no staff, vendor, release or expansion action.  
**Authority:** Eli as Parts/Shop/Data owner; qualified QC and independent protected-outcome review where required.  
**Dependencies:** `028`, `029`, `030`–`038`; later `070`–`079`.  
**Affected algorithms:** `SRO-ALG-020`–`025`, `044`; measurement and calibration controls.  
**Operational consequence:** Quality improvement is measured without weakening release gates or turning data into automatic blame.

## Workshop 4 acceptance response

Accepted 2026-07-16 through the controlled Codex session; exact time not captured:

| Decision | Accepted disposition | Journal record |
| --- | --- | --- |
| `030` | APPROVE_WITH_CHANGE | `SRO-AE4-APR-030` |
| `031` | APPROVE_WITH_CHANGE | `SRO-AE4-APR-031` |
| `032` | APPROVE_WITH_CHANGE | `SRO-AE4-APR-032` |
| `033` | APPROVE_WITH_CHANGE | `SRO-AE4-APR-033` |
| `034` | APPROVE_WITH_CHANGE | `SRO-AE4-APR-034` |
| `035` | APPROVE | `SRO-AE4-APR-035` |
| `036` | APPROVE_WITH_CHANGE | `SRO-AE4-APR-036` |
| `037` | APPROVE_WITH_CHANGE | `SRO-AE4-APR-037` |
| `038` | APPROVE_WITH_CHANGE | `SRO-AE4-APR-038` |
| `039` | APPROVE_WITH_CHANGE | `SRO-AE4-APR-039` |

```text
030: APPROVE_WITH_CHANGE — accept proposed baseline
031: APPROVE_WITH_CHANGE — accept proposed baseline
032: APPROVE_WITH_CHANGE — accept proposed baseline
033: APPROVE_WITH_CHANGE — accept proposed baseline
034: APPROVE_WITH_CHANGE — accept proposed baseline
035: APPROVE
036: APPROVE_WITH_CHANGE — accept proposed baseline
037: APPROVE_WITH_CHANGE — accept proposed baseline
038: APPROVE_WITH_CHANGE — accept proposed baseline
039: APPROVE_WITH_CHANGE — accept proposed baseline

I accept the exact Workshop 4 policy text for every decision marked APPROVE or APPROVE_WITH_CHANGE: YES / NO
```

You may change any line to `DEFER_SAFE` or `REJECT`. A changed policy must include exact replacement language. No aggregate approval will be recorded unless you explicitly accept the exact text above.

## Current result

`1 APPROVED / 9 APPROVED_WITH_CHANGE / 10 CLOSED / 0 OPEN / PASSED FOR POLICY`.

This policy pass does not authorize design, code, shadow use, pilot, activation, purchases, road testing, QC release, or application adaptation.
