# Approval Workshops 01-08 Program

**Status:** Prepared; not conducted  
**Decision state:** All decisions remain `OPEN`

## Program sequence

| Workshop | Name | Decisions | Required outcome |
| --- | --- | --- | --- |
| 1 | Program Charter, Scope, Lanes, and Pilot | `SRO-APR-001`-`009` | Approve mission, scope, boundaries, roles, pilot and precedence |
| 2 | Shop Operating Model, Classes of Service, WIP, and Readiness | `SRO-APR-010`-`019` | Approve states, queues, WIP limits, readiness, interruption and blocker policy |
| 3 | Capacity, Skills, Resources, Dispatch, and Forecasting | `SRO-APR-020`-`029` | Approve eligibility, capacity, sequencing, promises, fairness and overrides |
| 4 | Parts, Changed Scope, Sublet, QC, Rework, and Comebacks | `SRO-APR-030`-`039` | Approve parts/job execution and quality recovery controls |
| 5 | Parts/Labor Pricing, Discounts, Margin, and Financial Authority | `SRO-APR-040`-`049` | Approve transparent pricing matrices, limits and reconciliation |
| 6 | Technician/Advisor AI Assistance, Evidence, Privacy, and Security | `SRO-APR-050`-`059` | Approve recording/drafting boundary, consent, validation and retention |
| 7 | Customer Intelligence, Heat Cases, Predictive Service, and Outreach | `SRO-APR-060`-`069` | Approve intervention, prediction, consent, suppression and communication authority |
| 8 | Data Authority, Measurement, Tabletop, Pilot, and Final Sign-off | `SRO-APR-070`-`079` | Approve source matrix, test evidence, activation slices, pause/rollback and owners |

## Workshop 1 — Program Charter, Scope, Lanes, and Pilot

Participants: GM/Operations, Shop Manager, Inventory Manager, Service Advisor lead, Parts lead, Controller, IT/privacy owner.

Decide mission/objective hierarchy; customer-pay, inventory-recon and internal lanes; excluded authority; location/cohort; program roles; relationship to Inventory-to-Frontline; manual/shadow modes; initial success protections; pause/rollback authority.

Exit: one signed charter, lane ownership map, pilot boundary, and named authorities.

## Workshop 2 — Operating Model, WIP, and Readiness

Participants: Shop Manager, dispatcher/foreman, advisors, technicians, parts, QC, inventory.

Decide state model; classes of service; queue membership; WIP limits; one-current/one-next policy; job-start gate; blocker reasons/ownership; pause/resume/interruption; customer/inventory promise effect; degraded manual workflow.

Tabletops: waiting customer, unready priority job, bay-blocked vehicle, authorization revoked, missing owner, source outage.

Exit: staff can explain what is ready, what is blocked, who owns it, and what valid action comes next.

## Workshop 3 — Capacity, Skills, Resources, Dispatch, and Forecasting

Participants: Shop Manager, dispatcher, technician representatives, scheduling/appointment owner, HR/qualification owner, inventory.

Decide availability calendar; verified skills/certifications; bay/lift/tool/equipment requirements; protected buffer; efficiency assumptions; capacity range; dispatch ranking; promise forecast; resequencing/interruption; overrides; workload fairness.

Tabletops: A-tech shortage, equipment conflict, absence, emergency insertion, uncertain duration, inventory target versus customer promise.

Exit: approved eligible-resource model and explainable human-confirmed dispatch policy.

## Workshop 4 — Parts, Repair, Quality, and Recovery

Participants: Parts lead, Shop Manager, technicians, QC, advisors, inventory, purchasing authority.

Decide usable/available/reserved definitions; source/ETA confidence; substitutes; kitting; changed scope; purchase authority references; sublet qualification/custody; evidence; QC templates; road tests; rework/comeback/warranty recovery.

Tabletops: partial kit, wrong part, delayed ETA, changed scope, sublet completion, failed QC, repeat concern.

Exit: no job can start or release based on ambiguous parts or quality status.

## Workshop 5 — Pricing, Margin, Discounts, and Financial Authority

Participants: GM/Operations, Controller, Shop Manager, advisor lead, parts lead, compliance/legal as appropriate.

Decide parts curves; labor time/rate/minimum distinctions; floors/ceilings; vehicle/job/program rules; taxes/fees; matrix disclosures; discounts/goodwill/refunds; cumulative limits/anti-splitting; cost changes; realized margin reconciliation.

Tabletops: 0.3-hour job, older/corroded vehicle, package pricing, warranty/internal work, cost increase, partial authorization, layered discounts.

Exit: every price has an effective policy, visible calculation class, correct authority, and audit trail.

## Workshop 6 — Technician and Advisor Assistance

Participants: Technicians, advisors, Shop/QC, privacy/security, IT, procedure/catalog owners.

Decide permitted voice/text sources; recording/transcription consent; structured finding schema; confirmation; clarification; catalog/procedure retrieval; estimate and message drafts; unsupported-output controls; evidence; provider security; retention/access; incident response.

Tabletops: wrong-side transcription, slang, uncertain cause, unsupported part, sensitive recording, unavailable AI provider.

Exit: AI can reduce typing without becoming the diagnosing, pricing, authorizing, or communicating authority.

## Workshop 7 — Customer Intelligence and Retention

Participants: Advisor lead, Shop Manager, CRM/marketing owner, privacy/compliance, customer-experience owner.

Decide heat-case signals/bands; response targets; false-positive correction; compensation authority; transactional versus marketing communication; declined-service follow-up; mileage sources; predictive method/confidence; OEM schedule authority; consent; channel/frequency suppression.

Tabletops: sticker shock, missed promise, neutral message, no-keyword frustration, stale mileage, opt-out, time-before-mileage service interval.

Exit: customer intelligence creates accountable review without deceptive outreach or automatic concessions.

## Workshop 8 — Data, Measurement, Tabletop, Pilot, and Sign-off

Participants: All owners and representative staff.

Decide field authority/freshness; integration/reconciliation; metric definitions; shadow thresholds; test cases; staff training; slice sequence; monitoring; critical incident; pause/rollback/resume; final algorithm/policy owners and approval state.

Minimum end-to-end tabletop suite: normal customer repair, inventory recon, safety stop, unready dispatch, part failure, changed scope, price override, voice-assistance correction, heat case, mileage suppression, outage/manual recovery, QC failure/comeback.

Exit: signed decision register and explicit `NO_GO`, `SHADOW_ONLY`, or named-slice `PILOT_GO`. Planning completion alone defaults to `NO_GO`.

## Workshop conduct rule

For every decision, choose `APPROVE`, `APPROVE_WITH_CHANGE`, `DEFER_SAFE`, or `REJECT`. Approval records approver, authority, time, effective scope, exact policy language, conditions, dependencies, and affected algorithms/scenarios. Discussion or silence is not approval.
