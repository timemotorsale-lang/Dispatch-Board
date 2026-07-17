# Workshop 8 Decision Session — Data, Measurement, Tabletop, Slicing, and Final Authorization

**Session:** `SRO-AE0-2026-01`  
**Status:** `IN_DECISION_REVIEW — 10 OPEN`  
**Scope:** `SRO-APR-070`–`079`  
**Predecessor:** Workshops 1–7 passed for policy  
**Authorization boundary:** Policy closure only; the proposed final disposition is `NO_GO` for technical design, code, shadow use, pilot, production activation, and application adaptation

## `SRO-APR-070` — Field and source authority matrix

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Every consequential field must have a registry entry identifying semantic definition, authoritative system or human source, advisory sources, owner, permitted creator/updater, read/write boundary, identity keys, lineage, evidence, correction route, classification and affected gates. Advisory or generated data never overwrites authoritative facts. When no approved authoritative mapping exists, the field is `SOURCE_UNKNOWN`, may be displayed only as labeled context and must be manually verified before consequential use. Eli owns the Data/IT registry and applicable domain decision; Brock may correct attributable Advisor/Inventory facts within his scope. No external system or provider is designated authoritative by this decision.

**Required fields:** Actual field-by-field systems, owners, mappings, write paths and evidence sources remain required before technical design.  
**Safe default:** Source unknown/advisory; current manual human verification controls.  
**Authority:** Eli Data/IT and domain owner; Brock role-bounded corrections; qualified source owners retained.  
**Dependencies:** `010`–`069`.  
**Affected algorithms:** All `SRO-ALG-*` algorithms and integrations.  
**Operational consequence:** Policy closure cannot manufacture a system of record.

## `SRO-APR-071` — Freshness, conflicts, and degraded data

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Data used by a gate is `CURRENT_VERIFIED` only when verified for the relevant current event/version; `REVIEW_REQUIRED` when age, scope or change makes currentness uncertain; `CONFLICTED` when authoritative candidates disagree; and `UNAVAILABLE` when the approved source cannot be verified. `REVIEW_REQUIRED`, `CONFLICTED` or `UNAVAILABLE` data cannot satisfy readiness, authorization, safety, qualification, parts, financial, QC, consent or release gates. Eli or the approved domain authority resolves conflicts with evidence; corrections preserve lineage. Degraded operation uses the approved manual path and quarantines advancement until reconciliation. No numeric freshness interval is inferred.

**Required fields:** Field-specific freshness intervals/events, conflict owners, degraded levels and restoration evidence remain required before implementation.  
**Safe default:** Uncertain/stale/conflicting data fails the affected gate and requires manual verification.  
**Authority:** Eli Data/IT/Security and domain owner; qualified/independent review retained.  
**Dependencies:** `019`, `020`, `024`, `031`, `054`, `059`, `066`, `068`, `070`.  
**Affected algorithms:** All algorithms and consequential gates.  
**Operational consequence:** Old or conflicting data cannot be treated as current merely because it is available.

## `SRO-APR-072` — Integration and reconciliation controls

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Every future integration must identify owner, source/target, allowed direction, event identity and version, idempotency key, ordering/concurrency behavior, retry limit/backoff, authentication, error/mismatch queue, reconciliation method, correction authority, monitoring and closure evidence. Duplicate, late, partial, unauthorized or conflicting events do not silently advance workflow; they are correlated or quarantined. Return to normal requires all pending events reconciled and approved. Eli owns Integration/Data; affected domain owners confirm correction. No integration or authoritative-provider connection is approved here, so all integrations remain advisory/manual and no external write is authorized.

**Required fields:** Actual systems/endpoints, mappings, credentials, idempotency/retry values, owners and reconciliation procedures.  
**Safe default:** No automated integration writes; existing manual process and reconciliation.  
**Authority:** Eli IT/Integration/Data plus affected domain owner; independent review where required.  
**Dependencies:** `009`, `019`, `030`, `031`, `054`, `058`, `059`, `066`, `068`, `070`, `071`.  
**Affected algorithms:** All integrations and event-driven algorithms.  
**Operational consequence:** A retry, duplicate or outage cannot create a second operational truth.

## `SRO-APR-073` — Enterprise measurement definitions

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** The enterprise SRO scorecard uses the approved measures from Workshops 3–7 plus safety incidents/restriction compliance, authorization errors, source/freshness failures, privacy/security events, consent/suppression errors and manual-fallback/reconciliation performance. Every KPI records definition, numerator, denominator, cohort, exclusions, source/freshness, uncertainty, policy/algorithm version, owner and review cadence. Safety, authorization, quality/QC, privacy/security/consent, financial integrity and staff fairness are protected outcomes; improvement in speed, utilization, margin or retention cannot offset deterioration in them. Until exact sources, baselines and thresholds are accepted, measurement is descriptive only and cannot authorize action or expansion.

**Required fields:** Actual sources, baselines, target/error thresholds, final owners and accepted review cadence.  
**Safe default:** Descriptive measurement only; no consequential or expansion decision.  
**Authority:** Eli Data/Measurement and domain owner; independent/qualified protected-outcome review retained.  
**Dependencies:** `029`, `039`, `049`, `057`, `062`, `067`, `070`–`072`.  
**Affected algorithms:** `SRO-ALG-060`–`062` and all measured algorithms.  
**Operational consequence:** Every optimization claim must disclose its denominator and protected-outcome effects.

## `SRO-APR-074` — Shadow-evaluation thresholds and stop behavior

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** A future shadow evaluation requires a separately approved algorithm/slice version, representative baseline and sample, exact eligibility/exclusions, minimum sample/duration, correctness and calibration thresholds, false-positive/negative limits, protected-outcome noninferiority limits, review owners, incident stops and accepted evidence. Shadow output is hidden from operational staff decisions and cannot alter workflow, assignments, prices, promises, communication, QC or release. Any critical safety, authorization, financial, privacy, consent, fairness or data-integrity failure stops the evaluation. Because exact thresholds and evidence do not exist, shadow use is `NOT_AUTHORIZED`.

**Required fields:** Named version, baseline, sample, duration, thresholds, review owners and stop/acceptance evidence.  
**Safe default:** No shadow evaluation or staff-facing recommendation.  
**Authority:** Eli Algorithm/Pilot/Data authority plus independent safety/fairness/quality reviewers where required.  
**Dependencies:** `007`–`009`, `028`, `029`, `039`, `049`, `056`–`059`, `062`, `067`, `070`–`073`.  
**Affected algorithms:** Any proposed shadow algorithm; initially the future Slice 1 candidates only.  
**Operational consequence:** Policy approval is not evidence that an algorithm is accurate or safe.

## `SRO-APR-075` — Tabletop and acceptance suite

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** The 27 cases `SRO-TT-001`–`027` in the Enterprise Tabletop and Acceptance Suite are the minimum required set. Each run records current facts, participants/authority, sources/freshness, policy/version, expected and observed behavior, invalid choices excluded, human decisions, overrides, protected-outcome effects, gaps, owner/target, evidence and attributable acceptance. Every applicable case must pass; a failed or unrun case cannot be waived by aggregate success. Additional cases are added for discovered risks. The suite is approved as a requirement but remains `27 NOT RUN`; this decision does not authorize technical design, code, shadow use, pilot or activation.

**Required fields:** Actual run sessions, representative participants, observed results, gap closure and independent acceptance signatures.  
**Safe default:** No downstream authorization until all applicable cases pass and evidence is accepted.  
**Authority:** Eli coordinates; each domain and genuinely independent/qualified reviewer accepts within scope.  
**Dependencies:** `001`–`074`; [`TABLETOP_AND_ACCEPTANCE.md`](../approval-execution/TABLETOP_AND_ACCEPTANCE.md).  
**Affected algorithms:** All algorithms/scenarios.  
**Operational consequence:** A written test case is not a passed test.

## `SRO-APR-076` — First future implementation slice

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** The first future candidate is named **Slice 1 — Shop Flow Instrumentation and Job-Start Readiness Decision Support**. Its maximum policy scope is customer-pay and Inventory-Recon during staffed hours; `SRO-ALG-001`, `003`–`006`; `L0 Observe` initially; truthful state/queue/blocker instrumentation, readiness completeness and manager-visible explanation only. It excludes internal/fleet, safety-critical work, EV/high-voltage, road tests, purchases, pricing, customer messaging, AI/provider use, automated assignment/resequencing, QC/release, prediction and outreach. This naming establishes sequence and scope only. Technical design and implementation remain blocked until exact sources, calendars, skills/resources, mappings, acceptance criteria and a separate `IMPLEMENTATION_AUTHORIZED` decision exist.

**Required fields:** Technical source inventory, architecture, acceptance tests, delivery owner, exact cohort, training, monitoring and separate implementation authorization.  
**Safe default:** No implementation slice is authorized.  
**Authority:** Eli GM/Operations/Shop/Algorithm; Brock workflow participant; independent review retained.  
**Dependencies:** `007`–`009`, `020`–`029`, `070`–`075`.  
**Affected algorithms:** `SRO-ALG-001`, `003`–`006`; future Slice 1 only.  
**Operational consequence:** The next branch has a bounded candidate, not permission to write code.

## `SRO-APR-077` — Training, competency, support, and manual runbook

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Before any staff-facing use, each participant must complete role-based training and demonstrate competency on state/readiness meanings, source/freshness labels, manual fallback, correction/override, safety/QC/financial/privacy boundaries, incident reporting and prohibited uses. Training records version, trainer, participant, assessment, result, remediation and expiry/retraining trigger. Eli owns training/support; Brock supports Advisor/Inventory workflows after competency. A current manual runbook, help route, feedback route and staffed-hours escalation must be available and rehearsed. No staff-facing use occurs until exact materials, assessment/pass criteria, participants and support coverage are accepted.

**Required fields:** Training materials/version, participant roster, competency assessment/pass criteria, support contact, runbook and rehearsal evidence.  
**Safe default:** No staff-facing use.  
**Authority:** Eli Training/Support owner; Brock role-bounded support; qualified trainers where required.  
**Dependencies:** `006`, `007`, `009`, `019`, `056`, `059`, `075`, `076`.  
**Affected algorithms:** Any future staff-facing slice.  
**Operational consequence:** Access is based on demonstrated role competency, not attendance alone.

## `SRO-APR-078` — Monitoring, incidents, pause, rollback, and resume

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Any unauthorized action, safety/QC failure, systematic incorrect price, privacy/security/consent incident, corrupted authority/source, critical data/reconciliation failure, discriminatory effect, protected-outcome deterioration or loss of safe manual fallback triggers immediate affected-scope pause and containment. Eli is pause/rollback and Safety/Privacy/Data responder; Brock is staffed-hours backup within competence/conflict limits. New actions stop, current work is safely contained, evidence and owners remain visible, and manual operation continues. Resume requires root-cause correction, reconciliation, retest, threshold recovery and approval by an uninvolved competent reviewer; Eli cannot independently approve resume of Eli-originated action. Exact technical thresholds remain unapproved, so no pilot/activation monitoring is qualified.

**Required fields:** Technical signals/thresholds, notification channels, responder coverage, rollback procedure, drills and qualified independent resume reviewer.  
**Safe default:** Immediate pause, safe manual operation and no automatic resume.  
**Authority:** Eli primary; Brock staffed-hours backup; independent/qualified resume authority retained.  
**Dependencies:** `009`, `019`, `029`, `039`, `049`, `056`–`059`, `062`, `067`, `070`–`077`.  
**Affected algorithms:** All future SRO capabilities.  
**Operational consequence:** Monitoring policy exists, but activation cannot occur without real signals, drills and independent resume coverage.

## `SRO-APR-079` — Final policy and downstream authorization state

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** For Time Motor Sales / Minneapolis / `SRO-1.0`, the final current state is `POLICY_COMPLETE_WITH_SAFE_RESTRICTIONS / NO_GO`. Workshop policy records may close, but technical design, code implementation, shadow evaluation, pilot, production activation and application adaptation remain `NOT_AUTHORIZED`. Unavailable capabilities include application handoffs/timers, after-hours operation, unverified skills/resources, road testing, substitutes without qualified review, new pricing/tax/fee/concession logic, AI/providers/recording/transcription, automated classification/prediction/outreach and all consequential automation. The future Slice 1 candidate does not begin until applicable required inputs, source mappings, technical acceptance boundary, tabletop evidence, training/monitoring controls, independent reviews and a separate attributable `IMPLEMENTATION_AUTHORIZED` resolution are complete.

**Required fields:** None to record `NO_GO`; every listed closure condition remains required before any later authorization.  
**Safe default:** `NO_GO`; existing safe manual workflows only.  
**Authority:** User asserted decision authority; Eli ultimate reviewer/owner; independent/qualified reviewers remain required and cannot be replaced by Eli self-review.  
**Dependencies:** `001`–`078` and Master Authorization Resolution.  
**Affected algorithms:** All `SRO-ALG-*`; no active implementation.  
**Operational consequence:** Completing all 79 policy decisions closes governance planning but does not start implementation.

## Workshop 8 acceptance response

```text
070: APPROVE_WITH_CHANGE — accept proposed source-unknown/manual-verification baseline
071: APPROVE_WITH_CHANGE — accept proposed freshness/conflict baseline
072: APPROVE_WITH_CHANGE — accept proposed no-integration baseline
073: APPROVE_WITH_CHANGE — accept proposed descriptive-measurement baseline
074: APPROVE_WITH_CHANGE — accept proposed no-shadow baseline
075: APPROVE_WITH_CHANGE — accept 27-case suite as required but not executed
076: APPROVE_WITH_CHANGE — accept named future Slice 1 with no implementation authorization
077: APPROVE_WITH_CHANGE — accept proposed no-staff-use baseline
078: APPROVE_WITH_CHANGE — accept proposed monitoring/rollback baseline
079: APPROVE_WITH_CHANGE — accept POLICY_COMPLETE_WITH_SAFE_RESTRICTIONS / NO_GO

I accept the exact Workshop 8 policy text for every decision marked APPROVE_WITH_CHANGE: YES / NO
```

You may change any line to `DEFER_SAFE` or `REJECT`. A changed policy must include exact replacement language. Approval of this proposed packet closes policy decisions only and expressly preserves every downstream `NOT_AUTHORIZED` state.

## Current result

`0 CLOSED / 10 OPEN / WORKSHOP NOT PASSED / NO-GO`.
