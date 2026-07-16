# Frontline Release Review Decision and Scenario Catalog

**Status:** Proposed ninth vertical-slice catalog  
**Catalog ID:** `INV-ITF-FLR`  
**Version:** `0.1.0`  
**Activation:** Not approved; documentation only

## 1. Outcome and boundary

This catalog begins when Merchandising and Pricing submits a complete package for Frontline Release Review or an authorized manager requests reevaluation of a previously released/suspended unit. It ends when:

- one current, attributable readiness package assembles every applicable lifecycle gate and accepted evidence version;
- identity, acquisition/retail intent, receipt/custody, inspection, repair/QC, title/documents, physical condition, keys/accessories, merchandising/content, approved price, channel state, location/placement, ownership, and open-exception facts are current and mutually consistent;
- every critical safety, title/compliance, identity, custody, disclosure, authorization, and policy gate passes without averaging, scoring, schedule pressure, customer interest, or manager preference cancelling a failure;
- any allowed noncritical exception is explicitly policy-permitted, narrow, attributable, time/scope bounded, visible, and assigned for follow-up;
- an eligible independent release authority reviews the exact frozen package and records an immutable approve, reject, return, hold, or disposition decision;
- approved release creates the canonical `FRONTLINE_READY` projection and a controlled operational handoff for placement, digital availability, reservation/sales intake, and early post-release verification;
- material new facts suspend affected readiness and downstream availability through an attributable command while preserving the original release record;
- release, suspension, correction, reinstatement, and post-release verification remain reconstructable.

This stage does not reserve or sell a vehicle, create a customer contract, promise delivery, post accounting entries, guarantee every external listing, determine legal ownership, waive safety/title law, or make readiness permanent. It authorizes current retail offering eligibility under the exact evidence and policy snapshot.

## 2. Seven distinct frontline facts

1. **Upstream stage complete:** A source workflow reports its own gate passed.
2. **Readiness package assembled:** Current upstream evidence is correlated into one reviewable version.
3. **Readiness evaluated:** Rules identify passed, failed, missing, stale, conflicting, and exception-eligible dimensions.
4. **Release authorized:** An eligible person approves the exact package under the effective policy.
5. **Frontline status projected:** The canonical inventory lifecycle reflects `FRONTLINE_READY` from the authorization.
6. **Retail availability reconciled:** Physical placement and intended digital/sales availability match the release decision.
7. **Post-release verification accepted:** Early condition, listing, price, placement, and custody checks confirm or suspend continued readiness.

An upstream pass is not the complete package. A high score is not readiness. An evaluation is not authorization. Authorization is not physical/digital availability. Frontline status is not a sale. Frontline readiness is revocable when evidence changes.

## 3. Relationship to existing records

- `InventoryUnit` remains the canonical lifecycle subject and owns the `FRONTLINE_READY` projection, location, owner, target, operating state, version, and state history.
- `InventoryTitleReadiness`, repair/QC release records, inspection/recon histories, `InventoryMerchandisingPackage`, approved pricing/content/channel evidence, acquisition/receipt/custody, odometer, and condition records remain upstream authorities.
- `evaluateFrontlineReadiness` remains an initial hard-rule/readiness-decision foundation; a score or percentage is explanatory only and cannot authorize release.
- A dedicated versioned release-review/authorization evidence record is required by this catalog; a mutable package boolean or generic stage transition is not sufficient audit evidence.
- Sale/reservation/delivery records remain downstream authorities and cannot be created by frontline release.
- Tasks, approvals, exceptions, commands, expected versions, evidence, audit, domain events, outbox, rollout, notification, and recommendation controls remain canonical.

The current basic readiness command and evaluator are foundations only. This document proposes the complete release-review behavior and does not claim it is implemented or activated.

## 4. Entry trigger catalog

| Trigger ID | Trigger | Required response |
| --- | --- | --- |
| `FLR-TRG-001` | Merchandising/Pricing package handoff accepted | Create or refresh one release-review case |
| `FLR-TRG-002` | All required upstream stages appear complete | Assemble and evaluate a candidate readiness package |
| `FLR-TRG-003` | Upstream evidence/version/status changes before decision | Invalidate/freeze affected review and rebuild |
| `FLR-TRG-004` | Authorized release decision succeeds | Project frontline state and create placement/post-release work |
| `FLR-TRG-005` | Physical/digital availability or early verification differs from release | Reconcile or suspend affected readiness |
| `FLR-TRG-006` | Material safety/title/condition/price/listing/custody fact appears after release | Immediately evaluate suspension and recovery |
| `FLR-TRG-007` | Suspension correction package becomes complete | Create reinstatement review; never auto-restore |
| `FLR-TRG-008` | Warning, due, overdue, or expiry is reached | Escalate/review without auto-release or clock reset |

### Entry and duplicate rules

- One active release review exists per inventory unit, readiness-package version, location/retail route, and catalog version.
- Duplicate/replayed triggers and release commands return the existing decision and cannot create duplicate status events, public availability, or post-release work.
- Package assembly references exact immutable/snapshotted upstream versions and a stable fingerprint.
- Any material source change after package freeze invalidates the affected decision; it is not merged silently.
- Release authorization and canonical stage transition commit consistently or neither commits.
- Out-of-order external/listing/placement observations reconcile against occurrence time, source authority, package/release version, and desired state.
- Unknown/stale provider state never counts as confirmed live, removed, or correct.

## 5. Coordination states

```text
RELEASE_HANDOFF_RECEIVED
  -> PACKAGE_ASSEMBLY
  -> READINESS_EVALUATION
  -> AWAITING_EVIDENCE | AWAITING_CORRECTION | AWAITING_RELEASE_AUTHORITY
  -> BLOCKED_CRITICAL | EXCEPTION_REVIEW | READY_FOR_DECISION
  -> RELEASE_REJECTED | RELEASE_HELD | RELEASE_AUTHORIZED
  -> FRONTLINE_STATE_PROJECTED
  -> PLACEMENT_AND_AVAILABILITY_RECONCILIATION
  -> POST_RELEASE_VERIFICATION
  -> VERIFIED_FRONTLINE | READINESS_SUSPENDED
  -> CORRECTION -> REINSTATEMENT_REVIEW
```

These are workflow coordination states. Canonical inventory lifecycle and downstream commercial states remain authoritative.

## 6. Decision-entry contract

Every staff decision displays:

- exact VIN/stock/inventory unit, location/custody, retail intent, owner, target, total/pre-frontline age, current lifecycle and operating state;
- every readiness dimension with source record/version, status, evidence, freshness/expiry, accountable upstream owner, conflicts, restrictions, and policy criticality;
- current vehicle condition/mileage, keys/accessories, title/QC/merchandising/price/channel facts, open work/incidents/exceptions, customer interest/appointments, and intended physical/digital placement;
- readiness score only as an explanation beside exact gate results, never as the authorization basis;
- proposed action, downstream effect, eligible authority, non-waivable stops, exception limits, package fingerprint, and expected version.

The server revalidates identity, current package fingerprint, source versions, freshness, critical rules, capability, separation, exception authority, canonical stage, and expected version at command time.

## 7. Intake and readiness-package assembly

### `FLR-DEC-001` - Is the release-review handoff current and complete?

Validate current merchandising package, content/media/price approvals, channel boundary, title/QC/condition releases, location/custody, retail intent, owner, target, and no later invalidating fact.

Outputs: Accept; reject with exact missing/stale/conflicting context; hold; route correction; disposition review.

### `FLR-DEC-002` - Which readiness policy/template applies?

Select approved template by organization/entity, location, jurisdiction/route, vehicle class/use/age, title/brand state, retail channel, sale method, effective date, and pilot scope. No permissive default applies when template selection is ambiguous.

### `FLR-DEC-003` - Assemble identity, acquisition, intent, and authority dimension

Require canonical VIN/inventory identity, unique open inventory cycle, approved acquisition/source, dealership control/custody basis, current retail intent, authorized entity/location, and no incompatible sale/disposition state.

### `FLR-DEC-004` - Assemble receipt, custody, location, keys, and accessories dimension

Require accepted arrival/identity, known current location/custodian, required keys/remotes/manuals/accessories, document custody, physical accessibility, and no unexplained movement/loss.

### `FLR-DEC-005` - Assemble inspection, repair, QC, and safety dimension

Require applicable inspection complete, every required finding dispositioned, authorized repair/recon complete, current latest QC passes, operational repair release, no active labor/dispatch, and no safety containment/warning/incident invalidation.

### `FLR-DEC-006` - Assemble title, ownership, lien, and disclosure dimension

Require current applicable `READY` title/document evaluation or exact policy-permitted state, accepted ownership/lien/odometer/brand/disclosure requirements, original/electronic custody, no expired constrained state, and no later conflicting fact.

### `FLR-DEC-007` - Assemble physical condition and presentation dimension

Verify actual vehicle condition at release time: clean/presentation-ready, no new damage/warning, required fuel/charge, secure equipment, correct labels/displays, acceptable tires/glass/lights/cabin, and location/placement readiness under policy.

### `FLR-DEC-008` - Assemble merchandising, content, media, and disclosure dimension

Require current verified vehicle facts, approved media/content/disclosures, no privacy/security issue, no stale material change, and exact approved package version.

### `FLR-DEC-009` - Assemble price and economics authority dimension

Require current human-approved price, currency, effective/channel/location scope, price/floor authority, cost/market snapshot, no expired approval or material input change, and no conflicting public price.

### `FLR-DEC-010` - Assemble publication and retail-availability dimension

Apply policy for required/preferred channels and states. Require reconciled desired versus observed price/content/media/disclosures or an explicitly approved pre-publication boundary. Unknown/rejected/drifted required channel cannot be averaged away.

### `FLR-DEC-011` - Assemble ownership, next-action, and serviceability dimension

Require a named frontline owner, physical location/lot zone, sales visibility, next action, review cadence, age/price-review target, lead/appointment routing readiness, keys access, and escalation coverage. Customer interest cannot compensate for missing operational ownership.

### `FLR-DEC-012` - Freeze the candidate readiness package

Snapshot every source ID/version, evidence reference, result, criticality, freshness/expiry, exception, restriction, owner, policy/catalog version, evaluation algorithm version, input fingerprint, assembled/evaluated times, and actor. A frozen package is immutable.

## 8. Gate evaluation and exception review

### `FLR-DEC-020` - Evaluate every readiness dimension

Results: `PASS`, `FAIL`, `MISSING`, `STALE`, `CONFLICTING`, `NOT_APPLICABLE_WITH_AUTHORITY`, or `EXCEPTION_CANDIDATE`. Every result retains exact reason/evidence/owner.

### `FLR-DEC-021` - Are any critical gates incomplete?

Critical safety, identity, title/compliance, ownership/lien, required disclosure, custody, mandatory QC, public-price authority, privacy/security, and policy-designated gates block release. A readiness percentage, sales appointment, carrying cost, or manager role cannot override them.

### `FLR-DEC-022` - Are noncritical incomplete gates exception-eligible?

Only published policy may mark a specific condition exception-eligible. Evaluate exact scope, customer/public effect, reversibility, expiry, follow-up, owner, evidence, visibility, and whether release remains truthful.

### `FLR-DEC-023` - Request and decide narrow risk/exception acceptance

An eligible authority may approve, reject, narrow, or defer only a policy-permitted noncritical exception. Record condition, rationale, residual risk, affected channels/actions, expiry/review, required disclosure, owner, target, and automatic suspension behavior.

### `FLR-DEC-024` - Resolve stale or conflicting source versions

Return work to the authoritative upstream owner, show exact package impact, preserve frozen candidate, obtain correction/supersession, and rebuild. Release reviewer cannot edit source evidence to make the gate pass.

### `FLR-DEC-025` - Is package confidence sufficient for decision?

Confidence reflects source authority, freshness, completeness, reconciliation, and provider availability. Insufficient confidence blocks or limits exact actions by policy; high confidence cannot override a known failure.

### `FLR-DEC-026` - Determine disposition of incomplete review

Outputs: Return to title; return to repair/QC; return to merchandising/content; return to pricing; reconcile channel; correct custody/location; hold; approved noncritical follow-up; disposition/economics review; cancel superseded review.

## 9. Release authority and decision

### `FLR-DEC-030` - Is the release reviewer eligible and independent?

Check active role, organization/location/vehicle scope, frontline-policy training, sensitive/financial access, separation from preparers/approvers where required, delegated authority, workload/conflict, and no self-review prohibition.

### `FLR-DEC-031` - Present final release review

Show the exact frozen package, critical/noncritical results, evidence freshness, approved exceptions, score explanation, upstream owners, physical/digital desired state, downstream effects, and changes since prior review. No hidden collapsed failure.

### `FLR-DEC-032` - Approve, reject, return, hold, or route disposition

Approval requires every critical gate and all noncritical gates to pass or have current permitted exceptions. Reject/return/hold identifies exact reasons, owners, actions, targets, and whether current public/physical preparation must pause/remove.

### `FLR-DEC-033` - Record immutable release authorization

Snapshot inventory/package versions, all dimension results/evidence, approved exceptions, reviewer/authority, policy/catalog/algorithm versions, package fingerprint, reason, authorized time, effective location/route, and required post-release controls.

### `FLR-DEC-034` - Commit canonical frontline transition

In one consistent command, verify expected version and prior stage, create authorization/event/audit/outbox, project `FRONTLINE_READY`, set owner/location/next action/targets, and create downstream/post-release tasks. Partial commit is recoverable and cannot expose status without authorization.

### `FLR-DEC-035` - Handle duplicate or concurrent release decision

Idempotency returns the same authorization for replay. Expected version permits one of conflicting approve/reject/suspend commands; losers receive current state and safe recovery options.

## 10. Physical/digital availability and downstream handoff

### `FLR-DEC-040` - Confirm physical frontline placement

Record actual location/zone/space, placement time, custodian, keys access, condition, signage/label policy, charging/fuel/security needs, photo evidence where required, and sales-floor availability. A stage value alone does not prove physical placement.

### `FLR-DEC-041` - Confirm digital and sales availability

Reconcile required listing states, approved price/content, internal search/CRM/sales visibility, lead routing, appointment eligibility, channel restrictions, and reservation/sale intake enablement. Provider acknowledgement is not live availability.

### `FLR-DEC-042` - Route to reservation/sales intake

Handoff includes exact frontline authorization/version, current price/package, title/QC constraints, location/keys, owner, channel state, disclosures, expiry/review, and no promise of sale/delivery. Sales intake remains a separate workflow.

### `FLR-DEC-043` - Does downstream sales/lot owner accept the handoff?

Acceptance confirms current identity, custody, placement, price/package, permitted actions, restrictions, owner, and target. Rejection retains release history and creates exact reconciliation/correction work.

## 11. Post-release verification

### `FLR-DEC-050` - Schedule policy-required early verification

Define timing and owner by risk/location/channel/vehicle class. Checks may include physical condition/placement, keys/custody, warning indicators, mileage, price/content/listings, lead routing, title/QC restrictions, and new damage/recall-policy/provider facts.

### `FLR-DEC-051` - Verify physical state after release

Confirm correct vehicle/location, no new damage/warning, presentation/charge/fuel/security, keys/accessories, movement/mileage, and availability. Record observation time/source and exact variance.

### `FLR-DEC-052` - Verify digital/commercial state after release

Confirm desired listings and internal sales views show the approved vehicle, price, media, facts, disclosures, availability, and lead routing. Detect drift, duplicate, removed/unknown state, and stale package/price.

### `FLR-DEC-053` - Accept post-release verification or create correction

Outputs: Verified; minor owned correction without readiness suspension if policy permits; suspend affected digital channel; suspend all frontline readiness; safety/title emergency containment; disposition review.

### `FLR-DEC-054` - Monitor ongoing validity and expiries

Create review triggers for price/content/title/exception expiry, periodic condition/placement, mileage movement, recall/safety policy, provider drift, age/pricing review, and location/route change. No silent perpetual readiness.

## 12. Suspension, correction, and reinstatement

### `FLR-DEC-060` - Does a new fact require suspension?

Evaluate safety warning/recall-policy result, title/lien/disclosure defect, identity/custody loss, damage/condition change, QC reversal, price/content/listing error, privacy exposure, unauthorized movement, expired critical evidence/exception, or changed retail intent.

Outputs: No effect; channel-specific pause; reservation/sales intake hold; physical hold; full `FRONTLINE_READY` suspension; emergency containment.

### `FLR-DEC-061` - Authorize and commit suspension

Allow immediate system safety hold for configured critical facts with prompt human review; otherwise require eligible authority. Record triggering fact, evidence, scope, effective time, customer/deal/listing impact, current location/custody, owner, correction route, notifications, and prior release version. Preserve original authorization.

### `FLR-DEC-062` - Route correction and downstream impact

Create exact work in repair/QC, title, merchandising/content, pricing, channel reconciliation, custody/location, security/privacy, or disposition. Identify active lead/appointment/reservation/deal dependencies without cancelling them outside authority.

### `FLR-DEC-063` - Is correction complete for reinstatement review?

Require superseding accepted evidence, corrected channel/physical state, current exceptions, downstream reconciliation, and a newly assembled package. Correction completion never auto-restores frontline status.

### `FLR-DEC-064` - Reapprove and reinstate readiness

Use the same full release gates and eligible authority, link prior release/suspension/correction, create new immutable authorization/version, restore permitted availability, and restart post-release verification.

### `FLR-DEC-065` - Correct or supersede release metadata/evidence

Append correction/supersession referencing original, old/new value, source, reason, authority, affected scope, and reevaluation. Direct mutation/deletion of release or suspension history is prohibited.

### `FLR-DEC-066` - Operate during evidence/provider/projection degradation

Show unknown/stale/unavailable state, preserve durable decisions, default affected critical availability to safe policy behavior, prevent unsupported release/reinstatement, reconcile provider/projection after recovery, and audit any manual fallback.

## 13. Action catalog

| Action ID | Action | Minimum output |
| --- | --- | --- |
| `FLR-ACT-001` | Accept/reject release-review handoff | Exact readiness context and missing work |
| `FLR-ACT-002` | Select readiness policy/template | Versioned dimensions, criticality, applicability |
| `FLR-ACT-003` | Assemble/freeze readiness package | Source versions, evidence, fingerprint, owner |
| `FLR-ACT-004` | Evaluate dimension/hard rules | Pass/fail/missing/stale/conflict and reasons |
| `FLR-ACT-005` | Request/decide permitted exception | Scope, authority, expiry, follow-up, residual risk |
| `FLR-ACT-006` | Return/route correction | Upstream owner, action, target, downstream effect |
| `FLR-ACT-007` | Assign eligible release reviewer | Qualification, separation, current workload |
| `FLR-ACT-008` | Approve/reject/hold/disposition review | Immutable decision and reasons |
| `FLR-ACT-009` | Commit frontline authorization/status | Atomic authorization, state, event, tasks |
| `FLR-ACT-010` | Confirm physical placement | Location, custody, keys, condition, time |
| `FLR-ACT-011` | Confirm digital/sales availability | Desired/observed channel and routing state |
| `FLR-ACT-012` | Handoff to sales/reservation intake | Release/package/price/constraints/owner |
| `FLR-ACT-013` | Perform post-release verification | Physical/digital checks and variances |
| `FLR-ACT-014` | Suspend channel/intake/frontline state | Scope, trigger, authority, recovery owner |
| `FLR-ACT-015` | Route and verify correction | Superseding evidence and reconciliation |
| `FLR-ACT-016` | Reapprove/reinstate readiness | New package/release linked to suspension |
| `FLR-ACT-017` | Correct/supersede release evidence | Append-only lineage and reevaluation |
| `FLR-ACT-018` | Reconcile degraded/projection state | Durable decision and authoritative projection |

## 14. Evidence catalog

| Evidence ID | Evidence | Required when | Proposed criticality |
| --- | --- | --- | --- |
| `FLR-EVD-001` | Current release-review handoff | Every review cycle | Mandatory hard gate |
| `FLR-EVD-002` | Applicable readiness policy/template snapshot | Every package | Mandatory hard gate |
| `FLR-EVD-003` | Identity/acquisition/retail-intent authority | Every release | Mandatory hard gate |
| `FLR-EVD-004` | Receipt/custody/location/keys/accessories | Every release | Mandatory hard gate |
| `FLR-EVD-005` | Inspection/recon/QC/safety latest-state snapshot | Every applicable release | Mandatory hard gate |
| `FLR-EVD-006` | Title/ownership/lien/disclosure readiness | Every release | Mandatory hard gate |
| `FLR-EVD-007` | Current physical condition/presentation | Every release | Mandatory hard gate |
| `FLR-EVD-008` | Approved merchandising/content/media/disclosures | Every release | Mandatory hard gate |
| `FLR-EVD-009` | Approved/current price and authority | Every release | Mandatory hard gate |
| `FLR-EVD-010` | Required channel/publication reconciliation | As policy requires | Conditional hard gate |
| `FLR-EVD-011` | Frontline owner/placement/next-action readiness | Every release | Mandatory |
| `FLR-EVD-012` | Frozen package fingerprint/source versions | Every decision | Mandatory |
| `FLR-EVD-013` | Dimension evaluation and hard-rule results | Every decision | Mandatory |
| `FLR-EVD-014` | Permitted noncritical exception authority | When applicable | Conditional hard gate |
| `FLR-EVD-015` | Release-reviewer eligibility/independence | Every final decision | Mandatory hard gate |
| `FLR-EVD-016` | Immutable frontline release authorization | Every approved release | Mandatory |
| `FLR-EVD-017` | Canonical stage transition/event/outbox result | Every approved release | Mandatory |
| `FLR-EVD-018` | Physical placement verification | Every released unit | Mandatory |
| `FLR-EVD-019` | Digital/sales availability reconciliation | Every released unit | Mandatory/conditional |
| `FLR-EVD-020` | Sales/reservation-intake handoff/acceptance | Every released retail route | Mandatory |
| `FLR-EVD-021` | Post-release verification | Policy-required window | Mandatory |
| `FLR-EVD-022` | Suspension trigger/authority/impact | Every suspension | Mandatory hard gate |
| `FLR-EVD-023` | Correction/reinstatement lineage | Every reinstatement | Mandatory |
| `FLR-EVD-024` | Projection/provider outage reconciliation | When applicable | Mandatory exception evidence |

## 15. Exception reason catalog

| Reason code | Meaning | Control effect |
| --- | --- | --- |
| `FLR_EX_HANDOFF_INCOMPLETE` | Merchandising/release context absent | Review blocked |
| `FLR_EX_TEMPLATE_UNAVAILABLE` | No approved applicable readiness policy | Release blocked |
| `FLR_EX_IDENTITY_AUTHORITY` | Identity/acquisition/retail authority incomplete | Critical block |
| `FLR_EX_CUSTODY_LOCATION_KEYS` | Location/custody/keys/accessories unresolved | Critical/operational block |
| `FLR_EX_INSPECTION_RECON_QC` | Current inspection/repair/QC gate incomplete | Critical block |
| `FLR_EX_SAFETY_STOP` | Active safety restriction/warning/incident | Non-waivable block |
| `FLR_EX_TITLE_COMPLIANCE_STOP` | Title/ownership/lien/disclosure gate incomplete | Non-waivable block |
| `FLR_EX_PHYSICAL_CONDITION` | Vehicle is not presentation/sale ready | Release/correction block |
| `FLR_EX_MERCH_CONTENT_MEDIA` | Approved package is incomplete/stale/conflicting | Release blocked |
| `FLR_EX_PRICE_AUTHORITY` | Price absent/expired/out-of-scope/unauthorized | Release blocked |
| `FLR_EX_CHANNEL_REQUIRED_STATE` | Required publication state failed/unknown/drifted | Policy-defined block |
| `FLR_EX_NO_FRONTLINE_OWNER` | Owner/placement/next action absent | Release blocked |
| `FLR_EX_SOURCE_STALE_CONFLICT` | Package source version stale/conflicting | Rebuild/correction |
| `FLR_EX_CRITICAL_GATE_FAILED` | Any critical dimension fails | Non-waivable block |
| `FLR_EX_EXCEPTION_NOT_ELIGIBLE` | Requested waiver is not policy-permitted | Deny/route correction |
| `FLR_EX_EXCEPTION_EXPIRED` | Temporary permission is no longer current | Suspend/block |
| `FLR_EX_REVIEWER_INELIGIBLE` | Release authority/separation insufficient | Decision blocked |
| `FLR_EX_VERSION_CONFLICT` | Source/package/inventory changed during review | Current-state recovery |
| `FLR_EX_ATOMIC_COMMIT_RECOVERY` | Authorization/projection consistency uncertain | Safe reconciliation |
| `FLR_EX_PHYSICAL_PLACEMENT_MISMATCH` | Actual lot/location state differs | Reconcile/suspend as policy |
| `FLR_EX_DIGITAL_AVAILABILITY_MISMATCH` | Listing/sales view differs | Correct/pause/suspend |
| `FLR_EX_DOWNSTREAM_REJECTED` | Sales/lot owner cannot accept handoff | Handoff remains owned |
| `FLR_EX_POST_RELEASE_CONDITION` | New physical issue after release | Correct/suspend |
| `FLR_EX_POST_RELEASE_TITLE_SAFETY` | New critical title/safety fact | Immediate suspension/containment |
| `FLR_EX_POST_RELEASE_PRICE_LISTING` | Wrong/stale public content or price | Pause/correct/review |
| `FLR_EX_UNAUTHORIZED_MOVEMENT_CUSTODY` | Vehicle/keys moved without reconciled custody | Suspend/investigate |
| `FLR_EX_REINSTATEMENT_INCOMPLETE` | Correction package not fully current | Reapproval blocked |
| `FLR_EX_PROVIDER_PROJECTION_UNAVAILABLE` | External/internal state cannot be confirmed | Safe degraded behavior |
| `FLR_EX_UNAUTHORIZED_COMMAND` | Actor lacks release/suspend capability | Server denial |
| `FLR_EX_TARGET_MISSED` | Review/placement/verification target exceeded | Escalate; no auto-release |

## 16. Scenario catalog

| Scenario ID | Scenario | Expected outcome |
| --- | --- | --- |
| `FLR-SCN-001` | Normal unit with every gate current | Independent approval creates attributable frontline state |
| `FLR-SCN-002` | Merchandising handoff lacks exact package version | Reject with owned package correction |
| `FLR-SCN-003` | Readiness policy/template is ambiguous | No permissive default; policy review required |
| `FLR-SCN-004` | Duplicate/open inventory identity conflict | Critical identity block |
| `FLR-SCN-005` | Retail intent changed to wholesale/disposition | Release review stops and route changes with authority |
| `FLR-SCN-006` | Vehicle location/custodian is unknown | Release blocked; custody/location reconciliation |
| `FLR-SCN-007` | Required second key/accessory missing | Policy classifies exact block/exception; owner/target required |
| `FLR-SCN-008` | Latest repair job/QC no longer passes | Critical block back to repair/QC |
| `FLR-SCN-009` | New warning light appears after QC | Safety/condition evaluation blocks release |
| `FLR-SCN-010` | Title readiness is ready but evidence expired | Critical title gate fails until refreshed |
| `FLR-SCN-011` | Lien/title/disclosure conflict reopens | Non-waivable title/compliance block |
| `FLR-SCN-012` | Vehicle acquires lot damage after approved media | Physical/media/condition gates return correction |
| `FLR-SCN-013` | Vehicle is dirty/not presentation ready | Release held with exact physical preparation work |
| `FLR-SCN-014` | Approved content/media no longer matches vehicle | Package rebuild required |
| `FLR-SCN-015` | Approved price expired | Price revalidation required before release |
| `FLR-SCN-016` | Public listing shows wrong price | Channel/price block; pause/correct/reconcile |
| `FLR-SCN-017` | Required channel status is unknown | Cannot count as live; policy-defined release block |
| `FLR-SCN-018` | Policy permits release before publication | Release package records pending channel owner/target and exact boundary |
| `FLR-SCN-019` | All gates pass but no frontline owner/lot zone | Operational ownership gate blocks |
| `FLR-SCN-020` | Readiness score is 98% with one critical failure | Release denied; score cannot average away failure |
| `FLR-SCN-021` | Sales appointment exists for blocked unit | Customer interest does not override readiness |
| `FLR-SCN-022` | Carrying cost/age is high | Escalation/disposition review, not release override |
| `FLR-SCN-023` | Noncritical item is policy exception-eligible | Exact authority, expiry, disclosure, owner, and follow-up required |
| `FLR-SCN-024` | Manager requests exception for non-waivable title/safety gate | Server/policy denies override |
| `FLR-SCN-025` | Exception expires during review | Package invalidates and release blocks |
| `FLR-SCN-026` | Upstream source changes after package freeze | Expected fingerprint/version invalidates decision |
| `FLR-SCN-027` | Release reviewer prepared/approved package where independence required | Assign eligible independent reviewer |
| `FLR-SCN-028` | Unauthorized user attempts release | Server denies and protects package/evidence |
| `FLR-SCN-029` | Reviewer approves complete package | Immutable authorization and canonical transition commit together |
| `FLR-SCN-030` | Duplicate release command replay | Same authorization; no duplicate state/task/event |
| `FLR-SCN-031` | Concurrent approve and reject commands | One expected-version result; current-state recovery |
| `FLR-SCN-032` | Projection write fails after authorization attempt | No unsupported public state; reconciliation/atomic recovery |
| `FLR-SCN-033` | Physical placement matches authorized route | Placement/custody/keys evidence accepted |
| `FLR-SCN-034` | Vehicle placed in wrong lot/location | Reconcile or suspend per risk/policy |
| `FLR-SCN-035` | Digital channels and sales view match | Availability reconciliation accepted |
| `FLR-SCN-036` | Provider acknowledged listing but it is not live | Remain pending; acknowledgement is not availability |
| `FLR-SCN-037` | Sales/lot owner rejects handoff | Release history remains; exact gap stays owned |
| `FLR-SCN-038` | Reservation attempt arrives before release commits | Downstream intake denied until canonical ready state |
| `FLR-SCN-039` | Early physical verification finds no variance | Post-release verification accepted |
| `FLR-SCN-040` | Post-release check finds new damage/warning | Physical/full suspension and correction route |
| `FLR-SCN-041` | Post-release listing price/content drifts | Channel pause/correction and readiness impact per policy |
| `FLR-SCN-042` | Title/safety fact changes after release | Immediate attributable suspension/containment |
| `FLR-SCN-043` | Vehicle/keys moved without custody update | Suspend/investigate/reconcile location and access |
| `FLR-SCN-044` | Approved price or exception expires after release | Trigger review/suspension according to policy |
| `FLR-SCN-045` | Retail intent changes after release | Suspend availability and route authorized disposition/transfer |
| `FLR-SCN-046` | Correction completes after suspension | New full package required; no auto-reinstatement |
| `FLR-SCN-047` | Reinstatement review passes | New authorization links release/suspension/correction history |
| `FLR-SCN-048` | Evidence/channel/projection provider unavailable | Unknown/stale visible; safe behavior and reconciliation |
| `FLR-SCN-049` | Release metadata/evidence reference is wrong | Append correction/supersession and reevaluate reliance |
| `FLR-SCN-050` | Review/placement/verification target missed | Owned escalation/reforecast; no auto-release or clock reset |

## 17. Catalog exit gate

This catalog is ready for code only when:

- policy owners approve the seven upstream/package/evaluation/authorization/projection/availability/post-verification distinctions;
- frontline templates, dimensions, applicability, criticality, evidence/freshness/expiry, no-average rules, source authorities, evaluator/algorithm role, and publisher authority are approved;
- identity/acquisition/intent, receipt/custody/location/keys, inspection/recon/QC/safety, title/ownership/lien/disclosure, physical condition, merchandising/content/media, price, channel, owner/placement, and sales-intake gates are approved;
- release reviewer roles, qualifications, location/entity scope, separation, authority, assignment, workload, and audit requirements are approved;
- allowed noncritical exceptions are enumerated with exact authority, scope, disclosure, expiry/review, follow-up, owner, and automatic suspension; no generic override exists;
- immutable package/authorization, fingerprint/version conflict, idempotency, atomic transition, projection reconciliation, failure recovery, and degraded-state behavior are approved;
- physical placement, keys/custody, digital listing/internal sales visibility, lead routing, reservation/sales handoff, and downstream-acceptance rules are approved;
- post-release timing/checks, ongoing expiry/monitoring, material-change triggers, immediate safety/title hold, suspension scope/authority, downstream notification, correction, and reinstatement rules are approved;
- staff walk through at least twenty representative cases spanning critical/noncritical failures, stale evidence, price/listing mismatch, customer pressure, exception expiry, reviewer independence, concurrent release, placement mismatch, post-release suspension, and reinstatement;
- acceptance scenarios map to planned automated/manual evidence;
- no frontline status, public/sales availability, or downstream commercial behavior is activated merely because this planning catalog exists.
