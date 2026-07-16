# Inventory-to-Frontline Cross-Catalog Consistency and Approval Review

**Review status:** Complete for planning version `0.1.0`  
**Outcome:** Internally consistent and ready for dealership policy workshops; not approved for code or activation  
**Reviewed:** 2026-07-15  
**Scope:** Acquisition through verified, revocable `FRONTLINE_READY`

## 1. Executive decision

The nine catalogs form one coherent Inventory-to-Frontline lifecycle. No stage claims authority owned by its successor, every handoff has an attributable completion boundary, critical gates consistently outrank scores/recommendations, and later material facts consistently use correction/supersession/suspension rather than historical deletion.

The package is **catalog-complete but not implementation-approved**. It may proceed to structured dealership approval workshops. Code design remains blocked until:

- global scope, ownership, evidence, security, timing, financial, integration, and pilot decisions are approved;
- the applicable stage-specific Approval Register range is approved or safely deferred;
- counsel/compliance approves live-pilot Title/Document applicability;
- machine-enforceable handoff, policy, evidence, authority, exception, and release contracts are designed from the approved decisions;
- the planned acceptance evidence and pilot safeguards are assigned.

Approval to design or implement does not authorize live activation.

## 2. Reviewed inventory

| Item | Reviewed count | Result |
| --- | ---: | --- |
| Vertical-slice catalogs | 9 | Complete |
| Catalog decisions | 318 | Identifier families unique within catalogs |
| Catalog scenarios | 410 | All mapped to acceptance coverage |
| Acceptance cases | 220 | Present across all nine slices |
| Catalog-native evidence requirements | 168 | Present for slices 2-9 |
| Acquisition/Transportation evidence requirements | 16 | Canonical in `OPERATING_CONTROLS.md` |
| Total planned evidence requirements | 184 | Criticality requires approval |
| Open dealership decisions | 130 | None approved by documentation alone |

The difference in catalog structure for the first slice is intentional but should be normalized into implementation manifests: Acquisition/Transportation stores its evidence catalog in Operating Controls, while later slices include evidence tables directly.

## 3. End-to-end handoff contract

| Sequence | Producing slice | Required output | Consuming slice | Consumer must revalidate | Boundary result |
| ---: | --- | --- | --- | --- | --- |
| 1 | Acquisition and Transportation (`AT`) | Authoritative acquisition, identity, destination, movement outcome, arrival evidence, receiver/expected property | Receipt and Custody (`RC`) | Physical arrival, VIN, condition, custody, keys/documents/accessories, secure location | Transport complete is not receipt complete |
| 2 | Receipt and Custody (`RC`) | Accepted receipt/custody version, discrepancies/restrictions, secure placement, inspection handoff | Inspection and Triage (`IT`) | Identity, custody, safe access, applicable template/resources, restrictions | Receipt complete is not inspection complete |
| 3 | Inspection and Triage (`IT`) | Accepted inspection version, findings, critical containment, triage dispositions, diagnosis/specialist needs | Recon Planning and Approval (`RPA`) or approved alternate | Finding currency, diagnosis boundary, required/optional/disposition routes | Finding recorded is not diagnosis or repair authority |
| 4 | Recon Planning and Approval (`RPA`) | Versioned estimate/alternatives, exact authorization, executable job requirements and dependencies | Parts and Repair Execution (`PRE`) | Current authority, job lineage, procedure, skills/resources, parts/dependencies | Estimate/approval is not executable readiness |
| 5 | Parts and Repair Execution (`PRE`) | Completed authorized job, part/labor custody, procedure evidence, stopped clock, QC requirements | Quality and Safety Verification (`QSV`) | Job status, effective procedure, execution evidence, parts/labor, restrictions | Technician finish is not QC pass |
| 6 | Quality and Safety Verification (`QSV`) | Latest passing per-job QC, all-job operational release, final condition, keys/custody, open restrictions | Title/Document Readiness (`TDR`) and/or Merchandising/Pricing (`MPR`) | Exact QC/release versions, current condition, route, restrictions | Repair release is not title, merchandising, or frontline readiness |
| 7 | Title and Document Readiness (`TDR`) | Versioned requirement evaluation, accepted evidence, external dependency state, constraints, downstream route | Merchandising and Pricing (`MPR`) or approved alternate | Current route, title evidence/expiry, prohibited actions, material changes | Title readiness is not listing/publication/frontline readiness |
| 8 | Merchandising and Pricing (`MPR`) | Verified fact/media/content versions, human-approved price, channel desired/observed state, package completion | Frontline Release Review (`FLR`) | Current title/QC/condition, package/price/channel versions, exceptions | Package completion is not frontline authorization |
| 9 | Frontline Release Review (`FLR`) | Frozen all-gate package, immutable release authorization, canonical state event, placement/availability/post-check work | Reservation/Sales Intake (outside this package) | Current `FRONTLINE_READY`, price/package, custody/location, restrictions | Frontline ready is not reservation, sale, delivery, or permanent fact |

### Handoff minimum envelope

Every implementation handoff must contain:

```text
handoffId and idempotencyKey
organizationId, locationId, inventoryUnitId, vehicleId
producerCatalogId/version and producerStage
producerAggregateId/version and completionEventId
outcome/status and effective/occurred/recorded times
actor/source and accountable next owner
target, clock lineage, restrictions, exceptions, next action
evidence IDs with requirement/result/verification/freshness/expiry
policy/template versions and source data fingerprint
consumer stage and accepted/rejected/waiting state
correlation/causation IDs and audit/event/outbox references
```

Consumer acceptance is a separate attributable fact. Producing a handoff cannot mark the consuming stage complete.

## 4. Approved parallelism model

The catalogs allow controlled parallel work without weakening release gates:

| Parallel path | Permitted preparation | Prohibited implication |
| --- | --- | --- |
| Title work during transport/receipt/recon | Requirement discovery, document requests, custody preparation, provider follow-up | Preliminary work cannot prove final title readiness |
| Merchandising preparation before final title/QC | Data verification, physical preparation, approved media/content drafts within explicit policy | Constrained preparation cannot silently authorize publication or frontline release |
| Parts sourcing while approval/dependencies mature | Quotes, fitment/interchange comparison, approved preliminary demand work | Quote/order acknowledgement cannot become stock, reservation, or repair authority |
| Downstream planning during external waits | Resource reservations, tentative targets, owner assignment, scenario review | Tentative planning cannot fabricate predecessor completion |

Every parallel action must declare permitted actions, prohibited actions, expiry/review, owner, evidence, and effect of a changed upstream fact.

## 5. Authoritative fact ownership

| Fact | Authoritative producer | Downstream consumers | Consistency rule |
| --- | --- | --- | --- |
| Canonical vehicle/inventory identity | Vehicle and Inventory Unit foundations | All slices | No secondary VIN/inventory identity |
| Acquisition/source authority | Acquisition/Transportation | All later slices | Correction/supersession, never silent overwrite |
| Physical arrival/custody/location | Receipt/Custody plus later custody events | Inspection through Frontline | Current custody is revalidated at every movement/release |
| Odometer observation | Append-only odometer/receipt/inspection observations | Title, Merchandising, Frontline | Conflicts remain visible and owned |
| Inspection findings | Inspection/Triage | Recon, execution, QC, Frontline | Later work references exact finding version |
| Diagnosis/authorized work | Recon Planning/Approval | Execution and QC | Proposal, presentation, authorization, and execution remain distinct |
| Parts availability/custody | Parts ledger | Execution/QC/cost projections | On-hand, available, reserved, issued, installed remain distinct |
| Repair completion | Parts/Repair Execution | QC | Never interpreted as QC pass |
| QC pass/repair release | Quality/Safety Verification | Title/Merch/Frontline | Latest valid inspection controls; failures remain historical |
| Title/document readiness | Title/Document Readiness | Merchandising/Frontline | Legal/agency facts retain external authority and expiry |
| Media/content package | Merchandising/Pricing | Channels/Frontline | Draft and approved versions remain distinct |
| Advertised price | Human price approval | Channels/Frontline/Sales intake | Recommendation/provider output cannot approve price |
| Channel state | Provider reconciliation | Frontline/Sales | Request/acknowledgement/live/removed are separate facts |
| Frontline authorization | Frontline Release Review | Lot/Sales/Reservation | Authorization is versioned, revocable, and separate from sale |

## 6. Cross-catalog invariants review

| Invariant | Review result | Required implementation expression |
| --- | --- | --- |
| One canonical vehicle and inventory cycle | Pass | Shared IDs and uniqueness/current-cycle checks |
| One accountable internal owner for every open item | Pass | Owner required on tasks/dependencies/exceptions/handoffs |
| Successor revalidates producer output | Pass | Handoff acceptance command with expected versions |
| Proposals/claims do not become authoritative outcomes | Pass | Separate states/records/commands |
| Critical gates cannot be averaged or generally overridden | Pass | Server hard rules before scoring/recommendations |
| External waiting remains internally owned | Pass | Dependency owner, original/revised targets, follow-up |
| Reassignment/comments/retries do not reset age | Pass | Clock lineage and immutable timing events |
| Corrections preserve original facts | Pass | Append-only correction/supersession/reversal |
| Replay/concurrency does not duplicate effects | Pass | Idempotency key, expected version, unique constraints |
| Consequential decisions use exact authority | Pass | Server capability/scope/amount and policy version |
| Provider acknowledgement is not completion | Pass | Mapped external state and reconciliation evidence |
| Recommendations/AI remain advisory | Pass | Provenance, human authority, fallback, monitoring, kill switch |
| Release/status/projection commit consistently | Pass in plan; design required | Transactional command plus reconciliation |
| Material later fact can suspend downstream reliance | Pass | Invalidation event, affected-scope evaluation, recovery |
| Activation is separate from implementation | Pass | Rollout/pilot policy gate and kill switch |

## 7. Terminology and state crosswalk

| Shared concept | Required meaning |
| --- | --- |
| `OBSERVED` | Attributable observation; not automatically verified or accepted |
| `RECEIVED` | Artifact/vehicle/response arrived; not automatically accepted or complete |
| `VERIFIED` | Required checks performed against approved sources/rules |
| `ACCEPTED` | Eligible authority accepts exact evidence for a defined purpose/version |
| `COMPLETE` | The producing stage's own exit gate passed only |
| `READY` | Current prerequisites for a named next action pass; scope must be explicit |
| `AUTHORIZED` | Eligible person approved exact scope/version/amount/action |
| `ACKNOWLEDGED` | External provider received or recognized a request; not final outcome |
| `RECONCILED` | Desired/internal and authoritative observed state were compared and resolved |
| `RELEASED` | Named operational boundary passed; destination/scope must be explicit |
| `FRONTLINE_READY` | Current retail-offering eligibility under an immutable release package; revocable |
| `SUSPENDED` | Prior authorization remains historical but current reliance/actions are restricted |
| `SUPERSEDED` | A later attributable version controls current projection; original remains immutable |

UI labels must include the object and scope where ambiguity is possible, such as `Job ready for QC`, `Repair order operationally released`, or `Vehicle frontline ready`.

## 8. Consistency findings and disposition

| Finding ID | Finding | Classification | Disposition |
| --- | --- | --- | --- |
| `CCR-001` | Package status said “implementation-ready” while all policy decisions remained open | Documentation inconsistency | Corrected to catalog-complete planning draft |
| `CCR-002` | Acceptance section still said “First-slice” after nine catalogs were added | Documentation inconsistency | Corrected to catalog acceptance scenarios |
| `CCR-003` | First-slice evidence table lives in Operating Controls while later evidence lives in each catalog | Structural normalization | Accept for policy review; generate one common implementation manifest before code |
| `CCR-004` | Handoff requirements are semantically complete but no single machine contract is yet approved | Design blocker | Use the minimum envelope in section 3 as the design input |
| `CCR-005` | Existing basic merchandising/frontline projection is materially narrower than the approved-plan target | Design blocker | Do not activate it as enterprise release; design versioned package/authorization/projection records |
| `CCR-006` | Roles, capabilities, limits, targets, exception eligibility, templates, and pilot thresholds remain `OPEN`/`TBD` | Policy blocker | Resolve through approval workshops; do not seed permissive defaults |
| `CCR-007` | Title/document applicability requires jurisdiction-specific counsel/compliance authority | Legal/policy blocker | `ITF-APR-130` mandatory for each pilot scope |
| `CCR-008` | Provider/channel/source authority, mapping, freshness, and degraded behavior are not approved | Integration/policy blocker | Approve field/source matrix before live adapter reliance |
| `CCR-009` | Atomic release authorization/projection and suspension/reinstatement persistence are planned but not fully represented by existing records | Architecture blocker | Design additive versioned records and transactional/reconciliation behavior |
| `CCR-010` | Reservation/sale/delivery begins after this package and is not part of Inventory-to-Frontline | Scope boundary | Keep downstream commercial commands separate; define handoff only |
| `CCR-011` | Temporary non-VIN identity scenario lacked an explicit acceptance reference | Traceability gap | Added `AT-ACC-021`; all 410 scenarios now have acceptance coverage |

No contradiction requires rewriting a stage catalog before policy review. Findings `CCR-004` through `CCR-009` block implementation or activation until their applicable gate is satisfied.

## 9. Approval dependency map

| Approval wave | Decisions | Required authorities | Output |
| --- | --- | --- | --- |
| 0. Program charter | `ITF-APR-001`-`006` | General/Operations, Inventory, workflow owners | Outcome, scope, precedence, boundaries, hard invariants |
| 1. Pilot operating foundation | `010`-`075` | Operations, Inventory, Office, security/data, finance, pilot owners | Cohort, roles, capabilities, evidence, timing, money, integrations, pilot controls |
| 2. Physical custody and condition | `080`-`099` | Receiving, Inventory, Shop/Safety, policy owner | Receipt, custody, inspection, containment, triage gates |
| 3. Repair planning and execution | `100`-`129` | Shop/Recon, Parts, Finance authority, QC/Safety | Authorization, parts, dispatch, labor, QC, repair release |
| 4. Title/document legal policy | `130`-`139` | Counsel/compliance, Office/Controller, Inventory | Pilot-specific legal applicability, custody, dependencies, readiness |
| 5. Public content and price | `140`-`149` | Inventory/Merchandising, pricing/GM, compliance, data/channel owners | Claims/media/content, price authority, channel publication/reconciliation |
| 6. Final frontline release | `150`-`159` | GM/Operations, independent release authority, Inventory/Sales/Lot | All-gate release, placement, availability, suspension/reinstatement |

Later waves may be discussed in parallel, but they cannot approve away unresolved predecessor authority. Wave 4 requires qualified counsel/compliance participation; waves 5-6 require the resulting title/disclosure boundaries.

## 10. Recommended approval workshops

### Workshop 1 - Program, scope, and pilot charter

- Decisions: `001`-`006`, `010`-`015`, `070`-`075`.
- Participants: GM/Operations, Inventory Manager, pilot owner, implementation owner.
- Exit: one location/cohort, exclusions, lifecycle boundary, rollout authority, pause/rollback authority.

### Workshop 2 - Roles, evidence, security, timing, money, and integrations

- Decisions: `020`-`065`.
- Participants: role owners, Office/Controller, security/data, finance authority, integration owners.
- Exit: named owners/capabilities, separation, evidence/access/retention, limits, clocks, source authority/freshness.

### Workshop 3 - Receipt, custody, inspection, and safety

- Decisions: `080`-`099`.
- Participants: receiving/lot, Inventory, Shop/Safety, qualified inspectors, operations authority.
- Exit: physical custody, movement/containment, inspection templates/results, triage and alternate routes.

### Workshop 4 - Recon, parts, repair, and QC

- Decisions: `100`-`129`.
- Participants: Shop/Recon, Parts, technicians, QC/peer/road-test authorities, financial approvers.
- Exit: exact work/financial authority, parts ledger/custody, dispatch/labor, QC/rework/operational release.

### Workshop 5 - Title and documents

- Decisions: `130`-`139`.
- Participants: counsel/compliance, Office/Controller/title staff, Inventory, evidence/security, provider owners.
- Exit: approved pilot-jurisdiction templates, non-waivable gates, custody, external filing/dependency, constrained states.

### Workshop 6 - Merchandising, pricing, and channels

- Decisions: `140`-`149`.
- Participants: merchandising/media/content, compliance, pricing/GM, data/market, website/channel owners.
- Exit: truthful claims/media, AI/provider limits, price authority, payload/publish/reconcile rules.

### Workshop 7 - Frontline release and readiness suspension

- Decisions: `150`-`159` plus unresolved cross-stage dependencies.
- Participants: GM/Operations, independent release reviewers, Inventory, Office, Shop/QC, Merchandising/Pricing, Sales/Lot.
- Exit: final dimension/criticality matrix, permitted noncritical exceptions, atomic release, placement/availability, verification, suspension/reinstatement.

### Workshop 8 - Tabletop sign-off

- Decisions: confirm applicable `070`-`075` and all slice exits.
- Participants: representative executors and managers from all pilot stages.
- Exit: at least the required representative cases completed, terminology understood, every gap owned, approval register signed, no unresolved critical policy conflict.

## 11. Documentation-to-code readiness decision

### Current result: `NO-GO FOR CODE`, `GO FOR APPROVAL WORKSHOPS`

The first implementation slice may move to technical design only when:

1. program charter and pilot scope are approved;
2. named roles/capabilities/separation are approved for the slice;
3. required evidence, access, retention, timing, exception, authority, and source rules are approved;
4. the slice-specific approval range is approved or an unresolved action is safely absent;
5. handoff producer/consumer contracts and idempotent/expected-version behavior are defined;
6. acceptance cases have automated/manual evidence owners;
7. rollout remains off by default and the pilot pause/rollback authority is named.

No later stage needs to be implemented merely because its catalog is approved. Each slice retains an independent code, verification, pilot, and activation gate.

## 12. Sign-off record

| Review authority | Required sign-off | Current state |
| --- | --- | --- |
| General/Operations Manager | Program scope, critical gates, release, pilot authority | OPEN |
| Inventory Manager | End-to-end operating model, ownership, handoffs | OPEN |
| Office Manager / Controller delegate | Documents, custody, financial/accounting boundaries | OPEN |
| Counsel/compliance | Title/document applicability and public/legal claims | OPEN |
| Shop/Recon/Parts/QC authorities | Repair planning, execution, safety, QC/release | OPEN |
| Merchandising/Pricing authority | Content, price, provider/channel behavior | OPEN |
| Security/Data/Integration owners | Access, retention, source authority, resilience | OPEN |
| Pilot owner | Cohort, training, measures, pause/rollback, evidence | OPEN |

This review records planning consistency only. Sign-off must be recorded through the Approval Register with effective scope, version, approver, date, rationale, and any constrained deferral.
