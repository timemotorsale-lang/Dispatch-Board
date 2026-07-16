# Inventory-to-Frontline Operating Controls

**Status:** Proposed controls; dealership approval required  
**Version:** `0.1.0`  
**Activation:** None of the proposed roles, limits, targets, or evidence rules are production policy

## 1. Control principles

1. Safety, law, identity, custody, mandatory evidence, and valid authority are eligibility controls, not scoring factors.
2. Every open decision, task, dependency, exception, and approval has one accountable internal owner.
3. Staff receive only actions allowed by capability, location, case state, and policy.
4. High-impact facts change through commands with reason, authority, expected version, and audit—not unrestricted edits.
5. Completion is verified by a gate; checking a box or changing a task status is insufficient.
6. External responsibility never removes internal monitoring ownership.
7. Overrides are narrow, attributable, time/scope bounded, and incapable of bypassing non-waivable controls.
8. Proposed configuration remains inactive until a named policy owner approves an effective version.

## 2. Proposed responsibility model

Actual staff names and role-to-capability mappings remain `TBD`.

| Workflow responsibility | Proposed accountable role | Typical executor/support | Approval required |
| --- | --- | --- | --- |
| Workflow policy ownership | General/Operations Manager | Inventory Manager, compliance/safety advisors | Policy publication/change |
| Inventory-to-Frontline service ownership | Inventory Manager | Location managers | Service targets and exceptions |
| Acquisition validation | Inventory Manager | Office/Inventory Coordinator | Non-standard acquisition or missing evidence |
| Identity verification | Inventory Manager | Receiving staff | Identity conflict resolution |
| Transport planning | Inventory Coordinator | Inventory staff | Cost, non-standard method, destination change |
| Internal pickup execution | Authorized driver | Inventory/lot staff | Eligibility and vehicle-specific release |
| Transport monitoring | Inventory Coordinator | Receiving staff | Recovery beyond authority |
| Receipt and custody | Receiving owner | Inventory/lot staff | Material discrepancy disposition |
| Inspection and triage | Inspection/Shop Manager | Qualified inspector/technician, inventory staff | Template exceptions, critical restrictions, no-action/disposition route |
| Recon planning and approval | Shop/Recon Manager | Qualified diagnostician, estimator, parts, inventory manager | Exact scope/amount, partial approval, economics/disposition, changed scope |
| Parts and repair execution | Shop Manager | Parts Manager, qualified technician, service advisor, inventory staff | Purchase/substitution, changed scope, safety incident, sublet, cancellation/recovery |
| Quality and safety verification | Quality/Shop Manager | Qualified QC inspector, independent peer verifier, road-test driver, inventory staff | Critical failure disposition, changed scope/rework, operational release, post-release recovery |
| Title and document readiness | Office Manager / Controller delegate | Trained title/document coordinator, inventory manager, receiving/custody staff | Requirement policy, qualified exception, external filing/fee, constrained state, final readiness, post-ready recovery |
| Merchandising and pricing | Inventory/Merchandising Manager | Detail/media specialist, data/content coordinator, pricing analyst, channel publisher | Content/claim approval, price/floor authority, publication/removal, package completion, post-publish recovery |
| Frontline release review | General/Operations Manager or delegated frontline authority | Inventory Manager, independent release reviewer, lot/sales owner, data/channel reconciliation owner | Noncritical exception, frontline authorization, suspension scope, reinstatement, route/disposition escalation |
| Exception resolution | Named case/exception owner | Dependency owners | Risk acceptance or hard-rule disposition |
| Financial approval | Role with configured dollar authority | Requesting owner | Exact applicable limit/version |
| Cancellation/acquisition reversal | General/Operations Manager | Inventory/Office Manager | Always attributable; separate commands |
| Workflow/catalog administration | Authorized administrator | Policy owner | Four-eyes publication for consequential changes |

## 3. Capability catalog

Capabilities are server-enforced and may be scoped by organization, location, acquisition type, vehicle class, and dollar amount.

```text
inventory.workflow.view
inventory.workflow.start_manual
inventory.workflow.assign_owner
inventory.acquisition.validate
inventory.identity.observe
inventory.identity.resolve_conflict
inventory.transport.plan
inventory.transport.request_quote
inventory.transport.confirm
inventory.transport.execute_internal
inventory.transport.monitor
inventory.transport.amend
inventory.transport.cancel
inventory.transport.approve_cost:<limit>
inventory.destination.change
inventory.receipt.observe_arrival
inventory.receipt.accept_custody
inventory.receipt.record_intake
inventory.exception.own
inventory.exception.escalate
inventory.exception.accept_risk
inventory.acquisition.reverse
inventory.receipt.accept_handoff
inventory.receipt.resolve_discrepancy
inventory.receipt.correct
inventory.receipt.contain_restricted
inventory.receipt.handoff_inspection
inventory.inspection.select_template
inventory.inspection.assign_eligible_inspector
inventory.inspection.start
inventory.inspection.record_item
inventory.inspection.record_critical_finding
inventory.inspection.pause_transfer
inventory.inspection.review_evidence
inventory.inspection.classify_finding
inventory.inspection.route_finding
inventory.inspection.complete
inventory.inspection.correct_supersede
inventory.inspection.request_reinspection
inventory.inspection.handoff_recon
inventory.recon.validate_handoff
inventory.recon.request_record_diagnosis
inventory.recon.define_scope
inventory.recon.define_requirements
inventory.recon.request_record_quote
inventory.recon.build_estimate
inventory.recon.compare_alternatives
inventory.recon.present_estimate
inventory.recon.authorize:<limit>
inventory.recon.partial_authorize:<limit>
inventory.recon.revoke_authorization
inventory.recon.create_authorized_job
inventory.recon.supersede_plan
inventory.recon.cancel_recover_job
inventory.recon.handoff_execution
inventory.execution.validate_job
inventory.parts.create_demand
inventory.parts.source_compare
inventory.parts.purchase:<limit>
inventory.parts.receive
inventory.parts.resolve_discrepancy
inventory.parts.reserve_release
inventory.parts.issue_install_return
inventory.execution.dispatch
inventory.execution.start_pause_resume_finish
inventory.execution.record_evidence
inventory.execution.changed_scope
inventory.execution.reassign
inventory.execution.cancel_recover
inventory.execution.handoff_qc
inventory.quality.validate_handoff
inventory.quality.select_template
inventory.quality.assign_inspector
inventory.quality.start_stop_transfer
inventory.quality.record_check
inventory.quality.record_measurement
inventory.quality.peer_verify
inventory.quality.road_test_plan_execute
inventory.quality.record_disposition
inventory.quality.create_route_rework
inventory.quality.reinspect_supersede
inventory.quality.evaluate_order_release
inventory.quality.authorize_operational_release
inventory.quality.handoff_downstream
inventory.quality.suspend_released_reliance
inventory.quality.correct_reconcile
inventory.title.validate_handoff
inventory.title.select_context_template
inventory.title.create_requirements
inventory.title.receive_classify_document
inventory.title.manage_original_custody
inventory.title.verify_document
inventory.title.accept_reject_requirement
inventory.title.create_external_dependency
inventory.title.prepare_review_packet
inventory.title.submit:<limit>
inventory.title.approve_fee:<limit>
inventory.title.monitor_reconcile_provider
inventory.title.resolve_correction
inventory.title.request_qualified_review
inventory.title.evaluate_readiness
inventory.title.handoff_downstream
inventory.title.suspend_ready_reliance
inventory.title.correct_recover
inventory.merch.validate_handoff
inventory.merch.select_template_plan
inventory.merch.verify_vehicle_fact
inventory.merch.capture_media
inventory.merch.review_approve_media
inventory.merch.draft_content
inventory.merch.approve_content
inventory.pricing.analyze
inventory.pricing.propose
inventory.pricing.approve:<limit>
inventory.pricing.approve_floor_exception:<limit>
inventory.pricing.defer_reject
inventory.merch.build_channel_payload
inventory.merch.publish_update_pause_remove
inventory.merch.reconcile_channel
inventory.merch.resolve_channel_exception
inventory.merch.evaluate_package
inventory.merch.handoff_frontline_review
inventory.merch.suspend_published_reliance
inventory.merch.correct_recover
inventory.frontline.validate_handoff
inventory.frontline.select_policy
inventory.frontline.assemble_freeze_package
inventory.frontline.evaluate_dimensions
inventory.frontline.request_exception
inventory.frontline.approve_exception
inventory.frontline.route_correction
inventory.frontline.assign_reviewer
inventory.frontline.authorize_release
inventory.frontline.reject_hold
inventory.frontline.commit_transition
inventory.frontline.confirm_placement
inventory.frontline.reconcile_availability
inventory.frontline.handoff_sales_intake
inventory.frontline.post_release_verify
inventory.frontline.suspend
inventory.frontline.reinstate
inventory.frontline.correct_reconcile
inventory.workflow.policy_admin
inventory.workflow.policy_publish
```

UI visibility is convenience only. Every command re-evaluates capability and current facts server-side.

## 4. Separation of duties

Policy owner approval is required before deciding where independence is mandatory. Proposed baseline:

- A requester cannot self-approve transport spend above their delegated limit.
- A person resolving a material identity conflict cannot be the sole approver of that resolution.
- A person reporting transport damage may capture evidence but cannot be treated as liable or close the claim solely because they reported it.
- A required independent QC inspector or peer verifier cannot be replaced by the executing technician, schedule pressure, or a general override.
- A failed critical QC check cannot be converted to pass by an aggregate score, release authority, or downstream acceptance.
- Operational repair release and final frontline release remain distinct commands and should use separate accountable authority where policy requires.
- Staff who receive, scan, or prepare title documents cannot self-accept them or publish final readiness where four-eyes review is required.
- A manager cannot override identity, ownership-chain, lien, mandatory disclosure, required-original, suspected alteration/fraud, or other counsel-designated title/document stops.
- The workflow presents approved policy requirements and qualified-review routes; it does not authorize staff or software to provide legal conclusions.
- Media/content preparers cannot self-approve public claims, and price recommenders cannot self-approve price where policy requires independent review.
- AI/provider output is always draft assistance; it cannot be the sole approver of public content, customer price, publication, disposition, or frontline readiness.
- A publisher cannot bypass current title, safety, content, disclosure, price, or channel eligibility gates because a provider accepts the payload.
- Price, content, publication, package completion, and frontline release remain separate attributable decisions.
- A readiness evaluator, score, recommendation, package preparer, channel provider, or sales appointment cannot authorize frontline release.
- Critical safety, title/compliance, identity, custody, disclosure, QC, public-price, and privacy gates cannot use risk acceptance or be averaged away.
- Release authorization, lifecycle projection, physical placement, digital availability, sales handoff, and post-release verification remain separate facts.
- Immediate configured safety/title holds may suspend availability before human review, but only approved authority can reinstate readiness after a full package review.
- Policy author and policy publisher should be different people for hard stops, financial limits, and release gates.
- A general manager override cannot bypass law, known critical safety, identity integrity, or mandatory custody evidence.
- Emergency action may contain immediate harm, but retrospective approval cannot rewrite the original authority state.

## 5. Financial authority policy

All values remain `TBD`; do not seed permissive example limits.

The policy version must define:

| Configuration | Required definition |
| --- | --- |
| Currency | Organization accounting currency |
| Quote requirement | Number/type of quotes by distance, cost, or method |
| Staff transport limit | Maximum per movement and applicable cumulative exposure |
| Inventory manager limit | Maximum per movement and applicable cumulative exposure |
| General manager limit | Maximum per movement; board/owner boundary if applicable |
| Reapproval threshold | Absolute/percentage increase requiring new approval |
| Quote expiry | Time after which price/availability must be reconfirmed |
| Emergency authority | Narrow safety/custody containment actions and retrospective review |
| Related-cost aggregation | How split quotes, storage, tow, carrier, and incremental recovery costs correlate |
| Acquisition economics review | Exposure threshold that triggers recon/disposition reconsideration |

Controls:

- record amount, currency, source quote, tax/fee treatment, expiry, approver, delegated authority, and policy version;
- prevent request splitting from evading authority through correlated exposure;
- distinguish quote, approved commitment, incurred cost, disputed cost, and estimate;
- revised costs never overwrite prior approved or incurred facts;
- the workflow does not post accounting entries unless a separately approved integration owns that action.

## 6. Timing and clock policy

Targets are configured by acquisition type, source type, distance band, location calendar, transport method, vehicle class, and risk. All numeric targets are `TBD`.

Each rule defines:

```text
policyRuleId and version
scope and calendar/timezone
start event and stop event
warningAt, dueAt, overdueAt
allowed pause reasons
maximum pause review interval
owner acknowledgement target
escalation levels and recipients
customer/financial commitment linkage
```

Required clocks for the first slice:

- acquisition validation time;
- time to locate vehicle;
- time to approve destination;
- time to request/confirm transport;
- time awaiting release requirements;
- pickup commitment variance;
- in-transit time and arrival variance;
- time awaiting receipt handoff;
- total acquisition-to-receipt time;
- unexplained idle time.

Additional Quality and Safety Verification clocks must cover time awaiting QC intake, inspector/resource assignment, inspection, peer verification, road-test eligibility/execution, failed-QC rework, reinspection, order-level release review, and downstream handoff acceptance. Failure, rework, reassignment, and superseding inspection do not erase the original cycle or target history.

Additional Title and Document Readiness clocks must cover requirement selection, document request/receipt, verification, correction, payoff/lien release, provider/agency acknowledgement and completion, original-document transit, constrained-state review/expiry, final readiness review, and downstream handoff. External waiting remains internally owned; resubmission, provider ETA change, route change, or new readiness version does not erase original targets or elapsed time.

Additional Merchandising and Pricing clocks must cover physical/media readiness, capture/upload/review, vehicle-data correction, content approval, price analysis/approval, channel preflight/request/acknowledgement/live reconciliation, rejection/drift correction, package completion, and Frontline Release Review handoff. Recapture, content or price reapproval, retry, provider delay, or package version change does not erase original target or elapsed time.

Additional Frontline Release Review clocks must cover handoff acceptance, package assembly, source correction, exception review, reviewer assignment/decision, atomic projection, physical placement, digital/sales availability reconciliation, downstream acceptance, post-release verification, suspension response, correction, and reinstatement. Package rebuild, reviewer reassignment, release replay, suspension, or new authorization does not erase original release targets or pre-frontline age.

Clock rules:

- new estimates do not erase original commitments;
- reassignment and comments do not reset clocks;
- a pause needs reason, owner, evidence where required, review time, and expiry;
- external waiting remains visible and internally owned;
- business-time and calendar-time views are both retained where needed.

## 7. Evidence policy

Every evidence requirement defines subject, source, capture time, actor/system, integrity metadata, access classification, retention, expiry, verification state, and supersession relationship.

### First-slice evidence catalog

| Evidence ID | Evidence | Required when | Proposed criticality |
| --- | --- | --- | --- |
| `AT-EVD-001` | Approved acquisition/source reference | Every workflow start | Mandatory hard gate |
| `AT-EVD-002` | VIN/canonical identity evidence | Identity not already authoritative/fresh | Mandatory hard gate |
| `AT-EVD-003` | Acquisition authority evidence | Purchase/trade/consignment acceptance | Mandatory hard gate |
| `AT-EVD-004` | Current location source/observation | Location not authoritative | Mandatory for movement |
| `AT-EVD-005` | Destination approval | Destination selected or changed | Mandatory for movement |
| `AT-EVD-006` | Release authorization/reference | External pickup | Mandatory for dispatch |
| `AT-EVD-007` | Carrier quote/transport cost basis | Dealership bears cost | Mandatory for financial approval |
| `AT-EVD-008` | Cost approval | Amount exceeds executor authority | Mandatory for confirmation |
| `AT-EVD-009` | Roadworthiness/legal-operation evidence | Vehicle will be driven | Mandatory hard gate for drive method |
| `AT-EVD-010` | Insurance/driver eligibility | Internal driver method | Mandatory hard gate |
| `AT-EVD-011` | Confirmed transport plan | Every arranged movement | Mandatory |
| `AT-EVD-012` | Pickup/departure evidence | Pickup claimed complete | Mandatory for In Transit transition |
| `AT-EVD-013` | Pre-transport condition evidence | Required by source/method/risk policy | Conditional critical evidence |
| `AT-EVD-014` | Arrival/delivery evidence | Delivery claimed complete | Mandatory for Receipt handoff |
| `AT-EVD-015` | Transport damage comparison | New/disputed damage | Mandatory exception evidence |
| `AT-EVD-016` | Cancellation/amendment authority | Material plan cancellation/change | Mandatory |

The Receipt and Custody evidence catalog is defined separately in [`RECEIPT_CUSTODY_DECISION_CATALOG.md`](RECEIPT_CUSTODY_DECISION_CATALOG.md). Its physical identity, custody transfer/containment, secure placement, critical-condition, and receipt-gate evidence are proposed hard controls and require policy-owner approval before activation.

The Inspection and Triage evidence catalog is defined in [`INSPECTION_TRIAGE_DECISION_CATALOG.md`](INSPECTION_TRIAGE_DECISION_CATALOG.md). Template selection, inspector eligibility, required item results, measurements, operation eligibility, critical containment, finding disposition, and triage-gate evidence are proposed hard or conditional controls and require policy-owner approval before activation.

The Recon Planning and Approval evidence catalog is defined in [`RECON_PLANNING_APPROVAL_DECISION_CATALOG.md`](RECON_PLANNING_APPROVAL_DECISION_CATALOG.md). Finding/diagnosis lineage, work requirements, cost sources, estimate versions, economics comparisons, authority, exact authorization, job lineage, changed-scope reapproval, and planning-gate evidence are proposed hard or conditional controls and require policy-owner approval before activation.

The Parts and Repair Execution evidence catalog is defined in [`PARTS_REPAIR_EXECUTION_DECISION_CATALOG.md`](PARTS_REPAIR_EXECUTION_DECISION_CATALOG.md). Parts demand/source/fitment, purchase authority, receipt/discrepancy, reservation and custody, effective procedure, technician/resource eligibility, dispatch, pre-work safety, labor events, changed scope, installation/completion, and QC-handoff evidence are proposed hard or conditional controls and require policy-owner approval before activation. A quote is not stock; an order acknowledgement is not receipt; on-hand is not necessarily available; reserved is not issued; issued is not installed; and technician finish is not QC pass.

The Quality and Safety Verification evidence catalog is defined in [`QUALITY_SAFETY_VERIFICATION_DECISION_CATALOG.md`](QUALITY_SAFETY_VERIFICATION_DECISION_CATALOG.md). QC handoff, applicable template, inspector independence, completion/safety/functional checks, measurement provenance, peer verification, road-test applicability and outcome, immutable disposition, rework lineage, all-job latest-pass, stopped labor, keys/custody, final condition, exception review, operational release, downstream acceptance, and post-release recovery are proposed hard or conditional controls and require policy-owner approval before activation. Technician completion is not QC; inspection performed is not pass; job pass is not order release; and operational repair release is not frontline readiness.

The Title and Document Readiness evidence catalog is defined in [`TITLE_DOCUMENT_READINESS_DECISION_CATALOG.md`](TITLE_DOCUMENT_READINESS_DECISION_CATALOG.md). Requirement context/template, document receipt and custody, integrity, identity, assignment/signature, odometer, brand/history/disclosure, ownership chain, lien/payoff/release, requirement disposition, external submission/status, correction, blocker/constrained authority, qualified review, final readiness, downstream acceptance, and post-ready recovery are proposed hard or conditional controls and require counsel/compliance and policy-owner approval before activation. Receipt is not verification; verification is not legal adjudication; submission is not agency acceptance; payoff is not lien release; and title readiness is not frontline readiness.

The Merchandising and Pricing evidence catalog is defined in [`MERCHANDISING_PRICING_DECISION_CATALOG.md`](MERCHANDISING_PRICING_DECISION_CATALOG.md). Preparation eligibility, verified vehicle/equipment/mileage/condition/title/claim facts, media capture and review, content/AI provenance, content approval, cost/market/comparable analysis, price confidence/approval, channel payload/request/status/reconciliation, exception correction, package completion, frontline-review handoff, and post-publication recovery are proposed hard or conditional controls and require policy-owner approval before activation. Draft is not approved content; recommendation is not approved price; acknowledgement is not live publication; and package completion is not frontline readiness.

The Frontline Release Review evidence catalog is defined in [`FRONTLINE_RELEASE_REVIEW_DECISION_CATALOG.md`](FRONTLINE_RELEASE_REVIEW_DECISION_CATALOG.md). Applicable readiness policy, exact upstream source versions, critical-dimension results, frozen package fingerprint, permitted exception authority, reviewer independence, immutable authorization, atomic lifecycle projection, physical placement, digital/sales availability, downstream handoff, post-release verification, suspension, correction, reinstatement, and outage reconciliation are proposed hard or conditional controls and require policy-owner approval before activation. Upstream completion is not a full package; evaluation is not authorization; authorization is not availability; and frontline status is not a sale or permanent fact.

Evidence states:

```text
REQUIRED_MISSING
CAPTURED_UNVERIFIED
VERIFIED_ACCEPTED
REJECTED
EXPIRED
SUPERSEDED
CONFLICTING
QUARANTINED_OR_RESTRICTED
NOT_APPLICABLE_WITH_AUTHORITY
```

## 8. Exception and reason-code controls

Reason codes from the decision catalog map to enterprise reason families and remain stable. Free text explains case-specific facts but cannot replace the structured reason.

Every active exception requires:

- subject and affected outcome;
- detected condition and evidence;
- hard-rule status and risk dimensions;
- one resolver and supporting dependency owners;
- containment action;
- next action and response-by time;
- next review/escalation time;
- closure verification;
- root/correlated exception relationship.

Risk acceptance requires named authority, rationale, exact scope, expiry/review date, residual risk, and verification. Non-waivable gates cannot use risk acceptance.

## 9. Escalation policy

Proposed levels:

1. **Owner attention:** actionable reminder before/at response target.
2. **Inventory manager attention:** missed acknowledgement, stage target, or material exposure.
3. **Cross-functional coordination:** title, office, safety, transport provider, location, or other dependency owner required.
4. **General/operations manager attention:** critical custody, high exposure, repeated failure, acquisition reversal, or policy exception.
5. **Executive/external response:** only when policy, law, severity, insurer, law enforcement, or authorized judgment requires it.

Notifications must state what happened, what evidence supports it, what the recipient can do, response deadline, and consequence of no action. Repeated reminders correlate to one exception rather than generating duplicate alerts.

## 10. Recommendation controls

The first release is deterministic and recommendation-only.

Transportation recommendations may consider, after eligibility:

- distance and route;
- expected pickup/arrival;
- quote and incremental recovery cost;
- storage cost/time-to-harm;
- vehicle condition and handling requirements;
- provider approval/availability/performance facts;
- authorized employee/resource availability;
- destination capacity/hours;
- uncertainty and missing information.

Each recommendation discloses eligible alternatives, excluded alternatives and reasons, inputs/freshness, policy version, estimated impacts, confidence/data sufficiency, and required approval. Staff may choose another eligible option with a structured reason. The system must not optimize from invented utilization, duration, cost, or provider data.

## 11. Workflow configuration lifecycle

```text
DRAFT -> IN_REVIEW -> APPROVED -> SHADOW -> PILOT_ACTIVE
-> ACTIVE -> PAUSED -> RETIRED
```

Rules:

- only approved versions may enter shadow/pilot;
- active cases retain their start-version unless an explicit compatible migration is approved;
- hard-rule or safety defects can pause new starts immediately;
- pause stops new automated starts/actions but preserves visibility and safe manual recovery;
- retiring a version does not erase its cases, decisions, or evidence;
- rollback selects a prior compatible version for new cases and uses explicit recovery for in-flight cases.

## 12. Audit and retention

Audit captures actor/source, delegated authority, prior/new value, reason, workflow/catalog/policy version, correlation, occurrence/recording time, device/source context where approved, and evidence references.

Retention, legal hold, export, and destruction follow approved Vehicle Operations governance. Sensitive addresses, identity conflicts, insurance, contact details, and documents require least-privilege visibility and must not leak into general task titles, notifications, or logs.

## 13. Policy approval gate

The first code slice may define structures that hold these policies, but no live policy is approved until the Approval Register contains:

- named policy and workflow owners;
- real role/capability mappings;
- approved organization/location scope;
- financial authority and reapproval thresholds;
- stage timing and escalation rules;
- evidence requirements and classification;
- roadworthiness, insurance, release, and custody hard stops;
- cancellation/reversal authority;
- pilot scope, monitoring owner, pause, and rollback authority.
