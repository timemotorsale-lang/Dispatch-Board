# Consolidated 79-Decision Execution Ledger

**Status:** Workshops 1–7 complete; 12 approved; 57 approved with change; 10 decisions open
**Source of decision names:** [`Approval Register`](../APPROVAL_REGISTER.md)

## Reading the ledger

`APPROVE_WITH_CHANGE` means exact company values, people, policy language or procedures must be inserted before approval. `DEFER_SAFE` is available only when the excluded capability, safe manual behavior, owner and review condition are explicit. The safe default controls while a decision is open, invalid, expired or conflicted.

## Workshop 1 — Charter, scope, lanes and pilot

| Decision | Recommended | Required authorized output | Safe default while open | Required authority | State |
| --- | --- | --- | --- | --- | --- |
| `SRO-APR-001` | APPROVE | Adopt safety-first lexicographic mission and protected outcomes | Observe only; no optimization tradeoff | GM/Operations + Shop owner | APPROVED — `SRO-AE1-APR-001` |
| `SRO-APR-002` | APPROVE | Adopt included capabilities and prohibited consequential authority | All consequential actions remain human/manual | GM/Operations + all affected owners | APPROVED — `SRO-AE1-APR-002` |
| `SRO-APR-003` | APPROVE_WITH_CHANGE | Name customer-pay owner, intake/authorization/communication boundary and backup | Customer-pay optimization unavailable | Shop + Advisor/Customer authority | APPROVED_WITH_CHANGE — `SRO-AE1-APR-003`; no Shop backup/after-hours route |
| `SRO-APR-004` | APPROVE_WITH_CHANGE | Name inventory-recon owner and exact ITF input/output handoff | Inventory recon remains in existing manual process | Inventory + Shop workflow owners | APPROVED_WITH_CHANGE — `SRO-AE1-APR-004`; application handoff/timer/recovery held |
| `SRO-APR-005` | APPROVE_WITH_CHANGE | Define internal/fleet eligibility, owner, charge/authorization and exclusions | Internal/fleet lane unavailable | GM/Operations + Finance + Shop | APPROVED_WITH_CHANGE — `SRO-AE1-APR-005` |
| `SRO-APR-006` | APPROVE_WITH_CHANGE | Name all program roles, backups, capability scopes and independent-review rules | Unassigned authority cannot act | GM/Operations + domain owners | APPROVED_WITH_CHANGE — `SRO-AE1-APR-006` |
| `SRO-APR-007` | APPROVE_WITH_CHANGE | Define Minneapolis cohort, lanes, vehicle/work exclusions and representative sample | No pilot cohort | GM/Operations + Shop + pilot owner | APPROVED_WITH_CHANGE — `SRO-AE1-APR-007` |
| `SRO-APR-008` | APPROVE | Keep observe, draft, recommend, confirmed-execute, bounded-auto and autonomous modes distinct | `L0 Observe` only | GM/Operations + policy/data owners | APPROVED — `SRO-AE1-APR-008` |
| `SRO-APR-009` | APPROVE_WITH_CHANGE | Name pilot, pause, rollback and resume authorities, triggers and backups | `NO_GO`; affected capability stays paused | GM/Operations + safety/data/pilot owners | APPROVED_WITH_CHANGE — `SRO-AE1-APR-009` |

## Workshop 2 — Operating model, WIP and readiness

| Decision | Recommended | Required authorized output | Safe default while open | Required authority | State |
| --- | --- | --- | --- | --- | --- |
| `SRO-APR-010` | APPROVE | Adopt distinct proposed/authorized/ready/active/blocked/QC/released/handoff states | Existing authoritative workflow controls | Shop + workflow owners | APPROVED — `SRO-AE2-APR-010` |
| `SRO-APR-011` | APPROVE_WITH_CHANGE | Define class-of-service values, owners, precedence and change authority | Manager classifies manually | Shop + Advisor + Inventory | APPROVED_WITH_CHANGE — `SRO-AE2-APR-011` |
| `SRO-APR-012` | APPROVE_WITH_CHANGE | Define queues, membership, owner, entry/exit and aging clocks | Existing queues; no algorithmic placement | Shop/Dispatch + queue owners | APPROVED_WITH_CHANGE — `SRO-AE2-APR-012` |
| `SRO-APR-013` | APPROVE_WITH_CHANGE | Set WIP limits by lane/resource, exceptions, expiry and escalation | No automated WIP enforcement | Shop + Dispatch | APPROVED_WITH_CHANGE — `SRO-AE2-APR-013` |
| `SRO-APR-014` | APPROVE_WITH_CHANGE | Approve one-current/one-ready-next scope and permitted exceptions | Existing manager dispatch | Shop + Dispatch + technicians | APPROVED_WITH_CHANGE — `SRO-AE2-APR-014` |
| `SRO-APR-015` | APPROVE | Require current authorization, skill, safety, parts, procedure, resource and location before start | Job cannot be declared ready | Shop + Safety + Parts | APPROVED — `SRO-AE2-APR-015` |
| `SRO-APR-016` | APPROVE | Require blocker reason, owner, next action, review time and commitment effect | Blocked work remains visible and cannot auto-resume | Shop + workflow owners | APPROVED — `SRO-AE2-APR-016` |
| `SRO-APR-017` | APPROVE_WITH_CHANGE | Define interruption/resequence reasons, authority, impact review and protected work | No algorithmic interruption | Shop + Dispatch | APPROVED_WITH_CHANGE — `SRO-AE2-APR-017` |
| `SRO-APR-018` | APPROVE_WITH_CHANGE | Define how customer promises and inventory targets affect priority without bypassing gates | Commitments displayed only | Shop + Advisor + Inventory | APPROVED_WITH_CHANGE — `SRO-AE2-APR-018` |
| `SRO-APR-019` | APPROVE_WITH_CHANGE | Approve manual roster/board, minimum facts, reconciliation and return-to-normal | Existing manual procedure only | Shop + IT/Data + all operators | APPROVED_WITH_CHANGE — `SRO-AE2-APR-019` |

## Workshop 3 — Capacity, skills, resources and dispatch

| Decision | Recommended | Required authorized output | Safe default while open | Required authority | State |
| --- | --- | --- | --- | --- | --- |
| `SRO-APR-020` | APPROVE_WITH_CHANGE | Set shop/staff/resource calendars, source authority, leave/break/training rules and freshness | Capacity unknown; manager verifies manually | Shop + HR/availability owner | APPROVED_WITH_CHANGE — `SRO-AE3-APR-020` |
| `SRO-APR-021` | APPROVE_WITH_CHANGE | Define skill/certification catalog, scope, validity, verifier and revocation | Unverified skill is ineligible | Shop + qualified verifier | APPROVED_WITH_CHANGE — `SRO-AE3-APR-021` |
| `SRO-APR-022` | APPROVE_WITH_CHANGE | Define bay/lift/tool/equipment eligibility, capacity, calibration and conflicts | Unverified resource is unavailable | Shop + Safety/resource owners | APPROVED_WITH_CHANGE — `SRO-AE3-APR-022` |
| `SRO-APR-023` | APPROVE_WITH_CHANGE | Set capacity assumptions, efficiency evidence, protected buffer and uncertainty | Historical observation only; no commitment | Shop + Dispatch/Finance | APPROVED_WITH_CHANGE — `SRO-AE3-APR-023` |
| `SRO-APR-024` | APPROVE_WITH_CHANGE | Define duration ranges, evidence hierarchy, confidence and update/reforecast rules | Show uncertainty; no guaranteed time | Shop + Dispatch + technicians | APPROVED_WITH_CHANGE — `SRO-AE3-APR-024` |
| `SRO-APR-025` | APPROVE_WITH_CHANGE | Approve eligibility-first ranking factors, precedence, weights and explanation | No ranked assignment recommendation | Shop + Dispatch + fairness owner | APPROVED_WITH_CHANGE — `SRO-AE3-APR-025` |
| `SRO-APR-026` | APPROVE_WITH_CHANGE | Set promise-risk bands, owners, response targets and customer/internal effects | Advisory age/target display only | Shop + Advisor + Inventory | APPROVED_WITH_CHANGE — `SRO-AE3-APR-026` |
| `SRO-APR-027` | APPROVE_WITH_CHANGE | Define resequencing triggers, human confirmation, overrides, concurrency and notifications | Static human-confirmed sequence | Shop + Dispatch | APPROVED_WITH_CHANGE — `SRO-AE3-APR-027` |
| `SRO-APR-028` | APPROVE | Exclude protected/irrelevant traits; require like-for-like context, uncertainty and challenge/correction | No employee scoring or disciplinary use | GM/Operations + Shop + HR/fairness | APPROVED — `SRO-AE3-APR-028` |
| `SRO-APR-029` | APPROVE_WITH_CHANGE | Define capacity/dispatch measures, denominators, protected outcomes and review cadence | Measurement cannot drive action | Shop + Data/measurement owner | APPROVED_WITH_CHANGE — `SRO-AE3-APR-029` |

## Workshop 4 — Parts, execution, QC and recovery

| Decision | Recommended | Required authorized output | Safe default while open | Required authority | State |
| --- | --- | --- | --- | --- | --- |
| `SRO-APR-030` | APPROVE_WITH_CHANGE | Define usable, available, reserved and complete-kit states, ownership and evidence | Unknown parts cannot make job ready | Parts + Shop | APPROVED_WITH_CHANGE — `SRO-AE4-APR-030` |
| `SRO-APR-031` | APPROVE_WITH_CHANGE | Name eligible sources, ETA authority/freshness, confidence and conflict handling | ETA advisory; source selection manual | Parts/Purchasing + Data | APPROVED_WITH_CHANGE — `SRO-AE4-APR-031` |
| `SRO-APR-032` | APPROVE_WITH_CHANGE | Define interchange evidence, technical/financial authority, fitment and warranty implications | Substitute unavailable | Qualified technical + Parts/Finance | APPROVED_WITH_CHANGE — `SRO-AE4-APR-032` |
| `SRO-APR-033` | APPROVE_WITH_CHANGE | Define changed-scope detection, estimate version, authorization, work stop and reapproval | Stop affected work | Shop + Advisor/Inventory authorizer | APPROVED_WITH_CHANGE — `SRO-AE4-APR-033` |
| `SRO-APR-034` | APPROVE_WITH_CHANGE | Define internal/sublet eligibility, credentials, custody, price, SLA, evidence and recovery | Existing approved route only | Shop + Purchasing + Safety | APPROVED_WITH_CHANGE — `SRO-AE4-APR-034` |
| `SRO-APR-035` | APPROVE | Require attributable procedure, parts, measurements, findings and completion evidence before QC handoff | Repair remains incomplete | Shop + technicians + Evidence owner | APPROVED — `SRO-AE4-APR-035` |
| `SRO-APR-036` | APPROVE_WITH_CHANGE | Define QC templates, applicability, verifier qualification/independence and failure routing | No QC pass/release | Shop + QC/Safety | APPROVED_WITH_CHANGE — `SRO-AE4-APR-036` |
| `SRO-APR-037` | APPROVE_WITH_CHANGE | Define road-test applicability, driver/insurance/route/weather/vehicle gates and evidence | No road test | Safety/Insurance + QC | APPROVED_WITH_CHANGE — `SRO-AE4-APR-037` |
| `SRO-APR-038` | APPROVE_WITH_CHANGE | Define rework, comeback and warranty classification, custody, authority, no-blame review and recovery | Manager/quality review required | Shop + QC + Finance/Warranty | APPROVED_WITH_CHANGE — `SRO-AE4-APR-038` |
| `SRO-APR-039` | APPROVE_WITH_CHANGE | Define fill, kit, quality, first-pass, rework/comeback and recovery measures | Measurement only; no staff judgment | Parts + QC + Data | APPROVED_WITH_CHANGE — `SRO-AE4-APR-039` |

## Workshop 5 — Pricing and financial controls

| Decision | Recommended | Required authorized output | Safe default while open | Required authority | State |
| --- | --- | --- | --- | --- | --- |
| `SRO-APR-040` | APPROVE_WITH_CHANGE | Approve effective-dated parts pricing curves by cost/part/lane/program and rounding | Existing authorized manual price | Finance + Parts | APPROVED_WITH_CHANGE — `SRO-AE5-APR-040` |
| `SRO-APR-041` | APPROVE_WITH_CHANGE | Define labor time source, rate, minimum charge, matrix and override boundaries | Existing authorized manual labor policy | Finance + Shop | APPROVED_WITH_CHANGE — `SRO-AE5-APR-041` |
| `SRO-APR-042` | APPROVE_WITH_CHANGE | Set floors, ceilings, anomaly thresholds, stop behavior and authority | Stop below-floor/anomalous presentation | Finance/Controller | APPROVED_WITH_CHANGE — `SRO-AE5-APR-042` |
| `SRO-APR-043` | APPROVE_WITH_CHANGE | Approve permitted vehicle/job/program attributes and prohibit unfair/sensitive pricing factors | Base authorized policy only | Finance + Compliance | APPROVED_WITH_CHANGE — `SRO-AE5-APR-043` |
| `SRO-APR-044` | APPROVE_WITH_CHANGE | Define supplies, fees, taxes, applicability, calculation, disclosure and source authority | No new fee/tax calculation | Finance + qualified compliance | APPROVED_WITH_CHANGE — `SRO-AE5-APR-044` |
| `SRO-APR-045` | APPROVE_WITH_CHANGE | Define estimate versions, calculation display, authorization, expiry and presentation controls | Draft only; cannot present/send | Finance + Advisor | APPROVED_WITH_CHANGE — `SRO-AE5-APR-045` |
| `SRO-APR-046` | APPROVE_WITH_CHANGE | Name discount/goodwill/refund authorities, limits, reasons, evidence and separation | No automated or unapproved concession | Finance + GM/Operations | APPROVED_WITH_CHANGE — `SRO-AE5-APR-046` |
| `SRO-APR-047` | APPROVE | Aggregate related exposure and prohibit splitting across lines, estimates and actions | Higher cumulative authority required | Finance/Controller | APPROVED — `SRO-AE5-APR-047` |
| `SRO-APR-048` | APPROVE_WITH_CHANGE | Define material cost/scope changes, tolerance, work stop, reapproval and notification | Stop affected work/presentation | Finance + Shop + authorizer | APPROVED_WITH_CHANGE — `SRO-AE5-APR-048` |
| `SRO-APR-049` | APPROVE_WITH_CHANGE | Define realized gross/margin, credits/returns/cores/warranty/write-offs and reconciliation | No policy tuning from unreconciled result | Finance + Parts/Data | APPROVED_WITH_CHANGE — `SRO-AE5-APR-049` |

## Workshop 6 — Assistance, evidence, privacy and security

| Decision | Recommended | Required authorized output | Safe default while open | Required authority | State |
| --- | --- | --- | --- | --- | --- |
| `SRO-APR-050` | APPROVE_WITH_CHANGE | Define permitted voice/text uses, users, data classes, lanes and prohibited decisions | AI/voice assistance off | Shop + Privacy/Security | APPROVED_WITH_CHANGE — `SRO-AE6-APR-050` |
| `SRO-APR-051` | APPROVE_WITH_CHANGE | Define recording/transcription notice, consent, withdrawal, jurisdiction, storage and access | No recording/transcription | Privacy + qualified compliance | APPROVED_WITH_CHANGE — `SRO-AE6-APR-051` |
| `SRO-APR-052` | APPROVE_WITH_CHANGE | Approve structured finding fields, observation/diagnosis separation, units and required evidence | Freeform/manual existing record | Shop + QC/Evidence | APPROVED_WITH_CHANGE — `SRO-AE6-APR-052` |
| `SRO-APR-053` | APPROVE_WITH_CHANGE | Require technician confirmation, ambiguity prompts, corrections and no silent finalization | Draft cannot become finding | Shop + technicians/QC | APPROVED_WITH_CHANGE — `SRO-AE6-APR-053` |
| `SRO-APR-054` | APPROVE_WITH_CHANGE | Name approved procedure/catalog sources, versions, access, freshness and conflict behavior | No AI procedure authority | Procedure owner + Shop/Data | APPROVED_WITH_CHANGE — `SRO-AE6-APR-054` |
| `SRO-APR-055` | APPROVE_WITH_CHANGE | Keep estimates/messages drafts; define human reviewer, source version, send/present boundary and audit | Draft not sent/presented | Advisor + Finance/Shop | APPROVED_WITH_CHANGE — `SRO-AE6-APR-055` |
| `SRO-APR-056` | APPROVE | Stop unsupported/harmful output, preserve report/evidence, use safe manual path and review dependencies | Output discarded/quarantined | Shop + Safety/Privacy | APPROVED — `SRO-AE6-APR-056` |
| `SRO-APR-057` | APPROVE | Preserve input/source, prompt/instruction, provider/model/version, output, edits, confirmer and outcome lineage | AI output cannot be evidence authority | Privacy/Data + Evidence owner | APPROVED — `SRO-AE6-APR-057` |
| `SRO-APR-058` | APPROVE_WITH_CHANGE | Approve provider, contract/security review, data use, access, retention, deletion, incident and exit controls | No external AI provider data | Privacy/Security + IT | APPROVED_WITH_CHANGE — `SRO-AE6-APR-058` |
| `SRO-APR-059` | APPROVE_WITH_CHANGE | Define outage/incident detection, disablement, manual fallback, reconciliation and resume authority | AI off; manual workflow | IT + Privacy/Security + Shop | APPROVED_WITH_CHANGE — `SRO-AE6-APR-059` |

## Workshop 7 — Customer intelligence and retention

| Decision | Recommended | Required authorized output | Safe default while open | Required authority | State |
| --- | --- | --- | --- | --- | --- |
| `SRO-APR-060` | APPROVE_WITH_CHANGE | Define permitted heat-case signals, bands, exclusions, context and prohibited sensitive inference | No automated heat classification | Customer Experience + Privacy | APPROVED_WITH_CHANGE — `SRO-AE7-APR-060` |
| `SRO-APR-061` | APPROVE_WITH_CHANGE | Name intervention owner/backups, response targets, actions and escalation | Existing manual complaint route | Advisor + Shop/Customer owner | APPROVED_WITH_CHANGE — `SRO-AE7-APR-061` |
| `SRO-APR-062` | APPROVE_WITH_CHANGE | Define dismissal/correction, false-positive/negative review, thresholds and calibration | Flags cannot affect customer decision | Customer owner + Data | APPROVED_WITH_CHANGE — `SRO-AE7-APR-062` |
| `SRO-APR-063` | APPROVE_WITH_CHANGE | Name complaint, compensation and admission authority, limits, legal/insurance routing and evidence | No automated concession or admission | GM/Finance + qualified reviewer | APPROVED_WITH_CHANGE — `SRO-AE7-APR-063` |
| `SRO-APR-064` | APPROVE | Keep transactional operational messages distinct from marketing and honor channel purpose | No predictive/marketing outreach | Privacy/Compliance + Customer owner | APPROVED — `SRO-AE7-APR-064` |
| `SRO-APR-065` | APPROVE_WITH_CHANGE | Define declined-service eligibility, safety exclusions, owner, timing, content, consent and suppression | No automated follow-up | Advisor + Privacy/Marketing | APPROVED_WITH_CHANGE — `SRO-AE7-APR-065` |
| `SRO-APR-066` | APPROVE_WITH_CHANGE | Approve mileage sources, observation/prediction labels, validation, freshness and conflict handling | Predicted mileage not authoritative | Data + Advisor/Shop | APPROVED_WITH_CHANGE — `SRO-AE7-APR-066` |
| `SRO-APR-067` | APPROVE_WITH_CHANGE | Define predictive method, uncertainty, confidence bands, validation, exclusions and no-guarantee language | No predictive recommendation | Algorithm/Data + Shop | APPROVED_WITH_CHANGE — `SRO-AE7-APR-067` |
| `SRO-APR-068` | APPROVE_WITH_CHANGE | Name OEM interval sources, market/engine applicability, version, freshness and conflict review | No OEM-interval claim | Procedure/Data owner | APPROVED_WITH_CHANGE — `SRO-AE7-APR-068` |
| `SRO-APR-069` | APPROVE_WITH_CHANGE | Define consent, purpose, channel, frequency, quiet hours, opt-out, suppression and retry controls | No outreach | Privacy/Compliance + Customer owner | APPROVED_WITH_CHANGE — `SRO-AE7-APR-069` |

## Workshop 8 — Data, measurement, tabletop and activation

| Decision | Recommended | Required authorized output | Safe default while open | Required authority | State |
| --- | --- | --- | --- | --- | --- |
| `SRO-APR-070` | APPROVE_WITH_CHANGE | Define field-by-field authoritative/advisory sources, lineage, owners and write boundaries | Source unknown/advisory; manual verification | Data/IT + domain owners | OPEN |
| `SRO-APR-071` | APPROVE_WITH_CHANGE | Define freshness bands, conflict authority, degraded levels, quarantine and return-to-normal | Stale/conflict cannot pass gate | Data/IT + Security/domain owners | OPEN |
| `SRO-APR-072` | APPROVE_WITH_CHANGE | Name integration/reconciliation owners, idempotency, retries, mismatch queues and closure evidence | Integrations advisory/manual | IT/Integration + domain owners | OPEN |
| `SRO-APR-073` | APPROVE_WITH_CHANGE | Approve KPI definitions, cohorts, denominators, protected outcomes, owners and cadence | Measurement cannot authorize action | Data/Measurement + all policy owners | OPEN |
| `SRO-APR-074` | APPROVE_WITH_CHANGE | Set shadow thresholds, sample, baseline, error/harm limits, review and stop behavior | No staff-facing recommendation | Algorithm + pilot/safety/fairness owners | OPEN |
| `SRO-APR-075` | APPROVE_WITH_CHANGE | Approve required tabletop/acceptance cases, expected evidence, owners and pass criteria | No design/pilot authorization | All represented authorities | OPEN |
| `SRO-APR-076` | APPROVE_WITH_CHANGE | Name first implementation and pilot slice, exact algorithms, lanes, cohort and exclusions | No implementation slice | GM/Operations + Shop + owners | OPEN |
| `SRO-APR-077` | APPROVE_WITH_CHANGE | Approve training, competency, support, manual runbook, feedback and escalation | No staff-facing use | Shop + Training/Support owners | OPEN |
| `SRO-APR-078` | APPROVE_WITH_CHANGE | Define monitoring, critical incidents, thresholds, pause, containment, rollback and resume | Immediate pause/manual operation | GM + Safety/Privacy/Data/pilot owners | OPEN |
| `SRO-APR-079` | APPROVE_WITH_CHANGE | Record exact `NO_GO`, `SHADOW_ONLY` or named-slice `PILOT_GO`, owners, version, scope and conditions | `NO_GO` | All required signers | OPEN |

## Control totals

| Recommended disposition | Count |
| --- | ---: |
| APPROVE | 12 |
| APPROVE_WITH_CHANGE | 67 |
| DEFER_SAFE | 0 |
| REJECT | 0 |
| **Total** | **79** |

These are recommendations only. Current executed totals are 12 approved, 57 approved with change and 10 open; the signature journal controls.
