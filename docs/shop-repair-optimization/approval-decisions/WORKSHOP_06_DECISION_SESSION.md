# Workshop 6 Decision Session — Assistance, Evidence, Privacy, and Security

**Session:** `SRO-AE0-2026-01`  
**Status:** `PASSED FOR POLICY — 10 CLOSED`  
**Scope:** `SRO-APR-050`–`059`  
**Predecessor:** Workshops 1–5 passed for policy  
**Authorization boundary:** Policy decisions only; no design, code, provider use, recording, transcription, shadow, pilot, activation, customer communication, consequential AI decision, or application adaptation

## `SRO-APR-050` — Permitted voice and text assistance

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Assistance is limited to structuring staff-supplied text into an editable draft, identifying missing required fields, asking clarification questions, retrieving approved reference candidates and drafting explanations from already confirmed facts. It may not diagnose, declare cause, select/approve work, establish safety or QC status, authorize scope, price, discount, purchase, assign, promise, contact a customer, evaluate staff or release a vehicle. Only trained authorized staff may use it within their recorded lane and purpose. Customer secrets, payment/authentication data, unrelated personal data and unapproved sensitive recordings are prohibited. Because no provider or technical boundary is approved, voice processing and AI assistance remain off until later authorization.

**Required fields:** Approved users, technical provider/boundary, exact data classes and training evidence remain required before use.  
**Safe default:** AI/voice assistance off; existing manual records only.  
**Authority:** Eli as Shop/Privacy/Security/IT owner; Brock within Advisor/Inventory scope after authorization.  
**Dependencies:** `002`, `006`, `008`, `021`, `035`, `040`–`049`.  
**Affected algorithms:** `SRO-ALG-040`–`044`.  
**Operational consequence:** Assistance may reduce typing only after authorization and never becomes operational authority.

## `SRO-APR-051` — Recording and transcription consent

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** No person is recorded or transcribed unless a qualified, current policy defines the permitted purpose, jurisdiction, notice, consent or other valid basis, withdrawal/objection handling, participants, approved device/provider, storage, access, retention/deletion, incident response and alternate nonrecording path. Consent or notice evidence must precede capture and remain linked to the exact session. Withdrawal stops future capture and triggers the approved handling route; it does not silently rewrite required audit facts. Staff-only typed entry remains available. Because no qualified policy or provider is recorded, recording and transcription are prohibited.

**Required fields:** Qualified consent/legal basis, notice language, jurisdiction, provider/device, access, retention, deletion and withdrawal procedure.  
**Safe default:** No recording or transcription; staff type into the existing authorized record.  
**Authority:** Eli as Privacy/Security owner plus qualified privacy/compliance review where required.  
**Dependencies:** `006`, `050`, `058`, `059`.  
**Affected algorithms:** `SRO-ALG-040`, `043`; sensitive-recording scenarios.  
**Operational consequence:** Convenience cannot create unapproved surveillance or an unsupported consent claim.

## `SRO-APR-052` — Structured finding schema and evidence separation

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** A structured finding draft separates `CUSTOMER_OR_REPORTED_CONCERN`, `TECHNICIAN_OBSERVATION`, `MEASUREMENT_WITH_UNIT_AND_METHOD`, `TEST_PERFORMED_AND_RESULT`, `POSSIBLE_CAUSE_WITH_UNCERTAINTY`, `CONFIRMED_DIAGNOSIS_BY_AUTHORIZED_HUMAN`, `RECOMMENDED_OPERATION`, `PART_CANDIDATE`, `SAFETY_RESTRICTION`, `EVIDENCE_REFERENCE` and `OPEN_CLARIFICATION`. Observation is not diagnosis; a candidate is not authorization. Each factual field records author/source, time, vehicle/RO/scope version and corrections. Missing unit, side/location, identity, method, uncertainty or evidence creates a prompt and cannot be silently supplied. Existing freeform/manual recording remains authoritative until the schema and source mappings are implemented and authorized.

**Required fields:** Exact template applicability and source mappings remain required before application use.  
**Safe default:** Existing freeform/manual record; draft has no evidence authority.  
**Authority:** Eli as Shop/Evidence owner; performing technician confirms technical facts; qualified QC review remains separate.  
**Dependencies:** `010`, `021`, `033`, `035`, `036`, `050`.  
**Affected algorithms:** `SRO-ALG-040`–`044`.  
**Operational consequence:** A fluent summary cannot blur observation, uncertainty, diagnosis, recommendation and approval.

## `SRO-APR-053` — Human confirmation, clarification, and correction

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Every assisted output remains `DRAFT_UNCONFIRMED` until the authorized originating staff member reviews the source alongside the draft and explicitly confirms, edits or rejects it. Ambiguous vehicle identity, side/location, unit, negation, quantity, procedure, part, severity, authorization or safety meaning requires clarification; the system must not choose silently. Confirmation records source/output versions, confirmer, edits, rejected suggestions and time. Correction appends attributable history and reevaluates dependent drafts; it never erases original evidence. A draft cannot advance workflow, become a finding, generate a price, support QC or be sent externally merely because time elapsed or no one objected.

**Required fields:** Exact user-interface confirmation mechanism remains a future design decision; policy is exact now.  
**Safe default:** Draft cannot become a finding or action.  
**Authority:** Authorized technician/advisor confirms within role; Eli owns policy; QC remains independent.  
**Dependencies:** `002`, `008`, `035`, `045`, `050`, `052`.  
**Affected algorithms:** `SRO-ALG-040`–`044`.  
**Operational consequence:** Silence and automation never substitute for human confirmation.

## `SRO-APR-054` — Procedure and catalog source authority

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** A procedure, catalog, labor or parts reference may be retrieved only from an approved source registry recording publisher/authority, covered content, access rights, version/revision, effective date, vehicle/application scope, freshness, supersession, restrictions and conflict route. Retrieved content is reference-only until an authorized qualified human validates applicability to the exact vehicle/work. Conflicting, unavailable, expired, out-of-scope or unlicensed content is unavailable and cannot be summarized as authority. No approved registry or provider integration is recorded, so AI procedure/catalog authority and automated retrieval remain unavailable; staff use existing authorized sources manually.

**Required fields:** Approved sources, licenses/access, authoritative versions, freshness, conflict rules and integration mappings.  
**Safe default:** No AI procedure authority or automated retrieval.  
**Authority:** Eli as Shop/Data/IT owner plus qualified procedure/catalog owner where required.  
**Dependencies:** `006`, `021`, `031`, `035`, `050`–`053`; later `070`–`072`.  
**Affected algorithms:** `SRO-ALG-041`, `044`; wrong-reference/conflict scenarios.  
**Operational consequence:** Search convenience cannot convert an unverified document into a repair instruction.

## `SRO-APR-055` — Estimate and customer-message drafts

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** An assisted estimate or message is a labeled, versioned `DRAFT` built only from confirmed current facts and approved policy/source versions. It identifies unsupported fields, assumptions, omitted sensitive data and required reviewers. Eli completes required financial/Shop review; Brock independently reviews factual accuracy, audience, authorization state and plain-language meaning before presenting through the existing authorized route. The system cannot send, present, publish, accept authorization, create a promise or represent a draft as approved. Because no technical provider, presentation channel or message-consent configuration is approved, assisted drafting remains unavailable; existing human-prepared communications continue.

**Required fields:** Approved provider, users, channels, communication/consent rules and source mappings remain required.  
**Safe default:** Draft not created, presented or sent by the application.  
**Authority:** Eli financial/Shop review; Brock Advisor/Customer review and existing manual communication route.  
**Dependencies:** `003`, `006`, `018`, `024`, `026`, `045`, `050`–`054`.  
**Affected algorithms:** `SRO-ALG-042`, `043`; estimate/message scenarios.  
**Operational consequence:** Drafting assistance cannot speak for the dealership without attributable human review.

## `SRO-APR-056` — Unsupported or harmful output response

**Recommended:** `APPROVE`

**Exact proposed policy:** Staff must reject and report output that is unsupported, contradictory, unsafe, unauthorized, privacy-invasive, discriminatory, financially anomalous or outside approved purpose. The affected output is quarantined from workflow use; source, output, context and report are preserved with access controls. Staff return to the safe manual process, apply any safety/privacy/financial restriction and notify Eli through the approved incident route. Dependent drafts and recommendations are reevaluated. No output may be corrected by silently fabricating evidence, and no model confidence overrides a failed authoritative gate.

**Required fields:** None for the stop rule; exact technical incident channel is configured later.  
**Safe default:** Discard/quarantine output and use the safe manual path.  
**Authority:** Any staff member may stop/report; Eli owns response; independent/qualified review retained.  
**Dependencies:** `001`, `002`, `009`, `050`–`055`.  
**Affected algorithms:** All assisted algorithms.  
**Operational consequence:** Every staff member has stop authority when assistance becomes unsafe or unsupported.

## `SRO-APR-057` — AI evidence and lineage

**Recommended:** `APPROVE`

**Exact proposed policy:** Every assisted interaction preserves attributable input/source references, prompt/instruction and policy version, provider/model/version when applicable, output, confidence/limitations, retrieval references, edits, confirmer/rejecter, downstream use, incident/correction links and outcome. Access, retention and redaction follow the approved data class. Generated text is never authoritative evidence of the underlying fact; it is evidence only of what the system produced. Missing lineage makes the output unusable for operational, financial, QC, customer or policy decisions. Corrections append lineage and do not erase prior versions.

**Required fields:** None for the lineage principle; provider-specific fields, retention and access remain required before use.  
**Safe default:** Output without complete lineage is unavailable and cannot be evidence authority.  
**Authority:** Eli as Privacy/Data/Evidence owner; qualified reviewers retain their domains.  
**Dependencies:** `002`, `035`, `045`, `050`–`056`.  
**Affected algorithms:** `SRO-ALG-040`–`044`; audit and incident controls.  
**Operational consequence:** Reviewers can distinguish source facts, generated output, human edits and final decisions.

## `SRO-APR-058` — Provider, security, retention, and exit controls

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** External or hosted processing is prohibited until Eli records an approved provider/service, contract and security/privacy review, exact data classes/purposes, locations/subprocessors where required, access roles, authentication, encryption, logging, training/data-use prohibition or terms, retention/deletion, legal/incident handling, availability, export/exit and verified deletion. Least privilege and approved organization accounts are mandatory; consumer/personal accounts and unapproved copy/paste are prohibited. Provider change or material terms/model/data-flow change requires review before use. No provider is approved by this decision, so no SRO data may be sent to an external AI provider.

**Required fields:** Actual provider/service, contract/security evidence, data flow, access, retention, deletion, incident and exit controls.  
**Safe default:** No external AI-provider data and no assisted processing.  
**Authority:** Eli as Privacy/Security/IT/Data authority plus qualified security/privacy review where required.  
**Dependencies:** `006`, `009`, `050`–`057`; later `070`–`072`.  
**Affected algorithms:** All assisted algorithms and integrations.  
**Operational consequence:** Policy approval does not approve a vendor or disclose dealership/customer data.

## `SRO-APR-059` — Assistance outage and security/privacy incident response

**Recommended:** `APPROVE_WITH_CHANGE`

**Exact proposed policy:** Suspected unauthorized access/disclosure, provider compromise, harmful systematic output, corrupted lineage, unavailable safe fallback or material provider/model/data-flow change immediately disables affected assistance. Eli is primary Privacy/Security/Data responder and pause/rollback operator; Brock is staffed-hours backup within competence and conflict limits. Staff preserve evidence, contain access, apply safety/privacy restrictions and continue only through the approved manual workflow. Restoration requires reconciliation of pending drafts/events, correction or quarantine of conflicts, validation of provider/source/configuration and review by an uninvolved competent person; Eli cannot independently resume an Eli-originated incident action. No after-hours response is approved.

**Required fields:** Actual provider contacts, security incident channel, notification/legal route and qualified independent resume reviewer remain required before provider use.  
**Safe default:** Assistance off; manual workflow; no automatic resume.  
**Authority:** Eli primary; Brock staffed-hours backup; qualified independent reviewer where required.  
**Dependencies:** `009`, `019`, `050`–`058`.  
**Affected algorithms:** All assisted algorithms, providers and integrations.  
**Operational consequence:** An outage or incident removes assistance without blocking the safe manual shop workflow.

## Workshop 6 acceptance response

Accepted 2026-07-16 through the controlled Codex session; exact time not captured:

| Decision | Accepted disposition | Journal record |
| --- | --- | --- |
| `050` | APPROVE_WITH_CHANGE | `SRO-AE6-APR-050` |
| `051` | APPROVE_WITH_CHANGE | `SRO-AE6-APR-051` |
| `052` | APPROVE_WITH_CHANGE | `SRO-AE6-APR-052` |
| `053` | APPROVE_WITH_CHANGE | `SRO-AE6-APR-053` |
| `054` | APPROVE_WITH_CHANGE | `SRO-AE6-APR-054` |
| `055` | APPROVE_WITH_CHANGE | `SRO-AE6-APR-055` |
| `056` | APPROVE | `SRO-AE6-APR-056` |
| `057` | APPROVE | `SRO-AE6-APR-057` |
| `058` | APPROVE_WITH_CHANGE | `SRO-AE6-APR-058` |
| `059` | APPROVE_WITH_CHANGE | `SRO-AE6-APR-059` |

```text
050: APPROVE_WITH_CHANGE — accept proposed baseline
051: APPROVE_WITH_CHANGE — accept proposed no-recording baseline
052: APPROVE_WITH_CHANGE — accept proposed baseline
053: APPROVE_WITH_CHANGE — accept proposed baseline
054: APPROVE_WITH_CHANGE — accept proposed baseline
055: APPROVE_WITH_CHANGE — accept proposed baseline
056: APPROVE
057: APPROVE
058: APPROVE_WITH_CHANGE — accept proposed no-provider baseline
059: APPROVE_WITH_CHANGE — accept proposed baseline

I accept the exact Workshop 6 policy text for every decision marked APPROVE or APPROVE_WITH_CHANGE: YES / NO
```

You may change any line to `DEFER_SAFE` or `REJECT`. A changed policy must include exact replacement language. No aggregate approval will be recorded unless you explicitly accept the exact text above.

## Current result

`2 APPROVED / 8 APPROVED_WITH_CHANGE / 10 CLOSED / 0 OPEN / PASSED FOR POLICY`.

This pass does not authorize design, code, providers, recording, transcription, shadow use, pilot, activation, customer communication, consequential AI action, or application adaptation.
