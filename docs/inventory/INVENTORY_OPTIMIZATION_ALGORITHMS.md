# Inventory Console Optimization Algorithms

**Product:** Time Motor Sales Dispatch Board  
**Module:** Inventory Operations Console  
**Version:** 1.0 planning baseline  
**Date:** 2026-07-13  
**Status:** Algorithm foundation implemented; persistence, APIs, and console UI remain future vertical slices  
**UI source of truth:** [`INVENTORY_CONSOLE_UI_SOURCE_OF_TRUTH.md`](INVENTORY_CONSOLE_UI_SOURCE_OF_TRUTH.md)

---

## 1. Purpose

The Inventory Operations Console is the vehicle and repair-parts operating layer inside the Dispatch Board. It must continuously answer:

1. What inventory exists, where is it, and who owns its next action?
2. What lifecycle stage is each vehicle or part in?
3. How old is the inventory overall and within its current stage?
4. What is blocking movement?
5. What should happen next to release the most operational or financial value?
6. Which work should be assigned, approved, escalated, transferred, reordered, repriced, or disposed?
7. What evidence explains each recommendation?
8. Did the recommendation improve the intended operating outcome?

This specification defines the deterministic algorithms, scoring models, time controls, safeguards, outputs, and calibration measures planned for the Inventory Console.

The system can optimize against defined objectives, but it cannot guarantee a universal maximum. Productivity and efficiency must be measured against explicit targets such as time-to-frontline, inventory turn, gross-per-day, parts fill rate, stock accuracy, bay utilization, recon cycle time, and blocker resolution time.

## 2. Product decisions

The following decisions are binding for the planning baseline:

- Manage vehicle inventory and repair-parts inventory as connected but distinct lifecycles.
- Use one shared command layer for ownership, location, aging, costs, blockers, tasks, approvals, alerts, audit history, and next-best action.
- Record every lifecycle transition as a timestamped, attributable event.
- Use eligibility rules and state machines before weighted scores.
- Use deterministic, explainable, versioned algorithms before predictive machine-learning models.
- Treat recommendations as advice. Authorized staff retain decision authority and may override with a recorded reason.
- Create operational work through the existing Tasks Console rather than creating a second task engine.
- Never silently change inventory status, ownership, price, purchase commitment, accounting value, or disposition.
- Preserve the distinction between authoritative facts, calculated values, predictions, and user-entered estimates.
- Require confidence and missing-input reporting for every material recommendation.

## 3. Connected lifecycle model

### 3.1 Vehicle lifecycle

```text
ACQUISITION_OPPORTUNITY
  -> APPRAISAL
  -> APPROVAL_MAX_BID
  -> PURCHASED_OR_TRADE_IN
  -> TRANSPORTATION
  -> RECEIVED
  -> INSPECTION
  -> RECONDITIONING
  -> TITLE_DOCUMENT_READINESS
  -> PHOTOGRAPHY_MERCHANDISING
  -> FRONTLINE_READY
  -> RESERVED_DEAL_PENDING
  -> SOLD
  -> DELIVERED

Alternate terminal path:
  -> WHOLESALED_OR_OTHER_DISPOSITION
```

Every transition requires an effective time, actor or system source, prior stage, next stage, and correlation identifier. Reversals must be explicit events rather than destructive edits.

### 3.2 Repair-parts lifecycle

```text
DEMAND_IDENTIFIED
  -> PART_SOURCED
  -> VENDOR_COMPARISON
  -> APPROVAL
  -> PURCHASE_ORDER
  -> ORDERED
  -> RECEIVED
  -> INSPECTED
  -> BINNED
  -> RESERVED_FOR_REPAIR_ORDER
  -> ISSUED_TO_TECHNICIAN
  -> INSTALLED
  -> RETURNED_CORE_OR_WARRANTY_CLAIM
  -> RECONCILED
```

The lifecycle must support cancellation, substitution, partial receipt, backorder, transfer, damaged receipt, unused return, core return, warranty return, and vendor-credit paths.

### 3.3 Shared command layer

Both lifecycles share:

- accountable owner and collaborators
- physical and logical location
- lifecycle stage and stage history
- age, target duration, expected completion, and confidence
- acquisition, recon, parts, carrying, and projected disposition costs
- blocker, dependency, approval, and exception state
- tasks, appointments, comments, attachments, and evidence
- alerts and escalation history
- next-best-action recommendation
- decision record, override, and measured outcome

### 3.4 Retail Inventory versus Shop workflow boundary

The dealership has two related vehicle workflows that must remain operationally distinct:

```text
RETAIL INVENTORY
  acquisition -> appraisal -> purchase/trade -> receive -> inspect
  -> inventory recon handoff when required -> title -> merchandise
  -> frontline -> deal -> sold -> delivered or disposed

SHOP
  vehicle intake -> diagnostic -> estimate -> approval -> parts ordering
  -> ready for repair -> repairs -> quality control -> delivery or inventory handoff
```

Boundary rules:

- A customer-owned vehicle enters `SHOP_CUSTOMER_REPAIR` and never becomes dealership retail inventory.
- A dealership-owned vehicle intended for sale remains in `RETAIL_INVENTORY`; diagnostic or repair work creates a linked `SHOP_INVENTORY_RECON` work order.
- Shop controls diagnosis, approval, parts, repair execution, and QC.
- Inventory controls acquisition, capital exposure, title, merchandising, frontline readiness, pricing, sale, and disposition.
- A customer repair that passes QC routes to customer delivery.
- Inventory recon that passes QC routes back to title/document readiness or photography/merchandising.
- Failed QC returns to Repairs. It cannot be hidden by an overall completion percentage.
- Parts inventory supports both workflows, but each reservation must retain its customer-repair or inventory-recon source.

The Workflow Routing Engine uses structured ownership, retail intent, and repair-required facts. Free-text keywords do not decide whether a vehicle is customer property or dealership inventory.

## 4. Standard decision architecture

All algorithms follow this order:

1. **Data sufficiency:** determine whether required facts are present and current.
2. **Eligibility:** remove subjects or actions that are not valid.
3. **Hard rules:** enforce safety, compliance, title, authorization, accounting, and customer-commitment constraints.
4. **State machine:** determine allowed lifecycle transitions.
5. **Scoring or optimization:** rank the remaining valid choices.
6. **Human control:** approve, adjust, or override where policy requires.
7. **Execution:** create a task, approval, alert, transfer, order, or recommendation.
8. **Outcome capture:** measure what happened for later calibration.

### 4.1 Standard decision envelope

Every material algorithm returns the conceptual equivalent of:

```text
decisionType
algorithmVersion
subjectType and subjectId
evaluatedAt
eligible
score or recommended value
priority or risk band
recommendedActionCode
recommendedOwner or destination
dueAt or expectedCompletionAt
reasonCodes
humanExplanation
confidence
missingInputs
hardRuleCode
managerReviewRequired
inputFingerprint
```

Rules:

- Scores use a documented bounded range, normally 0 through 100.
- Reason codes are stable and machine-readable.
- Explanations are assembled from approved factors, not invented by an opaque model.
- Identical normalized inputs and algorithm versions must produce identical results.
- Missing required inputs reduce confidence or stop the recommendation.
- A high score cannot override a safety, compliance, title, accounting, or permission rule.

## 5. Inventory Lifecycle Age Engine

### 5.1 Objective

Measure total age, current-stage age, productive time, justified waiting time, and unexplained idle time. The engine must identify exactly where lifecycle time is being consumed.

### 5.2 Vehicle clocks

- Acquisition age: opportunity created to purchase or trade approval
- Transit age: purchased to physically received
- Intake age: received to inspection completed
- Recon age: inspection completed to recon completed
- Parts-wait age: part requested to usable receipt
- Approval-wait age: approval requested to decision
- Title age: received to title/document ready
- Merchandising age: recon ready to photos and listing published
- Frontline age: frontline ready to reservation, sale, or disposition
- Deal-pending age: reserved to sale, release, or cancellation
- Delivery age: sold to delivered
- Total inventory age: financial acquisition to sale or disposition

### 5.3 Parts clocks

- Demand-to-source time
- Source-to-vendor-selection time
- Approval time
- Purchase-order creation time
- Vendor lead time
- Receiving and inspection time
- Bin-to-reservation time
- Reservation-to-issue time
- Issue-to-install time
- Return-to-credit time
- Shelf age since receipt
- Time since last demand or issue
- Quantity-days held

### 5.4 Time classification

```text
Total Lifecycle Time = Current or Terminal Time - Lifecycle Start Time

Active Work Time = Sum of intervals with active accountable work
Waiting Time = Sum of approved parts, vendor, title, approval, or customer waits
Idle Time = Total Lifecycle Time - Active Work Time - Waiting Time

Stage Delay Ratio = Actual Stage Duration / Target Stage Duration
```

Paused time is allowed only for versioned, explicit pause reasons. A comment or routine status update does not reset an age clock.

### 5.5 Lifecycle Delay Score

Planning weights:

```text
Lifecycle Delay Score =
  30 * normalizedStageDelay
+ 25 * normalizedCarryingCostExposure
+ 20 * normalizedDownstreamRevenueImpact
+ 15 * normalizedBlockerSeverity
+ 10 * normalizedOwnershipOrUpdateRisk
```

Bands:

- `0-24 HEALTHY`
- `25-44 WATCH`
- `45-64 AT_RISK`
- `65-84 CRITICAL`
- `85-100 DISPOSITION_REVIEW`

Safety, title, compliance, customer-delivery, or missing-owner hard rules may place an item directly into a critical queue regardless of score.

### 5.6 Outputs

- total and stage age
- active, waiting, and idle percentages
- longest-delay stage
- current owner and blocker
- target and expected completion
- expected-completion confidence
- estimated carrying-cost exposure
- next action and escalation requirement
- age reason codes such as `STAGE_TARGET_BREACHED`, `UNEXPLAINED_IDLE_TIME`, `PARTS_WAIT_EXCESSIVE`, and `FRONTLINE_AGE_CRITICAL`

## 6. Vehicle inventory algorithms

### 6.1 Acquisition Opportunity Score

**Objective:** Rank potential purchases and trade-ins by local fit, expected return, liquidity, and execution risk.

Planning formula:

```text
Acquisition Score =
  25 * Market Demand Fit
+ 20 * Expected Gross Quality
+ 15 * Expected Turn Speed
+ 10 * Historical Store Fit
+ 10 * Merchandising Appeal
+ 10 * Data Confidence
+ 10 * Strategic Need
- 15 * Recon Risk
- 10 * Title or History Risk
- 10 * Capital Concentration Risk
```

The final value is clamped to 0 through 100. Safety, title, identity, permission, and unresolved condition rules can make a vehicle ineligible.

Primary outputs:

- acquisition score and band
- pursue, inspect further, watch, or decline recommendation
- maximum-bid evaluation eligibility
- comparable-set confidence
- risk and opportunity reason codes

### 6.2 Market Fit Score

**Objective:** Determine whether a vehicle belongs in the dealership's active inventory strategy.

Inputs include:

- historical dealership sales by make, model, trim, age, mileage, and price band
- current local competitive supply
- lead, search, appointment, and customer-interest signals
- historical days-to-sale and gross
- seasonal and location effects
- current category concentration

Planning factors:

- local demand 30%
- historical store performance 25%
- competitive scarcity 15%
- price-band fit 10%
- customer-intent evidence 10%
- portfolio balance 10%

The engine must not manufacture confidence when history or market data is sparse.

### 6.3 Appraisal Confidence Engine

**Objective:** Indicate whether an appraisal has enough reliable evidence for an acquisition decision.

Factors include VIN decode quality, trim certainty, mileage verification, condition evidence, comparable quantity and recency, history/title evidence, recon estimate quality, and market-data freshness.

Bands:

- `HIGH`: sufficient verified evidence and stable comparable set
- `MEDIUM`: usable with disclosed uncertainty
- `LOW`: manager review and additional inspection required
- `INSUFFICIENT`: max-bid recommendation must not be issued

### 6.4 Maximum Bid and Purchase Limit Engine

**Objective:** Protect expected return by calculating the most the dealership should commit before fees and uncertainty exceed policy.

```text
Expected Retail Proceeds
- Target Gross
- Expected Recon Cost
- Acquisition and Transport Fees
- Expected Holding Cost
- Title, Merchandising, and Selling Costs
- Risk Reserve
= Recommended Maximum All-In Cost

Recommended Maximum Bid =
  Recommended Maximum All-In Cost
  - Buyer Fees
  - Transport
  - Other Known Acquisition Costs
```

Risk reserve increases when appraisal confidence is lower, recon variance is higher, or expected turn is slower. The engine recommends; only an authorized person may approve or commit a purchase.

### 6.5 Recon Cost and Variance Engine

**Objective:** Estimate recon cost and expose uncertainty before and during reconditioning.

The engine compares:

- inspection findings
- standard labor and parts expectations
- similar historical vehicles and repairs
- vendor quotes
- approved scope versus actual scope
- committed, incurred, and forecast-to-complete costs

Outputs include expected cost, confidence range, variance, unexplained variance, approval requirement, and projected impact on maximum all-in cost.

### 6.6 Reconditioning Priority Engine

**Objective:** Rank vehicles for inspection, mechanical work, parts resolution, detail, and merchandising.

Eligibility first removes vehicles that cannot safely or legally proceed. Planning score:

```text
Recon Priority =
  25 * Revenue Release Potential
+ 20 * Lifecycle Delay Pressure
+ 15 * Customer or Delivery Commitment
+ 15 * Work Readiness
+ 10 * Parts Availability
+ 10 * Downstream Blockage
+  5 * Bay and Skill Fit
```

Hard rules place imminent delivery commitments, safety remediation, and critical title/compliance dependencies above routine scored work.

### 6.7 Critical Ratio Scheduling

**Objective:** Identify work whose remaining time is becoming incompatible with its required completion time.

```text
Critical Ratio = Time Remaining Until Required Completion / Estimated Work Remaining
```

- Less than `1.0`: completion is at risk or already late
- Approximately `1.0`: no useful schedule buffer remains
- Greater than `1.0`: schedule has remaining buffer

Critical ratio is a prioritization input, not the only assignment rule. Safety, skill, dependency, and parts readiness still apply.

### 6.8 Bay, Skill, and Work Assignment Optimizer

**Objective:** Recommend the best eligible staff member, bay, vendor, and start window for ready work.

Constraints include:

- required skill or certification
- bay and equipment compatibility
- staff availability and active workload
- parts and approval readiness
- task dependencies
- promised completion
- location and movement time
- work continuity and excessive context switching

The first release should use deterministic constraint filtering followed by weighted ranking. Mathematical scheduling optimization may be introduced only after duration and capacity data are reliable.

### 6.9 Frontline Readiness Score

**Objective:** Prevent vehicles from being treated as sellable before all required conditions are complete.

Required dimensions:

- mechanical and safety readiness
- title/document readiness
- clean/detail completion
- keys, accessories, and required equipment
- photos, description, price, and listing syndication
- location confirmation
- unresolved recall or policy exception

Readiness is a checklist-backed gate, not an average that lets one critical missing dimension hide behind completed items.

### 6.10 Dynamic Aging and Pricing Recommendation

**Objective:** Recommend review actions as market position and holding exposure change.

Inputs include frontline age, market price position, lead and VDP activity, appointments, offer history, comparable movement, gross floor, carrying cost, seasonality, and merchandising completeness.

Possible actions:

- hold and monitor
- improve merchandising
- correct data or pricing error
- targeted promotion
- manager price review
- transfer to another location
- wholesale or disposition review

The engine must not autonomously publish a new price in the initial release.

### 6.11 Vehicle Disposition Score

**Objective:** Identify when continued retail holding is less attractive than transfer, wholesale, or another approved exit.

Planning factors:

- remaining expected retail gross
- probability and expected time to retail sale
- carrying-cost trajectory
- current wholesale recovery
- recon or title exposure
- customer-intent strength
- location-specific fit
- opportunity cost of capital and space

Disposition always requires authorized review and a recorded reason.

### 6.12 Lot Location and Movement Control

**Objective:** maintain reliable physical location, reduce search time, and place vehicles where the next workflow can act.

The engine recommends movement based on lifecycle stage, next appointment or work step, keys status, customer visibility, safety restrictions, and lot capacity. Location confidence falls when scans, check-ins, or movement events are stale or contradictory.

## 7. Repair-parts inventory algorithms

### 7.1 ABC-XYZ Classification

**Objective:** Set control intensity according to financial importance and demand predictability.

ABC classification uses annual consumption value:

```text
Annual Consumption Value = Annual Quantity Used * Unit Cost
```

- `A`: highest financial exposure; tight controls and frequent review
- `B`: material but moderate exposure
- `C`: low financial exposure; simpler controls

XYZ classification uses demand variability:

- `X`: stable, predictable demand
- `Y`: variable or seasonal demand
- `Z`: intermittent or highly unpredictable demand

Combined classes such as `AX`, `BZ`, and `CZ` determine stocking policy, count frequency, safety stock, and approval rules.

### 7.2 Parts Demand Forecast

**Objective:** estimate future demand by part, substitute group, service category, vehicle population, location, and time period.

Planning hierarchy:

1. recent weighted usage
2. seasonality and trend
3. scheduled repair-order demand
4. appointment and inspection demand signals
5. supersession and substitute relationships
6. location and vehicle-population effects

Forecasts must report a range and confidence. Intermittent-demand parts require a method designed for sparse usage rather than a simple average.

### 7.3 Safety Stock and Reorder Point

**Objective:** reduce stockouts without tying up unnecessary cash.

```text
Reorder Point = Expected Demand During Lead Time + Safety Stock

Safety Stock =
  Service-Level Factor
  * Combined Demand and Lead-Time Uncertainty
```

Inputs include demand rate, supplier lead time, variability, desired service level, open orders, reservations, substitutes, and transfer availability.

### 7.4 Recommended Order Quantity

**Objective:** recommend a practical quantity after considering demand, carrying cost, order cost, packaging, minimum order, and available cash.

Economic order quantity may be used as a reference:

```text
EOQ = square root of ((2 * Annual Demand * Order Cost) / Annual Holding Cost Per Unit)
```

The operational recommendation must then apply pack size, minimum order, shelf capacity, expiration, existing orders, reservations, transfer opportunities, and policy limits.

### 7.5 Vendor Selection Score

**Objective:** recommend the best valid source, not merely the lowest listed price.

Planning formula:

```text
Vendor Score =
  25 * Availability
+ 20 * Delivery Reliability
+ 15 * Total Landed Cost
+ 10 * Correct-Part Accuracy
+ 10 * Fill Rate
+  5 * Return Convenience
+  5 * Warranty Performance
+  5 * Payment Terms
+  5 * Historical Service Quality
```

Emergency orders may use a different version that increases ETA and reliability weights. Conflicts of interest and non-approved vendors are eligibility issues, not scoring factors.

### 7.6 Parts ETA and Repair-Risk Engine

**Objective:** predict whether a part will arrive in time to protect the repair schedule or customer commitment.

Factors include promised ETA, supplier reliability, shipment state, order age, backorder status, substitute availability, transfer availability, repair critical ratio, and customer delivery deadline.

Outputs include on-time confidence, projected arrival range, affected repair orders, alternate-source recommendation, and escalation time.

### 7.7 Reservation and Allocation Engine

**Objective:** allocate available parts to the right repair order without double commitment.

Hard constraints:

- exact or approved substitute compatibility
- usable condition
- required quantity
- location and transfer feasibility
- safety or quality restrictions
- existing committed reservations

Ranking factors:

- safety and customer commitment
- repair critical ratio
- downstream revenue release
- reservation age
- availability of alternatives
- manager-approved exception

All reservations require expiration or release rules so abandoned work does not hide usable stock.

### 7.8 Multi-Location Transfer Optimizer

**Objective:** recommend transfer before external purchase when transfer produces the better operational result.

```text
Transfer Benefit =
  Avoided Purchase Cost
+ Avoided Stockout or Delay Cost
- Transfer Cost
- Source Location Stockout Risk
- Transfer Time Risk
```

The engine must protect the source location's reservations, safety stock, and known scheduled demand.

### 7.9 Receiving and Put-Away Priority

**Objective:** prioritize received parts that unlock active repairs and accurately update usable inventory.

Highest priority includes safety-related repairs, customer delivery blockers, overdue repair orders, and parts with active reservations. A part is not usable until quantity, condition, identity, and location are confirmed.

### 7.10 Core, Return, and Warranty Recovery Engine

**Objective:** prevent lost credits and untracked recoverable value.

The engine tracks:

- return or core eligibility
- required documentation and packaging
- return deadline
- expected credit
- responsible owner
- shipment and vendor receipt
- credit received and reconciled

Priority increases with credit value, approaching deadline, missing ownership, and disputed vendor status.

### 7.11 Cycle Count Risk Engine

**Objective:** count the right inventory at the right frequency.

Planning factors:

- ABC financial class
- movement velocity
- historical discrepancy rate
- shrinkage risk
- negative or impossible balances
- recent receiving, transfers, and returns
- bin accessibility and shared handling
- time since last verified count

The engine produces a daily or weekly count queue with reason codes and expected count effort.

### 7.12 Obsolescence and Dead-Stock Engine

**Objective:** identify parts whose expected future value no longer justifies continued holding.

Inputs include shelf age, time since last issue, demand forecast, supersession, return eligibility, vehicle population, quantity on hand, carrying cost, and transfer or wholesale demand.

Actions include retain, reduce reorder level, transfer, vendor return, bundle, wholesale, or authorized write-down/disposal review.

### 7.13 Shrinkage and Inventory Anomaly Detection

**Objective:** identify facts requiring verification without making unsupported accusations.

Initial deterministic signals:

- negative on-hand quantity
- issue without repair-order attribution
- repeated manual adjustments
- duplicate purchase or receipt
- received quantity inconsistent with invoice or PO
- reserved quantity exceeding usable stock
- unexplained bin movement
- return created without shipment or credit progression
- cost or quantity outside configured tolerance

The output is a verification task or manager review, not an employee misconduct conclusion.

## 8. Shared command-layer algorithms

### 8.1 Data Confidence and Freshness Engine

**Objective:** prevent authoritative-looking recommendations from incomplete, stale, or contradictory data.

Dimensions:

- required-field completeness
- source authority
- timestamp freshness
- identity and VIN/part-number certainty
- cross-record consistency
- inspection or count evidence
- estimate versus actual distinction

Outputs are `HIGH`, `MEDIUM`, `LOW`, or `INSUFFICIENT`, plus missing inputs and contradictions.

### 8.2 Blocker Severity Engine

**Objective:** classify blockers by operational consequence and required authority.

Hard-critical blockers include unresolved safety stops, material title/compliance exposure, imminent blocked customer delivery, and critical work with no owner.

Non-critical blocker score factors:

- age against intervention threshold
- number and importance of blocked downstream steps
- financial or revenue exposure
- customer commitment
- availability of a workaround
- clarity of next action and owner

### 8.3 Ownership and Work Routing Engine

**Objective:** recommend an accountable owner and collaborators for the next valid action.

Eligibility filters by role, permission, skill, location, employment status, and authority. Remaining candidates are ranked by capability fit, current workload, continuity, deadline fit, location, and conflict-of-interest rules.

The recommendation never silently reassigns work. Claims, requests, assignments, and manager overrides remain explicit commands.

### 8.4 Inventory Next-Best-Action Engine

**Objective:** recommend the single most valuable valid next action for each subject and rank the dealership's action queue.

Eligibility and hard rules run first. Planning score:

```text
Next-Best-Action Score =
  25 * Urgency
+ 20 * Revenue or Cost Release
+ 15 * Downstream Unblocking
+ 15 * Customer or Delivery Impact
+ 10 * Confidence of Benefit
+ 10 * Work Readiness
+  5 * Effort Efficiency
```

Example actions:

- inspect vehicle
- request or decide approval
- order or transfer part
- confirm ETA
- assign owner
- complete title requirement
- move vehicle to detail or photos
- correct merchandising
- review price
- release stale reservation
- initiate core return
- perform cycle count
- escalate blocker
- review disposition

### 8.5 Task Generation Engine

**Objective:** convert actionable inventory decisions into accountable Dispatch tasks.

A task is generated only when:

- an actionable condition exists
- no active equivalent task already owns the condition
- the target owner or claim route is valid
- the task has a due time or response target
- completion evidence is defined
- source inventory and decision records are linked

Task generation must be idempotent using subject, action code, policy version, and active lifecycle state.

### 8.6 SLA, Alert, and Escalation Engine

**Objective:** notify the right person at the right time without producing alert fatigue.

Rules include:

- stage-specific target and warning thresholds
- owner-first alerting
- escalation only when warning remains unresolved
- deduplication by subject and condition
- cooldown periods for unchanged conditions
- acknowledgement and snooze with reason
- immediate handling for hard-critical rules
- automatic resolution when authoritative state clears the condition

### 8.7 Expected Completion Engine

**Objective:** estimate when the current stage and full lifecycle will complete.

The initial deterministic estimate combines remaining standard work, active capacity, dependencies, parts ETA, approval ETA, business hours, and historical stage duration. Output must be a range with confidence, not a falsely precise timestamp.

### 8.8 Carrying Cost and Capital Exposure Engine

**Objective:** make the cost of time visible.

Vehicle exposure may include floorplan or capital cost, insurance, storage, depreciation or market movement, recon commitments, and opportunity cost. Parts exposure may include capital cost, shelf space, obsolescence, damage, and count/handling effort.

Calculated cost assumptions must be versioned and visible to authorized managers.

### 8.9 Outcome and Calibration Engine

**Objective:** determine whether recommendations improve operations and when weights or thresholds need review.

For every material decision, retain:

- recommendation and version
- accepted, rejected, expired, or overridden state
- override reason
- actual owner, action, cost, and completion time
- sale, gross, fill-rate, stockout, cycle-time, or recovery outcome
- data quality at decision time

Weights must not self-modify in production. Calibration proposals require analysis, approval, versioning, testing, and monitored rollout.

## 9. Stable reason-code catalog

Initial reason-code families:

- `AGE_*`: lifecycle and stage timing
- `ACQUISITION_*`: opportunity, market fit, and purchase limit
- `APPRAISAL_*`: evidence and confidence
- `RECON_*`: readiness, priority, parts, bay, and cost variance
- `TITLE_*`: title and documentation
- `MERCH_*`: photos, pricing, listings, and frontline readiness
- `PART_*`: demand, stock, reservation, substitution, and receipt
- `VENDOR_*`: source, ETA, reliability, return, and warranty
- `COUNT_*`: cycle count and discrepancy
- `COST_*`: carrying cost, margin, and capital exposure
- `BLOCKER_*`: blocked workflow and downstream impact
- `OWNER_*`: ownership, assignment, and authority
- `SLA_*`: warning, breach, escalation, and acknowledgement
- `DATA_*`: missing, stale, conflicting, or low-confidence input
- `SAFETY_*`, `COMPLIANCE_*`, and `CUSTOMER_*`: hard policy conditions

Exact codes will be finalized with each vertical implementation slice.

## 10. Policy and safety controls

- Safety and legal restrictions always outrank productivity scores.
- Financial commitments, pricing changes, write-downs, purchases, and dispositions require authorized commands.
- Recommendations must show the major factors that raised or lowered the result.
- Staff may report blockers without being penalized merely for making the blocker visible.
- An anomaly creates verification work; it does not declare wrongdoing.
- Algorithms may not use protected traits or irrelevant private information.
- Every override requires actor, time, prior recommendation, final action, and reason.
- Algorithm configuration is organization-scoped, versioned, effective-dated, and auditable.
- Preview or estimated data must never be presented as a persisted fact.
- External market, vendor, VIN, history, or pricing data requires an adapter with freshness and failure-state reporting.

## 11. Primary operating metrics

### Vehicle metrics

- acquisition decision time
- purchase-to-receipt time
- receipt-to-inspection time
- inspection-to-recon-complete time
- days to frontline
- active versus waiting versus idle time
- frontline age and total inventory age
- days to sale
- inventory turn
- gross and gross-per-day
- recon estimate variance
- percentage frontline-ready within target
- aged inventory and disposition recovery

### Parts metrics

- fill rate
- stockout rate
- first-time part accuracy
- supplier on-time delivery
- emergency-order rate
- repair delays caused by parts
- inventory accuracy
- reservation accuracy
- turnover and days on hand
- obsolete inventory value
- core and warranty credit recovery
- cycle-count discrepancy rate

### Shared command metrics

- unowned inventory exceptions
- blocker age and resolution time
- task duplication rate
- alert acknowledgement and usefulness
- recommendation acceptance and override rate
- expected versus actual completion
- decision confidence and missing-data rate
- downstream work released

## 12. Rollout sequence

The pure decision foundation for all six milestones is implemented under `src/server/inventory/`. Milestone completion here means formulas, contracts, safeguards, KPIs, exports, and unit tests exist. It does not mean the Inventory Console is production-ready; durable records, permissions, command services, APIs, integrations, and UI workflows must still be delivered as end-to-end slices.

### Milestone 1: Inventory foundation

- authoritative lifecycle definitions
- transition events and age clocks
- ownership, location, blocker, cost, and evidence contracts
- decision-record and policy-version contracts

### Milestone 2: Vehicle lifecycle control

- vehicle state machine
- lifecycle age and delay engine
- frontline-readiness gate
- recon priority and critical-ratio recommendations
- task and escalation bridge

### Milestone 3: Repair-parts lifecycle control

- parts state machine
- reservations, receipts, bins, issues, returns, and credits
- ABC-XYZ classification
- reorder point, vendor score, ETA risk, and cycle-count queue

### Milestone 4: Shared command center

- data-confidence, blocker, ownership, SLA, and next-best-action engines
- explainable queues and saved views
- manager approval and override workflows
- outcome capture

### Milestone 5: Financial and market optimization

- acquisition, market-fit, appraisal-confidence, and max-bid engines
- carrying-cost and recon-variance calculations
- aging, pricing-review, transfer, and disposition recommendations

### Milestone 6: Calibration and advanced optimization

- expected-completion ranges
- capacity-aware assignment and scheduling
- hierarchical demand forecasts
- multi-location optimization
- monitored calibration using measured outcomes

Each milestone must be implemented as small end-to-end slices containing domain rules, persistence, service, API, UI, permissions, audit evidence, and tests.

## 13. MVP algorithm boundary

The first production Inventory Console should include:

- vehicle and parts lifecycle state machines
- lifecycle age and stage-delay engine
- frontline-readiness gate
- recon priority and critical ratio
- parts reservations and receiving controls
- ABC-XYZ classification
- reorder point and vendor score
- parts ETA risk
- blocker, ownership, SLA, and next-best-action engines
- idempotent task generation
- explainable recommendations and logged overrides

Advanced market prediction, autonomous pricing, machine-learned demand, dynamic weight optimization, and fully optimized shop scheduling remain deferred until authoritative history and outcome data are sufficient.

## 14. Acceptance criteria for every algorithm

An algorithm is not rollout-ready until:

- its objective and prohibited uses are documented
- required and optional inputs are defined
- missing and stale data behavior is tested
- eligibility and hard rules are explicit
- formula, weights, thresholds, and version are controlled
- outputs include reason codes and a human explanation
- permissions and override behavior are enforced server-side
- execution is idempotent where applicable
- lifecycle events and decisions are auditable
- tests cover boundary, failure, and hard-rule scenarios
- a measurable outcome and calibration window are defined
- the UI distinguishes facts, estimates, recommendations, and predictions

## 15. Industry pattern references

The design combines operating patterns rather than copying any one product:

- Tekion ARC: unified dealership data and cross-department workflow architecture  
  <https://tekion.com/products>
- vAuto: market-based acquisition, appraisal, pricing, aging, and recon patterns  
  <https://www.vauto.com/>  
  <https://www.vauto.com/products/provision/>
- CDK Global: vehicle visibility, forecasting, fixed operations, parts scanning, and historical analysis  
  <https://www2.cdkglobal.com/vehicleinventory>
- Dealertrack DMS: parts aging, purchasing, scanning, returns, picking, and staging  
  <https://us.dealertrack.com/content/dealertrack/en/dealer-management-solutions.html>
- DealerSocket Inventory+: market intelligence, appraisal, sourcing, merchandising, and profit-per-day patterns  
  <https://www.dealer.solera.com/products/dealersocket/>
- Shop-Ware: clear repair-order and stocked-parts state visibility  
  <https://shop-ware.com/features/inventory-management-software/>
- PartsTech: multi-vendor sourcing and ordering within repair workflow  
  <https://get.partstech.com/learn-more>
- AutoLeap: repair-order-connected inventory, transfers, thresholds, usage, and margins  
  <https://autoleap.com/features/inventory/>
- Fullbay: real-time inventory, barcode controls, purchase orders, cores, reorder alerts, and multi-location practices  
  <https://www.fullbay.com/products/inventory-management-software/>

These references inform workflow principles only. The Inventory Console will use its own product language, interface, data model, policies, and implementation.
