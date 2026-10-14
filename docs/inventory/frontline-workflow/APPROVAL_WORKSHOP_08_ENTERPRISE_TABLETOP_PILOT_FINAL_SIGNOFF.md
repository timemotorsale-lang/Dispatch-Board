# Approval Workshop 08 - Enterprise Tabletop Validation, Pilot Readiness, and Final Sign-Off

**Status:** Decision-ready validation package; not conducted  
**Confirms:** `ITF-APR-070`-`075`, Workshops 1–7 decisions, all nine slice exits  
**Current gate:** `GO FOR TABLETOP PREPARATION`; `NO-GO FOR PILOT OR CODE ACTIVATION`  

## 1. Outcome

Demonstrate that the approved Inventory-to-Frontline policy works end to end for representative normal, exception, degraded, correction, safety, privacy, financial, provider and suspension cases; confirm staff can operate it; close or safely contain gaps; and issue the final policy-to-technical-design/pilot-readiness decision.

Workshop 8 does not substitute simulation for required qualified legal, safety, financial, privacy, source or release authority. It cannot sign decisions that remain unsupported.

## 2. Internal sequence

1. **8A — Approval and Version Baseline Freeze**.
2. **8B — Normal-Flow and Handoff Tabletop**.
3. **8C — Exception, Safety, Financial, Privacy, and Degraded-Operation Tabletop**.
4. **8D — Staff Usability, Coverage, Escalation, and Manager Review Validation**.
5. **8E — Audit Reconstruction, Acceptance Traceability, Gap Closure, and Sign-Off**.
6. **8F — Shadow/Manual Pilot Readiness and Activation Recommendation**.

## 3. Entry criteria

- applicable Workshop 1–7 decisions have authorized dispositions;
- exact policy/configuration versions and fingerprints are identified;
- every `DEFER_SAFE` removes/restricts the affected action;
- no unresolved critical policy conflict or uncontained gap exists in the proposed scope;
- named primary/backups, qualifications, locations, calendars, limits, sources and providers are evidenced;
- all 410 catalog scenarios remain mapped to 220 acceptance cases or approved revised totals with traceability;
- tabletop participants have protected representative evidence and safe test data;
- incident, pause, rollback, and data/privacy controls are active for the exercise.

If entry criteria fail, Workshop 8 may run as discovery only; it cannot issue sign-off.

## 4. Required participants

GM/Operations; Inventory/service/workflow/pilot owners; receiving/lot/custody; qualified inspector; recon/estimator; Parts; technician; independent QC/road-test/safety; Office/Controller/title and qualified legal/compliance; media/content/pricing/channel; Sales intake; privacy/security/data/records/integration; representative backups and frontline staff.

## 5. Decision confirmations

| Decision | Required confirmation | Safe result if not proven |
| --- | --- | --- |
| `070` | Required cross-functional participants complete at least the approved representative case set | No tabletop sign-off |
| `071` | Shadow trigger accuracy/data sufficiency thresholds are measurable hypotheses with evidence owners | Automatic triggers disabled |
| `072` | One-location trained manual cohort, minimum volume/duration and manager-confirmed start are operationally feasible | No manual pilot |
| `073` | Zero-critical-failure and reliability/outcome/usability/alert thresholds are exact and measurable | No pilot exit/expansion |
| `074` | Monitoring, incident, pause, rollback and resume primary/backups prove authority and procedure | Pilot remains off |
| `075` | Automatic-start scope remains separately gated after shadow/manual success | Automatic starts disabled |

## 6. Required case suite

### Normal flow

1. Onsite trade-in/no-movement through frontline release.
2. Approved auction/carrier movement through receipt and inspection.
3. Routine recon with stocked parts, repair, independent QC and release.
4. Complete title packet, media/content/price, channel reconciliation and frontline handoff.

### Identity, custody, condition and inspection

5. VIN/source conflict at arrival.
6. After-hours arrival and secure containment.
7. Missing keys/documents/accessories and material discrepancy.
8. New transport damage and provider disagreement.
9. Hazard/EV-high-voltage/unsafe-movement containment.
10. Critical inspection finding and alternate specialist route.
11. Inspection correction invalidating a downstream plan.

### Recon, parts, repair and QC

12. Partial recon authorization and changed-scope reapproval.
13. Economics threshold/disposition review without automatic disposition.
14. Wrong/damaged/substitute part, ledger custody and vendor recovery.
15. Provider/sublet timeout with uncertain outcome/idempotency risk.
16. Technician/resource conflict and stop-work incident.
17. Critical QC failure, rework, reinspection and repeat escalation.
18. Operational release invalidated after downstream handoff.

### Title, merchandising and channels

19. Ownership-chain/lien/disclosure blocker and constrained state.
20. Original document lost/exposed and legal hold.
21. Provider acknowledgement versus authoritative agency completion.
22. Unsupported AI/content claim and media privacy defect.
23. Price below floor/expired approval and reapproval.
24. Channel acknowledgement with wrong observed price/content.
25. Duplicate/partial publication and provider outage fallback.

### Frontline release and post-release

26. Critical dimension failure despite high aggregate readiness.
27. Concurrent release commands and atomic projection recovery.
28. Physical/digital/internal-sales availability mismatch.
29. Noncritical exception expiry and automatic suspension.
30. Post-release safety/title/condition/price/listing invalidation and full reinstatement.
31. Customer appointment/deposit pressure before authorization.

### Enterprise/degraded/control cases

32. Role absence/overload with backup and no clock reset.
33. Financial request splitting/cumulative exposure.
34. Evidence malware/misdirection/quarantine and dependency invalidation.
35. Calendar/notification/provider outage with durable recovery.
36. Manual fallback followed by out-of-order replay/reconciliation.
37. Source conflict/staleness with no last-write-wins.
38. Restricted evidence access/export denial and audit.
39. Policy version change with in-flight case preservation.
40. Pilot pause, rollback, reconciliation and authorized resume rehearsal.

The approved minimum may remain 12, but final enterprise sign-off should sample every case family and all nine slice handoffs. Unexecuted cases remain explicit residual validation gaps.

## 7. Case execution record

Each case records:

- case/scenario/acceptance IDs and policy/catalog versions;
- participant roles and authority/qualification;
- starting facts, source/freshness, evidence and expected outcome;
- staff questions/options and ineligible-action explanations;
- commands, approvals, handoffs, clocks, pauses and escalations;
- external/provider desired/acknowledged/observed states;
- exceptions, containment, correction, supersession and reconciliation;
- actual versus expected result;
- usability/confusion/unsafe workaround observations;
- audit reconstruction evidence;
- defect/gap, severity, owner, target and retest.

## 8. Pass/fail model

| Result | Meaning |
| --- | --- |
| `PASS` | Expected safe outcome, controls, ownership, evidence and audit are demonstrated |
| `PASS_WITH_NONCRITICAL_ACTION` | Safe outcome achieved; bounded usability/documentation improvement owned |
| `FAIL_CRITICAL` | Hard gate bypass, unsafe action, unauthorized commitment/release, identity/custody/privacy loss, evidence corruption, duplicate high-impact effect, or unrecoverable audit gap |
| `FAIL_MATERIAL` | Incorrect routing/ownership/clock/source/reconciliation or unusable workflow affecting outcome |
| `NOT_RUN` | Required case not executed; remains a readiness gap |
| `INVALID_TEST` | Preconditions/version/participants/data invalid; rerun required |

Any critical failure blocks pilot authorization for affected scope. Failures are not averaged into a passing score.

## 9. Staff-experience validation

Confirm staff can answer without policy expertise:

- what vehicle/work they own now;
- why it matters and what clock/commitment is at risk;
- what decision is being asked and which options are eligible;
- what evidence is required and who verifies it;
- what work may continue while waiting;
- how to report blocked, unsafe, unauthorized, unavailable or cannot-meet-target conditions;
- what happens next and who accepts the handoff.

Reject designs that require staff to search multiple unrelated tabs, infer authority, duplicate data, hide failures in comments, or bypass the governed workflow to finish routine work.

## 10. Manager and enterprise validation

Confirm managers can see and act on:

- unowned/unacknowledged/overdue critical work;
- capacity, workload, qualified backups and separation conflicts;
- complete correlated financial exposure;
- evidence/source freshness/conflicts and restricted access;
- provider desired/ack/observed drift and degraded state;
- permitted exception/release/suspension actions within authority;
- original versus revised targets and forecast;
- slice/handoff performance and root/correlated exceptions;
- pilot health, incident, pause/rollback and reconciliation.

## 11. Audit reconstruction test

For sampled cases, reconstruct without undocumented oral knowledge:

- canonical vehicle/cycle and external identities;
- authoritative acquisition/start and every stage/handoff;
- owners, assignments, authority and delegation;
- evidence originals/versions/acceptance/access;
- estimates, approvals, commitments, costs and corrections;
- tasks, clocks, pauses, notifications and escalations;
- provider commands/events/idempotency/reconciliation;
- failures, rework, exceptions, release, suspension and reinstatement;
- policy/template/source versions and final outcome.

Target recommendation: 100% successful reconstruction for sampled material commands and critical decisions.

## 12. Gap and defect rules

- critical gap/failure: contain affected scope immediately; no sign-off;
- material gap: owner, safe containment, target and retest required before affected pilot;
- noncritical usability issue: may be conditionally accepted with owner/target if no unsafe workaround or outcome risk;
- document inconsistency: reconcile source of truth and affected versions before freeze;
- repeated alert noise, false ownership, manual shadow systems or missing evidence are operational defects, not training excuses.

## 13. Pilot-readiness review

Confirm:

- one approved location/cohort and exclusions;
- trained primary/backups and competency evidence;
- manager-confirmed starts and automatic starts off;
- approved evidence/source/provider/manual fallback;
- support/incident/on-call/monitoring coverage;
- daily reconciliation and manager review;
- success, pause, rollback and resume thresholds;
- data protection, export/retention/hold and incident procedure;
- existing safe manual process during pause/rollback;
- exact implementation/configuration/version fingerprint.

## 14. Final sign-off options

- `APPROVE_TECHNICAL_DESIGN_ONLY` — policies exact; allows specified slice technical design, not pilot/activation.
- `APPROVE_SHADOW_VALIDATION` — allows nonexecuting trigger/recommendation observation for exact scope.
- `APPROVE_MANUAL_PILOT` — only after implementation/verification and separate activation authority.
- `APPROVE_WITH_EXCLUSIONS` — exact actions/sources/vehicles/locations remain unavailable.
- `DEFER_SAFE` — affected progression remains off with owner/target.
- `REJECT_REDESIGN` — critical model deficiency requires redesign/retest.

Sign-off must be per slice and scope; one signature cannot activate all nine slices.

## 15. Required signatories

GM/Operations; Inventory/Service/Workflow/Pilot owners; Receiving; Shop/Safety/Inspection; Recon/Finance/Parts; Technician/Independent QC; Office/Controller/Qualified Title/Compliance; Merchandising/Content/Pricing/Channel; Frontline Release/Sales/Lot; Privacy/Security/Data/Records/Integration.

## 16. Current result

Workshop 8 package is prepared but not conducted. No Workshop 1–7 decision is approved by this document. Current state remains `NO-GO FOR CODE`, `NO-GO FOR PILOT`, and `NO-GO FOR ACTIVATION` until authorized dispositions, implementation, verification and the applicable sign-off option are recorded.

