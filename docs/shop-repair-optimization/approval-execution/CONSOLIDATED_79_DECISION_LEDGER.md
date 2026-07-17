# Consolidated 79-Decision Execution Ledger

**Status:** 79 decisions open; recommendations are not approvals
**Source of decision names:** [`Approval Register`](../APPROVAL_REGISTER.md)

## Reading the ledger

`APPROVE_WITH_CHANGE` means exact company values, people, policy language or procedures must be inserted before approval. `DEFER_SAFE` is available only when the excluded capability, safe manual behavior, owner and review condition are explicit. The safe default controls while a decision is open, invalid, expired or conflicted.

## Workshop 1 — Charter, scope, lanes and pilot

| Decision | Recommended | Required authorized output | Safe default while open | Required authority | State |
| --- | --- | --- | --- | --- | --- |
| `SRO-APR-001` | APPROVE | Adopt safety-first lexicographic mission and protected outcomes | Observe only; no optimization tradeoff | GM/Operations + Shop owner | OPEN |
| `SRO-APR-002` | APPROVE | Adopt included capabilities and prohibited consequential authority | All consequential actions remain human/manual | GM/Operations + all affected owners | OPEN |
| `SRO-APR-003` | APPROVE_WITH_CHANGE | Name customer-pay owner, intake/authorization/communication boundary and backup | Customer-pay optimization unavailable | Shop + Advisor/Customer authority | OPEN |
| `SRO-APR-004` | APPROVE_WITH_CHANGE | Name inventory-recon owner and exact ITF input/output handoff | Inventory recon remains in existing manual process | Inventory + Shop workflow owners | OPEN |
| `SRO-APR-005` | APPROVE_WITH_CHANGE | Define internal/fleet eligibility, owner, charge/authorization and exclusions | Internal/fleet lane unavailable | GM/Operations + Finance + Shop | OPEN |
| `SRO-APR-006` | APPROVE_WITH_CHANGE | Name all program roles, backups, capability scopes and independent-review rules | Unassigned authority cannot act | GM/Operations + domain owners | OPEN |
| `SRO-APR-007` | APPROVE_WITH_CHANGE | Define Minneapolis cohort, lanes, vehicle/work exclusions and representative sample | No pilot cohort | GM/Operations + Shop + pilot owner | OPEN |
| `SRO-APR-008` | APPROVE | Keep observe, draft, recommend, confirmed-execute, bounded-auto and autonomous modes distinct | `L0 Observe` only | GM/Operations + policy/data owners | OPEN |
| `SRO-APR-009` | APPROVE_WITH_CHANGE | Name pilot, pause, rollback and resume authorities, triggers and backups | `NO_GO`; affected capability stays paused | GM/Operations + safety/data/pilot owners | OPEN |

## Workshop 2 — Operating model, WIP and readiness

| Decision | Recommended | Required authorized output | Safe default while open | Required authority | State |
| --- | --- | --- | --- | --- | --- |
| `SRO-APR-010` | APPROVE | Adopt distinct proposed/authorized/ready/active/blocked/QC/released/handoff states | Existing authoritative workflow controls | Shop + workflow owners | OPEN |
| `SRO-APR-011` | APPROVE_WITH_CHANGE | Define class-of-service values, owners, precedence and change authority | Manager classifies manually | Shop + Advisor + Inventory | OPEN |
| `SRO-APR-012` | APPROVE_WITH_CHANGE | Define queues, membership, owner, entry/exit and aging clocks | Existing queues; no algorithmic placement | Shop/Dispatch + queue owners | OPEN |
| `SRO-APR-013` | APPROVE_WITH_CHANGE | Set WIP limits by lane/resource, exceptions, expiry and escalation | No automated WIP enforcement | Shop + Dispatch | OPEN |
| `SRO-APR-014` | APPROVE_WITH_CHANGE | Approve one-current/one-ready-next scope and permitted exceptions | Existing manager dispatch | Shop + Dispatch + technicians | OPEN |
| `SRO-APR-015` | APPROVE | Require current authorization, skill, safety, parts, procedure, resource and location before start | Job cannot be declared ready | Shop + Safety + Parts | OPEN |
| `SRO-APR-016` | APPROVE | Require blocker reason, owner, next action, review time and commitment effect | Blocked work remains visible and cannot auto-resume | Shop + workflow owners | OPEN |
| `SRO-APR-017` | APPROVE_WITH_CHANGE | Define interruption/resequence reasons, authority, impact review and protected work | No algorithmic interruption | Shop + Dispatch | OPEN |
| `SRO-APR-018` | APPROVE_WITH_CHANGE | Define how customer promises and inventory targets affect priority without bypassing gates | Commitments displayed only | Shop + Advisor + Inventory | OPEN |
| `SRO-APR-019` | APPROVE_WITH_CHANGE | Approve manual roster/board, minimum facts, reconciliation and return-to-normal | Existing manual procedure only | Shop + IT/Data + all operators | OPEN |

## Workshop 3 — Capacity, skills, resources and dispatch

| Decision | Recommended | Required authorized output | Safe default while open | Required authority | State |
| --- | --- | --- | --- | --- | --- |
| `SRO-APR-020` | APPROVE_WITH_CHANGE | Set shop/staff/resource calendars, source authority, leave/break/training rules and freshness | Capacity unknown; manager verifies manually | Shop + HR/availability owner | OPEN |
| `SRO-APR-021` | APPROVE_WITH_CHANGE | Define skill/certification catalog, scope, validity, verifier and revocation | Unverified skill is ineligible | Shop + qualified verifier | OPEN |
| `SRO-APR-022` | APPROVE_WITH_CHANGE | Define bay/lift/tool/equipment eligibility, capacity, calibration and conflicts | Unverified resource is unavailable | Shop + Safety/resource owners | OPEN |
| `SRO-APR-023` | APPROVE_WITH_CHANGE | Set capacity assumptions, efficiency evidence, protected buffer and uncertainty | Historical observation only; no commitment | Shop + Dispatch/Finance | OPEN |
| `SRO-APR-024` | APPROVE_WITH_CHANGE | Define duration ranges, evidence hierarchy, confidence and update/reforecast rules | Show uncertainty; no guaranteed time | Shop + Dispatch + technicians | OPEN |
| `SRO-APR-025` | APPROVE_WITH_CHANGE | Approve eligibility-first ranking factors, precedence, weights and explanation | No ranked assignment recommendation | Shop + Dispatch + fairness owner | OPEN |
| `SRO-APR-026` | APPROVE_WITH_CHANGE | Set promise-risk bands, owners, response targets and customer/internal effects | Advisory age/target display only | Shop + Advisor + Inventory | OPEN |
| `SRO-APR-027` | APPROVE_WITH_CHANGE | Define resequencing triggers, human confirmation, overrides, concurrency and notifications | Static human-confirmed sequence | Shop + Dispatch | OPEN |
| `SRO-APR-028` | APPROVE | Exclude protected/irrelevant traits; require like-for-like context, uncertainty and challenge/correction | No employee scoring or disciplinary use | GM/Operations + Shop + HR/fairness | OPEN |
| `SRO-APR-029` | APPROVE_WITH_CHANGE | Define capacity/dispatch measures, denominators, protected outcomes and review cadence | Measurement cannot drive action | Shop + Data/measurement owner | OPEN |

## Workshop 4 — Parts, execution, QC and recovery

| Decision | Recommended | Required authorized output | Safe default while open | Required authority | State |
| --- | --- | --- | --- | --- | --- |
| `SRO-APR-030` | APPROVE_WITH_CHANGE | Define usable, available, reserved and complete-kit states, ownership and evidence | Unknown parts cannot make job ready | Parts + Shop | OPEN |
| `SRO-APR-031` | APPROVE_WITH_CHANGE | Name eligible sources, ETA authority/freshness, confidence and conflict handling | ETA advisory; source selection manual | Parts/Purchasing + Data | OPEN |
| `SRO-APR-032` | APPROVE_WITH_CHANGE | Define interchange evidence, technical/financial authority, fitment and warranty implications | Substitute unavailable | Qualified technical + Parts/Finance | OPEN |
| `SRO-APR-033` | APPROVE_WITH_CHANGE | Define changed-scope detection, estimate version, authorization, work stop and reapproval | Stop affected work | Shop + Advisor/Inventory authorizer | OPEN |
| `SRO-APR-034` | APPROVE_WITH_CHANGE | Define internal/sublet eligibility, credentials, custody, price, SLA, evidence and recovery | Existing approved route only | Shop + Purchasing + Safety | OPEN |
| `SRO-APR-035` | APPROVE | Require attributable procedure, parts, measurements, findings and completion evidence before QC handoff | Repair remains incomplete | Shop + technicians + Evidence owner | OPEN |
| `SRO-APR-036` | APPROVE_WITH_CHANGE | Define QC templates, applicability, verifier qualification/independence and failure routing | No QC pass/release | Shop + QC/Safety | OPEN |
| `SRO-APR-037` | APPROVE_WITH_CHANGE | Define road-test applicability, driver/insurance/route/weather/vehicle gates and evidence | No road test | Safety/Insurance + QC | OPEN |
| `SRO-APR-038` | APPROVE_WITH_CHANGE | Define rework, comeback and warranty classification, custody, authority, no-blame review and recovery | Manager/quality review required | Shop + QC + Finance/Warranty | OPEN |
| `SRO-APR-039` | APPROVE_WITH_CHANGE | Define fill, kit, quality, first-pass, rework/comeback and recovery measures | Measurement only; no staff judgment | Parts + QC + Data | OPEN |

## Workshop 5 — Pricing and financial controls

| Decision | Recommended | Required authorized output | Safe default while open | Required authority | State |
| --- | --- | --- | --- | --- | --- |
| `SRO-APR-040` | APPROVE_WITH_CHANGE | Approve effective-dated parts pricing curves by cost/part/lane/program and rounding | Existing authorized manual price | Finance + Parts | OPEN |
| `SRO-APR-041` | APPROVE_WITH_CHANGE | Define labor time source, rate, minimum charge, matrix and override boundaries | Existing authorized manual labor policy | Finance + Shop | OPEN |
| `SRO-APR-042` | APPROVE_WITH_CHANGE | Set floors, ceilings, anomaly thresholds, stop behavior and authority | Stop below-floor/anomalous presentation | Finance/Controller | OPEN |
| `SRO-APR-043` | APPROVE_WITH_CHANGE | Approve permitted vehicle/job/program attributes and prohibit unfair/sensitive pricing factors | Base authorized policy only | Finance + Compliance | OPEN |
| `SRO-APR-044` | APPROVE_WITH_CHANGE | Define supplies, fees, taxes, applicability, calculation, disclosure and source authority | No new fee/tax calculation | Finance + qualified compliance | OPEN |
| `SRO-APR-045` | APPROVE_WITH_CHANGE | Define estimate versions, calculation display, authorization, expiry and presentation controls | Draft only; cannot present/send | Finance + Advisor | OPEN |
| `SRO-APR-046` | APPROVE_WITH_CHANGE | Name discount/goodwill/refund authorities, limits, reasons, evidence and separation | No automated or unapproved concession | Finance + GM/Operations | OPEN |
| `SRO-APR-047` | APPROVE | Aggregate related exposure and prohibit splitting across lines, estimates and actions | Higher cumulative authority required | Finance/Controller | OPEN |
| `SRO-APR-048` | APPROVE_WITH_CHANGE | Define material cost/scope changes, tolerance, work stop, reapproval and notification | Stop affected work/presentation | Finance + Shop + authorizer | OPEN |
| `SRO-APR-049` | APPROVE_WITH_CHANGE | Define realized gross/margin, credits/returns/cores/warranty/write-offs and reconciliation | No policy tuning from unreconciled result | Finance + Parts/Data | OPEN |

## Workshop 6 — Assistance, evidence, privacy and security

| Decision | Recommended | Required authorized output | Safe default while open | Required authority | State |
| --- | --- | --- | --- | --- | --- |
| `SRO-APR-050` | APPROVE_WITH_CHANGE | Define permitted voice/text uses, users, data classes, lanes and prohibited decisions | AI/voice assistance off | Shop + Privacy/Security | OPEN |
| `SRO-APR-051` | APPROVE_WITH_CHANGE | Define recording/transcription notice, consent, withdrawal, jurisdiction, storage and access | No recording/transcription | Privacy + qualified compliance | OPEN |
| `SRO-APR-052` | APPROVE_WITH_CHANGE | Approve structured finding fields, observation/diagnosis separation, units and required evidence | Freeform/manual existing record | Shop + QC/Evidence | OPEN |
| `SRO-APR-053` | APPROVE_WITH_CHANGE | Require technician confirmation, ambiguity prompts, corrections and no silent finalization | Draft cannot become finding | Shop + technicians/QC | OPEN |
| `SRO-APR-054` | APPROVE_WITH_CHANGE | Name approved procedure/catalog sources, versions, access, freshness and conflict behavior | No AI procedure authority | Procedure owner + Shop/Data | OPEN |
| `SRO-APR-055` | APPROVE_WITH_CHANGE | Keep estimates/messages drafts; define human reviewer, source version, send/present boundary and audit | Draft not sent/presented | Advisor + Finance/Shop | OPEN |
| `SRO-APR-056` | APPROVE | Stop unsupported/harmful output, preserve report/evidence, use safe manual path and review dependencies | Output discarded/quarantined | Shop + Safety/Privacy | OPEN |
| `SRO-APR-057` | APPROVE | Preserve input/source, prompt/instruction, provider/model/version, output, edits, confirmer and outcome lineage | AI output cannot be evidence authority | Privacy/Data + Evidence owner | OPEN |
| `SRO-APR-058` | APPROVE_WITH_CHANGE | Approve provider, contract/security review, data use, access, retention, deletion, incident and exit controls | No external AI provider data | Privacy/Security + IT | OPEN |
| `SRO-APR-059` | APPROVE_WITH_CHANGE | Define outage/incident detection, disablement, manual fallback, reconciliation and resume authority | AI off; manual workflow | IT + Privacy/Security + Shop | OPEN |

## Workshop 7 — Customer intelligence and retention

| Decision | Recommended | Required authorized output | Safe default while open | Required authority | State |
| --- | --- | --- | --- | --- | --- |
| `SRO-APR-060` | APPROVE_WITH_CHANGE | Define permitted heat-case signals, bands, exclusions, context and prohibited sensitive inference | No automated heat classification | Customer Experience + Privacy | OPEN |
| `SRO-APR-061` | APPROVE_WITH_CHANGE | Name intervention owner/backups, response targets, actions and escalation | Existing manual complaint route | Advisor + Shop/Customer owner | OPEN |
| `SRO-APR-062` | APPROVE_WITH_CHANGE | Define dismissal/correction, false-positive/negative review, thresholds and calibration | Flags cannot affect customer decision | Customer owner + Data | OPEN |
| `SRO-APR-063` | APPROVE_WITH_CHANGE | Name complaint, compensation and admission authority, limits, legal/insurance routing and evidence | No automated concession or admission | GM/Finance + qualified reviewer | OPEN |
| `SRO-APR-064` | APPROVE | Keep transactional operational messages distinct from marketing and honor channel purpose | No predictive/marketing outreach | Privacy/Compliance + Customer owner | OPEN |
| `SRO-APR-065` | APPROVE_WITH_CHANGE | Define declined-service eligibility, safety exclusions, owner, timing, content, consent and suppression | No automated follow-up | Advisor + Privacy/Marketing | OPEN |
| `SRO-APR-066` | APPROVE_WITH_CHANGE | Approve mileage sources, observation/prediction labels, validation, freshness and conflict handling | Predicted mileage not authoritative | Data + Advisor/Shop | OPEN |
| `SRO-APR-067` | APPROVE_WITH_CHANGE | Define predictive method, uncertainty, confidence bands, validation, exclusions and no-guarantee language | No predictive recommendation | Algorithm/Data + Shop | OPEN |
| `SRO-APR-068` | APPROVE_WITH_CHANGE | Name OEM interval sources, market/engine applicability, version, freshness and conflict review | No OEM-interval claim | Procedure/Data owner | OPEN |
| `SRO-APR-069` | APPROVE_WITH_CHANGE | Define consent, purpose, channel, frequency, quiet hours, opt-out, suppression and retry controls | No outreach | Privacy/Compliance + Customer owner | OPEN |

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

These are recommendations only. Executed totals remain 0 closed and 79 open until valid journal records exist.
