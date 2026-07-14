# Vehicle Operations Canonical Glossary and RACI

**Milestone:** `VEH-004`  
**Version:** 1.0  
**Effective date:** 2026-07-13  
**Status:** Governance baseline; terms are approved for implementation planning, while system behavior remains subject to its milestone status  
**Accountable owner:** General Manager  
**Document steward:** Vehicle Operations Product Owner

## 1. Purpose

Provide one authoritative meaning, accountable business role, and system-of-record direction for every critical vehicle, inventory, shop, parts, time, financial, approval, and evidence concept used by the Vehicle Operations Console.

When another document or interface uses a term differently, this glossary governs unless an approved architecture decision record explicitly supersedes it. Synonyms may appear in user-facing labels, but persisted codes and business rules use the canonical term.

## 2. Governance roles

Roles describe responsibilities, not necessarily distinct employees. One person may hold multiple roles in a small dealership, but the system must preserve required approval boundaries.

| Role code | Role | Primary accountability |
| --- | --- | --- |
| `GM` | General Manager | Business policy, financial authority, risk acceptance, final operational escalation |
| `VPO` | Vehicle Operations Product Owner | Cross-domain definitions, roadmap, acceptance, workflow integrity |
| `IM` | Inventory Manager | Acquisition, retail inventory flow, title, merchandising, aging, disposition preparation |
| `SM` | Shop Manager / Dispatcher | Repair-order flow, technician dispatch, capacity, QC policy, shop exceptions |
| `SA` | Service Advisor | Customer intake, estimates, approvals, promises, status, delivery coordination |
| `TECH` | Technician | Diagnosis, labor, repair execution, evidence, blockers, QC handoff |
| `PM` | Parts Manager | Part master, vendors, purchasing, receiving, stock integrity, returns, recovery |
| `OM` | Office Manager / Controller delegate | Documents, accounting handoffs, title support, retention, reconciliation |
| `SO` | Security and Operations Owner | Access review, monitoring, incident coordination, backup/restore evidence |
| `APP` | Application Administrator | Configuration execution, access provisioning, technical operations; no implied business approval |
| `DATA` | Data/Reporting Steward | KPI definitions, data-quality rules, reconciliation, reporting lineage |

## 3. RACI key

- **A — Accountable:** owns the result and approves policy. Exactly one accountable role per decision.
- **R — Responsible:** performs or coordinates the work.
- **C — Consulted:** provides required subject-matter input before the decision.
- **I — Informed:** receives the decision or outcome.

## 4. Decision RACI

| Decision or control | A | R | C | I |
| --- | --- | --- | --- | --- |
| Canonical vehicle identity and duplicate resolution | VPO | IM | SA, OM, DATA | GM |
| Customer-owned versus dealership-owned workflow classification | VPO | IM, SA | SM | GM |
| Acquisition policy and appraisal evidence | GM | IM | OM, DATA | VPO |
| Purchase authorization and limit | GM | IM | OM | VPO |
| Retail lifecycle stage policy | VPO | IM | SM, OM | GM |
| Frontline readiness policy | GM | IM | SM, OM | VPO |
| Pricing or disposition policy | GM | IM | OM, DATA | VPO |
| Repair-order state and authorization policy | SM | SA | TECH, PM, OM | GM |
| Technician, bay, tool, and skill eligibility | SM | SM | TECH | SA |
| Quality-control and release policy | SM | TECH | SA, IM | GM |
| Parts master, stock, and count policy | PM | PM | SM, OM | GM |
| Purchase-order and adjustment authority | GM | PM | OM | SM |
| Customer promise and communication policy | GM | SA | SM, OM | VPO |
| KPI definition and reporting lineage | VPO | DATA | IM, SM, PM, OM | GM |
| Data classification and retention policy | GM | SO | OM, VPO | APP, DATA |
| Access policy and periodic access review | GM | SO | VPO, department owner | APP |
| Incident declaration and severity | SO | SO | GM, VPO, APP | affected owners |
| Disaster recovery declaration | GM | SO | VPO, APP, OM | all users |
| Algorithm policy, pilot, rollback, and retirement | VPO | DATA, APP | affected owner, SO | GM |
| Risk acceptance | GM | risk owner | SO, VPO, OM | affected owners |

## 5. Canonical identity and ownership terms

| Canonical term/code | Definition | Not equivalent to | Accountable owner | Intended source of truth |
| --- | --- | --- | --- | --- |
| `Vehicle` | The canonical physical vehicle identity shared across all workflows. | Inventory unit, appointment snapshot, repair order | VPO | Vehicle Registry |
| `VIN` | Normalized manufacturer vehicle identification number; raw input and validation evidence are retained. | Stock number or external database ID | VPO | Vehicle Registry, with external validation evidence |
| `StockIdentity` | Organization/location-scoped commercial stock identifier effective for a period. | Vehicle identity | IM | Retail Inventory |
| `ExternalIdentity` | Identifier assigned by a named external system with authority and mapping metadata. | Canonical ID | VPO | Integration identity map |
| `VehicleRelationship` | Effective-dated relationship connecting a vehicle to a customer, organization, deal, or stakeholder. | Permanent ownership fact | VPO | Vehicle Registry |
| `OwnershipClassification` | Structured classification such as customer-owned, dealership-owned, consigned, trade-pending, or historical. | Free-text usage note | VPO | Vehicle Registry |
| `InventoryUnit` | Dealership-controlled vehicle instance managed for retail, wholesale, or another approved disposition. | Vehicle or customer repair | IM | Retail Inventory |
| `CustomerVehicle` | Relationship view of a vehicle associated with a customer. | Separate duplicate vehicle | VPO | Vehicle Registry projection |
| `Custody` | Who is responsible for physical possession at a time. | Legal ownership or assignment | IM | Custody event history |
| `Location` | Approved organization place such as lot, building, vendor, transport, bay, or delivery area. | Free-text note | VPO | Organization/Location registry |

## 6. Retail inventory lifecycle terms

| Stage/code | Entry meaning | Completion evidence | Accountable owner |
| --- | --- | --- | --- |
| `ACQUISITION_OPPORTUNITY` | A candidate is under consideration; no purchase commitment exists. | Decision to appraise, watch, or decline | IM |
| `APPRAISAL` | Identity, condition, market, title/history, and recon evidence are being evaluated. | Versioned appraisal and confidence | IM |
| `APPROVAL_MAX_BID` | A purchase limit awaits or has received authorized approval. | Approved/rejected limit with actor and version | GM |
| `PURCHASED_OR_TRADE_IN` | An authorized acquisition or accepted trade has created dealership exposure. | Source document, amount, effective time, custody plan | IM |
| `TRANSPORTATION` | The vehicle is in controlled movement to an approved location. | Receipt and custody confirmation | IM |
| `RECEIVED` | Physical possession is confirmed but intake gates remain. | Receipt checklist, location, keys, damage, document exceptions | IM |
| `INSPECTION` | Safety, condition, diagnostic, document, and recon needs are being established. | Accepted inspection evidence and route decision | IM |
| `RECONDITIONING` | A linked inventory-recon RepairOrder is being authorized or executed. | Shop QC pass and inventory handoff | SM |
| `TITLE_DOCUMENT_READINESS` | Required ownership/title/compliance documents are incomplete or being verified. | All applicable critical document gates pass | OM |
| `PHOTOGRAPHY_MERCHANDISING` | Vehicle facts and approved media/listing package are being prepared or published. | Required content and publication evidence | IM |
| `FRONTLINE_READY` | All critical sale-readiness gates currently pass. | Readiness command and evidence snapshot | GM |
| `RESERVED_DEAL_PENDING` | Vehicle availability is constrained by a specific active deal/reservation. | Sale, release, expiry, or cancellation command | GM |
| `SOLD` | An authorized sale fact exists; delivery may remain incomplete. | Sale reference and delivery requirements | GM |
| `DELIVERED` | Custody and approved delivery requirements are complete. | Delivery command and required evidence | GM |
| `WHOLESALED_OR_OTHER_DISPOSITION` | An authorized terminal non-retail path was executed. | Disposition command, authority, amount/reference, custody | GM |

Stage is a current lifecycle fact. It is not a task status, location, department, or percentage complete.

## 7. Shop and repair terms

| Canonical term/code | Definition | Accountable owner | Intended source of truth |
| --- | --- | --- | --- |
| `ServiceVisit` | One customer or internal arrival/service episode for a vehicle. | SA | Shop Operations |
| `RepairOrder` / `RO` | Controlled commercial and operational container for authorized vehicle service work. | SM | Shop Operations |
| `RepairJob` | Independently estimable, authorizable, dispatchable, executable, and quality-reviewable work within an RO. | SM | Shop Operations |
| `Concern` | Reported symptom, request, or observed condition requiring evaluation. | SA | RepairOrder |
| `Cause` | Evidence-backed diagnosis of why a concern exists. | SM | RepairJob diagnosis |
| `Correction` | Work performed to resolve or address the cause. | SM | RepairJob execution |
| `DVI` | Versioned Digital Vehicle Inspection containing measurements, status, notes, and evidence. | SM | Inspection record |
| `EstimateVersion` | Immutable presented set of proposed labor, parts, fees, and applicable totals. | SA | RepairOrder estimate history |
| `Authorization` | Attributable acceptance, decline, deferral, partial acceptance, expiry, or revocation tied to an exact estimate version. | SA | Approval record |
| `WorkRequirement` | What capability, duration, skill, certification, bay, tool, part, or time window a job needs. | SM | Resource Scheduling |
| `Booking` | Which eligible resource is reserved for a requirement and when. | SM | Resource Scheduling |
| `FAST_TRACK` | Scoped short work eligible under configured duration, diagnostic, skill, and safety rules. | SM | Shop routing decision |
| `DIAGNOSTIC_HEAVY` | Work requiring diagnosis, advanced skill, or unresolved safety scope. | SM | Shop routing decision |
| `STANDARD_REPAIR` | Eligible work that is neither fast-track nor diagnostic/heavy. | SM | Shop routing decision |
| `QualityReview` | Independent or policy-defined validation of completed work and evidence. | SM | Shop Operations |
| `FirstPass` | Job passed applicable QC without a linked attributable return/rework under the governed comeback definition. | SM | Quality/comeback records |
| `Comeback` | A reviewed return or rework linked to a prior job; classification requires evidence and is not an automatic disciplinary conclusion. | SM | Comeback review |

## 8. Parts and procurement terms

| Canonical term/code | Definition | Accountable owner | Intended source of truth |
| --- | --- | --- | --- |
| `PartMaster` | Canonical part identity, manufacturer number, unit, category, and controlled attributes. | PM | Parts and Procurement |
| `Interchange` | Evidence-backed compatible or superseding part relationship with scope and source. | PM | Part master relationship |
| `StockItem` | A part held at a specific warehouse/bin and costing context. | PM | Parts balance projection |
| `StockLedgerEntry` | Immutable quantity/cost movement with source document, actor, location, time, and reversal link. | PM | Parts ledger |
| `OnHandQuantity` | Ledger-projected usable physical quantity before reservations. | PM | Parts balance projection |
| `AllocatedQuantity` | Quantity committed by active valid reservations. | PM | Reservation projection |
| `AvailableQuantity` | On-hand usable quantity minus active allocations and controlled holds. | PM | Parts balance projection |
| `Demand` | Documented need for a quantity by a job, stock policy, transfer, or approved request. | PM | Parts demand record |
| `Reservation` | Controlled allocation of available quantity to a specific demand. | PM | Parts reservation |
| `PurchaseOrder` / `PO` | Authorized order commitment to a vendor. | PM | Procurement aggregate |
| `Receipt` | Attributable acceptance of all or part of an order/transfer into custody, subject to inspection. | PM | Receiving record and ledger |
| `Core` | Returnable component with expected deadline and recoverable credit. | PM | Recovery record |
| `Adjustment` | Authorized ledger correction for a verified discrepancy; never a direct balance edit. | GM | Parts ledger command |
| `CycleCount` | Controlled physical observation and reconciliation of selected stock. | PM | Count record |

## 9. Work, status, blocker, and approval terms

| Term | Definition | Rule |
| --- | --- | --- |
| `Owner` | One role/person accountable for the next operational action on a record. | An owner is not necessarily the technician or creator. |
| `Assignee` | Person currently responsible for executing a task or booked work. | Assignment does not grant financial or approval authority. |
| `TaskStatus` | Execution state of a Task such as Not Started, In Progress, Blocked, Waiting, Ready for Review, or Completed. | Task status never substitutes for vehicle/RO/part state. |
| `Blocker` | Current condition preventing the next valid action. | Requires reason, owner, next review/action, and opened time. |
| `Waiting` | Approved period dependent on a named external/internal condition. | Waiting does not automatically stop a clock; policy determines clock treatment. |
| `Exception` | Detected violation, risk, mismatch, overdue state, or missing prerequisite requiring review. | An exception is evidence for work, not proof of wrongdoing. |
| `Approval` | Decision by an authorized actor over a versioned request. | Approval is distinct from acknowledgement and task completion. |
| `Override` | Authorized choice differing from a recommendation or default. | Requires actor, authority, reason, prior recommendation, and outcome. |
| `Acknowledgement` | Confirmation that information or work was received/seen. | Does not authorize spending, repair, release, price, or disposition. |
| `Escalation` | Routed increase in attention/authority because a defined condition remains active or critical. | Does not silently change business state. |
| `Critical` | Highest operational priority due to a configured safety, compliance, customer, integrity, or material-value condition. | Critical is policy-driven, not free-text emphasis. |

## 10. Time and clock terms

| Term | Formula or meaning | Clock owner |
| --- | --- | --- |
| `OccurredAt` | When the business event actually happened. | Event-producing domain |
| `RecordedAt` | When the system persisted the event. | Platform |
| `EffectiveAt` | When a policy, relationship, or decision becomes applicable. | Owning domain |
| `TotalInventoryAge` | Terminal/current time minus financial acquisition time. | IM |
| `StageAge` | Current time minus latest valid entry into current stage, adjusted only by approved policy. | Stage owner |
| `ActiveWorkTime` | Sum of attributable intervals with active work. | Owning work domain |
| `WaitingTime` | Sum of intervals in approved waiting conditions. | Owning work domain |
| `IdleTime` | Total tracked interval minus active and approved waiting time; never less than zero. | DATA |
| `TouchTime` | Direct attributable time actively working on the vehicle/job. | SM |
| `PromiseWindow` | Customer-approved expected interval for arrival or completion. | SA |
| `TargetAt` | Policy or manager-set desired completion timestamp. | Record owner |
| `DueAt` | Timestamp after which required action is overdue. | Policy owner |
| `ExpectedCompletionRange` | Forecast interval with confidence, assumptions, and evaluation time. | Owning decision engine |
| `SlaClock` | Versioned calculation over start, due, business calendar, pauses, and terminal condition. | Policy owner |

Persist instants in UTC. Display and business-calendar evaluation use the location time zone retained with the applicable event/policy. A comment or routine update never resets age.

## 11. Financial and quantity terms

| Term | Definition | Exclusions / rule | Accountable owner |
| --- | --- | --- | --- |
| `AcquisitionCost` | Authorized price paid/credited to acquire the vehicle. | Excludes later recon and carrying cost. | IM |
| `AcquisitionFees` | Auction, buyer, documentation, or directly attributable acquisition fees. | Categorized separately from price. | OM |
| `TransportCost` | Attributable cost to move vehicle into custody or between approved locations. | No estimate presented as actual. | IM |
| `ApprovedReconBudget` | Authorized ceiling for current recon plan/version. | Not actual cost. | GM |
| `CommittedCost` | Authorized obligation not yet fully incurred/received. | Source document required. | OM |
| `IncurredCost` | Accepted cost from completed/received work or goods. | Accounting status remains an integration fact. | OM |
| `ForecastAtCompletion` | Incurred plus valid commitments plus remaining estimate. | Must show confidence and evaluation time. | IM/SM |
| `CarryingCost` | Policy-calculated capital, storage, insurance, and approved opportunity/depreciation assumptions over time. | Calculated estimate, not general-ledger fact unless reconciled. | OM |
| `ProjectedRetailProceeds` | Evidence-based estimate of future retail proceeds. | Not sale price or guarantee. | IM |
| `ProjectedGross` | Projected proceeds less governed cost basis. | Formula version and included cost categories required. | DATA |
| `RealizedGross` | Reconciled actual proceeds less governed actual cost basis. | Requires accounting/DMS reconciliation. | OM |
| `ValueAtRisk` | Explainable estimated exposure associated with unresolved condition and time. | Decision aid, not accounting balance. | VPO |
| `UnitCost` | Governed costing amount per part unit. | Costing method requires Parts Ledger ADR. | PM/OM |
| `Quantity` | Non-negative amount in the part's governed unit of measure. | Current balance changes only through ledger. | PM |

## 12. Evidence, source, and confidence terms

| Term | Definition | Rule |
| --- | --- | --- |
| `AuthoritativeFact` | Accepted fact owned by the designated system/domain of record. | Carries source, time, and authority. |
| `ExternalFact` | Fact reported by a named external source. | Carries provider, retrieval time, freshness, and mapping version. |
| `UserObservation` | Attributable human observation such as condition or odometer reading. | May require verification; never mislabeled as external fact. |
| `Estimate` | Calculated or entered expectation subject to uncertainty. | Labeled with author/model, assumptions, version, and time. |
| `Prediction` | Model-produced future estimate. | Requires confidence/range, evaluation, and monitoring. |
| `Recommendation` | Suggested valid action after eligibility and policy evaluation. | Does not execute the action. |
| `Evidence` | Document, measurement, image, video, signature reference, checklist result, or external response supporting a claim. | Carries provenance, access, retention, and integrity metadata. |
| `Confidence` | `HIGH`, `MEDIUM`, `LOW`, or `INSUFFICIENT` assessment based on documented input quality. | Never substitutes for required evidence. |
| `Freshness` | Age of a fact relative to its policy-defined maximum acceptable age. | Stale facts remain visible but are labeled/rejected where required. |
| `Lineage` | Trace from displayed/derived value to source records, transformations, and versions. | Required for governed KPIs and material decisions. |

## 13. Source-of-truth hierarchy

1. Safety, legal, title, and compliance facts come from the approved authoritative record and accepted evidence.
2. Core operational state comes from the owning Dispatch Board domain command/event history.
3. Accounting, payment, lender, government, OEM, valuation, and vendor facts remain authoritative in their designated external system unless an approved ADR changes the boundary.
4. Integration projections never silently override canonical state when source authority conflicts.
5. Calculated values, estimates, predictions, and recommendations are always distinguishable from facts.
6. UI state, comments, exported spreadsheets, and cached pages are never authoritative sources.

## 14. Change control

Any glossary change affecting persistence, API, calculation, authority, or reporting requires:

1. change proposal and impacted-term list
2. accountable-owner approval
3. migration/backward compatibility analysis
4. KPI, policy, UI, integration, test, and documentation impact review
5. version/effective date and communication

Historical records retain the definitions and policy versions effective when they were created.

## 15. Acceptance evidence

`VEH-004` is satisfied when:

- critical identity, stage, status, clock, financial, quantity, approval, evidence, and source terms have canonical definitions
- each material decision has exactly one accountable business role
- system-of-record boundaries distinguish internal facts, external facts, estimates, and recommendations
- the document supplies the vocabulary required by `VEH-005`, `VEH-006`, and `VEH-007`

