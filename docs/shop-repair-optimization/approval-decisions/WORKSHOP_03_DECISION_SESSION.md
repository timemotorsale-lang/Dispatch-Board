# Workshop 3 Decision Session — Capacity, Skills, Resources, Dispatch, and Fairness

**Session:** `SRO-AE0-2026-01`  
**Status:** `PASSED FOR POLICY — 10 CLOSED`  
**Scope:** `SRO-APR-020`–`029`  
**Predecessor:** Workshops 1–2 passed for policy  
**Authorization boundary:** Policy decisions only; no design, code, shadow, pilot, activation, or application adaptation

## `SRO-APR-020` — Operating calendars and availability authority

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Capacity exists only inside Eli-published staffed business hours and only from current, attributable availability records. Planned shifts, approved leave, absence, breaks, meetings, training, restricted duty and resource downtime reduce availability before any recommendation or promise. Eli owns the operating calendar; each affected staff member may report a correction, and Eli or an uninvolved authorized delegate confirms it. No after-hours route is approved. Until exact clock hours and a current calendar source are published, application-derived capacity and dispatch recommendations remain unavailable and staff use verified manual availability.

**Required fields:** Exact clock schedule and authoritative availability source remain required before implementation; this policy safely contains both omissions.  
**Safe default:** Capacity unknown; Eli verifies availability manually during staffed hours.  
**Authority:** Eli as Shop/Operations and availability owner; affected staff for correction.  
**Dependencies:** `006`, `009`, `012`, `015`, `019`.  
**Affected algorithms:** `ALG-003`–`006`, `010`, `013`–`016`.  
**Operational consequence:** An unpublished, stale or disputed calendar cannot create capacity or a promise.

## `SRO-APR-021` — Skill and certification eligibility

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Every skill or certification used for job eligibility records its exact scope, level, issuer or evidence source, verifier, verified date, effective/expiry dates, restrictions and revocation state. A technician is eligible only when the current job requirements fall within verified scope. Eli owns the operational roster but cannot substitute for a genuinely qualified or independent verifier. Missing, expired, disputed, revoked or out-of-scope qualifications make the technician ineligible for that work. Until the catalog and qualified verifier are recorded, no application recommendation may rely on the qualification.

**Required fields:** Actual skill/certification catalog and qualified verification route remain required before affected use.  
**Safe default:** Unverified qualification is ineligible; manual assignment must follow the existing qualified process.  
**Authority:** Eli operationally; qualified or independent verifier where the qualification requires it.  
**Dependencies:** `006`, `015`, `020`.  
**Affected algorithms:** `ALG-003`, `010`–`016`, `020`.  
**Operational consequence:** Availability never substitutes for competence.

## `SRO-APR-022` — Bay, lift, tool, and equipment eligibility

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Each executable job identifies required bay, lift, tool, equipment, capacity/rating, inspection or calibration state and incompatibilities. A resource counts as eligible capacity only when it is present, available, within rating, current for required inspection/calibration, not reserved by conflicting work and permitted for the vehicle/task. Eli owns the operational resource roster; required safety or technical eligibility must be confirmed by a qualified person. Missing, stale, disputed, overdue or out-of-range evidence makes the resource unavailable. Until the actual resource inventory and verification route are recorded, the application may not infer resource eligibility.

**Required fields:** Actual resource inventory, ratings, inspection/calibration sources and qualified verifier remain required before affected use.  
**Safe default:** Unverified resource is unavailable; Eli verifies resources manually.  
**Authority:** Eli operationally; qualified safety/resource verifier where required.  
**Dependencies:** `006`, `013`, `015`, `020`, `021`.  
**Affected algorithms:** `ALG-003`–`006`, `010`–`016`, `020`.  
**Operational consequence:** Open floor space or a listed tool cannot be treated as usable capacity without eligibility evidence.

## `SRO-APR-023` — Capacity assumptions and protected buffer

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Available capacity is calculated as verified eligible staffed capacity minus breaks, meetings, training, leave/absence, known downtime, committed eligible work and a protected recovery buffer. The enterprise baseline buffer is ten percent of verified productive capacity for the staffed business day, with a minimum of one productive hour; Eli may increase it but may not reduce it without an attributable same-day reason and impact review. Efficiency assumptions require representative, like-for-like completed-work evidence and are expressed as a range with confidence, never as a guaranteed productivity rate. Unknown or low-confidence capacity cannot support a customer or Inventory promise.

**Required fields:** Accept the proposed `10% / minimum one productive hour` baseline or provide an exact replacement.  
**Safe default:** Historical observation only; no application-derived capacity commitment.  
**Authority:** Eli as Shop/Dispatch/Finance authority; independent review remains required where a financial control demands it.  
**Dependencies:** `005`, `006`, `020`–`022`.  
**Affected algorithms:** `ALG-004`–`006`, `013`–`016`.  
**Operational consequence:** The schedule retains recovery capacity and uncertainty cannot be converted into a promise.

## `SRO-APR-024` — Duration uncertainty and forecast ranges

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Every duration forecast shows `LOW`, `EXPECTED` and `HIGH` values, evidence class, comparable-work basis, assumptions, excluded time, confidence and last-updated time. Evidence precedence is current technician assessment and executable scope, then current like-for-like dealership history, then broader historical reference; generic reference cannot override current vehicle facts. Scope, authorization, parts, resource, technician, blocker or progress changes trigger reforecast. A point estimate may be displayed only as the expected value inside the visible range and never as a guarantee. Missing or noncomparable evidence produces `LOW_CONFIDENCE` and requires manual review.

**Required fields:** None for policy; source mappings and freshness are finalized in Workshop 8.  
**Safe default:** Show uncertainty; do not guarantee completion time.  
**Authority:** Eli for Shop/Dispatch policy; assigned technician supplies current-work evidence; Brock uses accepted forecasts for commitments.  
**Dependencies:** `015`–`018`, `020`–`023`.  
**Affected algorithms:** `ALG-010`–`015`, `050`, `051`.  
**Operational consequence:** A promise cannot be built from a hidden single-point estimate.

## `SRO-APR-025` — Eligibility-first dispatch ranking

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Dispatch first removes every job or resource that fails authorization, readiness, safety, qualification, resource or evidence eligibility. Remaining work is ranked lexicographically by: (1) safety containment and prevention of harm; (2) recovery of an authorized customer or Inventory commitment at risk; (3) age in a ready state; (4) completion or downstream-unblocking value; (5) verified technician/resource fit; and (6) like-for-like workload fairness. Margin, revenue, utilization or class alone cannot override a higher factor. Every recommendation shows eligibility evidence, decisive factors, alternatives, uncertainty and policy version. Eli confirms assignment; the system cannot assign automatically.

**Required fields:** Accept this ordered baseline; numeric weights are intentionally prohibited until validated evidence and Workshop 8 acceptance exist.  
**Safe default:** No ranked application recommendation; Eli dispatches manually.  
**Authority:** Eli as Shop/Dispatch and fairness owner; Brock supplies customer/Inventory commitment facts.  
**Dependencies:** `001`, `002`, `008`, `011`, `015`, `018`, `020`–`024`.  
**Affected algorithms:** `ALG-001`–`006`, `013`–`016`.  
**Operational consequence:** Optimization may explain an option but cannot manufacture eligibility or execute assignment.

## `SRO-APR-026` — Promise-risk bands and response

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Promise risk is `GREEN` when the current high forecast is on or before the attributable commitment; `AMBER` when expected completion is on or before the commitment but the high forecast exceeds it; `RED` when expected completion exceeds the commitment or a critical unresolved blocker makes the commitment infeasible; and `UNKNOWN` when commitment, scope, readiness, forecast or source evidence is missing, stale or disputed. Brock owns customer-pay and Inventory commitment review; Eli owns cross-lane recovery. `AMBER`, `RED` and `UNKNOWN` require human review before a new or revised promise. No band sends a customer message, changes priority, or revises a commitment automatically.

**Required fields:** Exact clock-based response targets remain a Workshop 8 operating input; until approved, review is immediate when observed during staffed hours and no after-hours response is implied.  
**Safe default:** Display attributable dates/ages only; no automated promise or outreach.  
**Authority:** Brock for commitment context; Eli for recovery and conflicts.  
**Dependencies:** `017`, `018`, `020`, `024`, `025`.  
**Affected algorithms:** `ALG-012`–`015`, `050`, `051`.  
**Operational consequence:** Risk is explainable from the forecast range and always requires human handling.

## `SRO-APR-027` — Dynamic resequencing and override

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Resequencing may be proposed only after a verified authorization or scope change, safety containment event, part/resource failure or restoration, staff absence, approved emergency insertion, blocker resolution, or promise-risk band change. Brock may propose changes for customer-pay and Inventory commitments; Eli confirms every disruptive change. Before confirmation, current work must be safely stoppable and impacts, alternatives, affected commitments and recovery path must be visible. Confirmation records the prior sequence, new sequence, actor, reason, evidence, policy/data version and notifications. Stale or concurrent proposals are rejected and recomputed; replay is idempotent. Override never bypasses readiness, safety, qualification, QC or authorization.

**Required fields:** None for policy; notification-channel configuration remains required before implementation.  
**Safe default:** Static, human-confirmed sequence; no application interruption.  
**Authority:** Eli confirms; Brock proposes within recorded lane scope.  
**Dependencies:** `009`, `014`–`018`, `020`–`026`.  
**Affected algorithms:** `ALG-013`–`016`.  
**Operational consequence:** Every disruption is attributable, concurrency-safe and recoverable.

## `SRO-APR-028` — Workload fairness and protected-use boundary

**Recommended:** `APPROVE`

**Exact proposed policy:** Capacity, dispatch and workload comparisons exclude protected characteristics and irrelevant personal data. Comparisons must be like-for-like for authorized hours, verified skill, job complexity, diagnostic uncertainty, approved training, safety work, nonproductive duties, parts/resource waits, leave and corrected data. Individual metrics are contextual operating signals, not standalone performance ratings, discipline, compensation or termination evidence. Staff may inspect attributable inputs, challenge an error and receive correction with preserved history. Unexplained material disparity pauses affected optimization pending Eli review and genuinely independent or qualified review where required.

**Required fields:** None for the protected-use policy; legal or HR conclusions are not invented.  
**Safe default:** No employee scoring, ranking, discipline or compensation use.  
**Authority:** Eli as GM/Operations/Shop authority; genuinely independent or qualified reviewer where required.  
**Dependencies:** `001`, `002`, `006`, `008`, `020`–`025`.  
**Affected algorithms:** `ALG-004`–`006`, `016`, `074`; all staff measurement views.  
**Operational consequence:** Flow optimization cannot silently become employee surveillance or an adverse-action score.

## `SRO-APR-029` — Capacity and dispatch outcome measures

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** The approved measurement set is readiness accuracy, unready-start rate, ready-queue age, active WIP, blocked time by attributable reason, forecast interval coverage and calibration, promise reliability, resource utilization as a range, recommendation acceptance/override, resequence frequency, workload distribution among comparable eligible staff, fairness challenges/corrections, QC failure/rework and safety/authorization exceptions. Every measure defines numerator, denominator, exclusions, source, freshness, policy version and uncertainty. Eli reviews the set weekly during any future authorized shadow or pilot and monthly only after stable acceptance; safety, authorization, quality, privacy and fairness are protected outcomes and cannot be traded for speed, utilization or margin. Targets and activation thresholds require separate Workshop 8 approval.

**Required fields:** Target values, authoritative source mappings and final acceptance owners remain required in Workshop 8; no action threshold is approved here.  
**Safe default:** Measurement is descriptive only and cannot trigger assignment, promise, employee action or expansion.  
**Authority:** Eli as Shop/Data/measurement owner; independent or qualified review for protected outcomes where required.  
**Dependencies:** `001`, `002`, `006`, `008`, `020`–`028`; later `070`–`079`.  
**Affected algorithms:** All Workshop 3 algorithms and measurement/calibration controls.  
**Operational consequence:** Any claimed optimization must show its denominator and preserve protected outcomes.

## Workshop 3 acceptance response

Accepted 2026-07-16 through the controlled Codex session; exact time not captured:

| Decision | Accepted disposition | Journal record |
| --- | --- | --- |
| `020` | APPROVE_WITH_CHANGE | `SRO-AE3-APR-020` |
| `021` | APPROVE_WITH_CHANGE | `SRO-AE3-APR-021` |
| `022` | APPROVE_WITH_CHANGE | `SRO-AE3-APR-022` |
| `023` | APPROVE_WITH_CHANGE | `SRO-AE3-APR-023` |
| `024` | APPROVE_WITH_CHANGE | `SRO-AE3-APR-024` |
| `025` | APPROVE_WITH_CHANGE | `SRO-AE3-APR-025` |
| `026` | APPROVE_WITH_CHANGE | `SRO-AE3-APR-026` |
| `027` | APPROVE_WITH_CHANGE | `SRO-AE3-APR-027` |
| `028` | APPROVE | `SRO-AE3-APR-028` |
| `029` | APPROVE_WITH_CHANGE | `SRO-AE3-APR-029` |

```text
020: APPROVE_WITH_CHANGE — accept proposed baseline
021: APPROVE_WITH_CHANGE — accept proposed baseline
022: APPROVE_WITH_CHANGE — accept proposed baseline
023: APPROVE_WITH_CHANGE — accept proposed 10% / minimum one productive hour buffer
024: APPROVE_WITH_CHANGE — accept proposed baseline
025: APPROVE_WITH_CHANGE — accept proposed baseline
026: APPROVE_WITH_CHANGE — accept proposed baseline
027: APPROVE_WITH_CHANGE — accept proposed baseline
028: APPROVE
029: APPROVE_WITH_CHANGE — accept proposed baseline

I accept the exact Workshop 3 policy text for every decision marked APPROVE or APPROVE_WITH_CHANGE: YES / NO
```

You may change any line to `DEFER_SAFE` or `REJECT`. A changed policy must include exact replacement language. No aggregate approval will be recorded unless you explicitly accept the exact text above.

## Current result

`1 APPROVED / 9 APPROVED_WITH_CHANGE / 10 CLOSED / 0 OPEN / PASSED FOR POLICY`.

This policy pass does not authorize technical design, code, shadow use, pilot, activation, or application adaptation.
