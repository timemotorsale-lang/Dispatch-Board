# Merchandising and Pricing Decision and Scenario Catalog

**Status:** Proposed eighth vertical-slice catalog  
**Catalog ID:** `INV-ITF-MPR`  
**Version:** `0.1.0`  
**Activation:** Not approved; documentation only

## 1. Outcome and boundary

This catalog begins when an inventory unit is accepted into Merchandising and Pricing from Title/Document Readiness, Quality/Safety operational release, or an expressly permitted preparation route. It ends when:

- the vehicle is physically and digitally ready for truthful merchandising under the approved policy/template version;
- authoritative identity, equipment, condition, mileage, title/disclosure constraints, warranty/coverage, and retail claims are reconciled;
- required photos, video/360 or other media, descriptions, features, disclosures, accessibility text, and channel data pass quality, privacy, accuracy, and freshness gates;
- pricing inputs, cost/exposure, market data, comparable selection, margin/floor constraints, uncertainty, and recommendation provenance are visible;
- an eligible human approves the exact price, currency, effective scope/time, channel treatment, and policy version;
- each selected listing channel is eligible, receives only approved content, and has a separately tracked request, acknowledgement, live/rejected/pending state, and reconciliation result;
- stale, rejected, conflicting, duplicate, partially published, post-publication, or provider-outage states remain visible and owned;
- the completed package is handed to Frontline Release Review with exact evidence, approved price, channel status, constraints, owner, and target.

This stage does not autonomously set customer price, make legal/warranty claims, hide known condition/title facts, guarantee third-party publication, post accounting entries, accept a reservation/sale, or set `FRONTLINE_READY`. Frontline readiness requires a separate authorized release review of all lifecycle gates.

## 2. Seven distinct merchandising/pricing facts

1. **Source fact verified:** Vehicle identity, equipment, condition, mileage, title/disclosure, and coverage fact is accepted from an authoritative source.
2. **Content drafted:** Media, description, features, claims, and channel payload exist but are not approved.
3. **Content approved:** An authorized reviewer accepts the exact content version for a defined scope.
4. **Price proposed:** A human or controlled recommendation produces a reviewable price with inputs and confidence.
5. **Price approved:** An eligible human authorizes the exact price, scope, currency, effective time, and constraints.
6. **Publication reconciled:** A provider/channel state is acknowledged and verified as live, rejected, pending, removed, or inconsistent.
7. **Package complete for release review:** All applicable hard gates pass and the package is ready for independent Frontline Release Review.

A decoded feature is not verified equipment. A draft is not approved content. A recommendation is not an approved price. A publish request is not a live listing. One live channel is not full reconciliation. Merchandising completion is not frontline readiness.

## 3. Relationship to existing records

- `InventoryUnit` remains the canonical lifecycle subject and owns stage, location, owner, target, operating state, and version.
- `InventoryMerchandisingPackage` remains the existing package foundation for media references, description, price, channels, status, version, and current projection.
- Canonical `Vehicle`, acquisition/appraisal, receipt, inspection, repair/QC, title-readiness, cost/exposure, odometer, evidence, and lifecycle histories remain authoritative for their facts.
- Approved price, content, channel payload/publication, and reconciliation histories must be versioned/immutable where consequential; current package fields are projections, not sufficient audit history by themselves.
- External valuation, comparable, VIN/equipment, website, DMS, marketplace, media, and syndication providers remain external facts with explicit authority, freshness, confidence, mapping, and reconciliation.
- Tasks, approvals, exceptions, commands, expected versions, audit, events, outbox, evidence, rollout, and recommendation controls remain canonical.

The existing package and frontline foundation are inputs to this catalog. This document defines full workflow behavior and does not claim every behavior is implemented or activated.

## 4. Entry trigger catalog

| Trigger ID | Trigger | Required response |
| --- | --- | --- |
| `MPR-TRG-001` | Title/QC/downstream handoff is accepted | Start or refresh merchandising readiness case |
| `MPR-TRG-002` | Policy permits preparation before all release gates pass | Create constrained preparation with prohibited actions |
| `MPR-TRG-003` | Vehicle identity/equipment/condition/mileage/title/coverage fact changes | Re-evaluate affected content, price, channel payloads, and release readiness |
| `MPR-TRG-004` | Media/content/price version is submitted for review | Create exact approval decision and freeze reviewed version |
| `MPR-TRG-005` | Approved price, policy, market, cost, incentive, or expiry condition changes | Re-evaluate price validity and affected publication |
| `MPR-TRG-006` | Channel returns acknowledgement/status/rejection or reconciliation detects drift | Update exact channel state and create correction/retry work |
| `MPR-TRG-007` | Material fact appears after publication/package completion | Suspend affected content/price/channel/release reliance |
| `MPR-TRG-008` | Warning, due, or overdue target occurs | Escalate without auto-approving content/price or claiming publication |

### Entry and duplicate rules

- One active merchandising case exists per inventory unit, package version, intended route/location, and catalog version.
- Duplicate triggers and commands return the existing media/content/price/publication result and cannot create duplicate approvals or listings.
- Constrained preparation cannot publish or become release-ready beyond its explicit policy scope.
- Content and price approvals reference exact immutable/snapshotted versions; later edits automatically require re-review where material.
- Channel events reconcile using provider, account/location, external listing ID, payload/version, occurrence time, status mapping, and current desired state.
- Provider outage or unknown state is displayed as unavailable/pending reconciliation, never as live or successfully removed.

## 5. Coordination states

```text
MERCH_HANDOFF_RECEIVED
  -> ELIGIBILITY_REVIEW
  -> PREPARATION_ALLOWED | PREPARATION_CONSTRAINED | PREPARATION_BLOCKED
  -> VEHICLE_DATA_VERIFICATION
  -> MEDIA_CAPTURE_REVIEW
  -> CONTENT_BUILD_REVIEW
  -> PRICE_ANALYSIS_REVIEW
  -> CONTENT_APPROVED + PRICE_APPROVED
  -> CHANNEL_PREFLIGHT
  -> PUBLISH_PENDING -> LIVE_RECONCILED | PARTIALLY_LIVE | REJECTED | UNKNOWN
  -> PACKAGE_COMPLETE
  -> FRONTLINE_RELEASE_HANDOFF_PENDING
  -> FRONTLINE_RELEASE_HANDOFF_ACCEPTED
```

These are workflow coordination states. Canonical lifecycle/package/channel states remain authoritative.

## 6. Decision-entry contract

Every staff decision displays:

- exact vehicle/VIN/stock/inventory unit, location/custody, lifecycle gates, owner, target, stage age, and retail/disposition intent;
- title/QC restrictions, condition, odometer, identity/equipment, warranty/coverage, cost/exposure, market, price, content, and channel facts with source/freshness/confidence;
- current package/content/media/price/payload versions, approvers, effective windows, expiration, and pending changes;
- selected channels, eligibility, desired versus provider-observed state, external IDs, last confirmation, errors, retries, and reconciliation owner;
- only permitted actions, affected approvals/publications, financial authority, disclosures, and downstream effects.

The server revalidates current state, capability, expected version, source authority/freshness, content policy, price authority, margin/floor constraints, channel eligibility, and release gates at command time.

## 7. Intake, preparation eligibility, and work planning

### `MPR-DEC-001` - Is the merchandising handoff current and complete?

Validate identity, location/custody, retail intent, title-readiness version/constraints, QC operational release, current condition/mileage, existing package/publications, owner, and required downstream target.

Outputs: Accept full work; accept constrained preparation; reject with exact gap; suspend existing package; disposition review.

### `MPR-DEC-002` - What work is permitted now?

Options: Physical preparation only; data verification; media capture; content draft; price analysis; internal review; publish; unpublish; no work. Policy defines prerequisites and prohibited actions for each.

### `MPR-DEC-003` - Is the vehicle physically ready for media/presentation?

Check location, custody, safe access, wash/detail, repair/QC restrictions, damage, warning indicators, fuel/charge where needed, keys, removable items, temporary protections, weather/lighting, photo area, and scheduled movement.

### `MPR-DEC-004` - Select merchandising template and channel requirements

Select approved template by organization/location/brand standard, vehicle class, body type, age/use, condition, title/brand/disclosure state, language, channel mix, and effective date. Snapshot required shot list, media types, data fields, claims/disclosures, description sections, accessibility, and channel constraints.

### `MPR-DEC-005` - Assign work and resources

Assign eligible detail/media/content/data/pricing/reviewer roles, studio/lot/location, equipment, target windows, dependencies, and handoffs. Recommendations cannot override skill/access/location eligibility or separation rules.

### `MPR-DEC-006` - Resolve preparation conflict

Conflicts include vehicle unavailable/moved, active repair, unsafe condition, weather, dirty/damaged state, missing keys, scheduled appointment, equipment/studio contention, or title/QC restriction. Only eligible parallel work proceeds.

## 8. Vehicle data and claim verification

### `MPR-DEC-010` - Verify identity and core specifications

Reconcile VIN, year, make, model, trim, body, drivetrain, engine/powertrain, fuel/energy type, transmission, exterior/interior color, doors/seating, stock number, and other required attributes across authoritative records. Decode/provider data is a proposal until reconciled.

### `MPR-DEC-011` - Verify installed equipment and options

Use authoritative build data, physical observation, labels, procedure/repair evidence, and approved provider sources. Distinguish standard, factory option, dealer-installed, aftermarket, removed, inoperative, uncertain, and not applicable.

### `MPR-DEC-012` - Verify mileage and usage statement

Use latest accepted odometer fact, unit, observation time/source, title/disclosure constraints, and current freshness. Media or listing mileage must not silently lag material vehicle movement.

### `MPR-DEC-013` - Verify condition and disclosure claims

Reconcile inspection, recon/QC, title/brand/history, damage, cosmetic condition, known defects, warning lights, keys/accessories, tire/feature state, and approved disclosure policy. Content may not conceal a known material fact or overstate condition.

### `MPR-DEC-014` - Verify warranty, certification, service, ownership, and promotional claims

Require authoritative eligibility, scope, term, exclusions, effective date, provider, disclosure text, and approval. Phrases such as certified, one owner, clean title/history, accident free, fully serviced, guaranteed, or under warranty cannot be inferred from absence of contrary evidence.

### `MPR-DEC-015` - Resolve conflicting or uncertain data

Outputs: Correct canonical source through authorized workflow; request inspection/title/service/provider verification; omit optional uncertain claim; add approved disclosure; block required field/content; escalate suspected integrity issue.

### `MPR-DEC-016` - Freeze a verified merchandising fact snapshot

Snapshot exact source IDs, observed/provider facts, freshness, confidence, conflicts, approvals, prohibited claims, and policy/template version used to create content and pricing. Later material changes invalidate affected approvals.

## 9. Media capture and review

### `MPR-DEC-020` - Plan required media

Create shot/media checklist by template/channel: exterior, interior, odometer/instrument, engine/cargo, wheels/tires, keys/accessories, notable options, disclosed condition, video/360, thumbnail/hero, and accessibility text. Requirements remain policy-specific; no universal count alone proves completeness.

### `MPR-DEC-021` - Capture media with identity and session custody

Record vehicle/session/operator, time/location, device/source, shot code, sequence, original asset, derivative/edit lineage, upload/integrity status, and consent/property restrictions where applicable.

### `MPR-DEC-022` - Review media quality and truthfulness

Check correct vehicle, completeness, focus/exposure/color, framing/orientation, duplicates, obstruction, reflections, background, cleanliness, current condition, visible defects, prohibited overlays, watermark policy, and edits that could misrepresent the vehicle.

### `MPR-DEC-023` - Review privacy/security content

Detect or manually review customer/person faces, plates where policy requires treatment, documents, addresses, keys/key codes, screens/messages, geolocation metadata, employee/customer data, unrelated vehicles, and restricted internal identifiers. Redaction/editing must preserve truthful vehicle representation and lineage.

### `MPR-DEC-024` - Select and approve media set

Map approved assets to shot requirements and channels, select hero/order/crops/derivatives, record reviewer, policy/template, rejection reasons, expiry/freshness, and exact version. Missing/rejected hard shots block completion.

### `MPR-DEC-025` - Handle vehicle change after media capture

Evaluate movement/mileage, repair, damage, detail state, accessory/option change, plate/display change, weather/background, or disclosure impact. Require targeted recapture or full refresh based on policy; do not reuse stale media silently.

## 10. Description, features, and content approval

### `MPR-DEC-030` - Build description and structured listing content

Use only verified snapshot facts and approved templates. Separate factual fields, human/AI draft text, disclosures, channel formatting, language, accessibility text, SEO/marketing content, and prohibited claims.

### `MPR-DEC-031` - Review AI- or provider-generated content

Show source facts, model/provider/version, prompt/template, confidence where available, edits, unsupported claims, and reviewer. AI/provider output is always draft and cannot be the sole approver of public content or customer price.

### `MPR-DEC-032` - Validate content consistency

Compare description, structured fields, photos/video, title/disclosure facts, equipment, condition, mileage, price scope, incentives, warranty language, and every channel payload. Conflicts block approval or route exact correction.

### `MPR-DEC-033` - Approve content version

An eligible reviewer accepts the exact media/data/description/disclosure version for defined channels/languages and effective window. Approval records exceptions, prohibited edits, expiry, and policy version. Material edits create a new review.

### `MPR-DEC-034` - Localize or create channel variants

Transform only within approved rules for length, fields, image ratios, language, accessibility, and channel disclosures. Variant content retains source lineage and cannot change factual meaning or omit mandatory disclosure.

## 11. Pricing analysis and approval

### `MPR-DEC-040` - Is the cost/exposure basis complete enough for pricing review?

Show acquisition, recon, parts/labor/sublet, title, transport, merchandising, carrying, committed, incurred, estimated, disputed, and recovered amounts with source/confidence/freshness. Accounting remains authoritative; the workflow does not create ledger facts.

### `MPR-DEC-041` - Is market and comparable data eligible?

Evaluate source/provider, market radius, vehicle match, trim/equipment/mileage/condition, title/brand, retail/wholesale distinction, listing versus transaction data, recency, duplicate sellers/listings, outliers, sample size, and provider outage.

### `MPR-DEC-042` - Build price alternatives and economics

Present current/proposed price, comparable range, market position, expected gross/margin range, all-in exposure, carrying cost/age, demand/leads, incentives, floor/ceiling policy, uncertainty, target review date, and alternative actions. Do not hide adverse inputs.

### `MPR-DEC-043` - Is price recommendation confidence sufficient?

Outputs: High/medium/low confidence with reasons; manual analysis required; more data needed; no recommendation. Low confidence never becomes autonomous authority.

### `MPR-DEC-044` - Does proposed price comply with authority and constraints?

Check currency, tax/fee display boundary, exact amount, gross/margin floor, cost basis, prior/current price, absolute/percentage change, related incentive/discount exposure, advertised-price rules, location/channel scope, effective dates, and approver authority.

### `MPR-DEC-045` - Approve, reject, revise, or defer price

Record exact price, currency, scope/channels, effective/expiry time, cost/market snapshot, reason, approver, authority/policy version, and whether content/payload reapproval is required. Request splitting or incentive separation cannot evade authority.

### `MPR-DEC-046` - Handle floor exception, aging, or disposition recommendation

Route to authorized management with gross/margin, age/carrying, demand, merchandising quality, title/condition constraints, market confidence, and alternatives. Recommendations cannot autonomously reprice, write down, transfer, or dispose of inventory.

### `MPR-DEC-047` - Revalidate approved price before publication/release

Invalidate or review on expiry, material cost/condition/title/equipment change, incentive change, policy change, currency/display error, market-staleness threshold, or channel scope change. Routine market movement alone follows approved policy rather than silent repricing.

## 12. Channel publishing and reconciliation

### `MPR-DEC-050` - Select eligible channels and desired state

Check organization/location/account, vehicle/category/age/title/condition eligibility, approved content/price/disclosures, inventory route, provider terms/policy, credentials/health, channel field/media constraints, and whether state should be draft, live, paused, or removed.

### `MPR-DEC-051` - Build and review channel payload

Snapshot exact approved content/media/price version, external identifiers, channel mappings, required/optional fields, transformations, disclosures, desired state, and idempotency key. Preview is not publication.

### `MPR-DEC-052` - Authorize publication, update, pause, or removal

Revalidate permission, content and price approvals, hard lifecycle gates, channel eligibility, expected version, desired state, and material changes. Constrained preparation cannot publish unless the exact policy expressly permits the exact action.

### `MPR-DEC-053` - Record request and provider acknowledgement separately

Request records payload/action/time/actor. Acknowledgement records only provider receipt/processing reference. Neither proves the listing is live, correct, or removed.

### `MPR-DEC-054` - Reconcile provider-observed listing state

Verify external ID, URL/reference, live/paused/rejected/removed/pending state, content fields, price, media count/order, disclosures, timestamp, error/warning, and desired-state match. Use provider API, feed report, approved observation, or manual evidence with explicit confidence.

### `MPR-DEC-055` - Resolve rejection, partial publication, drift, or duplicate listing

Classify mapping/content/media/price/eligibility/auth/provider failure; correct source or channel variant; retry idempotently; remove unauthorized/duplicate state; preserve prior requests/responses; escalate impact and target.

### `MPR-DEC-056` - Is channel rollout complete enough for release review?

Policy defines required channels and allowed states. Outputs: All required live/reconciled; publication not required before release; pending within approved boundary; partial with block; rejected; unknown; removal required. No overall percentage can hide a required-channel failure.

## 13. Completion, handoff, and recovery

### `MPR-DEC-060` - Is the merchandising package complete?

Require current verified facts, approved media and content, approved/current price, mandatory disclosures, channel eligibility/status, no blocking conflict/exception, current title/QC/condition facts, and exact package/evidence snapshot.

### `MPR-DEC-061` - Is the final package reviewer eligible and independent?

Check capability, location/scope, price/content access, separation from preparer where required, current policy training, and conflict. Required independent/four-eyes review is non-waivable.

### `MPR-DEC-062` - Create Frontline Release Review handoff

Snapshot package/content/media/price versions, source facts, approvals, channel desired/observed state, title/QC/condition gates, exceptions/constraints, owner, target, policy/catalog version, and evidence. Package complete does not set frontline status.

### `MPR-DEC-063` - Does Frontline Release Review accept the handoff?

Acceptance confirms exact package and remaining independent readiness gates. Rejection returns exact missing/stale/conflicting evidence without deleting content, price, or publication history.

### `MPR-DEC-064` - Handle material change after package completion/publication

Suspend affected approval/publication/frontline reliance, identify affected content/price/channels, choose correct/update/pause/remove/review path, preserve prior versions, notify downstream owners, and re-evaluate release readiness.

### `MPR-DEC-065` - Correct or supersede media/content/price/channel evidence

Append correction/supersession with original reference, old/new fact, source, reason, authority, affected scope, provider reconciliation, and downstream impact. Direct deletion/edit of consequential history is prohibited.

### `MPR-DEC-066` - Operate during media/market/channel provider degradation

Show unavailable/stale/unknown states, preserve approved draft work, prevent unsupported claim/price/publication/readiness, queue reconciliation, use approved manual fallback with confidence where permitted, and review after recovery.

## 14. Action catalog

| Action ID | Action | Minimum output |
| --- | --- | --- |
| `MPR-ACT-001` | Accept/reject merchandising handoff | Eligibility, constraints, owner, missing work |
| `MPR-ACT-002` | Select template/channels/work plan | Versioned requirements and dependencies |
| `MPR-ACT-003` | Verify vehicle/equipment/condition/mileage/claims | Source, freshness, confidence, conflicts |
| `MPR-ACT-004` | Plan/capture/upload media | Session, shot code, original/derivative lineage |
| `MPR-ACT-005` | Review/approve/reject media | Quality, privacy, truthfulness, exact version |
| `MPR-ACT-006` | Draft/validate/approve content | Verified sources, disclosures, variants, reviewer |
| `MPR-ACT-007` | Build pricing analysis/alternatives | Cost, market, margin, confidence, constraints |
| `MPR-ACT-008` | Approve/reject/revise/defer price | Exact amount/scope/effective version/authority |
| `MPR-ACT-009` | Request floor/aging/disposition review | Evidence-backed alternatives and authority route |
| `MPR-ACT-010` | Build/review channel payload | Approved versions, mappings, desired state |
| `MPR-ACT-011` | Publish/update/pause/remove | Attributable idempotent request |
| `MPR-ACT-012` | Record acknowledgement/status | Provider reference and mapped state |
| `MPR-ACT-013` | Reconcile desired/observed listing | Field/media/price/disclosure/state comparison |
| `MPR-ACT-014` | Resolve retry/rejection/drift/duplicate | Root cause, correction, current owner/target |
| `MPR-ACT-015` | Evaluate package completion | Exact hard-gate result and blockers |
| `MPR-ACT-016` | Create/accept frontline-review handoff | Package snapshot, constraints, owner, target |
| `MPR-ACT-017` | Suspend/update published reliance | Affected channels/content/price and recovery |
| `MPR-ACT-018` | Correct/supersede/reconcile history | Append-only lineage and reevaluation |

## 15. Evidence catalog

| Evidence ID | Evidence | Required when | Proposed criticality |
| --- | --- | --- | --- |
| `MPR-EVD-001` | Current title/QC/condition merchandising handoff | Every case/cycle | Mandatory hard gate |
| `MPR-EVD-002` | Preparation/publish eligibility and constraints | Every case | Mandatory hard gate |
| `MPR-EVD-003` | Template/channel requirement snapshot | Every package version | Mandatory |
| `MPR-EVD-004` | Verified identity/core specifications | Every package | Mandatory hard gate |
| `MPR-EVD-005` | Equipment/options verification | Every applicable claimed feature | Mandatory |
| `MPR-EVD-006` | Mileage/condition/title/disclosure snapshot | Every package/publication | Mandatory hard gate |
| `MPR-EVD-007` | Warranty/certification/promotional claim authority | Every applicable claim | Conditional hard gate |
| `MPR-EVD-008` | Media capture session/original lineage | Every asset | Mandatory |
| `MPR-EVD-009` | Media quality/privacy/truthfulness review | Every approved media set | Mandatory hard gate |
| `MPR-EVD-010` | Approved media set/order/variants | Every package | Mandatory |
| `MPR-EVD-011` | Content source/draft/AI-provider provenance | Every content version | Mandatory |
| `MPR-EVD-012` | Content consistency/disclosure review | Every approved content version | Mandatory hard gate |
| `MPR-EVD-013` | Content approval | Every public content version | Mandatory |
| `MPR-EVD-014` | Cost/exposure snapshot | Every pricing decision | Mandatory |
| `MPR-EVD-015` | Market/comparable source and eligibility | When used | Conditional evidence |
| `MPR-EVD-016` | Price analysis/confidence/alternatives | Every price proposal | Mandatory |
| `MPR-EVD-017` | Price approval/authority/effective scope | Every advertised price | Mandatory hard gate |
| `MPR-EVD-018` | Channel payload/request/acknowledgement | Every channel action | Mandatory |
| `MPR-EVD-019` | Channel observed-state reconciliation | Every selected required channel | Mandatory/conditional hard gate |
| `MPR-EVD-020` | Rejection/drift/duplicate correction lineage | When applicable | Mandatory exception evidence |
| `MPR-EVD-021` | Package completion/final-review evidence | Every completed package | Mandatory hard gate |
| `MPR-EVD-022` | Frontline Release Review handoff/acceptance | Every completed route | Mandatory |
| `MPR-EVD-023` | Post-completion/publication invalidation/recovery | When material fact changes | Mandatory exception evidence |
| `MPR-EVD-024` | Provider outage/manual fallback/reconciliation | When applicable | Mandatory exception evidence |

## 16. Exception reason catalog

| Reason code | Meaning | Control effect |
| --- | --- | --- |
| `MPR_EX_HANDOFF_INCOMPLETE` | Required title/QC/condition context absent | Intake/final gate blocked |
| `MPR_EX_PREPARATION_RESTRICTED` | Only defined early work is permitted | Publish/release prohibited |
| `MPR_EX_VEHICLE_NOT_MEDIA_READY` | Physical condition/location/access unsuitable | Capture waits/replans |
| `MPR_EX_TEMPLATE_UNAVAILABLE` | No approved applicable package/channel rules | Completion blocked |
| `MPR_EX_IDENTITY_DATA_CONFLICT` | Core vehicle facts conflict | Content/pricing blocked |
| `MPR_EX_OPTION_UNVERIFIED` | Equipment claim lacks accepted evidence | Omit/verify/block required field |
| `MPR_EX_MILEAGE_STALE_CONFLICT` | Mileage is stale/conflicting | Listing/release blocked per policy |
| `MPR_EX_CONDITION_DISCLOSURE_CONFLICT` | Content/media conflicts with known condition | Approval/publication blocked |
| `MPR_EX_CLAIM_UNSUPPORTED` | Warranty/history/certification/promo claim lacks authority | Claim prohibited |
| `MPR_EX_MEDIA_INCOMPLETE` | Required media/shot absent | Approval/completion blocked |
| `MPR_EX_MEDIA_QUALITY_FAILED` | Asset fails quality/truthfulness | Recapture/rework |
| `MPR_EX_MEDIA_PRIVACY_SECURITY` | Sensitive/prohibited content visible | Restrict/redact/recapture |
| `MPR_EX_MEDIA_STALE` | Vehicle materially changed after capture | Recapture/review |
| `MPR_EX_CONTENT_INCONSISTENT` | Fields/text/media/disclosures conflict | Approval blocked |
| `MPR_EX_AI_PROVIDER_UNSUPPORTED_CLAIM` | Generated draft invented/overstated fact | Remove/review; monitor source |
| `MPR_EX_CONTENT_APPROVAL_EXPIRED` | Approved version/effective window stale | Re-review required |
| `MPR_EX_COST_BASIS_INCOMPLETE` | Material exposure missing/uncertain | Price review constrained |
| `MPR_EX_MARKET_DATA_STALE_LOW_CONFIDENCE` | Market basis is weak/stale | Human/manual review |
| `MPR_EX_PRICE_FLOOR_AUTHORITY` | Price violates constraint or approver authority | Approval blocked/escalated |
| `MPR_EX_PRICE_EXPIRED_CHANGED` | Price no longer current for inputs/scope | Reapproval/update required |
| `MPR_EX_CHANNEL_INELIGIBLE` | Vehicle/account/content cannot use channel | Exclude/block required channel |
| `MPR_EX_PAYLOAD_INVALID` | Required mapping/field/media/disclosure absent | Publication blocked |
| `MPR_EX_PUBLISH_REJECTED` | Provider rejected request | Correct/retry/escalate |
| `MPR_EX_PUBLISH_UNKNOWN` | Provider outcome cannot be confirmed | Reconciliation pending |
| `MPR_EX_CHANNEL_DRIFT` | Live listing differs from approved desired state | Correct/pause/remove |
| `MPR_EX_DUPLICATE_LISTING` | Multiple unintended external listings exist | Remove/reconcile |
| `MPR_EX_DOWNSTREAM_REJECTED` | Frontline review cannot accept package | Handoff remains owned |
| `MPR_EX_POST_PUBLISH_INVALIDATION` | New fact undermines content/price/listing | Suspend/update/remove/review |
| `MPR_EX_UNAUTHORIZED_COMMAND` | Actor lacks content/price/publish capability | Server denial |
| `MPR_EX_TARGET_MISSED` | Merchandising/pricing/publish target exceeded | Escalate; no auto-approval/live state |

## 17. Scenario catalog

| Scenario ID | Scenario | Expected outcome |
| --- | --- | --- |
| `MPR-SCN-001` | Normal eligible vehicle, complete media/content/price | Approved reconciled package reaches release review |
| `MPR-SCN-002` | Title policy permits early photo preparation only | Capture allowed; content publication/frontline blocked |
| `MPR-SCN-003` | QC/condition handoff missing | Reject/hold with exact owner/work |
| `MPR-SCN-004` | Vehicle moved to unavailable location | Reassign/replan; no fabricated capture |
| `MPR-SCN-005` | Vehicle dirty, damaged, or active repair resumes | Media readiness fails; existing assets evaluated for staleness |
| `MPR-SCN-006` | Applicable channel/template not configured | Package/publish blocked to policy owner |
| `MPR-SCN-007` | VIN decode proposes wrong trim | Reconcile source/physical facts; do not publish proposal |
| `MPR-SCN-008` | Factory option is physically absent | Mark absent/uncertain; prohibit unsupported claim |
| `MPR-SCN-009` | Aftermarket equipment is installed | Identify accurately with approved claim/disclosure rules |
| `MPR-SCN-010` | Odometer changed materially after media capture | Refresh mileage/media/content as policy requires |
| `MPR-SCN-011` | Known cosmetic defect omitted from description/photos | Consistency/disclosure gate blocks approval |
| `MPR-SCN-012` | Unsupported “one owner/clean history/certified” claim | Remove and route authoritative verification |
| `MPR-SCN-013` | Photo session covers every required shot | Identity/session lineage and review create approved set |
| `MPR-SCN-014` | Required interior/condition shot missing | Media set remains incomplete and recapture is owned |
| `MPR-SCN-015` | Wrong vehicle photo uploaded | Reject, restrict publication, and reconcile asset identity |
| `MPR-SCN-016` | Photo is blurry/dark/duplicated | Quality failure routes targeted recapture |
| `MPR-SCN-017` | Image edit hides damage or changes vehicle truth | Reject asset and investigate integrity |
| `MPR-SCN-018` | Customer document/face/key code appears in image | Restrict asset and redact/recapture under privacy policy |
| `MPR-SCN-019` | Vehicle changes after approved photos | Invalidate affected media/content and recapture/review |
| `MPR-SCN-020` | AI draft accurately summarizes verified facts | Remains draft until eligible human approval |
| `MPR-SCN-021` | AI/provider invents feature or warranty claim | Remove unsupported claim, preserve provenance, review provider |
| `MPR-SCN-022` | Description conflicts with structured field/photo | Content approval blocked with exact conflict |
| `MPR-SCN-023` | Channel length/format requires variant | Approved transformation preserves facts/disclosures and lineage |
| `MPR-SCN-024` | Content edited materially after approval | Prior approval no longer covers new version |
| `MPR-SCN-025` | Cost/exposure inputs complete and fresh | Pricing review shows attributable economics |
| `MPR-SCN-026` | Recon/title cost is missing or disputed | Uncertainty disclosed; policy determines block/manual review |
| `MPR-SCN-027` | Comparable set contains duplicate/stale/wrong-trim listings | Ineligible observations excluded with reasons |
| `MPR-SCN-028` | Market sample is too weak | Low confidence/manual review; no autonomous price |
| `MPR-SCN-029` | Proposed price meets floor and staff authority | Exact human approval records scope/effective version |
| `MPR-SCN-030` | Proposed price falls below gross/margin floor | Higher authority/floor exception required |
| `MPR-SCN-031` | Discount/incentive split attempts to evade limit | Aggregate exposure and enforce authority |
| `MPR-SCN-032` | Approved price expires before publication | Publication/release blocked pending revalidation |
| `MPR-SCN-033` | Condition/cost changes after price approval | Invalidate/review affected price and payloads |
| `MPR-SCN-034` | Aging recommendation suggests price reduction | Human reviews evidence; no automatic repricing |
| `MPR-SCN-035` | Economics support disposition/transfer review | Authorized decision route; no automatic action |
| `MPR-SCN-036` | Channel payload passes preflight | Idempotent publish request records exact approved versions |
| `MPR-SCN-037` | Provider acknowledges request but listing not yet live | State stays pending; acknowledgement is not publication |
| `MPR-SCN-038` | Provider rejects missing/invalid field | Correct mapped source/variant and retry with lineage |
| `MPR-SCN-039` | Listing goes live with wrong price | Drift is critical; correct/pause/remove and block release per policy |
| `MPR-SCN-040` | Media order/count differs on live channel | Reconcile and correct exact channel variance |
| `MPR-SCN-041` | One required channel live, another rejected | Partial state remains visible; required-channel gate blocks |
| `MPR-SCN-042` | Duplicate listing exists at old location/account | Remove/reconcile unauthorized duplicate |
| `MPR-SCN-043` | Provider outage leaves publish result unknown | No live claim; reconciliation owner/target remains |
| `MPR-SCN-044` | All required channels reconciled or policy says prepublish unnecessary | Package can proceed to independent release review |
| `MPR-SCN-045` | Frontline reviewer rejects stale title/media/price evidence | Package history preserved; exact correction route |
| `MPR-SCN-046` | Material defect/title fact appears after publication | Suspend/update/pause/remove affected listing and release reliance |
| `MPR-SCN-047` | Duplicate content/price/publish command replay | Same result; no duplicate approval/request/listing |
| `MPR-SCN-048` | Concurrent price/content approval commands conflict | One expected-version transition; recoverable current state |
| `MPR-SCN-049` | Unauthorized user attempts price approval/publish | Server denies and protects approved versions |
| `MPR-SCN-050` | Media/pricing/channel target missed | Owned escalation/reforecast; no auto-approval, live claim, or clock reset |

## 18. Catalog exit gate

This catalog is ready for code only when:

- policy owners approve the seven source/draft/content/price/publication/package distinctions and the separate Frontline Release Review boundary;
- merchandising templates, shot/media requirements, quality, privacy/security, truthfulness, editing, accessibility, language, disclosure, channel, freshness, and publisher authority are approved;
- identity/equipment/options/mileage/condition/title/history/warranty/certification/service/promotional claim sources and verification rules are approved;
- media/detail/content/data/pricing/reviewer/publisher roles, qualifications, location scope, sensitive access, separation, overrides, and workload policies are approved;
- pricing inputs, accounting boundary, cost/exposure sources, comparable eligibility, market freshness/confidence, margin/floor/ceiling, incentive aggregation, authority, expiry, reapproval, and recommendation rules are approved;
- AI/provider-generated content/price assistance has provenance, evaluation, human review, fallback, monitoring, and kill switch; it cannot autonomously approve public content/customer price;
- channel eligibility, accounts, mappings, payload versions, required disclosures, desired states, idempotency, acknowledgement/live distinction, reconciliation evidence, retry, rejection, duplicate, pause/remove, outage, and manual fallback rules are approved;
- package completion, required-channel boundary, final reviewer, frontline handoff, post-publish invalidation, correction, route change, and recovery behavior are approved;
- staff walk through at least twenty representative cases spanning constrained preparation, data conflict, privacy, unsupported claims, price authority/floor, weak market data, provider rejection/drift, partial publication, duplicate listing, and post-publish invalidation;
- acceptance scenarios map to planned automated/manual evidence;
- no content, price, publication, or frontline behavior is activated merely because this planning catalog exists.
