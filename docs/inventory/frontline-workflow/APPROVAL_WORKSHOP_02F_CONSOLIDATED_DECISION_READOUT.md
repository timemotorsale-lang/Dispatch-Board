# Approval Workshop 02F - Consolidated Decision Readout, Gap Register, and Slice Readiness Review

**Workshop status:** Decision-ready closeout package; not conducted  
**Decision state:** 32 of 32 Workshop 2 decisions remain `OPEN`  
**Covers:** `ITF-APR-020`-`025`, `030`-`036`, `040`-`045`, `050`-`056`, `060`-`065`  
**Prepared:** 2026-07-16  
**Current gate:** `GO FOR WORKSHOP 2 DECISION READOUT`; `NO-GO FOR CODE`; `NO-GO FOR WORKSHOP 3 APPROVAL`  

## 1. Name and purpose of this step

This step is **Workshop 2F — Consolidated Decision Readout, Gap Register, and Slice Readiness Review**.

It closes the Workshop 2 planning sequence by converting five recommendation packets into one controlled decision meeting. It does not assume that preparation equals approval. Its purpose is to:

- read back every proposed role, authority, financial, timing, evidence, privacy/security, source, and integration control;
- record an authorized disposition for all 32 Workshop 2 decisions;
- identify every unresolved person, number, source, qualification, policy, and integration dependency;
- assign safe containment, an accountable owner, evidence, and a target to each gap;
- test Workshop 2 decisions against all nine Inventory-to-Frontline slices;
- determine whether Workshop 3 may begin as an approval workshop and whether the first slice may later enter technical design.

## 2. Controlled artifact set

| Artifact | Purpose |
| --- | --- |
| This document | Consolidated decision agenda, decision rules, required participants, readout sequence, and sign-off |
| [`WORKSHOP_02_GAP_REGISTER.md`](WORKSHOP_02_GAP_REGISTER.md) | Owned register for unresolved roles, values, policies, sources, evidence, coverage, and integration controls |
| [`WORKSHOP_02_SLICE_READINESS_MATRIX.md`](WORKSHOP_02_SLICE_READINESS_MATRIX.md) | Readiness assessment for all nine lifecycle slices and Workshop 3 entry |
| [`APPROVAL_REGISTER.md`](APPROVAL_REGISTER.md) | Authoritative approval states and complete approval metadata |

These artifacts summarize and route decisions; the detailed Workshop 2A–2E packets remain the normative recommendation source.

## 3. Governing decision rules

For each decision, an eligible authority must choose exactly one:

- `APPROVE` — accept the exact recommendation for the stated effective scope/version;
- `APPROVE_WITH_CHANGE` — record exact replacement language, affected requirements/rules/slices, and consistency review;
- `DEFER_SAFE` — keep the affected command/action unavailable and record containment, owner, evidence, and target;
- `REJECT` — return the decision for redesign with rationale, owner, and target.

Rules:

1. Silence, attendance, discussion, chat agreement, or prior operating habit is not approval.
2. Approval requires approver identity, role/authority, date/time, effective scope, version, rationale, conditions, evidence, affected IDs, and review/expiry where applicable.
3. A changed recommendation must be checked against every dependent packet, catalog, acceptance case, gap, and slice.
4. A safe deferral removes or disables the affected live action; it cannot seed a permissive default.
5. Critical identity, safety, custody, privacy, title/legal, QC, public-price, and release controls cannot be deferred into an implied pass.
6. Approval to document or design is not approval to implement, pilot, activate, publish, spend, move, or release.
7. No numerical `TBD`, blank source, unnamed owner, or missing qualification may be interpreted as unlimited, optional, permanent, or approved.

## 4. Required participants and decision authority

| Participant/authority | Required decisions | Attendance expectation |
| --- | --- | --- |
| General/Operations Manager | Policy, role combinations, upper authority, emergency, escalation, pilot boundary | Required for final readout/sign-off |
| Inventory Manager / proposed service owner | Case/stage ownership, transport, targets, source operations | Required |
| Office Manager / Controller delegate | Financial classification/limits, documents, accounting boundary, records | Required for affected decisions |
| Shop/Safety authority | Roadworthiness, driver/method, QC independence, safety containment | Required for safety-related decisions |
| Privacy/Security/Data owner | Classification, access, incident, source/freshness, integration security | Must be named; required for affected decisions |
| Records/Legal/Compliance authority | Retention/hold/disposal and applicable legal/title boundaries | Required or affected decisions safely deferred |
| Integration/provider owners | Acquisition, carrier, DMS, accounting, website mappings and recovery | Required per actual source; otherwise integration reliance deferred |
| Representative executors | Staff usability, evidence capture, timing, coverage, fallback reality | Required for validation; not policy approval unless separately authorized |
| Workflow owner and administrator/publisher candidates | Version consistency, change impact, publication separation | Required; actual roles still require approval |
| Pilot owner | Training, monitoring, incident, pause/rollback, evidence | Required before pilot approval, may remain safely deferred here |

If required qualified authority is absent, the affected decision is `DEFER_SAFE`; the meeting cannot infer approval.

## 5. Consolidated decision inventory

### 5.1 Roles and authority — Workshop 2A

| Decision | Required readout | Primary authority | State |
| --- | --- | --- | --- |
| `ITF-APR-020` | Name policy, service, workflow, and pilot owners with exact scope | GM/Operations | OPEN |
| `ITF-APR-021` | Map named staff/roles to capabilities, location, vehicle, qualification, schedule, and backup | GM/Operations + role owners | OPEN |
| `ITF-APR-022` | Approve transport planning, execution, monitoring, receiving, and accepted handoffs | Inventory + Operations/Safety | OPEN |
| `ITF-APR-023` | Approve material identity-conflict and cancellation/acquisition-reversal authority | GM/Operations + Inventory/Office | OPEN |
| `ITF-APR-024` | Approve separation and independent-review rules | GM/Operations + qualified authorities | OPEN |
| `ITF-APR-025` | Name workflow administrator and separate consequential-policy publisher | GM/Operations + Security/Data | OPEN |

Detailed source: [`APPROVAL_WORKSHOP_02_ENTERPRISE_ROLE_RESPONSIBILITY_CATALOG.md`](APPROVAL_WORKSHOP_02_ENTERPRISE_ROLE_RESPONSIBILITY_CATALOG.md).

### 5.2 Authority, financial control, and economics — Workshop 2B

| Decision | Required readout | Primary authority | State |
| --- | --- | --- | --- |
| `ITF-APR-030` | Approve currency and cost classifications | GM/Operations + Office/Controller | OPEN |
| `ITF-APR-031` | Approve exact per-command, vehicle, plan/order, period, and upper limits | GM/Operations + Owner/Controller boundary | OPEN |
| `ITF-APR-032` | Approve quote count/type, eligible sources, comparison, expiry, and exception | Financial + functional owners | OPEN |
| `ITF-APR-033` | Approve absolute/percentage reapproval and material-change triggers | Financial + functional owners | OPEN |
| `ITF-APR-034` | Approve correlated exposure and anti-splitting dimensions | GM/Operations + Office/Controller | OPEN |
| `ITF-APR-035` | Approve narrow emergency custody/safety expenditure categories, limits, and review | GM/Operations + Safety/Insurance + Controller | OPEN |
| `ITF-APR-036` | Approve acquisition-economics/disposition-review inputs and thresholds | GM/Operations + Inventory + Controller | OPEN |

Detailed source: [`APPROVAL_WORKSHOP_02B_AUTHORITY_FINANCIAL_CONTROL_MATRIX.md`](APPROVAL_WORKSHOP_02B_AUTHORITY_FINANCIAL_CONTROL_MATRIX.md).

### 5.3 Timing, escalation, notification, and coverage — Workshop 2D

| Decision | Required readout | Primary authority | State |
| --- | --- | --- | --- |
| `ITF-APR-040` | Approve acquisition-validation segments and exact warning/due/overdue targets | Inventory + Operations | OPEN |
| `ITF-APR-041` | Approve transport plan/request/quote/approval/confirmation targets | Inventory/Transport + Finance/Operations | OPEN |
| `ITF-APR-042` | Approve pickup/arrival warning, variance, stale/unknown, and after-hours rules | Inventory/Receiving + Operations | OPEN |
| `ITF-APR-043` | Approve pause reasons, authority, maximum review, expiry, and continuing age views | Operations + stage owners | OPEN |
| `ITF-APR-044` | Approve escalation levels, eligible recipients, backup/on-call, and acknowledgement/response/resolution targets | GM/Operations + incident/role owners | OPEN |
| `ITF-APR-045` | Approve channels, urgency, quiet behavior, content, delivery evidence, retry, and fallback | Operations + Security/Privacy + communications | OPEN |

Detailed source: [`APPROVAL_WORKSHOP_02D_TIMING_ESCALATION_NOTIFICATION_COVERAGE_MATRIX.md`](APPROVAL_WORKSHOP_02D_TIMING_ESCALATION_NOTIFICATION_COVERAGE_MATRIX.md).

### 5.4 Evidence, privacy, security, and records — Workshop 2C

| Decision | Required readout | Primary authority | State |
| --- | --- | --- | --- |
| `ITF-APR-050` | Approve all 16 first-slice evidence requirements, applicability, and criticality | Policy + Inventory + Evidence/Security | OPEN |
| `ITF-APR-051` | Approve roadworthiness/legal-operation sources, validity, invalidation, and alternate route | Operations + Shop/Safety + Insurance/legal | OPEN |
| `ITF-APR-052` | Approve driver/insurance eligibility sources, validity, privacy, and revocation | Operations + Insurance/HR/Privacy | OPEN |
| `ITF-APR-053` | Approve pre/post condition evidence by source, method, risk, and safe capture | Inventory + Receiving + Transport/Claims | OPEN |
| `ITF-APR-054` | Approve evidence/data classes and role/action visibility | Privacy/Security + policy/role owners | OPEN |
| `ITF-APR-055` | Approve retention, legal hold, export, disposal, and records ownership | Records + Legal/Privacy + Security | OPEN |
| `ITF-APR-056` | Approve supplement/reject/correct/supersede/conflict/quarantine authority and propagation | Evidence + Security/Privacy + decision authority | OPEN |

Detailed source: [`APPROVAL_WORKSHOP_02C_EVIDENCE_PRIVACY_SECURITY_MATRIX.md`](APPROVAL_WORKSHOP_02C_EVIDENCE_PRIVACY_SECURITY_MATRIX.md).

### 5.5 Sources, integrations, freshness, and reconciliation — Workshop 2E

| Decision | Required readout | Primary authority | State |
| --- | --- | --- | --- |
| `ITF-APR-060` | Approve acquisition source authority field by field | Inventory + Office/Controller + source owner | OPEN |
| `ITF-APR-061` | Approve canonical identity, VIN verification, external mapping, duplicate/conflict control | Inventory + Identity/Data owner | OPEN |
| `ITF-APR-062` | Approve reported/observed/planned/in-transit/arrival/custody/placement sources | Inventory + Receiving/Custody + Data | OPEN |
| `ITF-APR-063` | Approve provider status mappings, freshness, idempotency, timeout, monitoring, and reconciliation | Inventory/Transport + Provider/Integration owner | OPEN |
| `ITF-APR-064` | Approve DMS/accounting/website field boundaries and desired-versus-observed behavior | GM/Operations + Controller + Merchandising + integrations | OPEN |
| `ITF-APR-065` | Approve freshness, conflict, degraded, fallback, and return-to-normal reconciliation | Data/Integration + Security + functional owners | OPEN |

Detailed source: [`APPROVAL_WORKSHOP_02E_SOURCE_AUTHORITY_INTEGRATION_RECONCILIATION_MATRIX.md`](APPROVAL_WORKSHOP_02E_SOURCE_AUTHORITY_INTEGRATION_RECONCILIATION_MATRIX.md).

## 6. Readout sequence

The closeout should run in four controlled passes rather than attempting 32 unrelated approvals in one conversation.

### Pass 1 — People, scope, and non-waivable boundaries

Decide `020`-`025` first. Confirm the real people, primary/backup coverage, qualifications, separation, administrator, and publisher. Decisions in later passes cannot be approved without knowing who holds the required authority.

### Pass 2 — Money, time, and coverage

Decide `030`-`045`. Enter exact amounts, currencies, quote/reapproval/economics thresholds, calendars, clock targets, pause intervals, escalation recipients, on-call coverage, channels, and delivery behavior.

### Pass 3 — Evidence, privacy, security, and records

Decide `050`-`056`. Review the 16 first-slice requirements row by row; approve sources, validity, criticality, classification, role visibility, retention, hold, export/disposal, correction, and quarantine.

### Pass 4 — Sources, integrations, and reconciliation

Decide `060`-`065`. Inventory actual systems and manual sources; approve field authority, mappings, freshness, conflicts, degraded operation, fallback, and reconciliation. Unknown integrations remain `PLANNED` and unavailable for hard gates.

### Final consistency pass

Review every `APPROVE_WITH_CHANGE` and `DEFER_SAFE` against:

- the other Workshop 2 decisions;
- Workshop 1 scope/pilot assumptions;
- the nine lifecycle catalogs and 220 acceptance cases;
- the Gap Register;
- the Slice Readiness Matrix;
- non-waivable invariants and implementation boundaries.

## 7. Required pre-read and evidence

Before the decision meeting, participants must bring:

- current staff roster, schedules, job duties, qualifications, delegated authority, and backup/on-call coverage;
- exact financial/signature limits, quote practices, cost examples, and ownership boundary;
- approved/draft operating calendars, holidays, closures, and receiving coverage;
- first-slice forms, photos, documents, measurements, approvals, and retention/hold/export practices;
- roadworthiness, driver, insurance, condition capture, incident, and claims procedures;
- actual acquisition, DMS, accounting, carrier, website/channel, title, VIN/history, and other source/provider inventory;
- sample records/statuses/payloads and known conflicts, duplicates, stale data, outages, and manual fallback;
- security/privacy/records/provider owners and applicable qualified legal/compliance participation;
- Workshop 1 decisions or explicit acknowledgement that unresolved Workshop 1 dependencies constrain Workshop 2 effectiveness.

Missing pre-read evidence results in `DEFER_SAFE`, not assumption.

## 8. Gap-management rules

Every unresolved item must be entered into the Gap Register with:

- stable gap ID and affected decision/slice;
- clear missing fact/control rather than a vague topic;
- severity and non-waivable status;
- safe containment and prohibited actions;
- one accountable owner and supporting roles;
- required closure evidence and acceptance authority;
- target/review date and escalation;
- state and closure record.

Valid gap states:

- `OPEN_UNCONTAINED` — unacceptable for any affected pilot/design progression;
- `OPEN_CONTAINED` — affected action safely unavailable/restricted;
- `IN_REMEDIATION` — owner is producing required evidence/control;
- `READY_FOR_REVIEW` — closure evidence awaits eligible acceptance;
- `CLOSED_ACCEPTED` — eligible authority accepted closure for exact scope;
- `WONT_DO_SAFE` — action permanently excluded with approved containment;
- `REOPENED` — later facts invalidate closure.

## 9. Slice-readiness review rules

Each of the nine slices is evaluated across:

1. approved outcome/scope and predecessor/handoff;
2. named accountable/responsible/approver/verifier roles and backups;
3. exact capability, authority, financial, exception, and separation rules;
4. evidence criticality, sources, freshness, access, retention, and correction;
5. clocks, pauses, escalation, notification, and coverage;
6. canonical identity, field authority, provider mapping, degraded/fallback, and reconciliation;
7. slice-specific policy decisions;
8. acceptance scenarios and evidence owners;
9. pilot cohort, training, monitoring, pause/rollback, and activation authority.

Possible results:

- `NOT_READY` — missing/uncontained critical dependencies;
- `DOCUMENTATION_READY_FOR_APPROVAL` — catalog/readout exists but decisions remain open;
- `POLICY_READY_FOR_TECHNICAL_DESIGN` — all applicable decisions approved/safely deferred and design inputs exact;
- `TECHNICALLY_VERIFIED_FOR_PILOT` — implementation and verification complete, rollout still off;
- `PILOT_AUTHORIZED` — named authority activates exact cohort/version;
- `ACTIVE_BOUNDED` — approved production scope with monitoring/rollback;
- `PAUSED_OR_ROLLED_BACK` — controlled safe state.

No slice advances because a later slice is well documented. Each retains an independent gate.

## 10. Cross-packet consistency checks

The readout must explicitly confirm:

- a named role has only capabilities within its approved authority, qualification, location, schedule, and separation;
- financial limits use the same currency, gross exposure, correlation, and reapproval definitions as evidence and source mappings;
- clocks begin from authoritative source events and do not pause for unapproved reasons;
- notification recipients are eligible, available, and permitted to see the included data;
- evidence sources match the field-authority matrix and use the approved freshness/retention rules;
- manual fallback preserves identity, authority, evidence, timing, privacy, idempotency, and reconciliation;
- provider acknowledgement never becomes transport completion, accounting posting, channel-live truth, or frontline readiness without mapped verification;
- critical conflicts cannot use last-write-wins, generic override, risk averaging, or commercial urgency;
- every deferred action is absent/restricted in affected slices and acceptance scenarios;
- every changed source/evidence/approval invalidates or re-evaluates dependent plans, handoffs, listings, prices, and releases.

## 11. Readout stress tests

Before sign-off, the consolidated model must answer at least these cross-packet cases:

1. Brock is absent, transport is urgent, and cost exceeds the available approver's limit.
2. A carrier arrives after hours with no approved receiver or secure containment location.
3. Physical VIN conflicts with acquisition source while a provider request is pending.
4. Internal driving is proposed without approved roadworthiness/driver/insurance sources.
5. Required pre-transport condition media cannot be captured safely.
6. A provider timeout leaves transport commitment uncertain and a retry could duplicate it.
7. A manual fallback is used during outage, then automated events replay out of order.
8. A title scan exists while original custody and retention/visibility rules are unresolved.
9. A technician finishes safety work with no eligible independent QC coverage.
10. Website acknowledgement exists while live price/content differs and frontline status is not authorized.
11. A customer appointment creates pressure to bypass expired evidence and final release review.
12. A source correction after frontline release invalidates a critical fact.

For every case: name one owner, exact permitted/prohibited actions, authority, evidence, clock, notification, source status, containment, reconciliation, and escalation.

## 12. Decision capture record

Use one record per decision:

| Field | Required entry |
| --- | --- |
| Decision ID and packet version | `TBD` |
| Disposition | `APPROVE`, `APPROVE_WITH_CHANGE`, `DEFER_SAFE`, or `REJECT` |
| Exact approved/replacement text | `TBD` |
| Effective organization/location/cohort | `TBD` |
| Named approver and authority basis | `TBD` |
| Date/time/effective/review/expiry | `TBD` |
| Rationale and conditions | `TBD` |
| Evidence/source references | `TBD` |
| Affected decisions/rules/requirements/slices | `TBD` |
| Safe containment if not approved | `TBD` |
| Gap/owner/target/escalation | `TBD` |
| Independent publisher/sign-off where required | `TBD` |

## 13. Meeting agenda

Recommended controlled format:

1. Confirm authority, scope, decision rules, and no-code boundary — 10 minutes.
2. Pass 1: roles/authority decisions `020`-`025` — 45 minutes.
3. Pass 2A: financial/economics decisions `030`-`036` — 45 minutes.
4. Pass 2B: timing/escalation decisions `040`-`045` — 45 minutes.
5. Pass 3: evidence/privacy/security decisions `050`-`056` — 60 minutes.
6. Pass 4: source/integration decisions `060`-`065` — 60 minutes.
7. Review Gap Register severity, containment, owners, and targets — 30 minutes.
8. Review all nine slices and Workshop 3 entry — 30 minutes.
9. Run cross-packet stress tests — 45 minutes.
10. Read back decisions, changes, deferrals, contradictions, and sign-off — 20 minutes.

The meeting may be split into sessions, but decisions remain versioned together and require a final consolidated consistency readout.

## 14. Sign-off requirements

| Sign-off | Confirms | State |
| --- | --- | --- |
| GM/Operations | Policy, scope, critical boundaries, upper authority, escalation, safe deferrals | OPEN |
| Inventory/Service owner | End-to-end ownership, handoffs, first-slice operations, slice impacts | OPEN |
| Office/Controller | Currency, limits, costs, records, accounting boundary | OPEN |
| Shop/Safety/Insurance authority | Movement, roadworthiness, driver, emergency, QC independence implications | OPEN |
| Privacy/Security/Data/Records | Access, retention, incidents, sources, integration/degraded controls | OPEN |
| Integration/source owners | Actual systems, mappings, freshness, fallback, reconciliation | OPEN |
| Workflow owner + independent publisher | Decision-to-policy version integrity and publish separation | OPEN |
| Pilot owner | Training, monitoring, incident, pause/rollback dependencies | OPEN |

Conditional sign-off must reference exact `DEFER_SAFE` gaps and excluded actions. A signature cannot turn blank values into approved configuration.

## 15. Exit criteria

Workshop 2F is complete only when:

- all 32 decisions have an authorized disposition and complete metadata;
- every `APPROVE_WITH_CHANGE` passes cross-packet/catalog/slice consistency review;
- every unresolved item exists in the Gap Register with safe containment, owner, evidence, and target;
- no `OPEN_UNCONTAINED` critical gap remains for the scope proposed to advance;
- all real roles, amounts, calendars, evidence rules, validity periods, sources, mappings, and fallbacks are exact;
- separation, least privilege, retention, idempotency, degraded operation, and reconciliation are approved;
- all nine slices have current readiness results with traceable reasons;
- Workshop 3 participants and entry dependencies are named;
- required sign-offs are recorded in the Approval Register;
- documentation version/fingerprint is frozen for the approved scope.

## 16. Current readiness decision

### Result: `DOCUMENTATION COMPLETE FOR WORKSHOP 2 READOUT`

### Result: `WORKSHOP 2 NOT APPROVED`

### Result: `NO-GO FOR CODE`

### Result: `NO-GO FOR WORKSHOP 3 APPROVAL`

Reason: all 32 Workshop 2 decisions remain `OPEN`; named owners, real capabilities, numerical limits, calendars, evidence validity/retention, actual sources/provider mappings, and qualified sign-offs are not yet approved.

Safe next action: conduct Workshop 2F using this package. Workshop 3 material may be prepared in parallel, but Workshop 3 cannot approve away unresolved Workshop 1/2 authority, evidence, safety, source, or control dependencies.
