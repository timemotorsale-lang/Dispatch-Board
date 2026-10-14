# Approval Workshop 02C - Evidence, Privacy, and Security Matrix

**Workshop status:** Decision-ready planning draft; not conducted  
**Decision state:** All decisions remain `OPEN` until authorized sign-off  
**Covers:** `ITF-APR-050`-`056`; supports all catalog evidence requirements  
**Program:** Inventory-to-Frontline  
**Pilot scope:** Time Motor Sales - Minneapolis, subject to Workshop 1 approval  
**Prepared:** 2026-07-16  

## 1. Workshop outcome

This packet continues Workshop 2 by defining what the Inventory-to-Frontline workflow may treat as evidence, who may capture and verify it, how it is classified and protected, how long it is retained, how corrections and disputes work, and what happens when evidence is missing, stale, conflicting, rejected, quarantined, or compromised.

The nine lifecycle catalogs currently define 184 planned evidence requirements: 16 for Acquisition and Transportation and 168 within the later eight catalogs. This packet establishes the common enterprise control model those requirements must use before they become implementation manifests.

This packet does not:

- approve any current evidence requirement, criticality, source, validity period, access grant, retention period, or disposal schedule;
- establish legal sufficiency, privilege, regulatory applicability, consent, or records obligations;
- permit staff to upload arbitrary sensitive information merely because a workflow accepts files;
- treat capture, upload, provider acknowledgement, OCR/AI extraction, or database presence as verification;
- authorize deletion, alteration, or replacement of historical evidence;
- activate evidence storage, integrations, cameras, scanning, identity checks, telematics, or external sharing.

Required output:

- approved evidence requirement and criticality model;
- approved first-slice evidence catalog and conditional applicability;
- approved sources and validity periods for roadworthiness, legal operation, driver, and insurance eligibility;
- approved pre/post transport condition requirements by source, method, and risk;
- approved data classifications and role visibility;
- approved retention, legal hold, export, and defensible disposal rules;
- approved correction, rejection, supersession, conflict, and quarantine authority;
- named evidence, privacy/security, records, and incident owners;
- safe non-execution behavior whenever required evidence cannot be trusted or accessed.

## 2. Evidence principles

1. **Evidence is purpose-bound:** evidence is accepted for an exact requirement, subject, workflow/cycle, decision, and version.
2. **Capture is not verification:** a file, photo, scan, measurement, statement, or provider payload remains unverified until the applicable control accepts it.
3. **Verification is not legal adjudication:** workflow verification applies approved policy; it does not invent legal requirements or replace qualified review.
4. **Source matters:** the system records who or what produced the evidence and whether that source is authoritative for the claimed fact.
5. **Freshness matters:** time-sensitive evidence has an as-of time, validity rule, expiry, and revalidation owner.
6. **Integrity matters:** original content and provenance are preserved; transformations, redactions, OCR, annotations, and derived results remain linked.
7. **Minimum necessary:** collect and display only the information necessary for the approved business purpose.
8. **Least privilege:** access is based on purpose, role, location, vehicle/case, classification, and time—not broad staff membership.
9. **No silent overwrite:** corrections and later evidence supersede prior items without erasing history.
10. **Conflicts are explicit:** conflicting evidence creates a visible hold or qualified review path; the system does not select the convenient result.
11. **Critical evidence does not average:** a missing, rejected, expired, or conflicting hard-gate item cannot be compensated for by other scores or volume of attachments.
12. **External acknowledgement is not truth:** provider receipt, processing, or success status is mapped and reconciled before acceptance.
13. **Human accountability remains:** OCR, AI, scoring, computer vision, or automated validation may assist but cannot become the sole approver of a critical fact.
14. **Audit access is also controlled:** evidence of who accessed or exported sensitive data does not make the underlying data broadly visible.
15. **Safety containment does not require unsafe capture:** staff must never be directed to obtain evidence in a way that risks injury or loss.

## 3. Evidence requirement contract

Every requirement must define:

| Field | Required definition |
| --- | --- |
| Requirement ID/version | Stable identifier and approved version |
| Business purpose | Decision or gate the evidence supports |
| Subject | Vehicle, cycle, movement, person/role eligibility, document, part, job, provider, price, channel, or release package |
| Applicability | Exact source, method, risk, vehicle, location, jurisdiction, route, and condition rules |
| Criticality | Approved class from section 5 |
| Accepted evidence type | Structured fact, document, media, measurement, attestation, event, approval, provider status, or composite package |
| Source authority | Which source may establish which field/fact |
| Capture role | Who may collect or submit it |
| Verification role | Who may validate integrity/content and required independence |
| Acceptance authority | Who may accept it for the requirement/decision |
| Required content | Fields, views, measurements, signatures, references, metadata, or comparison |
| Capture timing | Before/during/after event and allowed delay |
| Freshness/expiry | As-of rule, validity period, recheck trigger, and expiration behavior |
| Integrity controls | Original preservation, provenance, source, timestamps, and transformation lineage |
| Classification | Visibility and handling class from section 11 |
| Retention/disposal | Approved schedule, hold behavior, and disposition owner |
| Correction behavior | Rejection, supplementation, supersession, conflict, and quarantine path |
| Failure behavior | Missing/stale/unavailable/corrupt/provider-down safe response |
| Audit events | Capture, view, verify, accept, reject, export, correct, hold, and dispose events |

An evidence requirement with a missing critical field remains inactive for production use. Blank validity or retention values must not be interpreted as permanent.

## 4. Evidence roles and separation

| Role | Responsibility | Cannot infer |
| --- | --- | --- |
| Requirement/Policy Owner | Approves purpose, applicability, criticality, and acceptable sources | Access to every item or legal sufficiency |
| Evidence Capturer | Observes, scans, photographs, measures, records, or submits | Verification or acceptance authority |
| Source System/Provider | Supplies a mapped fact/status/document | Human acceptance or current truth outside mapped contract |
| Evidence Verifier | Checks provenance, integrity, completeness, content, freshness, and conflicts | Authority to change policy or ignore a failed hard gate |
| Decision/Acceptance Authority | Accepts evidence for an exact decision/gate | Permission to alter original evidence |
| Custodian | Protects originals, physical property, or restricted digital evidence | Ownership of the underlying business decision |
| Privacy/Security Owner | Defines access, monitoring, incident, and protection controls | Business readiness or title/safety sufficiency |
| Records Owner | Defines retention, legal hold, export, and disposal execution | Permission to destroy held or otherwise required records |
| Legal/Compliance Authority | Determines applicable legal/privilege requirements where needed | Operational execution outside approved role |
| System | Validates structure, malware, metadata, duplicates, rules, and expiry; routes work | Sole critical verifier, policy owner, or legal authority |

The same person may capture and verify only where approved risk policy permits. Identity conflict, independent QC, title/document final review, public claims, pricing, and frontline release retain the separation rules established in Workshop 2A.

## 5. Evidence criticality model

| Class | Meaning | Missing/rejected/expired behavior | Exception eligibility |
| --- | --- | --- | --- |
| `HARD_GATE` | Establishes safety, law/policy eligibility, identity, authority, custody, privacy, or another non-waivable condition | Prohibit affected command/transition; contain/escalate | None unless policy changes prospectively through governance |
| `CONDITIONAL_HARD_GATE` | Hard gate when an approved applicability condition is true | Evaluate condition; prohibit affected action when applicable and unsatisfied | Cannot waive after applicability is true |
| `MANDATORY_CONTROL` | Required for an approved operational decision/handoff | Hold completion/acceptance until satisfied | Only an explicitly modeled correction or alternate evidence path |
| `MANDATORY_EXCEPTION` | Required to document and resolve a detected exception | Keep exception open/restricted | Disposition authority may resolve, not omit evidence |
| `SUPPORTING` | Improves explanation, comparison, or review but does not alone gate | Warn or request supplementation as policy defines | May proceed if all actual gates pass |
| `ADVISORY` | Context or recommendation input | No gate; display provenance/confidence | Never upgraded to proof by convenience |
| `DERIVED` | Computed from identified source evidence | Recompute/invalidate when source changes | Cannot outrank its sources |

Criticality belongs to the requirement and approved applicability, not the file type.

## 6. Evidence lifecycle and states

```text
REQUIRED_MISSING
-> CAPTURE_PENDING_UPLOAD
-> CAPTURED_UNVERIFIED
-> VERIFICATION_IN_REVIEW
-> VERIFIED_ACCEPTED

Any applicable state may become:
REJECTED
EXPIRED
SUPERSEDED
CONFLICTING
QUARANTINED_OR_RESTRICTED
NOT_APPLICABLE_WITH_AUTHORITY
```

| State | Meaning | Permitted behavior |
| --- | --- | --- |
| `REQUIRED_MISSING` | Applicable evidence has not been captured/linked | Hold affected gate; assign capture owner |
| `CAPTURE_PENDING_UPLOAD` | Captured locally but durable upload/receipt is unconfirmed | Do not treat as available/accepted; preserve retry status |
| `CAPTURED_UNVERIFIED` | Durable item/reference exists but has not passed review | Permit only actions explicitly allowed before verification |
| `VERIFICATION_IN_REVIEW` | Eligible reviewer is evaluating current version | Preserve owner, clock, and restrictions |
| `VERIFIED_ACCEPTED` | Eligible authority accepted exact version for exact purpose | Satisfy only mapped requirement until expiry/invalidation |
| `REJECTED` | Reviewer found a defined deficiency | Show reason, correction path, and restriction |
| `EXPIRED` | Validity elapsed or freshness trigger fired | Revalidate/recapture before affected reliance |
| `SUPERSEDED` | Newer accepted/corrected version replaced operational reliance | Preserve history and use latest valid version |
| `CONFLICTING` | Relevant sources cannot be reconciled automatically | Hold affected gate; route qualified review |
| `QUARANTINED_OR_RESTRICTED` | Malware, alteration, privacy, privilege, classification, or integrity concern limits use/access | Isolate; notify owner; do not satisfy gate |
| `NOT_APPLICABLE_WITH_AUTHORITY` | Eligible authority applied an approved non-applicability rule | Record rule, facts, actor, time, and version |

Deletion is not an operational evidence state. Disposal occurs only through the approved records process.

## 7. Evidence type and provenance matrix

| Evidence type | Minimum provenance | Common integrity risk | Required control direction |
| --- | --- | --- | --- |
| Direct observation | Actor, subject, time, context, structured result | Memory, wrong vehicle, delayed entry | Near-event capture, identity context, delay reason |
| Photo/video/audio | Original, capture time, actor/device/source, subject/view labels | Editing, wrong vehicle/time, excessive personal data | Preserve original; link transformations; approved checklist |
| Measurement/reading | Instrument/source, unit, method, procedure, actor, validation/calibration where applicable | Transcription, wrong unit/tool, stale device | Structured unit/range, source, measurement time |
| Document/scan | Type/version, parties/subject, pages, original/copy status, receipt/custody | Missing pages, alteration, wrong version, sensitive exposure | Completeness/integrity review; track original separately |
| Signature/attestation | Signer identity/capacity, statement, time, method | Unverified capacity, reused signature | Approved method and qualified review where required |
| Internal system event | Source, event ID/version, actor/service, occurred/recorded time | Duplicate, stale projection, unauthorized mutation | Idempotency, source authority, reconciliation, audit |
| External provider status | Provider, request/response/reference, mapped status, timestamps | Acknowledgement confused with completion | Explicit mapping and observed-state reconciliation |
| Approval/decision | Request/scope/version, authority, result, reason, expiry | Chat/silence treated as approval | Structured command and authority evidence |
| Derived/AI/OCR output | Input IDs/versions, model/rule/provider/version, time, limitations | Hallucination, extraction error, opacity | Derived label; human verification for consequential use |
| Composite package | Requirement results, exact sources, fingerprint, assembler/reviewer | Mixed stale versions, omitted failures | Freeze manifest; invalidate/rebuild on material change |

## 8. First-slice evidence catalog (`ITF-APR-050`)

All proposed criticalities remain `OPEN`. Participants must approve applicability, source, verifier, acceptance authority, freshness, classification, and retention for each row.

| Evidence ID | Evidence | Proposed criticality | Capture/source | Verification/acceptance | Safe unresolved behavior |
| --- | --- | --- | --- | --- | --- |
| `AT-EVD-001` | Approved acquisition/source reference | `HARD_GATE` | Approved acquisition source / Inventory | Acquisition authority/source reconciliation | Do not start workflow |
| `AT-EVD-002` | VIN/canonical identity evidence | `HARD_GATE` when identity not authoritative/fresh | Receiving/Inventory or approved identity source | Eligible identity verifier; independent conflict authority | Hold/quarantine identity |
| `AT-EVD-003` | Acquisition authority evidence | `HARD_GATE` | Approved acquisition authority/source | Eligible acquisition authority | Do not plan/commit movement |
| `AT-EVD-004` | Current location source/observation | `MANDATORY_CONTROL` for movement | Custody/location source or observation | Case/custody owner | No movement dispatch |
| `AT-EVD-005` | Destination approval | `MANDATORY_CONTROL` | Plan and destination authority | Eligible destination/method authority | No movement dispatch |
| `AT-EVD-006` | Release authorization/reference | `HARD_GATE` for applicable external pickup | Seller/auction/custodian plus monitor | Eligible release/custody verifier | No pickup/dispatch |
| `AT-EVD-007` | Carrier quote/transport cost basis | `MANDATORY_CONTROL` when dealership bears cost | Eligible provider/contract/catalog | Financial approver per Workshop 2B | No financial commitment |
| `AT-EVD-008` | Cost approval | `HARD_GATE` when above executor authority | Structured approval command | Authority service/audit and executor | No commitment |
| `AT-EVD-009` | Roadworthiness/legal-operation evidence | `CONDITIONAL_HARD_GATE` for driven method | Approved inspection/legal source | Qualified safety/legal-operation authority | Driving unavailable |
| `AT-EVD-010` | Driver/insurance eligibility | `CONDITIONAL_HARD_GATE` for internal driver | Approved HR/driver/insurance sources | Safety/insurance authority | Internal driving unavailable |
| `AT-EVD-011` | Confirmed transport plan | `MANDATORY_CONTROL` | Coordinator plus approved provider/method facts | Inventory/transport authority | Do not dispatch |
| `AT-EVD-012` | Pickup/departure evidence | `MANDATORY_CONTROL` for `IN_TRANSIT` | Driver/provider/internal monitor | Transport monitor reconciles | Do not claim in transit |
| `AT-EVD-013` | Pre-transport condition evidence | `CONDITIONAL_HARD_GATE` by risk rule | Approved observer/provider/media process | Transport/condition reviewer | Hold dispatch or approved restricted alternative |
| `AT-EVD-014` | Arrival/delivery evidence | `MANDATORY_CONTROL` for receipt handoff | Provider/receiver observation/media/status | Receiving/Custody Owner | Do not claim delivered/handoff |
| `AT-EVD-015` | Transport damage comparison | `MANDATORY_EXCEPTION` for new/disputed damage | Pre/post evidence and statements | Qualified discrepancy/claim authority | Contain and keep exception open |
| `AT-EVD-016` | Cancellation/amendment authority | `HARD_GATE` for material change | Structured authority command | Exact cancellation/amendment authority | Preserve safest valid plan/restriction |

## 9. Roadworthiness and legal-operation evidence (`ITF-APR-051`)

Internal driving remains excluded from the proposed first pilot until this decision and related safety/insurance authority are approved.

Policy must define:

- movements requiring roadworthiness/legal-operation evidence;
- qualified inspection/source and procedure version;
- validity period and invalidating events;
- required safety systems/items and limited-movement distinctions;
- registration/plate/permit, custody, and jurisdiction source;
- mileage/route/weather/time/load restrictions;
- conditions requiring stop/review, including EV/high-voltage where applicable;
- verification and exact movement authority;
- alternate tow/trailer/containment route when evidence fails or expires.

Recommended direction: require a current vehicle-specific result from an approved qualified source; separate mechanical roadworthiness from legal-operation eligibility; and never infer safe/legal driving from prior travel, seller/provider statement, lack of a warning, or schedule pressure.

## 10. Driver and insurance eligibility (`ITF-APR-052`)

Policy must define authoritative source and freshness for:

- active approved driver assignment;
- license class/status/restrictions and verification method;
- organization/location and vehicle-class scope;
- insurance applicability and effective period;
- exclusions, route/purpose, plate/permit, and reporting requirements;
- training for tow, trailer, EV/high-voltage, specialty, or other method;
- incident/suspension status where approved;
- underlying evidence visibility versus minimal eligibility result;
- immediate revocation/expiry propagation and alternate route.

The operational workflow should normally expose `ELIGIBLE`, `INELIGIBLE`, `EXPIRED`, or `REVIEW_REQUIRED` plus scope and expiry—not unnecessary license, insurance, government identifier, medical, or HR details.

## 11. Pre/post transport condition evidence (`ITF-APR-053`)

Requirement strength must be approved by acquisition source, custody risk, movement method, provider, vehicle type/value/condition, weather, after-hours status, and claim/contract terms.

### Minimum proposed capture pattern

- vehicle identity and movement reference;
- actor/source, time, location, and custody context;
- required exterior views and existing-damage close-ups;
- interior/cargo/keys/accessories/documents when applicable and safe;
- odometer and fuel/charge level when relevant;
- operability/warning/condition observations without implying diagnosis;
- exceptions for poor light, weather, unsafe access, sealed transport, or provider restriction;
- arrival views sufficiently comparable to departure evidence;
- damage comparison, disagreement, provider notification, containment, and claim owner.

### Prohibited practices

- unsafe positioning or access to obtain media;
- unnecessary capture of bystanders, IDs, payment data, documents, screens, home addresses, or unrelated property;
- editing originals to hide context;
- retaining only compressed thumbnails for critical evidence;
- treating “no visible damage” as mechanical/safety certification;
- closing disputed damage because one party failed to respond.

## 12. Information classification and role visibility (`ITF-APR-054`)

| Class | Examples | Default visibility | Additional controls |
| --- | --- | --- | --- |
| `PUBLIC_APPROVED` | Final approved listing media/content/price | Approved channel/public use | Exact version; withdrawal/reconciliation |
| `INTERNAL_OPERATIONAL` | Stage, owner, location, work status, ordinary vehicle facts | Staff with operational need | Organization/location/case scope |
| `CONFIDENTIAL_BUSINESS` | Acquisition cost, quotes, vendor terms, recon economics, margins | Financial/inventory/manager need | Field restriction; export monitoring |
| `RESTRICTED_PERSONAL` | Driver/customer/seller identifiers, signatures, license/insurance data | Exact operational/office/privacy roles | Masking, purpose/time-bound access, audit |
| `RESTRICTED_DOCUMENT` | Title, lien, payoff, ownership-chain, POA/entity records | Trained title/office/qualified reviewers | Document-level access; custody controls |
| `RESTRICTED_SAFETY_SECURITY` | Key/access, secure location, incident, hazard, suspected alteration | Safety/security/exact managers/executors | Need-to-know; restricted notifications |
| `PRIVILEGED_OR_LEGAL_HOLD` | Counsel-directed privileged/held evidence | Named counsel/records/security scope | No ordinary dissemination/disposal |
| `QUARANTINED` | Malware, suspected tampering, misdirected or unknown sensitive content | Security/evidence custodian only | Isolated; no gate satisfaction |

Visibility rules:

- enforce access at item and field level, not only page/module;
- verify organization, location, case, role, purpose, classification, and time on every access;
- separate view, annotate, verify, accept, download, print, export, share, correct, hold, and dispose capabilities;
- mask sensitive values in tasks, notifications, search, logs, analytics, and URLs;
- use authenticated deep links rather than restricted attachments in messages;
- do not expose evidence solely because a person can view the vehicle;
- revoke access when role, assignment, employment, delegation, or purpose ends;
- use break-glass only if approved, reasoned, time-bound, audited, and reviewed.

## 13. Privacy and data minimization

Before collection, document purpose/basis, minimum content, notice/consent where applicable, source/correction, access, retention, external processing, incident/individual/hold obligations, and qualified review.

Proposed prohibitions unless separately approved:

- biometric identification or face recognition;
- continuous employee/location surveillance;
- full payment-card, banking, government identifier, health, or unrelated HR data in workflow notes/media;
- external AI training with restricted evidence;
- restricted content copied into free text, titles, analytics, or notifications;
- public media use before content/privacy review.

## 14. Physical and digital chain of custody

### Physical originals and property

Track identity/contents, original/copy/electronic status, source, receiver, time, condition, location, transfers, borrower/purpose/return, loss/discrepancy, secure storage, and downstream filing/shipping/provider reconciliation.

A scan does not prove possession of an original. A provider acknowledgement does not prove agency acceptance. A key count does not prove every key works.

### Digital evidence

Track original identity, uploader/source, occurrence/capture/received/processing times, integrity reference, type/size/page count, malware state, transformations/redactions/annotations/OCR/AI/exports, storage/encryption, access, retention/hold, and supersession/conflict lineage.

## 15. Retention, legal hold, export, and disposal (`ITF-APR-055`)

All durations remain `TBD` pending records/legal/privacy approval. Retention must be class-specific rather than “keep everything forever.”

| Field | Required definition |
| --- | --- |
| Record/evidence class | Exact requirement/type/classification |
| Trigger | Acquisition, capture, workflow close, sale/disposition, contract end, claim resolution, or approved event |
| Minimum/maximum period | Exact period and basis |
| Authoritative copy | System/location responsible |
| Duplicates/derivatives | Working copies, thumbnails, OCR, exports, caches, backups |
| Legal hold | Detection, placement, scope, preservation, notification, release authority |
| Export | Authority, purpose, scope, format, redaction, encryption, delivery, expiry |
| Disposal | Approval, method, provider, verification, exception, certificate/audit |
| Owner/review | Records owner, policy owner, frequency |

### Legal hold

- hold overrides ordinary disposal;
- scope includes relevant originals, derivatives, audit, approved communications/exports, and provider records;
- ordinary users see only necessary hold detail;
- release requires named authority and normal retention reevaluation;
- failed preservation or provider inability becomes an incident/exception.

### Export

- export is separate from view;
- record purpose, authority, recipient, scope, classification, redaction, encryption, expiry, and delivery;
- bulk export requires elevated authority and preview/manifest;
- exported copies receive handling/retention rules;
- tokens expire and do not expose content through guessable identifiers.

### Disposal

- verify expiry, no hold/open claim/dispute/investigation, and authoritative-copy status;
- use approved physical/digital method;
- record item, rule/version, authority, time, method, result, and failure;
- handle backups/providers through a documented lifecycle;
- preserve historical explanatory audit metadata unless qualified policy requires otherwise.

## 16. Correction, rejection, supersession, conflict, and quarantine (`ITF-APR-056`)

| Action | When used | Required authority/record | Effect |
| --- | --- | --- | --- |
| Supplement | Authentic but incomplete evidence can be cured | Capturer/verifier, reason, linked addendum | Original remains; return to review |
| Reject | Wrong, incomplete, illegible, invalid, stale, unsupported, or failed evidence | Eligible verifier, reason, cure | Cannot satisfy requirement |
| Correct metadata | Demonstrable metadata error without changing original | Correction capability, source, prior/new | New metadata version |
| Supersede | New evidence legitimately replaces reliance | Eligible verifier/acceptor, lineage/time | Prior retained as superseded |
| Mark conflicting | Relevant sources disagree materially | Verifier/detection plus review owner | Gate holds pending resolution |
| Quarantine | Malware, alteration, fraud concern, misdirected content, unknown class, integrity concern | Security/evidence review | Restricted; cannot satisfy requirement |
| Redact derivative | Sharing/use requires minimum necessary copy | Authorized redactor/reviewer | Original protected and linked |
| Reclassify | Approved review changes sensitivity | Privacy/security/records authority | Recompute access/retention |
| Release quarantine | Review confirms safe handling/classification | Named authority and evidence | Return to review; not auto-accepted |

No actor edits an accepted original in place. Rejection does not delete evidence. Suspected alteration routes to qualified policy rather than operational accusation. Material correction re-evaluates dependent decisions.

## 17. Invalidation and dependency propagation

Changed, expired, conflicting, rejected, or quarantined evidence must identify dependent requirements, gates, approvals, plans, jobs, handoffs, releases, exceptions, derived values, recommendations, prices, content, listings, packages, movements, restrictions, availability, downstream owners, and provider requests.

Policy chooses warning, recapture, re-verification, reapproval, handoff rejection, work stop, safety/title hold, listing pause/removal, frontline suspension, or full package review. Historical decisions remain explainable; current reliance changes prospectively.

## 18. Staff and reviewer experience

### Capture

Show purpose, vehicle/subject confirmation, exact required content, acceptable examples, safety/privacy warning, pending-upload state, validation errors, visibility summary, verifier, permitted work while pending, and rejection cure.

### Review

Show requirement/criticality, source, actor/time, freshness/classification, original versus derivative, prior/conflicting evidence, reviewer eligibility/independence, structured actions, reasons, and dependent-impact preview. Prohibit bulk acceptance where individual review is consequential.

### Failure/recovery

- interrupted upload remains pending, not accepted;
- duplicate detection preserves intentional distinct items;
- corrupt/malicious content is isolated;
- stale/conflicting commands reload current evidence;
- unavailable capture/provider uses only an approved alternate or holds;
- staff can report misdirected sensitive content without redistributing it.

## 19. AI, OCR, automated validation, and providers

- preserve input/version and tool/provider/model/rule version;
- label outputs derived/unverified;
- record limitations without converting confidence into acceptance;
- prohibit external training/retention of restricted evidence unless approved;
- minimize/redact approved external inputs;
- test extraction, manipulation limits, bias, accessibility, and drift;
- allow human correction with immutable lineage;
- reconcile outage, timeout, duplicate, or changed result;
- never let AI/OCR/provider independently approve identity, roadworthiness, legal operation, title, QC, public claims, price, exceptions, or frontline release.

## 20. Security baseline

Before live use, approve encryption, authentication/authorization, service identities/secrets, isolation, malware scanning/quarantine, upload/file-serving controls, tamper-evident audit, backup/restore/disaster recovery, unusual-access/export monitoring, vulnerability/patch/provider assurance, incident response, and periodic access/retention/provider/policy review.

Exact technical design follows approved architecture; this packet does not prescribe a vendor or claim certification.

## 21. Incident behavior

Potential incidents include lost originals/keys, unauthorized access/export, misdirected upload, malware, alteration, credential misuse, provider exposure, missing audit, broken isolation, failed retention/disposal, or unavailable critical evidence.

Response:

1. protect people and custody;
2. restrict/quarantine evidence and credentials without destruction;
3. preserve incident/audit facts and identify scope;
4. notify named security/privacy/records/operations authority;
5. suspend affected reliance, movement, publication, or availability as required;
6. assess notification/provider obligations with qualified authority;
7. recover from verified sources and revalidate dependencies;
8. document resolution, residual risk, correction, and control updates.

Staff must not investigate suspected fraud/privacy/security incidents beyond their role or spread sensitive detail through ordinary comments.

## 22. Decision recommendations

| Decision | Recommended outcome | Required authority | State |
| --- | --- | --- | --- |
| `ITF-APR-050` | Approve the 16 first-slice requirements using section 8; normalize all 184 requirements into one manifest only after stage-owner review | Policy + Inventory + evidence/security owners | OPEN |
| `ITF-APR-051` | Keep internal driving disabled until vehicle-specific roadworthiness and separate legal-operation sources, validity, invalidation, qualifications, and alternate tow route are approved | Operations + Shop/Safety + Insurance/legal authority | OPEN |
| `ITF-APR-052` | Keep internal driving disabled until minimal driver/insurance eligibility has approved source, scope, validity, revocation, privacy, and backup | Operations + Insurance/HR/privacy authority | OPEN |
| `ITF-APR-053` | Require attributable comparable pre/post condition evidence by source/method/risk, with safe-capture exceptions and damage ownership | Inventory + Receiving + transport/claims authority | OPEN |
| `ITF-APR-054` | Adopt item/field classification and least privilege; expose minimal eligibility/results instead of underlying sensitive detail where possible | Privacy/Security + role/policy owners | OPEN |
| `ITF-APR-055` | Approve class-specific retention with hold precedence, controlled export, verified disposal, and no blank-as-permanent duration | Records + Legal/Privacy + Security owner | OPEN |
| `ITF-APR-056` | Preserve originals and require attributable supplement/reject/correct/supersede/conflict/quarantine with dependency reevaluation | Evidence + Security/Privacy + decision authority | OPEN |

## 23. Evidence-policy capture sheet

| Field | Required entry |
| --- | --- |
| Requirement ID/version | `TBD` |
| Purpose/decision/gate | `TBD` |
| Subject/applicability | `TBD` |
| Criticality | `TBD` |
| Accepted types/content | `TBD` |
| Authoritative source by fact | `TBD` |
| Capture role/timing | `TBD` |
| Verification/acceptance role and separation | `TBD` |
| Freshness/expiry/invalidation | `TBD` |
| Integrity/provenance | `TBD` |
| Classification/permitted actions | `TBD` |
| Retention trigger/period | `TBD` |
| Hold/export/disposal | `TBD` |
| Correction/conflict/quarantine | `TBD` |
| Missing/provider-down alternate | `TBD` |
| Dependent invalidation response | `TBD` |
| Owner/publisher/review date | `TBD` |

## 24. Access grant capture sheet

| Field | Required entry |
| --- | --- |
| Role/person/service | `TBD` |
| Organization/location/case scope | `TBD` |
| Evidence classes/types | `TBD` |
| Purpose | `TBD` |
| View/verify/accept/download/print/export/share/correct/hold/dispose | `TBD` |
| Masking/redaction | `TBD` |
| Effective/expiry/review | `TBD` |
| Delegation/break-glass | `TBD` |
| Approval/policy basis | `TBD` |
| Monitoring/audit owner | `TBD` |

## 25. Retention schedule capture sheet

| Field | Required entry |
| --- | --- |
| Evidence/record class | `TBD` |
| Trigger | `TBD` |
| Minimum/maximum period | `TBD` |
| Legal/policy basis | `TBD` |
| Authoritative copy | `TBD` |
| Derivatives/caches/backups/providers | `TBD` |
| Hold placement/release authority | `TBD` |
| Export rules | `TBD` |
| Disposal method/verification | `TBD` |
| Owner/publisher/review date | `TBD` |

## 26. Required evidence stress tests

Workshop 2C does not pass until participants can determine requirement, criticality, source, verifier, access, retention, and safe behavior for each case:

1. Acquisition reference exists but provider authority/freshness is unknown.
2. A VIN photo conflicts with the acquisition record.
3. A driver is licensed, but insurance applicability is unconfirmed.
4. Accepted roadworthiness evidence predates new damage.
5. A carrier arrives before required condition media can be safely captured.
6. Departure photos exist only as provider thumbnails.
7. Arrival media contains a bystander's ID/payment information.
8. A receiver uploads media against the wrong vehicle.
9. Local upload success appears before durable storage acknowledgement.
10. OCR extracts an incorrect VIN/title assignment.
11. A title scan exists, but required-original custody is unknown.
12. A technician corrects a measurement after QC review begins.
13. Accepted QC evidence is linked to an uncalibrated instrument.
14. Approved content relies on a later-superseded vehicle fact.
15. A channel acknowledgement conflicts with the live listing.
16. A manager requests a bulk title/acquisition export.
17. An employee changes roles but retains old links/downloads.
18. Counsel places a hold before scheduled disposal.
19. A provider claims deletion without verification.
20. Malware is found in hard-gate evidence.
21. Staff discuss suspected alteration in ordinary task comments.
22. A customer appointment exists while critical evidence is expired.

Expected behavior: minimize exposure, preserve original/provenance, hold affected reliance, route eligible review/incident authority, protect hard gates, and never manufacture acceptance from availability or urgency.

## 27. Workshop agenda

### Before the meeting

Bring current first-slice evidence, roadworthiness/driver/insurance/condition procedures, title/QC/public-content practices, storage/access lists, providers, retention/hold/export/disposal rules, incident contacts, and protected examples of good/incomplete/stale/conflicting/sensitive/suspicious evidence.

### In the meeting

1. Name evidence, privacy/security, records, and incident owners.
2. Approve contract, criticality, states, and separation.
3. Review all 16 first-slice requirements.
4. Decide roadworthiness/legal-operation and driver/insurance sources/validity.
5. Decide condition-evidence applicability and safe capture.
6. Approve classification and role/action visibility.
7. Approve retention, hold, export, and disposal.
8. Approve correction, conflict, quarantine, and propagation.
9. Review AI/OCR/provider and degraded-mode boundaries.
10. Run stress tests and assign gaps.
11. Record `ITF-APR-050`-`056` dispositions.

## 28. Exit criteria

Workshop 2C is complete only when:

- `ITF-APR-050`-`056` have complete dispositions and metadata;
- first-slice requirements have approved criticality, source, content, role, freshness, classification, retention, correction, and failure behavior;
- roadworthiness/driver/insurance rules pass or internal driving remains unavailable;
- condition evidence is safe, comparable, and risk/source/method specific;
- privacy/security/records owners and incident/access processes are named;
- restricted evidence cannot leak through search, tasks, notifications, URLs, analytics, exports, or broad vehicle access;
- originals/history survive correction, rejection, supersession, conflict, quarantine, and disposal decisions;
- legal holds override disposal and controlled export/disposal are auditable;
- material changes propagate to every dependent decision/release/publication;
- stress tests pass or have safe non-execution behavior with owners and dates.

## 29. Next Workshop 2 packet

Workshop 2 continues with the **Timing, Escalation, Notification, and Coverage Matrix**, covering `ITF-APR-040`-`045`: calendars, service targets, clock start/pause/stop, escalation, acknowledgement/response, delivery evidence, quiet hours, after-hours containment, and workload/coverage response.

Evidence approval does not make the first implementation slice ready for code. Applicable role, authority/financial, timing, source/integration, pilot, and stage-specific decisions must also be approved or safely deferred, and activation remains separately gated.
