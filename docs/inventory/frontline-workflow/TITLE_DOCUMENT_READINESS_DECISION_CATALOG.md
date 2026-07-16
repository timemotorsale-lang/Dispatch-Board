# Title and Document Readiness Decision and Scenario Catalog

**Status:** Proposed seventh vertical-slice catalog  
**Catalog ID:** `INV-ITF-TDR`  
**Version:** `0.1.0`  
**Activation:** Not approved; documentation only

## 1. Outcome and boundary

This catalog begins when an inventory unit is eligible for Title and Document Readiness from Receipt/Custody, Inspection/Triage, Quality/Safety operational release, or an approved parallel-work route. It ends when:

- a policy-authoritative, jurisdiction-aware requirement set is selected for the exact vehicle, acquisition, seller/source, ownership history, intended retail/disposition route, and effective date;
- every applicable ownership, transfer, lien, odometer, identity, disclosure, tax/fee support, and other policy-required document is received, classified, verified, accepted, corrected, replaced, or placed in an expressly permitted constrained state;
- original-paper and electronic-record custody is attributable, secure, and reconstructable;
- signatures, names, VIN, dates, assignments, brands, mileage, notarization, and related cross-document facts are reconciled without the workflow pretending to provide a legal opinion;
- external agency, lender, seller, auction, carrier, processor, or prior-owner dependencies have one internal owner, current status, target, evidence, and escalation;
- suspected fraud, alteration, lost document, lien conflict, branded/history conflict, ownership gap, and legal/compliance uncertainty are contained and routed to qualified authority;
- readiness is versioned and may be suspended when a material fact, document, policy, or intended route changes;
- an eligible unit is handed to Merchandising and Pricing or another approved route with exact constraints, evidence, owner, and target.

This stage does not issue a government title, release a lien, determine legal ownership, provide legal advice, post accounting/tax entries, publish a listing, approve pricing, set `FRONTLINE_READY`, authorize a sale, or guarantee that a later delivery/title-registration package is complete. Those conclusions remain with the appropriate agency, lender, qualified policy owner, counsel, and downstream workflow.

## 2. Six distinct title/document facts

1. **Requirement identified:** A document/check is applicable under the approved policy version.
2. **Document received:** A physical/electronic artifact or authoritative provider fact has arrived.
3. **Document verified:** Identity, source, completeness, consistency, integrity, and policy checks have been performed.
4. **Document accepted for this purpose:** An authorized verifier accepts the artifact for the exact inventory route and effective policy.
5. **External filing/dependency acknowledged:** A provider/agency confirms receipt or status; this is not final issuance or completion.
6. **Title/Document Readiness passed:** Every applicable hard requirement is accepted or in an explicitly permitted constrained state.

Possession is not verification. Verification is not legal adjudication. Submission is not acceptance. A lender quote is not lien release. An agency acknowledgement is not title issuance. Title/document readiness is not frontline readiness.

## 3. Relationship to existing records

- `InventoryUnit` remains the canonical inventory lifecycle subject and owns stage, location, owner, target, and operating-state projections.
- `InventoryTitleReadiness` remains the versioned readiness evaluation with required documents, statuses, evidence references, external dependencies, blockers, owner, and evaluation time.
- Canonical `Vehicle`, acquisition, source, appraisal, receipt/custody, odometer observation, inspection, repair/QC release, merchandising, sale, and delivery records remain authoritative for their facts.
- The Evidence domain remains authoritative for document objects, integrity metadata, sensitivity, access, retention, expiry, and supersession.
- Tasks, approvals, exceptions, incidents, commands, expected versions, audit, events, outbox, and rollout foundations remain canonical.
- Government, lender, auction, seller, processor, vehicle-history, and DMS/provider records are external facts with explicit authority, freshness, confidence, mapping, and reconciliation status.

The existing `InventoryTitleReadiness` foundation is an input to this catalog. This catalog defines complete staff decisions and policy boundaries; it does not claim that all behaviors are implemented or activated.

## 4. Entry trigger catalog

| Trigger ID | Trigger | Required response |
| --- | --- | --- |
| `TDR-TRG-001` | Acquisition becomes authoritative | Start preliminary requirements and dependency discovery |
| `TDR-TRG-002` | Receipt/Custody accepts physical documents | Reconcile document inventory and original custody |
| `TDR-TRG-003` | Inspection/QC observes title, VIN, mileage, brand, disclosure, or ownership concern | Re-evaluate affected requirement and restrict downstream reliance |
| `TDR-TRG-004` | Operational repair release routes inventory to title/merchandising | Evaluate final stage entry and remaining requirements |
| `TDR-TRG-005` | Document/provider/agency/lender status changes | Re-evaluate exact dependent requirements |
| `TDR-TRG-006` | Intended sale/disposition, jurisdiction, entity, location, or vehicle use changes | Rebuild requirement applicability under current policy |
| `TDR-TRG-007` | Accepted evidence expires, is corrected, revoked, superseded, or conflicts | Suspend affected readiness and create recovery |
| `TDR-TRG-008` | Warning, due, or overdue target occurs | Escalate without inventing receipt, filing, issuance, or readiness |

### Entry and duplicate rules

- One active readiness case exists per inventory unit, requirement-set version, jurisdiction/route context, and catalog version.
- Duplicate/replayed triggers return the existing case and do not create duplicate tasks, submissions, fees, requests, or readiness versions.
- Preliminary work may begin before repair release where policy permits, but final completion revalidates current vehicle, route, and release facts.
- Later observations or provider updates append a new evaluation; they do not rewrite prior accepted evidence or historical readiness.
- Out-of-order/provider events reconcile against external reference, source, occurrence time, prior status, and current version.
- System degradation preserves pending work and cannot invent an agency/lender acknowledgement or legal conclusion.

## 5. Coordination states

```text
TITLE_HANDOFF_RECEIVED
  -> REQUIREMENT_CONTEXT_REVIEW
  -> REQUIREMENTS_SELECTED
  -> DOCUMENT_INVENTORY
  -> AWAITING_DOCUMENT | AWAITING_VERIFICATION | AWAITING_CORRECTION
  -> AWAITING_SELLER | AWAITING_LENDER | AWAITING_AGENCY | AWAITING_PROCESSOR
  -> BLOCKED_IDENTITY | BLOCKED_OWNERSHIP | BLOCKED_LIEN | BLOCKED_BRAND_DISCLOSURE
  -> READY_FOR_FINAL_REVIEW
  -> TITLE_DOCUMENT_READY
  -> DOWNSTREAM_HANDOFF_PENDING
  -> DOWNSTREAM_HANDOFF_ACCEPTED
```

These are workflow coordination states. Canonical lifecycle and title-readiness statuses remain authoritative.

## 6. Decision-entry contract

Every staff decision displays:

- exact VIN/stock/inventory unit, acquisition/source, seller/transferor, location, custody owner, retail/disposition intent, target, and stage age;
- applicable organization/entity, acquisition and expected sale jurisdictions, vehicle class/use, title/history indicators, lien/payoff facts, odometer facts, and policy version;
- required-document checklist with applicability basis, status, source, freshness, evidence, original/electronic custody, expiry, verifier, dependencies, and blockers;
- cross-document conflicts in names, VIN, mileage, dates, signatures, assignments, brands, lienholders, and ownership chain;
- external dependency status, confirmation type, reference, provider authority, last contact, ETA/target, internal owner, and escalation;
- only permitted actions, qualified review options, downstream effects, and non-waivable stops.

The server revalidates identity, current policy/applicability, capability, expected version, evidence integrity/access, separation of duties, external-fact freshness, and readiness gates when a command is submitted.

## 7. Context and requirement selection

### `TDR-DEC-001` - Is the handoff current and complete?

Validate inventory identity, authoritative acquisition, seller/source, receipt/custody documents, location, odometer observations, condition/history flags, operational repair release where required, intended route, and existing title case.

Outputs: Accept; accept preliminary parallel work; reject for missing handoff; reconcile conflicting identity/source; hold for qualified review.

### `TDR-DEC-002` - What jurisdiction and legal entity contexts apply?

Determine only through approved policy inputs: acquiring entity/location, source/transfer jurisdiction, expected titling/registration/retail jurisdiction, vehicle location/use, and effective date. Staff do not choose a convenient rule set.

### `TDR-DEC-003` - What acquisition/source type applies?

Outputs may include dealership purchase, consumer trade, auction, dealer transfer, consignment, manufacturer/new vehicle, repossession/recovery, estate/trust/entity transfer, import, donation, or other qualified route. Ambiguous source blocks automatic requirement selection.

### `TDR-DEC-004` - What title/ownership instrument state is claimed?

Capture observed/source-reported state such as original paper, electronic record, certificate/MSO/MCO, assigned title, duplicate pending, title absent, title held by lender/agency, bonded/special process, branded, non-title jurisdiction/age treatment, or unknown. Labels are observations until verified.

### `TDR-DEC-005` - Is there a lien, payoff, security-interest, or ownership dependency?

Distinguish payoff quote, payoff authorization, funds requested/sent, lender receipt, lien satisfied, release received, electronic release posted, and title issued. No intermediate state is treated as final lien clearance.

### `TDR-DEC-006` - Select the applicable requirement template

Resolve a counsel/compliance-approved template using jurisdiction, entity, source type, instrument state, lien status, vehicle age/class/use, mileage/disclosure applicability, brand/history, intended route, transaction date, and policy effective version.

### `TDR-DEC-007` - Are supplements or qualified review required?

Possible supplements include lien/payoff, odometer, branded/salvage/rebuilt/flood, import, duplicate/lost title, entity/POA/trust/estate, consignment, transfer, disclosure, correction affidavit, tax/fee support, or special agency process.

### `TDR-DEC-008` - Create the versioned requirement set

Each requirement records code, plain-language purpose, applicability basis, required source/form/version, acceptable evidence, original requirement, signature/notary/witness rules where policy-defined, verifier capability, expiry, dependency, constrained-state eligibility, retention/access classification, owner, and target.

## 8. Document intake, custody, and verification

### `TDR-DEC-010` - Did the expected document or provider fact arrive?

Options: Original paper received; certified/approved copy; electronic authoritative record; provider status; image/reference only; partial packet; unexpected document; not received; lost in transit; conflicting delivery claim.

Receipt records actor/source, time, channel, inventory/VIN linkage, page/item count, condition, envelope/tracking/reference, and custody without declaring acceptance.

### `TDR-DEC-011` - Classify the document and sensitivity

Map to a requirement, document/form/version, original/copy/electronic status, issuer/source, confidentiality class, retention, access, export/redaction, and physical/electronic storage rule. Unknown or unrelated documents enter restricted review.

### `TDR-DEC-012` - Is original-paper custody controlled?

Record receipt, sealed/open condition where relevant, secure location, custodian, check-in/out, transfer, copy/scan, shipment, return, loss, destruction authority, and chain of custody. A scan does not erase original-custody obligations.

### `TDR-DEC-013` - Is the artifact authentic and unaltered enough for policy verification?

Check approved security/features/source confirmation, completeness, legibility, alteration/erasures, overwriting, inconsistent fonts/data, missing pages, image integrity, and provider verification. Suspected fraud/alteration is contained and escalated; staff do not adjudicate criminal intent.

### `TDR-DEC-014` - Do vehicle and transaction identities match?

Reconcile VIN, year/make/model where applicable, stock/inventory unit, seller/owner/entity names, buyer/acquiring entity, addresses/identifiers where policy permits, and transaction reference. A material VIN or party mismatch is a hard stop.

### `TDR-DEC-015` - Are assignments, signatures, dates, and capacity complete?

Apply the selected policy/form rules for signatures, printed names, assignment sequence, date consistency, agent/representative capacity, POA/entity authority, notarization/witnessing, corrections, and blank fields. The system flags requirements; qualified policy authority determines legal acceptability.

### `TDR-DEC-016` - Are odometer facts and disclosures consistent?

Compare applicable disclosure, receipt and inspection observations, acquisition records, history/provider facts, units, dates, branding/notations, and corrections. Implausible sequence or conflict creates an owned exception and cannot be overwritten.

### `TDR-DEC-017` - Are title brands, history flags, and required disclosures reconciled?

Compare instrument, authoritative provider facts, acquisition/appraisal, inspection, and policy-required disclosure evidence for brand/status/history indicators. Conflicts route qualified review, economics/disposition review, and downstream restriction.

### `TDR-DEC-018` - Is the ownership/assignment chain complete?

Trace each required transferor-to-transferee link, dealer reassignment or equivalent record, prior assignments, supporting bills/authorities, and gaps. An unexplained skip, duplicate assignment, or incompatible party prevents readiness.

### `TDR-DEC-019` - Accept, reject, or request correction/replacement

Outputs: Accepted for exact requirement/purpose; rejected with reason; incomplete; correction affidavit/form needed; duplicate/replacement needed; certified/authoritative confirmation needed; qualified review; not applicable with authority; superseded.

Acceptance records verifier, capability, policy/template version, checks, evidence, scope, time, expiry, and any downstream constraints. It is not a legal opinion or agency acceptance.

## 9. External dependencies and filing

### `TDR-DEC-020` - Create an external dependency

Record provider/agency/lender/seller/auction/processor, internal owner, purpose, exact requested artifact/action, authority to request, consent/privacy basis, reference, submission channel, sent time, acknowledgement, original/revised target, status freshness, cost/fee authority, and escalation.

### `TDR-DEC-021` - Prepare an outbound packet/request

Validate recipient, form/template version, required attachments, redaction, signatures/authority, fees, delivery method, tracking, original custody, return destination, and four-eyes review where policy requires. Preview is not submission.

### `TDR-DEC-022` - Is submission or fee authority sufficient?

Evaluate role/capability, exact scope, fee amount/currency, related exposure, sensitive disclosure, original-document shipment, and policy. Unauthorized packet/fee remains a draft with exact approval route.

### `TDR-DEC-023` - Record submission and acknowledgement separately

Submission evidence records what was sent, by whom, when, how, recipient/reference, and custody. Acknowledgement records only provider receipt/status. Neither proves approval, lien release, or title issuance.

### `TDR-DEC-024` - Monitor status and SLA

Track original/revised targets, last confirmation, provider state mapping, requests for information, rejection, return, lost mail, pending review, issuance, and receipt. External waiting always has an internal owner and next-contact target.

### `TDR-DEC-025` - Resolve provider request, rejection, or mismatch

Verify legitimacy, exact deficiency, current policy/form, affected evidence, correction authority, resubmission needs, fees, custody, target impact, and whether downstream restrictions expand. Preserve every submission and response version.

### `TDR-DEC-026` - Did final external evidence arrive?

Distinguish lender lien-release evidence, electronic status, agency approval/issuance, mailed/in-transit artifact, delivered original, returned/rejected packet, and provider statement. Each final claim still undergoes intake and verification.

## 10. Blockers, exceptions, and constrained states

### `TDR-DEC-030` - Classify a blocker

Classes include missing original, ownership gap, lien/payoff, VIN/party mismatch, odometer conflict, signature/assignment defect, title brand/history conflict, fraud/alteration concern, duplicate/lost title, provider rejection, agency delay, policy ambiguity, privacy/access, fee authority, custody loss, or system reconciliation.

### `TDR-DEC-031` - Is the blocker non-waivable?

Law, binding policy, ownership/identity integrity, unresolved lien, required disclosure, suspected fraud/alteration, mandatory original, and other counsel-designated gates cannot be bypassed by manager preference, age, carrying cost, customer interest, or a high readiness score.

### `TDR-DEC-032` - Is a constrained state permitted?

Only a published, counsel/compliance-approved policy may permit a named intermediate route. It must define exact condition, prohibited actions, allowed preparation, expiry/review, owner, evidence, disclosure, risk, and exit criteria. Constrained readiness cannot silently enable listing, contract, delivery, or frontline actions beyond policy.

### `TDR-DEC-033` - Route qualified legal/compliance review

Provide facts and questions without instructing staff to decide legal ownership or law. Record reviewer authority, scope, advice/reference where permitted, effective date, constraints, follow-up, and whether policy/template change is needed. Sensitive legal communications follow access/retention rules.

### `TDR-DEC-034` - Reconsider retail intent or economics

When delay, brand, title path, fees, carrying exposure, marketability, or uncertainty crosses approved thresholds, present disposition alternatives to authorized management. Recommendations do not decide legality, write down value, or dispose of the unit.

## 11. Final readiness and downstream handoff

### `TDR-DEC-040` - Is every applicable requirement dispositioned?

Each requirement must be accepted, explicitly not applicable with authority, or in a currently valid policy-permitted constrained state. Missing, rejected, expired, conflicting, unverified, or superseded-only evidence prevents full readiness.

### `TDR-DEC-041` - Are cross-document and external facts current and consistent?

Revalidate identity, ownership chain, lien state, odometer, brands/disclosures, parties, dates, original custody, provider freshness, intended route, jurisdiction/entity context, and policy version. A checklist percentage cannot outweigh one hard failure.

### `TDR-DEC-042` - Is the final reviewer eligible and independent?

Check capability, location/entity scope, policy training, sensitive-document access, separation from document preparer where required, and conflict. Policy-required independent/four-eyes review is non-waivable.

### `TDR-DEC-043` - Record the versioned readiness evaluation

Statuses: `READY`, `INCOMPLETE`, `BLOCKED`, `EXPIRED`, or other canonical safe projection. Snapshot requirement set, document dispositions, evidence IDs, external dependencies, blockers, constraints, owner, evaluator, policy/catalog version, target, and time.

### `TDR-DEC-044` - Select downstream route

Options: Merchandising and Pricing preparation/review; Frontline Release Review only if all other independent gates are satisfied; continued constrained preparation; return to source/correction; disposition review; hold. Title readiness alone does not activate a listing or frontline status.

### `TDR-DEC-045` - Does the downstream owner accept the handoff?

Confirm identity/location/custody, readiness version, evidence summary, permitted/prohibited actions, remaining nonblocking dependencies, expiry/review, owner, and target. Rejection retains title history and returns exact missing/conflicting context.

### `TDR-DEC-046` - Handle a material fact after readiness

Append a new evaluation, suspend affected downstream reliance or frontline readiness where authorized, preserve prior readiness evidence, identify affected requirements/transactions, and route containment/correction/provider/legal/disclosure/review work. Never silently edit the prior ready version.

## 12. Cancellation, correction, and degraded operation

### `TDR-DEC-050` - Cancel or change intended route/entity/jurisdiction

Require authority, reason, effective time, commitments/filings already made, document custody, fee/recovery implications, downstream effects, and rebuilt requirements. Do not delete the prior context.

### `TDR-DEC-051` - Correct or supersede a document/status fact

Reference original fact/evidence, preserve prior value, record authority/reason/source, create correction or supersession, and re-evaluate affected requirements, filings, disclosures, readiness, and downstream reliance. Direct edit/delete is prohibited.

### `TDR-DEC-052` - Recover lost, damaged, misrouted, or exposed documents

Contain access/custody risk, notify required authority, preserve chain/evidence, determine replacement/duplicate/affidavit/provider steps, assess privacy/security incident, reassign owner/target, and block unsupported readiness.

### `TDR-DEC-053` - Operate during provider or evidence-system degradation

Show unavailable versus stale versus locally observed facts, preserve approved draft work, prevent unsupported submission/acceptance/readiness, queue reconciliation, and require review after recovery.

## 13. Action catalog

| Action ID | Action | Minimum output |
| --- | --- | --- |
| `TDR-ACT-001` | Accept/reject title handoff | Context, owner, exact missing work |
| `TDR-ACT-002` | Select jurisdiction/entity/source context | Versioned applicability inputs |
| `TDR-ACT-003` | Select requirement template/supplements | Requirement set and policy basis |
| `TDR-ACT-004` | Record document/provider receipt | Source, channel, time, custody, mapping |
| `TDR-ACT-005` | Classify/store/transfer original or electronic evidence | Sensitivity, custodian, location, integrity |
| `TDR-ACT-006` | Verify identity/content/integrity | Structured checks and conflicts |
| `TDR-ACT-007` | Accept/reject/request correction | Exact requirement disposition and reason |
| `TDR-ACT-008` | Create external dependency/request | Provider, owner, reference, target, evidence |
| `TDR-ACT-009` | Prepare/review/authorize packet | Exact version, attachments, authority, custody |
| `TDR-ACT-010` | Submit/ship and record acknowledgement | Separate attributable facts |
| `TDR-ACT-011` | Monitor/escalate external status | Original/revised target and next action |
| `TDR-ACT-012` | Resolve rejection/mismatch/request | Correction/resubmission with lineage |
| `TDR-ACT-013` | Contain/escalate title/document risk | Restriction and qualified owner |
| `TDR-ACT-014` | Request qualified legal/compliance review | Facts, question, scope, outcome restrictions |
| `TDR-ACT-015` | Evaluate/record readiness | Immutable versioned gate result |
| `TDR-ACT-016` | Route/accept downstream handoff | Destination, constraints, owner, target |
| `TDR-ACT-017` | Suspend prior readiness/reliance | Affected scope and recovery work |
| `TDR-ACT-018` | Correct/supersede/reconcile evidence | Append-only lineage and reevaluation |

## 14. Evidence catalog

| Evidence ID | Evidence | Required when | Proposed criticality |
| --- | --- | --- | --- |
| `TDR-EVD-001` | Current inventory/title handoff snapshot | Every case/cycle | Mandatory hard gate |
| `TDR-EVD-002` | Jurisdiction/entity/source/route context | Every requirement set | Mandatory hard gate |
| `TDR-EVD-003` | Approved requirement template/supplements snapshot | Every requirement set | Mandatory hard gate |
| `TDR-EVD-004` | Document receipt/source/channel evidence | Every received artifact/fact | Mandatory |
| `TDR-EVD-005` | Original/electronic custody and storage ledger | When custody applies | Mandatory hard gate |
| `TDR-EVD-006` | Authenticity/integrity/completeness review | Every accepted artifact | Mandatory |
| `TDR-EVD-007` | VIN/vehicle/party identity reconciliation | Every applicable artifact | Mandatory hard gate |
| `TDR-EVD-008` | Assignment/signature/date/capacity review | When applicable | Conditional hard gate |
| `TDR-EVD-009` | Odometer/disclosure reconciliation | When applicable | Conditional hard gate |
| `TDR-EVD-010` | Brand/history/disclosure reconciliation | When applicable/indicated | Conditional hard gate |
| `TDR-EVD-011` | Ownership/assignment chain | Every ownership route | Mandatory hard gate |
| `TDR-EVD-012` | Lien/payoff/release status evidence | When applicable | Conditional hard gate |
| `TDR-EVD-013` | Requirement acceptance/rejection decision | Every requirement | Mandatory |
| `TDR-EVD-014` | External request/submission packet snapshot | Every external submission | Mandatory |
| `TDR-EVD-015` | Submission/shipping/custody evidence | Every outbound packet/original | Mandatory |
| `TDR-EVD-016` | Provider acknowledgement/status/response | Every external dependency | Mandatory |
| `TDR-EVD-017` | Correction/replacement/resubmission lineage | When required | Mandatory |
| `TDR-EVD-018` | Blocker/restriction/constrained-state authority | Every constrained/blocked case | Mandatory hard gate |
| `TDR-EVD-019` | Qualified legal/compliance review reference | When policy requires | Conditional restricted evidence |
| `TDR-EVD-020` | Final reviewer eligibility/independence | Every final review | Mandatory hard gate |
| `TDR-EVD-021` | Versioned readiness evaluation | Every evaluation | Mandatory |
| `TDR-EVD-022` | Downstream handoff/acceptance | Every completed route | Mandatory |
| `TDR-EVD-023` | Post-readiness invalidation/recovery | When material new fact appears | Mandatory exception evidence |
| `TDR-EVD-024` | Loss/exposure/provider-outage reconciliation | When applicable | Mandatory exception evidence |

## 15. Exception reason catalog

| Reason code | Meaning | Control effect |
| --- | --- | --- |
| `TDR_EX_HANDOFF_INCOMPLETE` | Required context/evidence absent | Intake/final gate blocked |
| `TDR_EX_CONTEXT_AMBIGUOUS` | Jurisdiction/entity/source/route uncertain | Qualified selection required |
| `TDR_EX_TEMPLATE_UNAVAILABLE` | No approved applicable requirement set | Readiness blocked |
| `TDR_EX_DOCUMENT_MISSING` | Required artifact/fact absent | Owned request/dependency |
| `TDR_EX_ORIGINAL_REQUIRED` | Required original not in controlled custody | Hard/conditional block |
| `TDR_EX_DOCUMENT_INCOMPLETE` | Required fields/pages/attachments absent | Correction/replacement |
| `TDR_EX_DOCUMENT_ILLEGIBLE` | Content cannot be reliably verified | Replacement/confirmation |
| `TDR_EX_ALTERATION_FRAUD_CONCERN` | Artifact appears altered/suspicious | Contain; qualified escalation |
| `TDR_EX_VIN_IDENTITY_MISMATCH` | Vehicle/document identity conflicts | Non-waivable stop |
| `TDR_EX_PARTY_NAME_MISMATCH` | Seller/owner/entity facts conflict | Reconcile/qualified review |
| `TDR_EX_SIGNATURE_ASSIGNMENT_DEFECT` | Required execution/assignment incomplete | Correction/replacement |
| `TDR_EX_AUTHORITY_POA_DEFECT` | Agent/entity authority insufficient | Qualified correction |
| `TDR_EX_ODOMETER_CONFLICT` | Mileage/disclosure facts conflict | Hard/qualified review |
| `TDR_EX_BRAND_HISTORY_CONFLICT` | Brand/history/disclosure facts conflict | Restrict; qualified/economics review |
| `TDR_EX_OWNERSHIP_CHAIN_GAP` | Required transfer link missing/conflicting | Non-waivable stop |
| `TDR_EX_LIEN_PAYOFF_OPEN` | Lien/release dependency unresolved | Readiness/release restriction |
| `TDR_EX_PROVIDER_REJECTED` | Agency/lender/processor rejected packet/request | Correct/resubmit/escalate |
| `TDR_EX_PROVIDER_DELAY` | External status exceeds target | Escalate; no invented completion |
| `TDR_EX_DUPLICATE_LOST_TITLE` | Replacement/special process required | Owned external path |
| `TDR_EX_FEE_AUTHORITY` | Filing/processing fee not authorized | Submission blocked |
| `TDR_EX_POLICY_AMBIGUITY` | Approved policy does not resolve case | Compliance/counsel review |
| `TDR_EX_PRIVACY_ACCESS` | Sensitive access/export is not permitted | Server denial/restricted review |
| `TDR_EX_ORIGINAL_CUSTODY_LOST` | Physical original missing/misrouted/damaged | Incident/recovery and block |
| `TDR_EX_CONSTRAINED_STATE_EXPIRED` | Temporary permission expired | Downstream action suspended |
| `TDR_EX_DOWNSTREAM_REJECTED` | Next owner cannot accept handoff | Handoff remains owned |
| `TDR_EX_POST_READY_INVALIDATION` | New fact undermines readiness | Suspend reliance/recover |
| `TDR_EX_PROVIDER_UNAVAILABLE` | External/evidence system unavailable | Degraded reconciliation |
| `TDR_EX_DUPLICATE_CONCURRENT_COMMAND` | Replay/version conflict | Idempotent/current-state recovery |
| `TDR_EX_UNAUTHORIZED_COMMAND` | Actor lacks capability | Server denial |
| `TDR_EX_TARGET_MISSED` | Title/dependency/readiness target exceeded | Escalate; no auto-ready |

## 16. Scenario catalog

| Scenario ID | Scenario | Expected outcome |
| --- | --- | --- |
| `TDR-SCN-001` | Normal dealer purchase with complete accepted packet | Versioned ready result and downstream handoff |
| `TDR-SCN-002` | Preliminary title work starts before repair release | Allowed preparation only; final gate waits/revalidates |
| `TDR-SCN-003` | Handoff identity/source context is incomplete | Reject/hold with exact owned missing facts |
| `TDR-SCN-004` | Acquisition type or jurisdiction is ambiguous | No guessed template; qualified review |
| `TDR-SCN-005` | Policy template missing for special source | Readiness blocked; policy owner route |
| `TDR-SCN-006` | Consumer trade requires additional approved supplement | Requirements expand with versioned applicability |
| `TDR-SCN-007` | Paper original received with vehicle | Receipt and secure original custody recorded separately from acceptance |
| `TDR-SCN-008` | Only a phone image/scan is available where original is required | Evidence may inform work but cannot satisfy original gate |
| `TDR-SCN-009` | Electronic authoritative title/status source applies | Provider authority/freshness mapped and verified |
| `TDR-SCN-010` | Unexpected unrelated sensitive document received | Restricted classification and return/handling path |
| `TDR-SCN-011` | Document is incomplete or missing a page | Reject/request correction; preserve received version |
| `TDR-SCN-012` | Document is illegible/damaged | Replacement/authoritative confirmation path |
| `TDR-SCN-013` | Suspected alteration or fraud indicator | Contain access/original; qualified escalation; no accusation |
| `TDR-SCN-014` | VIN differs by one character | Hard identity stop and reconciliation |
| `TDR-SCN-015` | Seller/owner name differs from acquisition record | Party/authority reconciliation before acceptance |
| `TDR-SCN-016` | Assignment/signature/date field incomplete | Policy-driven correction/replacement; no staff improvisation |
| `TDR-SCN-017` | POA/entity/trust/estate authority is uncertain | Qualified authority review and exact additional evidence |
| `TDR-SCN-018` | Odometer disclosure conflicts with receipt reading | Preserve both facts; exception/qualified review |
| `TDR-SCN-019` | Implausible odometer sequence appears | Append-only investigation; no overwrite |
| `TDR-SCN-020` | Title brand conflicts with provider/history observation | Restrict downstream; qualified/economics/disclosure review |
| `TDR-SCN-021` | Ownership chain contains an unexplained gap | Non-waivable readiness block |
| `TDR-SCN-022` | Duplicate assignment or incompatible transferee | Reject and route correction/qualified review |
| `TDR-SCN-023` | No lien applies with accepted evidence | Lien supplement closes as not applicable with basis |
| `TDR-SCN-024` | Payoff quote received but lien release absent | Dependency remains open; quote is not release |
| `TDR-SCN-025` | Funds sent and lender acknowledges receipt | Preserve intermediate status; no final clearance |
| `TDR-SCN-026` | Electronic lien release posts | Verify authoritative state and affected requirement |
| `TDR-SCN-027` | Duplicate/lost title process required | Owned provider path, target, restrictions, and evidence |
| `TDR-SCN-028` | Outbound packet is missing required attachment | Submission blocked at preview/review |
| `TDR-SCN-029` | Filing fee exceeds staff authority | Draft preserved and exact approval routed |
| `TDR-SCN-030` | Original title shipped with tracking | Outbound custody, packet snapshot, and return destination recorded |
| `TDR-SCN-031` | Carrier says delivered but agency has no record | Conflicting claims remain unresolved; investigation/escalation |
| `TDR-SCN-032` | Agency acknowledges packet then requests correction | Preserve submission/response; correct and resubmit with lineage |
| `TDR-SCN-033` | Provider rejects obsolete form version | Rebuild from current approved policy; no overwrite |
| `TDR-SCN-034` | Agency/lender delay has no reliable ETA | Internally owned escalation/reforecast; no indefinite invisible wait |
| `TDR-SCN-035` | Agency reports issuance but original is still in transit | Issuance and physical receipt/custody remain distinct |
| `TDR-SCN-036` | Manager asks to waive ownership gap for aging unit | Non-waivable gate remains blocked |
| `TDR-SCN-037` | Policy permits limited merchandising preparation | Exact permitted/prohibited actions and expiry enforced |
| `TDR-SCN-038` | Constrained-state permission expires | Downstream preparation/reliance suspends and review reopens |
| `TDR-SCN-039` | Title delay makes retail economics unattractive | Authorized disposition review; no automatic wholesale/write-down |
| `TDR-SCN-040` | All documents present but one accepted item expired | Final readiness fails until refreshed/revalidated |
| `TDR-SCN-041` | All requirements accepted and facts consistent | Immutable `READY` evaluation with exact evidence snapshot |
| `TDR-SCN-042` | Final reviewer prepared the packet where independence required | Assign independent reviewer; no self-release |
| `TDR-SCN-043` | Downstream owner rejects missing custody context | Readiness history remains; exact handoff gap stays owned |
| `TDR-SCN-044` | Intended route/jurisdiction changes after ready | Rebuild applicability and suspend affected reliance |
| `TDR-SCN-045` | Material title/lien/brand fact appears after ready/frontline | Append invalidation, suspend affected state, route recovery |
| `TDR-SCN-046` | Original document is lost or exposed | Incident/custody/privacy recovery and readiness block |
| `TDR-SCN-047` | Duplicate receipt/submission/readiness command replay | Same result; no duplicate artifact, request, fee, or version |
| `TDR-SCN-048` | Concurrent conflicting acceptance/readiness command | One expected-version transition; recoverable current state |
| `TDR-SCN-049` | Provider/evidence system unavailable | Durable work and visible staleness; no invented status/readiness |
| `TDR-SCN-050` | Title/dependency target missed | Owned escalation and revised forecast; no auto-ready or clock reset |

## 17. Catalog exit gate

This catalog is ready for code only when:

- dealership counsel/compliance approves the jurisdiction/entity/source/vehicle/route applicability model and expressly identifies which gates are non-waivable;
- policy owners approve the six requirement/receipt/verification/acceptance/external/readiness distinctions;
- approved requirement templates, supplements, forms/versions, applicability rules, acceptable evidence, original/copy/electronic rules, signatures/capacity, expiry, and publisher authority are established for pilot scope;
- title/document roles, sensitive access, verifier/final-reviewer qualifications, separation, delegation, external-request, filing, fee, and original-shipment authority are approved;
- VIN/party, assignment, odometer, brand/history/disclosure, ownership-chain, lien/payoff/release, duplicate/lost-title, correction, and qualified-review policies are approved;
- original/electronic custody, storage, transfer, scan, export, redaction, retention, loss/exposure, incident, and destruction controls are approved;
- external provider authority, mapping, freshness, acknowledgement versus completion, SLA, rejection, correction, resubmission, reconciliation, and outage rules are approved;
- constrained-state permitted/prohibited actions, expiry, review, disclosure, owner, and exit rules are explicit; no generic manager override exists;
- readiness, downstream handoff, route change, post-ready invalidation, frontline suspension, correction, cancellation, and recovery behavior are approved;
- staff walk through at least twenty representative cases spanning acquisition/source types, electronic/original records, lien/payoff, odometer conflict, brand/history, ownership gap, correction, provider delay, constrained preparation, and post-ready invalidation;
- acceptance scenarios map to planned automated/manual evidence;
- no workflow behavior or legal policy is activated merely because this planning catalog exists.
