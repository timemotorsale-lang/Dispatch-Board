# Workshops 1–8 Execution Gates

**Status:** Prepared; no workshop entered or completed
**Governing ledger:** [`Consolidated 79-Decision Ledger`](CONSOLIDATED_79_DECISION_LEDGER.md)

## Common execution rule

For every row in a workshop range, the facilitator reads the proposed policy, safe default, dependencies and affected algorithms/scenarios. An authorized human selects `APPROVE`, `APPROVE_WITH_CHANGE`, `DEFER_SAFE` or `REJECT`; the exact result is entered in the signature journal. A workshop is not complete when discussion occurred—it is complete only when every decision has a valid disposition, dependencies are closed/safely contained and required evidence is accepted.

## Workshop 1 gate — Charter, scope, lanes and pilot (`001`–`009`)

**Entry:** AE-0 entered; GM/Operations, Shop, Inventory, Advisor, Parts, Finance and Privacy scopes represented or safely deferred.

- [ ] Mission and higher-order protections adopted.
- [ ] Included and prohibited capabilities exact.
- [ ] Customer-pay, inventory-recon and internal/fleet lane ownership exact.
- [ ] Program roles, backups and separation rules exact.
- [ ] Minneapolis cohort/exclusions and automation modes exact.
- [ ] Pilot, pause, rollback and resume authority exact.

**Exit:** Signed charter, lane/role map and explicit `NO_GO` baseline. Current: `9 OPEN / NO-GO`.

## Workshop 2 gate — Operating model, WIP and readiness (`010`–`019`)

**Entry:** Workshop 1 scope/roles valid; Shop, Dispatch, Advisor, Technician, Parts, QC and Inventory represented.

- [ ] State and terminal-handoff meanings approved.
- [ ] Classes of service, queues and ownership approved.
- [ ] WIP limits and one-current/one-next exceptions exact.
- [ ] Job-start gate and non-waivable inputs exact.
- [ ] Block, pause, resume, interruption and resequencing authority exact.
- [ ] Customer/inventory commitment effect approved.
- [ ] Degraded/manual workflow and reconciliation approved.

**Required tabletop:** waiting customer; unready priority job; bay-blocked vehicle; revoked authorization; missing owner; source outage.

**Exit:** Staff can identify ready, blocked, owner, restriction and next valid action. Current: `10 OPEN / NO-GO`.

## Workshop 3 gate — Capacity, skills, resources and dispatch (`020`–`029`)

**Entry:** Workshop 2 states/readiness stable; calendar, qualification, safety/resource and fairness authorities represented.

- [ ] Calendars, availability, qualifications and resource eligibility exact.
- [ ] Capacity/buffer and duration uncertainty policy approved.
- [ ] Dispatch ranking excludes ineligible choices and explains factors.
- [ ] Promise-risk, resequencing and override controls exact.
- [ ] Staff fairness, correction and protected-use boundaries adopted.
- [ ] Balanced capacity/dispatch outcomes approved.

**Required tabletop:** A-tech shortage; lift/tool conflict; absence; emergency insertion; uncertain duration; customer promise versus inventory target.

**Exit:** Eligible-resource model and human-confirmed explainable dispatch policy approved. Current: `10 OPEN / NO-GO`.

## Workshop 4 gate — Parts, execution, QC and recovery (`030`–`039`)

**Entry:** Workshop 2 readiness and Workshop 3 eligibility controls valid; Parts, Shop, Technicians, QC, Advisor, Inventory and Purchasing represented.

- [ ] Parts availability/reservation/kit definitions and sources exact.
- [ ] Substitute technical and financial authority exact.
- [ ] Changed-scope work-stop and reauthorization route exact.
- [ ] Internal/sublet eligibility, custody and evidence exact.
- [ ] Execution completion evidence and QC templates exact.
- [ ] Verifier independence, road-test and safety requirements exact.
- [ ] Rework/comeback/warranty recovery and measures exact.

**Required tabletop:** partial kit; wrong part; ETA failure; changed scope; sublet completion; failed QC; repeat concern.

**Exit:** No job starts or releases from ambiguous parts, scope or quality state. Current: `10 OPEN / NO-GO`.

## Workshop 5 gate — Pricing and financial controls (`040`–`049`)

**Entry:** Finance/Controller, GM/Operations, Shop, Advisor, Parts and applicable qualified compliance represented; pricing sources and current practices available.

- [ ] Parts curves and labor time/rate/minimum policies exact and effective-dated.
- [ ] Floors, ceilings, anomalies and permitted attributes exact.
- [ ] Supplies, fees, taxes and disclosure reviewed by qualified authority.
- [ ] Estimate presentation/version/authorization exact.
- [ ] Discount, goodwill, refund and cumulative anti-splitting authority exact.
- [ ] Cost-change reapproval and realized-margin reconciliation exact.

**Required tabletop:** short labor job; older/corroded vehicle; package price; warranty/internal work; cost increase; partial authorization; layered discounts.

**Exit:** Every price is reproducible, attributable, within authority and correctly disclosed. Current: `10 OPEN / NO-GO`.

## Workshop 6 gate — Assistance, evidence, privacy and security (`050`–`059`)

**Entry:** Shop/QC, technicians/advisors, Privacy/Security, IT and procedure/evidence owners represented; provider/data flow known.

- [ ] Permitted voice/text purposes and prohibited decisions exact.
- [ ] Recording/transcription consent and jurisdiction reviewed.
- [ ] Structured findings and technician confirmation/correction exact.
- [ ] Procedure/catalog sources and versioning exact.
- [ ] Estimate/message drafts remain human-reviewed and unsent by default.
- [ ] Unsupported-output stop, lineage and provider controls approved.
- [ ] Outage, incident, disablement, fallback and resume exact.

**Required tabletop:** wrong-side transcription; slang ambiguity; uncertain cause; unsupported part; sensitive recording; provider outage.

**Exit:** Assistance reduces typing without diagnosing, pricing, authorizing, communicating or releasing. Current: `10 OPEN / NO-GO`.

## Workshop 7 gate — Customer intelligence and retention (`060`–`069`)

**Entry:** Advisor/Customer Experience, Shop, Privacy/Compliance, Marketing/CRM, Data and applicable Finance/GM authorities represented.

- [ ] Heat signals/bands exclude sensitive inference and retain context.
- [ ] Intervention ownership, targets, correction and error measurement exact.
- [ ] Complaint, compensation and admission authority exact.
- [ ] Transactional/marketing boundary adopted.
- [ ] Declined-service eligibility and suppression exact.
- [ ] Mileage and OEM interval sources/freshness exact.
- [ ] Prediction method, uncertainty and no-guarantee labeling exact.
- [ ] Consent, frequency, quiet hours, opt-out and suppression exact.

**Required tabletop:** sticker shock; missed promise; neutral-message false positive; stale mileage; opt-out; time-before-mileage interval.

**Exit:** Accountable human review without deceptive outreach, automatic concessions or unsupported predictions. Current: `10 OPEN / NO-GO`.

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
| 1 | 9 | 0 | 9 | NOT ENTERED |
| 2 | 10 | 0 | 10 | NOT ENTERED |
| 3 | 10 | 0 | 10 | NOT ENTERED |
| 4 | 10 | 0 | 10 | NOT ENTERED |
| 5 | 10 | 0 | 10 | NOT ENTERED |
| 6 | 10 | 0 | 10 | NOT ENTERED |
| 7 | 10 | 0 | 10 | NOT ENTERED |
| 8 | 10 | 0 | 10 | NOT ENTERED |
| **Total** | **79** | **0** | **79** | **NO-GO** |
