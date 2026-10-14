# Approval Workshop 02A - Enterprise Role and Responsibility Catalog

**Workshop status:** Decision-ready planning draft; not conducted  
**Decision state:** All decisions remain `OPEN` until authorized sign-off  
**Covers:** `ITF-APR-020`-`025`  
**Program:** Inventory-to-Frontline  
**Pilot scope:** Time Motor Sales - Minneapolis, subject to Workshop 1 approval  
**Prepared:** 2026-07-16  

## 1. Workshop outcome

This packet begins Workshop 2 by defining who owns, performs, approves, verifies, supports, and monitors the Inventory-to-Frontline lifecycle. It converts generic catalog actors into an enterprise responsibility model that can later drive access, assignment, escalation, evidence, and audit controls.

This packet does not:

- approve any person, role, qualification, delegation, or capability;
- activate a workflow or change the application;
- establish financial limits, legal qualifications, safety qualifications, or employment duties;
- permit one person to bypass a required independent review because the dealership is small;
- treat assignment as authority, qualification, availability, or completed work.

Required output:

- one accountable policy owner, service owner, workflow owner, and pilot owner;
- a named primary and backup for every active pilot responsibility;
- approved role-to-person, location, vehicle-class, and lifecycle scope;
- approved responsibility and handoff boundaries for all nine stages;
- approved separation-of-duty and independence rules;
- approved delegation, absence, overload, and emergency-containment behavior;
- named workflow administrator and independent policy publisher;
- an owned remediation plan for every staffing or qualification gap.

## 2. Role-model principles

1. **One accountable owner:** every open case, task, decision, approval, dependency, exception, and handoff has one accountable internal owner.
2. **Roles before names:** permissions attach to approved role assignments and scopes, not hard-coded employee names.
3. **Assignment is not authority:** being assigned work does not grant approval, financial, legal, driving, publishing, or release authority.
4. **Authority is not qualification:** a manager title does not prove technical, title, safety, road-test, privacy, or provider qualification.
5. **Qualification is not availability:** work cannot be routed to an absent, overloaded, suspended, or out-of-scope person merely because they are qualified.
6. **Execution is not verification:** completing work does not automatically authorize its acceptance, QC pass, publication, or frontline release.
7. **External work retains an internal owner:** a carrier, vendor, auction, title provider, sublet shop, marketplace, or other provider never becomes the dealership's accountable case owner.
8. **Least privilege:** staff see and act on only the vehicles, locations, evidence classes, commands, and amounts needed for their approved duties.
9. **No silent delegation:** delegation has a delegator, delegate, scope, reason, start, expiry, and audit record.
10. **Small-team constraints are explicit:** if independence cannot be satisfied, the affected command remains unavailable or routes to an approved external/alternate reviewer.
11. **Automation supports people:** the System may recommend, route, remind, reconcile, and contain approved risks, but it is not the human policy owner or final approver.
12. **Customer and vehicle safety outrank throughput:** schedule pressure, aging, customer interest, margin, or workload cannot remove a hard gate.

## 3. Responsibility vocabulary

| Term | Meaning | Required control |
| --- | --- | --- |
| Accountable owner (`A`) | The one internal role answerable for the outcome and unresolved risk | Exactly one per responsibility at a time |
| Responsible executor (`R`) | Performs the work and records the result/evidence | Must be assigned, capable, eligible, and available |
| Approver (`P`) | Authorizes a bounded decision within active policy | Exact capability, scope, limit, and current policy version |
| Independent verifier (`V`) | Evaluates work without a prohibited conflict | Independence and qualification must be proven |
| Consulted (`C`) | Supplies required expertise or facts before the decision | Consultation does not transfer accountability |
| Informed (`I`) | Receives an attributable outcome or material change | Notification delivery is recorded where consequential |
| Monitor (`M`) | Watches an external dependency, clock, or projected state | Must own recovery/escalation when the expected outcome fails |
| Policy owner | Approves business rules and risk posture | Cannot silently delegate publication or bypass law/safety |
| Service owner | Owns end-to-end flow performance and cross-stage recovery | Does not replace stage executors or approvers |
| Workflow owner | Maintains the approved operating design and change backlog | Cannot publish their own consequential policy change alone |
| Case owner | Coordinates one vehicle's lifecycle until accepted handoff | Changes only through attributable transfer |
| Stage owner | Accountable for a stage's queue, capacity, quality, and handoffs | Must resolve or escalate unowned/stalled work |
| Dependency owner | Owns a required internal or external prerequisite | Does not become the whole vehicle's case owner |

`R`, `A`, `P`, and `V` are separate control concepts even when policy permits one person to hold more than one on a low-risk action. Each allowed combination must be explicit; no combination is inferred from job title.

## 4. Enterprise role catalog

### 4.1 Governance and control roles

| Role | Accountable outcome | May typically do | Must not do without separate authority |
| --- | --- | --- | --- |
| General/Operations Manager | Dealership policy, risk boundaries, pilot authorization, pause/rollback, final escalation | Approve policy within lawful authority, name delegates, review critical exceptions, authorize pilot state changes | Bypass law, known safety, identity, custody, privacy, mandatory evidence, or counsel-designated stops |
| Inventory-to-Frontline Service Owner | End-to-end flow, handoff quality, aging, cross-functional recovery | Set approved service targets, chair flow review, assign case ownership, coordinate exceptions | Self-approve all spend, QC, title, public claims, or frontline release merely because they own flow |
| Workflow Owner | Catalog integrity, terminology, workflow versions, acceptance backlog | Propose rule changes, maintain decision catalog, coordinate tabletop validation | Publish their own consequential changes when independent publication is required |
| Pilot Owner | Cohort, training, daily monitoring, incident coordination, evidence of pilot results | Admit eligible pilot cases, monitor gates, recommend pause/resume | Expand cohort or activate automation without approved authority |
| Workflow Administrator | Controlled configuration and operational administration | Prepare configurations, manage approved assignments/scopes, support recovery | Create policy, grant themselves authority, publish unapproved versions, alter historical audit |
| Independent Policy Publisher | Verifies and publishes an approved consequential configuration | Compare approval record to proposed version, publish exact approved version | Author and independently publish the same hard-stop, release, security, or financial change |
| Security/Data Owner | Access model, evidence classification, retention, audit access | Approve access classes and monitoring controls | Decide business readiness or legal sufficiency solely from data access role |
| Integration Owner | Source mapping, freshness, provider health, degraded-mode recovery | Approve source contracts and reconciliation procedures | Treat provider acknowledgement as verified operational truth |

### 4.2 Inventory and custody roles

| Role | Accountable outcome | Typical responsibilities | Control boundaries |
| --- | --- | --- | --- |
| Inventory Manager | Vehicle case ownership, lifecycle coordination, inventory intent, cross-stage handoffs | Validate acquisition context, prioritize units, assign work, monitor constraints, accept eligible handoffs | Cannot independently resolve every identity conflict, approve unlimited spend, or self-authorize frontline release |
| Inventory Coordinator | Accurate operational coordination for acquisition, movement, and dependencies | Gather facts, request quotes, prepare transport plan, monitor provider, chase missing information | Quote/request is not commitment; assignment is not spend or movement authority |
| Authorized Driver | Safe, eligible vehicle movement for an exact approved movement | Complete pre-movement check, execute route, record departure/arrival/incident facts | Cannot self-declare roadworthiness or expand method/route/scope |
| Receiving/Custody Owner | Physical receipt, observed identity, property transfer, secure placement | Observe VIN/condition, count keys/documents/accessories, record custody, secure exceptions | Arrival is not receipt acceptance; observation is not identity-conflict resolution |
| Lot/Placement Owner | Physical location, keys, display placement, movement traceability | Maintain placement and custody status, execute approved moves | Physical placement is not frontline authorization or digital availability |

### 4.3 Shop, parts, and quality roles

| Role | Accountable outcome | Typical responsibilities | Control boundaries |
| --- | --- | --- | --- |
| Inspection/Shop Manager | Inspection readiness, triage routing, capacity, critical containment | Select approved template, assign qualified inspector, review findings, route diagnosis | Inspection performed is not accepted evidence, repair approval, or QC pass |
| Qualified Inspector/Diagnostician | Complete, attributable inspection/diagnosis using applicable procedure | Perform checks, record measurements/findings, identify incomplete/unsafe conditions | Cannot convert incomplete evidence to pass or authorize unrelated spend |
| Recon Planner/Estimator | Versioned work proposal with traceable scope, dependencies, and cost | Build alternatives, estimates, parts/labor requirements, changed-scope requests | Estimate is not authorization; recommendation is not disposition authority |
| Shop/Recon Manager | Authorized repair plan execution, dispatch, constraints, recovery | Assign eligible technicians/resources, control WIP, stop unsafe work, manage rework | Cannot treat technician completion as QC or override critical failed QC |
| Parts Custodian/Manager | Parts source, fitment, purchasing, receipt, reservation, custody, disposition | Verify source/fitment, manage quote/order/receipt/reservation/issue/return states | Quote is not stock; on-hand is not necessarily available; issued is not installed |
| Qualified Technician | Safe, procedure-aligned repair execution and evidence | Accept job, verify prerequisites, record labor/parts/procedure results, stop changed scope | Cannot self-approve changed scope or independently QC own work where prohibited |
| Independent QC Inspector/Peer Verifier | Independent evidence-backed verification of completed work | Perform applicable QC, measurements, peer checks, road-test decision/result, fail/rework routing | Cannot average away a critical failure or pass missing mandatory evidence |
| Authorized Road-Test Driver | Controlled road test under approved safety/legal conditions | Verify eligibility/route/conditions, perform test, stop/report incident | Road test is not a substitute for missing legal or safety eligibility |
| Operational Repair Release Authority | All current repair/QC gates satisfied for downstream handoff | Review latest job/QC versions and authorize shop release | Operational repair release is not frontline readiness |

### 4.4 Title, merchandising, and release roles

| Role | Accountable outcome | Typical responsibilities | Control boundaries |
| --- | --- | --- | --- |
| Office Manager / Controller Delegate | Document custody, office controls, applicable financial/accounting boundary | Assign trained document work, protect originals, monitor external dependencies | Administrative ownership is not legal adjudication or permission to waive required originals |
| Title/Document Coordinator | Complete and traceable requirement package | Receive, prepare, index, track, correct, and route documents | Receipt/preparation is not qualified acceptance or final readiness |
| Qualified Title/Document Reviewer | Independent review against approved jurisdiction/entity policy | Verify applicable requirements, evidence, chain, signatures, disclosures, dependencies | Cannot invent legal applicability or override counsel-designated stops |
| Detail/Media Specialist | Accurate condition preparation and media capture | Detail, stage, capture required media, report condition mismatch | Media capture is not content/claim approval |
| Content/Data Coordinator | Verified vehicle facts and complete draft content package | Reconcile source facts, draft descriptions, manage corrections | AI/provider output remains draft; cannot approve unsupported public claims |
| Content/Claim Approver | Truthful public content within approved disclosure policy | Review evidence, claims, disclosures, prohibited language | Cannot approve price or frontline release by implication |
| Pricing Recommender | Evidence-backed price proposal and alternatives | Analyze cost, market, comparable, aging, and margin inputs | Recommendation is not approval |
| Pricing Authority | Approved customer-facing price within exact scope/limit | Approve, reject, or require revised price; set expiry/review | Cannot bypass disclosure, title, safety, or identity gates |
| Channel Publisher/Reconciliation Owner | Accurate desired/live listing state and recovery | Submit approved payload, monitor acknowledgement/live state, reconcile drift, pause/remove | Provider acceptance is not proof of live/correct publication; publishing is not frontline authorization |
| Independent Frontline Release Reviewer | Whole-package evaluation and release recommendation/decision within scope | Review current gate versions, exceptions, evidence, placement and availability prerequisites | Cannot create a pass from scores, stale evidence, appointments, or commercial pressure |
| Frontline Release Authority | Immutable, scoped frontline authorization and suspension/reinstatement | Authorize, suspend, or reinstate after complete eligible review | Cannot waive critical gates or treat authorization as a sale/delivery |
| Sales/Lot Intake Owner | Accept released vehicle into controlled sales availability | Confirm physical/digital/internal availability and downstream ownership | Sales interest, appointment, deposit, or placement cannot create readiness |

## 5. Proposed Time Motor Sales role mapping

This mapping uses the current [`ROLE_DUTY_REFERENCE.md`](../../ROLE_DUTY_REFERENCE.md). Every entry remains proposed and requires confirmation of competence, availability, location, delegation, and separation rules.

| Current staff identity | Existing documented duties | Proposed Workshop 2 role slots | Restrictions / unresolved validation |
| --- | --- | --- | --- |
| Eli | General Manager; sales oversight; final approval and dispatch control | General/Operations Manager; policy owner; candidate pilot authority; candidate frontline release authority | Cannot bypass hard gates; independent publisher/reviewer conflicts must be resolved; exact financial and release scopes remain `TBD` |
| Brock | Inventory Manager; Service Department Manager; shop/parts and lot/detail support | Inventory-to-Frontline service owner; workflow owner candidate; Inventory Manager; Shop/Recon Manager; candidate transport monitor and operational repair release authority | Workload concentration is material; cannot independently execute and verify prohibited combinations; parts, QC, and release independence require explicit design |
| Walter | Mechanic | Qualified Technician; inspector/diagnostician candidate | Actual qualifications, vehicle/system scope, road-test eligibility, and QC independence remain `TBD`; cannot independently QC own repair where independence applies |
| Baraka | Salesperson; Marketing and Advertisement Manager | Detail/media and content coordinator candidate; channel operations candidate; Sales/Lot Intake Owner | Content approval, price approval, and publishing combinations require separation; listing work cannot create frontline readiness |
| Ancilla | Office / Front Desk Manager; documentation and listing support | Inventory Coordinator candidate; Receiving/Custody Owner candidate; Title/Document Coordinator candidate | Title qualification, sensitive-document access, physical custody procedure, final verification independence, and workload remain `TBD` |
| Eva | Collections Manager | No default Inventory-to-Frontline operational role | Must not receive workflow access or work solely because she is staff; any future assignment requires explicit role/scope/training |
| System | Daily generation and automation | Routing, reminder, duplicate prevention, reconciliation, audit-support functions | Never the human accountable owner, policy approver, qualified verifier, price approver, or release authority |

### 5.1 Unfilled or unverified pilot control roles

The following are not safely satisfied by the existing staff reference and must be named, qualified, or explicitly removed from the live pilot path:

| Gap | Why required | Safe unresolved behavior |
| --- | --- | --- |
| Independent policy publisher | Consequential policy/configuration publication requires four-eyes control | No consequential version may be published |
| Security/Data owner | Evidence access, privacy, retention, and audit access require accountable policy | Protected evidence/workflow access remains unavailable beyond existing approved access |
| Integration owner(s) | Each acquisition, VIN, provider, title, market, and channel source needs authority/freshness ownership | Provider data remains advisory/manual and cannot satisfy a hard gate |
| Qualified identity-conflict reviewer | Material VIN/identity conflicts require independent resolution | Quarantine and escalate; do not advance |
| Authorized driver and backup | Any internal driving requires proven eligibility | Internal drive/pickup remains excluded, consistent with Workshop 1 recommendation |
| Independent QC inspector/peer verifier | Required repair checks cannot be performed only by the executing technician | Route to qualified alternate/external verifier or hold in QC |
| Qualified title/document reviewer | Final readiness requires approved jurisdiction/entity competence | Hold title readiness; do not infer sufficiency |
| Content/claim approver | Public claims require evidence-backed independent approval | Keep content draft/unpublished |
| Pricing authority and backup | Customer-facing price requires exact human approval | Do not publish or change public price |
| Independent frontline release reviewer | Final review cannot be inferred from upstream completion | Vehicle remains not frontline ready |
| Workflow administrator | Controlled configuration and recovery need an accountable operator | No workflow configuration publication or privileged recovery |

## 6. End-to-end responsibility matrix

The proposed matrix identifies role families, not approved people. `A` must resolve to one named eligible person for each live case.

| Lifecycle responsibility | A | R | P / V | C / I |
| --- | --- | --- | --- | --- |
| Program policy and hard gates | General/Operations Manager | Workflow Owner prepares | Independent Policy Publisher verifies approved version | Service, safety, office, security, finance owners |
| Acquisition validation | Inventory Manager | Inventory Coordinator | Acquisition/identity authority for exceptions | Office; policy owner informed of critical conflict |
| Transportation plan | Inventory Manager | Inventory Coordinator | Financial/method authority as applicable | Receiving owner; provider monitor |
| Movement execution | Inventory Manager | Approved provider or Authorized Driver | Safety/legal/movement eligibility verifier | Receiving owner informed |
| Transport monitoring/recovery | Inventory Manager | Inventory Coordinator | Recovery authority for material change | Receiving, provider, case owner |
| Receipt and custody | Receiving/Custody Owner | Receiving/lot staff | Identity/discrepancy authority as applicable | Inventory Manager |
| Inspection and triage | Inspection/Shop Manager | Qualified Inspector/Diagnostician | Independent/manager review for exceptions | Inventory Manager |
| Recon plan and estimate | Shop/Recon Manager | Recon Planner/Estimator | Exact financial/scope authority | Parts, technician, Inventory Manager |
| Parts sourcing and custody | Parts Custodian/Manager | Approved parts staff | Purchase/substitution authority | Shop Manager, technician |
| Repair execution | Shop/Recon Manager | Qualified Technician | Changed-scope approver; QC remains downstream | Parts, Inventory Manager |
| Quality and safety verification | Quality/Shop authority | Independent QC Inspector / road-test role | Operational Repair Release Authority | Technician, Inventory Manager |
| Title/document readiness | Office Manager / Controller Delegate | Title/Document Coordinator | Qualified Title/Document Reviewer | Inventory Manager, counsel/compliance as required |
| Merchandising/content | Inventory/Merchandising authority | Detail/Media + Content/Data roles | Content/Claim Approver | Title, shop/QC, Inventory Manager |
| Pricing | Inventory/GM pricing authority | Pricing Recommender | Pricing Authority | Finance/Inventory as policy requires |
| Channel publication/reconciliation | Merchandising authority | Channel Publisher/Reconciliation Owner | Content/price/channel gates verify eligibility | Inventory, Sales Intake |
| Frontline release review | Frontline Release Authority | Independent Frontline Release Reviewer | Release Authority authorizes; separate verifier where required | All upstream owners; Sales/Lot Intake |
| Post-release verification/suspension | Frontline Release Authority | Assigned verification owner | Reinstatement requires complete current review | Inventory, Sales, affected stage owners |

## 7. Handoff accountability contract

Every stage handoff must identify:

- producing stage, producer, and accountable stage owner;
- receiving stage, proposed receiver, and accountable next owner;
- vehicle/cycle identity and expected version;
- completion outcome and unresolved restrictions;
- required evidence and freshness/expiry state;
- open dependency, exception, clock, financial exposure, and next action;
- acceptance, rejection, or conditional-waiting response;
- timestamp and audit correlation.

Rules:

1. A producer cannot mark the receiving stage complete.
2. Sending a handoff does not transfer accountability until the receiver accepts it.
3. Rejection returns an explicit reason and accountable recovery owner; it does not create unowned work.
4. If the intended receiver is unavailable or ineligible, the handoff remains pending and escalates to the stage owner.
5. External-provider status never automatically accepts an internal handoff.
6. Parallel preparation may have separate dependency owners, but the vehicle retains one case owner.
7. Ownership transfer preserves the prior owner, reason, time, scope, and accepting actor.

## 8. Separation-of-duty matrix

| Controlled action | Prohibited or controlled combination | Proposed minimum control | Safe behavior when unavailable |
| --- | --- | --- | --- |
| Consequential workflow publication | Author is sole publisher | Independent publisher compares approval and exact version | Keep prior version; do not publish |
| Spend above delegated limit | Requester self-approves | Eligible approver with current cumulative exposure | Hold commitment |
| Material identity conflict | Observer/resolver is sole final approver | Independent identity authority and preserved source evidence | Quarantine/hold |
| Transport damage | Reporter is treated as solely liable or sole claim closer | Separate disposition/claim authority | Preserve evidence; escalate |
| Repair QC | Executing technician performs required independent QC | Qualified independent QC/peer verifier | Hold in QC or use approved external verifier |
| Critical QC failure | Manager/score converts failure to pass | Corrective work plus applicable reinspection | Restrict operation/release |
| Title/document readiness | Preparer is sole final verifier where four-eyes applies | Qualified independent reviewer | Hold title readiness |
| Public content | Content/media preparer approves unsupported own claims | Evidence-backed content approver | Keep draft/unpublished |
| Customer price | Recommender self-approves where review is required | Scoped pricing authority | No public-price change |
| Channel publication | Publisher bypasses current content/price/title/safety gates | Pre-command eligibility check and reconciliation | Do not submit/pause/remove as policy directs |
| Frontline release | Upstream owner, evaluator, publisher, or sales demand alone authorizes readiness | Independent whole-package review plus scoped release authority | Remain not frontline ready |
| Reinstatement | Person correcting one defect alone reinstates readiness | Full current package review by eligible authority | Remain suspended |

Policy owners must decide which combinations require different people versus different attributable roles with compensating review. Critical independence cannot be waived for convenience or staffing pressure.

## 9. Assignment, delegation, and coverage rules

### 9.1 Eligibility before assignment

Before presenting an action, the workflow must eventually be able to verify:

- active employment/user status and authenticated identity;
- approved role and capability;
- organization and location scope;
- vehicle class/system and task qualification;
- dollar, action, evidence, provider, and jurisdiction scope where applicable;
- required independence from prior actors;
- current schedule/availability and workload guardrail;
- delegation validity and expiry;
- no suspension, conflict, or stale credential.

### 9.2 Primary and backup coverage

Every live pilot responsibility requires:

- one named primary;
- at least one eligible backup or an approved external/manual containment path;
- business-hours coverage and after-hours containment owner;
- maximum acknowledgement time and escalation destination;
- planned-absence handoff procedure;
- overload threshold and reassignment authority.

The backup does not receive authority until the assignment/delegation is effective. A shared queue may aid discovery, but a claimed work item must resolve to one accountable owner.

### 9.3 Delegation contract

A valid delegation records:

- delegator and authority basis;
- delegate and verified eligibility;
- capabilities and prohibited actions;
- organization, location, stage, vehicle class, and dollar scope;
- start, expiry, reason, and revocation authority;
- whether redelegation is prohibited;
- affected open cases and notification recipients;
- audit and review evidence.

Delegation cannot transfer a qualification the delegate does not possess, defeat separation of duties, exceed the delegator's authority, or survive revocation/expiry.

### 9.4 Absence, overload, and emergency containment

- **Planned absence:** transfer open responsibilities before absence with receiver acceptance.
- **Unexpected absence:** stage owner assigns an eligible backup; the system must not silently reassign consequential approvals.
- **Overload:** stop new assignment at approved limits, preserve priority rules, and escalate capacity—not lower evidence or independence requirements.
- **No eligible person:** contain the vehicle/action, identify the missing role, notify authority, and show the approved alternate path.
- **Emergency:** eligible staff may take narrowly approved action to protect people/property/custody; retrospective review records what occurred but does not rewrite original authority.

## 10. Staff workspace and visibility model

Roles should simplify the experience rather than create more navigation.

| Workspace | Who lands here | What appears | What remains hidden |
| --- | --- | --- | --- |
| My Work | All active staff | Eligible assigned decisions, tasks, approvals, evidence requests, blockers, handoffs | Ineligible commands, unrelated vehicles, protected evidence |
| Inventory Lifecycle | Inventory, receiving, title, merchandising, sales-intake roles | Acquisition through frontline stage context and role-relevant queues | Shop execution detail not needed for the role; privileged policy controls |
| Shop & Recon | Shop, parts, technicians, QC, road-test roles | Triage, plan, approval status, parts, repair, QC, restrictions, handoff | Unneeded customer/financial/title evidence and ineligible release controls |
| Manager Review | Eligible managers/approvers | Exceptions, approvals, aging, capacity, exposure, release/suspension decisions | Actions outside exact authority/scope |
| Workflow Administration | Administrator and independent publisher | Draft/version/diff/approval/publication/recovery controls | Business approval powers not separately granted |

Staff do not need a tab for every catalog. A task deep-links to the exact vehicle, stage, decision, evidence request, and next permitted action. Managers see exceptions and decisions requiring their authority; healthy routine work stays summarized.

## 11. Decision recommendations

| Decision | Recommended outcome | Required authority | State |
| --- | --- | --- | --- |
| `ITF-APR-020` | Name Eli as proposed policy owner; Brock as proposed service owner and workflow-owner candidate; name a separate pilot owner or explicitly approve a bounded combination after workload review | General/Operations | OPEN |
| `ITF-APR-021` | Adopt the role catalog and proposed staff mapping only after completing the named-person scope, qualification, availability, backup, and access capture sheet | GM/Operations + functional role owners | OPEN |
| `ITF-APR-022` | Make Inventory Manager accountable for the first-slice case; Inventory Coordinator responsible for planning/monitoring; authorized provider/driver responsible for movement; Receiving/Custody Owner responsible for receipt; require accepted handoffs | Inventory + Operations/Safety | OPEN |
| `ITF-APR-023` | Require independent review for material identity conflict; reserve acquisition reversal/cancellation authority to GM/Operations or exact delegate; preserve separate commands and evidence | GM/Operations + Inventory/Office | OPEN |
| `ITF-APR-024` | Approve the separation matrix as the minimum baseline; unavailable independence holds or externally routes the action rather than weakening the gate | GM/Operations + affected qualified authorities | OPEN |
| `ITF-APR-025` | Name a Workflow Administrator and different Independent Policy Publisher for consequential changes; prohibit self-grant and self-publication | GM/Operations + Security/Data owner | OPEN |

## 12. Named-person capture sheet

Complete one row for every role activated in the pilot. Blank or assumed fields do not grant access.

| Field | Required entry |
| --- | --- |
| Role ID/title | `TBD` |
| Primary person | `TBD` |
| Backup person / safe alternate | `TBD` |
| Accountable manager | `TBD` |
| Organization/location | `TBD` |
| Lifecycle stages | `TBD` |
| Vehicle/source/method scope | `TBD` |
| Allowed capabilities | `TBD` |
| Prohibited combinations | `TBD` |
| Approval/financial scope | `TBD` in Workshop 2 financial packet |
| Qualification evidence and expiry | `TBD` |
| Evidence access class | `TBD` in Workshop 2 evidence/security packet |
| Primary coverage window | `TBD` |
| Acknowledgement/escalation target | `TBD` in Workshop 2 timing packet |
| Delegation allowed / publisher | `TBD` |
| Effective and review dates | `TBD` |
| Approver and approval record | `TBD` |

## 13. Workshop agenda

### Before the meeting

Bring:

- current staff roster, schedules, and location assignments;
- existing job descriptions and delegated authorities;
- qualification/certification/driver eligibility sources;
- financial approval structure;
- title/document and sensitive-data responsibilities;
- vendor/sublet/external-review options;
- planned absences and realistic workload/capacity;
- current emergency and after-hours contacts.

### In the meeting

1. Confirm policy, service, workflow, and pilot ownership.
2. Review each role definition and remove overlapping labels that do not represent distinct control needs.
3. Map primary and backup people to the first implementation slice.
4. Map the remaining lifecycle roles for planning completeness.
5. Validate qualifications and prohibited combinations.
6. Resolve or contain every unfilled role.
7. Approve delegation, absence, overload, and emergency behavior.
8. Name the administrator and independent publisher.
9. Run the role stress tests in section 14.
10. Record each `ITF-APR-020`-`025` decision in the Approval Register.

## 14. Required role stress tests

The responsibility model does not pass Workshop 2A until participants can answer each case with one owner, permitted actions, forbidden actions, backup path, and escalation:

1. Brock is absent when a purchased vehicle must be transported.
2. Ancilla observes a VIN conflict while receiving a vehicle.
3. Walter discovers changed repair scope above the current authorization.
4. Walter completes a safety-related repair and no independent QC person is onsite.
5. A carrier reports delivery after hours with no approved receiver.
6. A title provider reports success, but required original custody is unverified.
7. Baraka prepares photos, description, recommended price, and listing payload for the same vehicle.
8. A high-interest customer wants to test-drive a vehicle before final release review.
9. Eli is the only manager present but a non-waivable gate has failed.
10. The workflow author proposes an urgent hard-gate configuration change.
11. A primary approver is overloaded and approvals are aging.
12. An integration reports current data, but its freshness/source authority is unknown.

Expected behavior in every case: protect the hard gate, preserve one accountable owner, present an approved alternate or containment path, and record the decision without inventing authority.

## 15. Exit criteria

Workshop 2A is complete only when:

- `ITF-APR-020`-`025` have recorded dispositions and approval metadata;
- policy, service, workflow, pilot, administration, and publication owners are named;
- every first-slice responsibility has a primary, backup, scope, and accountable manager;
- qualification and independence requirements are evidenced or safely unresolved;
- all nine lifecycle stages have an accountable role family and handoff boundary;
- the separation matrix is approved without a convenience override for hard gates;
- delegation, absence, overload, emergency, and external-provider ownership are approved;
- unfilled roles have owners, target dates, and safe non-execution behavior;
- staff workspace visibility can be derived from approved roles without exposing unauthorized commands.

## 16. Next Workshop 2 packets

After this role catalog is reviewed, Workshop 2 continues in this order:

1. **Authority and Financial Control Matrix** — capabilities, decision limits, cumulative exposure, approvals, overrides, and reapproval.
2. **Evidence, Privacy, and Security Matrix** — evidence criticality, capture/verification roles, access, retention, correction, quarantine, and audit.
3. **Timing, Escalation, and Coverage Matrix** — clocks, acknowledgement, due targets, pauses, timeout, on-call, overload, and notification.
4. **Source Authority and Integration Matrix** — authoritative fields, freshness, conflict, provider acknowledgement, reconciliation, degraded mode, and recovery.

Role approval alone does not make the first slice ready for code. Workshop 2 exits only after the applicable `ITF-APR-020`-`065` decisions are approved or safely deferred and Workshop 1 dependencies are formally resolved.
