# Workshops 1–8 Execution Gates

**Status:** Workshops 1–7 passed for policy; Workshop 8 in decision review; 69 valid records and 10 open
**Governing ledger:** [`Consolidated 79-Decision Ledger`](CONSOLIDATED_79_DECISION_LEDGER.md)

## Common execution rule

For every row in a workshop range, the facilitator reads the proposed policy, safe default, dependencies and affected algorithms/scenarios. An authorized human selects `APPROVE`, `APPROVE_WITH_CHANGE`, `DEFER_SAFE` or `REJECT`; the exact result is entered in the signature journal. A workshop is not complete when discussion occurred—it is complete only when every decision has a valid disposition, dependencies are closed/safely contained and required evidence is accepted.

## Workshop 1 gate — Charter, scope, lanes and pilot (`001`–`009`)

**Entry:** AE-0 entered; GM/Operations, Shop, Inventory, Advisor, Parts, Finance and Privacy scopes represented or safely deferred.

- [x] Mission and higher-order protections adopted.
- [x] Included and prohibited capabilities exact.
- [x] Customer-pay, inventory-recon and internal/fleet lane ownership exact or safely restricted.
- [x] Program roles, backups and separation rules exact or safely restricted.
- [x] Minneapolis future cohort/exclusions and automation modes exact; pilot remains unauthorized.
- [x] Pilot, pause, rollback and resume authority exact or safely restricted.

**Exit:** Signed charter, lane/role map and explicit `NO_GO` baseline. Current: `9 VALID / 0 OPEN / PASSED FOR POLICY`.

## Workshop 2 gate — Operating model, WIP and readiness (`010`–`019`)

**Entry:** Workshop 1 scope/roles valid; Shop, Dispatch, Advisor, Technician, Parts, QC and Inventory represented.

- [x] State and terminal-handoff meanings approved.
- [x] Classes of service, queues and ownership approved.
- [x] WIP limits and one-current/one-next exceptions exact.
- [x] Job-start gate and non-waivable inputs exact.
- [x] Block, pause, resume, interruption and resequencing authority exact.
- [x] Customer/inventory commitment effect approved.
- [x] Degraded/manual workflow and reconciliation approved.

**Required tabletop:** waiting customer; unready priority job; bay-blocked vehicle; revoked authorization; missing owner; source outage.

**Exit:** Staff can identify ready, blocked, owner, restriction and next valid action. Current: `10 VALID / 0 OPEN / PASSED FOR POLICY`.

## Workshop 3 gate — Capacity, skills, resources and dispatch (`020`–`029`)

**Entry:** Workshop 2 states/readiness stable; calendar, qualification, safety/resource and fairness authorities represented.

- [x] Calendars, availability, qualifications and resource eligibility exact or safely restricted.
- [x] Capacity/buffer and duration uncertainty policy approved.
- [x] Dispatch ranking excludes ineligible choices and explains factors.
- [x] Promise-risk, resequencing and override controls exact or safely restricted.
- [x] Staff fairness, correction and protected-use boundaries adopted.
- [x] Balanced capacity/dispatch outcomes approved; Workshop 8 targets retained.

**Required tabletop:** A-tech shortage; lift/tool conflict; absence; emergency insertion; uncertain duration; customer promise versus inventory target.

**Exit:** Eligible-resource model and human-confirmed explainable dispatch policy approved. Current: `10 VALID / 0 OPEN / PASSED FOR POLICY`.

## Workshop 4 gate — Parts, execution, QC and recovery (`030`–`039`)

**Entry:** Workshop 2 readiness and Workshop 3 eligibility controls valid; Parts, Shop, Technicians, QC, Advisor, Inventory and Purchasing represented.

- [x] Parts availability/reservation/kit definitions exact; sources safely restricted.
- [x] Substitute technical and financial authority exact; substitution unavailable pending qualified route.
- [x] Changed-scope work-stop and reauthorization route exact.
- [x] Internal/sublet eligibility, custody and evidence exact or safely restricted.
- [x] Execution completion evidence exact; QC templates safely held pending configuration.
- [x] Verifier independence and road-test/safety requirements exact; road testing unavailable pending inputs.
- [x] Rework/comeback/warranty recovery and measures exact with financial holds retained.

**Required tabletop:** partial kit; wrong part; ETA failure; changed scope; sublet completion; failed QC; repeat concern.

**Exit:** No job starts or releases from ambiguous parts, scope or quality state. Current: `10 VALID / 0 OPEN / PASSED FOR POLICY`.

## Workshop 5 gate — Pricing and financial controls (`040`–`049`)

**Entry:** Finance/Controller, GM/Operations, Shop, Advisor, Parts and applicable qualified compliance represented; pricing sources and current practices available.

- [x] Parts and labor policy contracts exact; numerical matrices safely held pending approved values.
- [x] Floor/ceiling/anomaly contract and permitted attributes exact; thresholds held.
- [x] Supplies, fees and taxes prohibited from new calculation pending authoritative qualified review.
- [x] Estimate version/authorization exact; presentation channel safely held.
- [x] Discount/goodwill/refund and cumulative anti-splitting authority exact or safely restricted.
- [x] Zero-increase cost-change reapproval and realized-margin reconciliation exact.

**Required tabletop:** short labor job; older/corroded vehicle; package price; warranty/internal work; cost increase; partial authorization; layered discounts.

**Exit:** Every future supported price must be reproducible, attributable, within authority and correctly disclosed. Current: `10 VALID / 0 OPEN / PASSED FOR POLICY`.

## Workshop 6 gate — Assistance, evidence, privacy and security (`050`–`059`)

**Entry:** Shop/QC, technicians/advisors, Privacy/Security, IT and procedure/evidence owners represented; provider/data flow known.

- [x] Permitted assistance purposes and prohibited decisions exact; assistance remains off.
- [x] Recording/transcription prohibited pending qualified consent/jurisdiction review.
- [x] Structured findings and technician confirmation/correction exact.
- [x] Procedure/catalog source contract exact; automated retrieval unavailable pending registry.
- [x] Estimate/message drafts remain human-reviewed and unavailable for application sending.
- [x] Unsupported-output stop and lineage approved; no provider approved.
- [x] Outage, incident, disablement, fallback and independent resume exact or safely restricted.

**Required tabletop:** wrong-side transcription; slang ambiguity; uncertain cause; unsupported part; sensitive recording; provider outage.

**Exit:** Any future assistance may reduce typing without diagnosing, pricing, authorizing, communicating or releasing. Current: `10 VALID / 0 OPEN / PASSED FOR POLICY`.

## Workshop 7 gate — Customer intelligence and retention (`060`–`069`)

**Entry:** Advisor/Customer Experience, Shop, Privacy/Compliance, Marketing/CRM, Data and applicable Finance/GM authorities represented.

- [x] Heat signals/bands exclude sensitive inference and retain context; automation unavailable.
- [x] Intervention ownership, targets and correction exact; error thresholds retained for Workshop 8.
- [x] Complaint, compensation and admission authority exact or safely restricted.
- [x] Transactional/marketing boundary adopted.
- [x] Declined-service eligibility exact; follow-up unavailable pending suppression inputs.
- [x] Mileage and OEM source contracts exact; integrations/registries safely held.
- [x] Prediction method contract exact; prediction unavailable pending validation.
- [x] Consent/suppression contract exact; outreach unavailable pending company rules.

**Required tabletop:** sticker shock; missed promise; neutral-message false positive; stale mileage; opt-out; time-before-mileage interval.

**Exit:** Accountable human review without deceptive outreach, automatic concessions or unsupported predictions. Current: `10 VALID / 0 OPEN / PASSED FOR POLICY`.

## Workshop 8 gate — Data, measurement, tabletop and activation (`070`–`079`)

**Entry:** Workshops 1–7 decisions valid or safely deferred; all owners and representative staff present; source and evidence inventories available.

- [ ] Field/source authority, freshness, conflicts and degraded behavior exact.
- [ ] Integration, idempotency, reconciliation and recovery ownership exact.
- [ ] KPIs and protected outcomes exact.
- [ ] Shadow thresholds, samples and stop conditions exact.
- [ ] Required tabletop evidence accepted.
- [ ] First implementation/pilot slice and exclusions exact.
- [ ] Training, support and manual runbook accepted.
- [ ] Monitoring, incident, pause, rollback and resume controls accepted.
- [ ] Final result explicitly records `NO_GO`, `SHADOW_ONLY` or named-slice `PILOT_GO`.

**Exit:** Signed decision register and separately attributable authorization. Current: `10 OPEN / NO-GO`.

## Program control totals

| Workshop | Expected | Valid records | Open | Gate |
| --- | ---: | ---: | ---: | --- |
| 1 | 9 | 9 | 0 | PASSED FOR POLICY |
| 2 | 10 | 10 | 0 | PASSED FOR POLICY |
| 3 | 10 | 10 | 0 | PASSED FOR POLICY |
| 4 | 10 | 10 | 0 | PASSED FOR POLICY |
| 5 | 10 | 10 | 0 | PASSED FOR POLICY |
| 6 | 10 | 10 | 0 | PASSED FOR POLICY |
| 7 | 10 | 10 | 0 | PASSED FOR POLICY |
| 8 | 10 | 0 | 10 | IN DECISION REVIEW |
| **Total** | **79** | **69** | **10** | **NO-GO** |
