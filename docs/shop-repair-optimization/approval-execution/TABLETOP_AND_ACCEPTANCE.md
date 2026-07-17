# SRO Enterprise Tabletop and Acceptance Suite

**Status:** Prepared; not executed or accepted
**Activation effect:** None; tabletop success does not authorize code, pilot or production

## Evidence record

Each run records case/session, participants and authority, lane/vehicle/RO facts, source freshness, policy/algorithm versions, eligible/excluded choices, recommendation/manual outcome, human decision, evidence, override, safety/financial/privacy/fairness effects, expected/observed result, gaps, acceptance authority and final disposition.

## Minimum end-to-end cases

| Case | Scenario | Required proof |
| --- | --- | --- |
| `SRO-TT-001` | Normal customer-pay repair | Lane, authorization, readiness, dispatch, parts, execution, QC, price and communication remain attributable |
| `SRO-TT-002` | Inventory recon from ITF with frontline target | ITF handoff preserved; priority cannot bypass authorization, safety, parts or QC |
| `SRO-TT-003` | Internal/fleet work with unclear charge authority | Lane remains unavailable until exact owner/authorization exists |
| `SRO-TT-004` | Waiting customer but job is unready | Waiting status affects visibility, not readiness hard gates |
| `SRO-TT-005` | Excess WIP and bay-blocked vehicle | Staff see blocker/owner/next action; no unready bay placement |
| `SRO-TT-006` | A-tech shortage, absence and lift/tool collision | Ineligible options excluded; capacity/promise uncertainty visible |
| `SRO-TT-007` | Emergency insertion interrupts committed work | Authorized human sees consequences; interruption is versioned and protected gates remain |
| `SRO-TT-008` | Partial kit, wrong part and unreliable ETA | Job cannot start on ambiguous availability; source/confidence and recovery remain visible |
| `SRO-TT-009` | Substitute/interchange proposed | Qualified fitment/technical and financial approvals required before use |
| `SRO-TT-010` | Changed repair scope after authorization | Affected work stops; versioned reauthorization and price/promise impacts are explicit |
| `SRO-TT-011` | Sublet work returns with incomplete evidence | Custody and completion remain incomplete; QC cannot infer work performed |
| `SRO-TT-012` | QC failure, repeat failure and comeback | Failed mandatory item blocks release; rework/review occurs without automatic blame |
| `SRO-TT-013` | Road test required but driver/vehicle/weather gate fails | No road test or release claim; approved alternate/containment remains visible |
| `SRO-TT-014` | Short labor job, older vehicle and package price | Time, rate, minimum, attributes and disclosure remain distinct and reproducible |
| `SRO-TT-015` | Layered discount crosses cumulative authority | Anti-splitting aggregates exposure and requires correct approver |
| `SRO-TT-016` | Cost increases after partial authorization | Original facts persist; affected work/presentation pauses for reapproval |
| `SRO-TT-017` | Voice draft uses wrong side/slang/uncertain cause | Technician confirmation/correction required; draft cannot become diagnosis or finding silently |
| `SRO-TT-018` | Sensitive recording and provider outage | Consent/access/retention protections hold; AI disables and safe manual path works |
| `SRO-TT-019` | Unsupported or harmful AI output | Output quarantines/stops; report and dependent review occur without consequential use |
| `SRO-TT-020` | Heat-case false positive and compensation request | Context/correction visible; no automatic concession, admission or customer classification |
| `SRO-TT-021` | Declined service with opt-out/quiet-hour conflict | Suppression wins; transactional and marketing purposes stay distinct |
| `SRO-TT-022` | Stale mileage and conflicting OEM interval | Prediction labeled uncertain; no authoritative mileage/interval claim or outreach |
| `SRO-TT-023` | Source outage/conflict and duplicate integration event | Degraded mode, idempotency, reconciliation and return-to-normal preserve one truthful state |
| `SRO-TT-024` | Unauthorized action or self-review attempt | Command/approval denied or held; genuine independent route required |
| `SRO-TT-025` | Employee challenges inaccurate skill/availability data | Recommendation impact is explainable and correction/review path works without retaliation |
| `SRO-TT-026` | Shadow results improve speed but harm safety/fairness/quality | Higher-order protected outcome forces stop/no-go |
| `SRO-TT-027` | Rollback during in-flight recommendations | New actions stop; manual state/ownership remains visible; reconciliation precedes resume |

## Acceptance gates

- [ ] All applicable policy decisions have valid dispositions.
- [ ] Expected and observed outcomes are captured for every required case.
- [ ] Invalid people, resources, jobs, sources and actions are excluded before ranking.
- [ ] Safety, authorization, financial, QC, privacy and consent hard gates cannot be offset by optimization scores.
- [ ] Human decisions, overrides, corrections and independent reviews are attributable.
- [ ] No case performs autonomous diagnosis, spend, pricing, communication, QC, release, compensation or employee action.
- [ ] Degraded/manual operation and reconciliation preserve truthful state.
- [ ] Protected outcomes, error rates and staff/customer challenge paths are accepted.
- [ ] All gaps have owner, target, safe restriction and closure evidence.
- [ ] Required authorities sign the result.

Current result: `27 NOT RUN / NO-GO`.
