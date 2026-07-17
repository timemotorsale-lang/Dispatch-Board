# Workshop 7 Decision Session — Customer Intelligence, Prediction, Consent, and Outreach

**Session:** `SRO-AE0-2026-01`  
**Status:** `PASSED FOR POLICY — 10 CLOSED`  
**Scope:** `SRO-APR-060`–`069`  
**Predecessor:** Workshops 1–6 passed for policy  
**Authorization boundary:** Policy decisions only; no design, code, automated classification, prediction, customer outreach, concession, admission, shadow, pilot, activation, or application adaptation

## `SRO-APR-060` — Permitted customer-risk signals and bands

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Customer-risk review may use only attributable operational facts: missed or threatened authorized promise, repeated unresolved contact, unresolved blocker without owner/next action, material estimate/scope change awaiting review, failed handoff, explicit complaint/request for manager, unresolved safety/quality concern, or current `RED/UNKNOWN` promise risk. Bands are `RED` for explicit escalation, safety/quality concern, missed commitment or infeasible expected forecast; `AMBER` for high forecast beyond commitment, repeated unresolved contact or material pending change; `GREEN` for no current qualifying signal; and `UNKNOWN` for missing/stale/conflicting context. Protected traits, sentiment/personality inference, vulnerability, accent, language style, neighborhood, device, financial distress or opaque keyword scoring are prohibited. No automated heat classification is authorized.

**Required fields:** Source mappings and validated thresholds remain required before application use.  
**Safe default:** No automated classification; Brock and Eli review known facts manually.  
**Authority:** Eli Customer Experience/Privacy owner; Brock Advisor/Inventory context.  
**Dependencies:** `001`, `002`, `018`, `026`, `028`, `050`–`059`.  
**Affected algorithms:** `SRO-ALG-050`, `051`, `060`–`062`.  
**Operational consequence:** Customer attention is based on explainable service facts, not inferred emotion or identity.

## `SRO-APR-061` — Human intervention ownership and targets

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Brock owns initial staffed-hours customer/Inventory review; Eli owns manager escalation and cross-lane recovery. `RED` requires immediate pause/containment where applicable and acknowledgment within 15 minutes during staffed hours; `AMBER` requires review within the same staffed business day; `GREEN` remains routine; `UNKNOWN` requires fact verification before classification or action. Permitted actions are verify context, assign owner/next action, correct data, update a verified forecast, obtain required authority, escalate safety/quality/financial issues, or communicate through the existing authorized manual route. No after-hours route or automatic customer contact is approved.

**Required fields:** Exact staffed clock hours and backup/after-hours route remain required before timed application support.  
**Safe default:** Existing manual complaint/service-recovery route.  
**Authority:** Brock primary review; Eli escalation/recovery; qualified reviewers for protected domains.  
**Dependencies:** `003`, `006`, `009`, `016`–`018`, `026`, `060`.  
**Affected algorithms:** `SRO-ALG-050`, `051`; escalation scenarios.  
**Operational consequence:** A risk indicator creates accountable human review, not automatic outreach or concession.

## `SRO-APR-062` — Dismissal, correction, and classification calibration

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Brock or Eli may dismiss/correct an advisory flag only with reason, source review, corrected fact, affected customer/commitment, actor and time. The prior flag remains in lineage and dependent recommendations are reevaluated. False positive means the approved signal/band was not supported by current authoritative facts; false negative means a qualifying fact existed but no appropriate flag appeared. Both are reviewed by signal, lane, source freshness and customer impact without inferring staff blame. No threshold self-adjusts. Until representative validation, accepted thresholds and Workshop 8 measures exist, flags cannot affect priority, customer treatment, compensation, messaging or staff evaluation.

**Required fields:** Validation sample, acceptable error thresholds and review cadence remain Workshop 8 inputs.  
**Safe default:** Flags advisory/unavailable and cannot drive customer decisions.  
**Authority:** Eli Customer/Data owner; Brock operational correction; independent review where required.  
**Dependencies:** `028`, `029`, `057`, `060`, `061`; later `073`–`075`.  
**Affected algorithms:** `SRO-ALG-050`, `060`–`062`.  
**Operational consequence:** Correction improves evidence without allowing the system to tune itself.

## `SRO-APR-063` — Complaint, compensation, and admission authority

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Complaint documentation, operational recovery, financial concession, warranty determination, liability admission and safety/insurance reporting are distinct actions. Brock may document, verify facts and communicate an Eli-approved operational update; only Eli may approve compensation/goodwill/refund under current financial authority. No one may make a legal/liability admission or insurance/warranty determination without the applicable qualified route. Every action records exact issue, facts/uncertainty, authority, cumulative exposure, wording, affected estimate/invoice and follow-up. No limits, legal conclusion or automatic concession are inferred; absent required authority, the action is unavailable.

**Required fields:** Compensation limits, qualified legal/insurance/warranty route, backup and approved wording remain required.  
**Safe default:** Document and escalate; no automated concession, admission or determination.  
**Authority:** Eli GM/Finance/Customer; Brock documentation/communication; qualified external route where required.  
**Dependencies:** `006`, `038`, `046`, `047`, `055`, `060`–`062`.  
**Affected algorithms:** `SRO-ALG-050`, `051`, `033`, `043`.  
**Operational consequence:** Service recovery cannot silently become a financial or legal admission.

## `SRO-APR-064` — Transactional versus marketing communication

**Recommended:** `APPROVE`

**Exact proposed policy:** A transactional message is limited to a current requested service, authorized repair, appointment, verified status, required authorization, safety/quality restriction or customer-requested response. Marketing or predictive outreach promotes future service, retention, offers or inferred opportunities. Purpose cannot be changed after data collection or hidden inside a transactional message. Each communication records purpose, basis/consent where required, channel, audience, source facts, human approver and suppression check. Transactional permission does not authorize marketing, and operational urgency does not waive channel or suppression controls. No application sending is authorized.

**Required fields:** None for purpose separation; channel-specific consent/configuration remains required.  
**Safe default:** No predictive/marketing outreach; existing authorized manual transactional route only.  
**Authority:** Eli Privacy/Customer owner; Brock existing transactional communication role.  
**Dependencies:** `002`, `003`, `050`, `051`, `055`, `058`, `059`.  
**Affected algorithms:** `SRO-ALG-043`, `051`–`054`.  
**Operational consequence:** A service update cannot become disguised marketing.

## `SRO-APR-065` — Declined-service follow-up

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Follow-up eligibility requires an attributable declined/deferred item, current vehicle/customer identity, confirmed scope and recommendation source, no unresolved safety-critical instruction requiring a different route, permitted purpose/channel, current consent or other qualified basis, suppression pass and human review. Content must state the original finding/recommendation, uncertainty, date, current-verification need and that no work is authorized. Brock owns human review; Eli owns policy/escalation. No timing, frequency, offer, safety language or automated sending is inferred. Until exact consent, timing, suppression and approved content exist, automated or predictive follow-up is prohibited.

**Required fields:** Eligibility window, timing, content templates, consent/basis, channels, frequency, suppression and safety route.  
**Safe default:** No automated follow-up; existing customer-requested manual route only.  
**Authority:** Brock Advisor review; Eli Privacy/Customer/Marketing policy; qualified compliance review retained.  
**Dependencies:** `003`, `006`, `033`, `055`, `058`, `064`, `069`.  
**Affected algorithms:** `SRO-ALG-052`, `054`.  
**Operational consequence:** A historical decline cannot create unconsented or misleading outreach.

## `SRO-APR-066` — Mileage source and observation/prediction separation

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Observed mileage, customer-reported mileage, imported mileage and predicted mileage are distinct. Every value records source, observation/event time, unit, vehicle identity, confidence and correction lineage. An attributable current physical observation is preferred; other sources remain labeled and conflicts require manual resolution. Predicted mileage is always a range with as-of date, assumptions and uncertainty and is never authoritative for safety, warranty, pricing, authorization, odometer disclosure or service completion. No authoritative mileage integration is approved; staff use current verified manual observations.

**Required fields:** Approved mileage sources, freshness, conflict authority and integration mappings.  
**Safe default:** Predicted mileage unavailable/advisory; current manual observation controls.  
**Authority:** Eli Data/Shop owner; Brock/authorized staff may record attributable observations.  
**Dependencies:** `002`, `035`, `057`; later `070`–`072`.  
**Affected algorithms:** `SRO-ALG-053`, `060`–`062`.  
**Operational consequence:** A forecast cannot become an odometer fact.

## `SRO-APR-067` — Predictive method and validation

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Any future usage/service prediction must identify method/version, eligible population, input sources/freshness, observation window, low/expected/high result, confidence, exclusions, validation sample, error/calibration measures, drift checks and no-guarantee language. Missing or conflicting authoritative data produces `UNKNOWN`; safety-critical, warranty, legal disclosure, pricing or authorization decisions may not rely on prediction. No prediction self-changes policy or triggers outreach. Because no validated method, sample or acceptance thresholds are approved, predictive recommendations remain unavailable.

**Required fields:** Method, representative sample, validation/error thresholds, drift limits, owners and accepted evidence.  
**Safe default:** No predictive recommendation.  
**Authority:** Eli Algorithm/Data/Shop owner; independent validation/qualified review where required.  
**Dependencies:** `028`, `029`, `057`, `061`, `062`, `066`; later `073`–`075`.  
**Affected algorithms:** `SRO-ALG-053`, `060`–`062`.  
**Operational consequence:** Prediction is unavailable until evidence shows it is calibrated and safe for its narrow purpose.

## `SRO-APR-068` — OEM interval source authority

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** An OEM/service interval claim requires an approved source registry with publisher, document/version, effective date, exact year/make/model/engine/market/use-condition applicability, mileage/time logic, supersession, access rights, freshness and conflict route. Time-before-mileage and severe-use conditions remain visible. A qualified human validates applicability to the exact vehicle; generic search results, model output or stale reference cannot become an OEM claim. No approved source registry or provider integration is recorded, so application-generated OEM interval claims remain unavailable.

**Required fields:** Approved OEM/reference sources, licenses, applicability schema, freshness, conflict owner and integrations.  
**Safe default:** No application OEM-interval claim; staff use existing authorized manual reference.  
**Authority:** Eli Procedure/Data owner plus qualified source reviewer where required.  
**Dependencies:** `054`, `057`, `066`, `067`; later `070`–`072`.  
**Affected algorithms:** `SRO-ALG-053`, `052`; interval scenarios.  
**Operational consequence:** A plausible maintenance interval cannot be presented as manufacturer authority without exact applicability.

## `SRO-APR-069` — Consent, channel, frequency, and suppression

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Every proposed outbound communication must pass current purpose, consent or other qualified basis, channel permission, audience identity, frequency, quiet-hours, opt-out, global and purpose-specific suppression, do-not-contact, prior failure/retry and pending-complaint checks before human review. Opt-out/suppression takes precedence and is applied without unreasonable delay; retry cannot switch channels or purposes to evade it. Each decision is attributable and versioned. No consent source, channel, frequency, quiet hours, suppression registry or retry rule is approved here, so predictive/marketing application outreach is prohibited.

**Required fields:** Qualified consent/basis, channel rules, frequency, quiet hours, opt-out handling, suppression sources, retry limits and incident route.  
**Safe default:** No application outreach.  
**Authority:** Eli Privacy/Customer owner plus qualified compliance review; Brock may send only through an existing authorized manual route.  
**Dependencies:** `051`, `055`, `058`, `059`, `064`, `065`.  
**Affected algorithms:** `SRO-ALG-051`–`054`.  
**Operational consequence:** Outreach cannot occur until permission and suppression are proven for that exact purpose and channel.

## Workshop 7 acceptance response

Accepted 2026-07-16 through the controlled Codex session; exact time not captured:

| Decision | Accepted disposition | Journal record |
| --- | --- | --- |
| `060` | APPROVE_WITH_CHANGE | `SRO-AE7-APR-060` |
| `061` | APPROVE_WITH_CHANGE | `SRO-AE7-APR-061` |
| `062` | APPROVE_WITH_CHANGE | `SRO-AE7-APR-062` |
| `063` | APPROVE_WITH_CHANGE | `SRO-AE7-APR-063` |
| `064` | APPROVE | `SRO-AE7-APR-064` |
| `065` | APPROVE_WITH_CHANGE | `SRO-AE7-APR-065` |
| `066` | APPROVE_WITH_CHANGE | `SRO-AE7-APR-066` |
| `067` | APPROVE_WITH_CHANGE | `SRO-AE7-APR-067` |
| `068` | APPROVE_WITH_CHANGE | `SRO-AE7-APR-068` |
| `069` | APPROVE_WITH_CHANGE | `SRO-AE7-APR-069` |

```text
060: APPROVE_WITH_CHANGE — accept proposed baseline
061: APPROVE_WITH_CHANGE — accept proposed response-target baseline
062: APPROVE_WITH_CHANGE — accept proposed baseline
063: APPROVE_WITH_CHANGE — accept proposed baseline
064: APPROVE
065: APPROVE_WITH_CHANGE — accept proposed no-follow-up baseline
066: APPROVE_WITH_CHANGE — accept proposed baseline
067: APPROVE_WITH_CHANGE — accept proposed no-prediction baseline
068: APPROVE_WITH_CHANGE — accept proposed baseline
069: APPROVE_WITH_CHANGE — accept proposed no-outreach baseline

I accept the exact Workshop 7 policy text for every decision marked APPROVE or APPROVE_WITH_CHANGE: YES / NO
```

You may change any line to `DEFER_SAFE` or `REJECT`. A changed policy must include exact replacement language. No aggregate approval will be recorded unless you explicitly accept the exact text above.

## Current result

`1 APPROVED / 9 APPROVED_WITH_CHANGE / 10 CLOSED / 0 OPEN / PASSED FOR POLICY`.

This pass does not authorize design, code, automated classification, prediction, outreach, concessions, shadow use, pilot, activation, or application adaptation.
