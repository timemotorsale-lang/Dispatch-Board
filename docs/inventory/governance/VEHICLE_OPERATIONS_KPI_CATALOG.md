# Vehicle Operations KPI Catalog v1

**Milestone:** `VEH-005`  
**Catalog version:** 1.0.0  
**Effective date:** 2026-07-13  
**Status:** Approved definition baseline; most metrics do not yet have durable production facts or projections  
**Accountable owner:** Vehicle Operations Product Owner  
**Data steward:** Data/Reporting Steward  
**Vocabulary:** [`VEHICLE_OPERATIONS_GLOSSARY_RACI.md`](VEHICLE_OPERATIONS_GLOSSARY_RACI.md)

## 1. Purpose

Define calculation, unit, scope, exclusions, reporting window, owner, quality requirement, and drill-through source for every first-release Vehicle Operations metric. This catalog governs APIs, projections, dashboards, exports, targets, alerts, and decision outcomes.

No production KPI may be calculated only inside a UI component. Every displayed value must carry catalog version, scope, period, location time zone, calculated time, freshness, confidence, and a drill-through route or documented exception.

## 2. Common calculation policy

### Time and scope

- Persist instants in UTC; evaluate business dates and display periods in the selected location's IANA time zone.
- Default operational windows: current business day, trailing 7 completed business days, trailing 30 completed calendar days, and current month-to-date.
- A partial current period is labeled `PARTIAL`; it is not compared to a full prior period without normalization.
- Multi-location totals include only records visible to the viewer and use an explicit location set.
- Historical snapshots retain the organization, locations, policy versions, time zone, filters, and data cutoff used.

### Mathematical rules

- Ratios use eligible numerator divided by eligible denominator.
- A zero denominator returns `null / NOT_APPLICABLE`, not a misleading 0%, unless the catalog explicitly says otherwise.
- Durations use elapsed wall-clock or business-clock time exactly as specified by the metric.
- Medians and percentiles require the sorted eligible sample; p90 is the nearest-rank 90th percentile.
- Monetary values retain currency; cross-currency aggregation is prohibited without an approved conversion source and rate timestamp.
- Rounding occurs only for display. Stored/calculated intermediate values retain available precision.
- Reversed, test, duplicate, corrupted, or out-of-scope records are excluded with reason counts retained.

### Required metric envelope

```text
metricCode
catalogVersion
periodStart / periodEnd / cutoffAt
organizationId / locationIds / timeZone
value / unit / numerator / denominator / sampleSize
status: COMPLETE | PARTIAL | STALE | INSUFFICIENT | NOT_APPLICABLE
confidence
sourceProjectionVersion
exclusionCounts
drillThroughQuery
calculatedAt
```

## 3. Retail inventory KPIs

| Code | Name and unit | Formula | Required exclusions / qualification | Default window | Owner | Drill-through source |
| --- | --- | --- | --- | --- | --- | --- |
| `INV_ACTIVE_UNITS` | Active inventory units, count | Count InventoryUnits not in delivered/disposed terminal states at cutoff | Test, duplicate, voided acquisition | Current snapshot | IM | InventoryUnit projection |
| `INV_CAPITAL_EXPOSURE` | Inventory capital exposure, currency | Sum governed acquisition cost + included committed/incurred categories per cost-basis version | Missing currency/cost basis reported separately; no estimates presented as actual | Current snapshot | OM | Inventory cost ledger by unit |
| `INV_AVG_DAYS_HELD` | Average days held, days | Sum TotalInventoryAge / eligible units | Units missing financial acquisition time | Current snapshot and sold cohort | IM | Inventory lifecycle facts |
| `INV_MEDIAN_DAYS_HELD` | Median days held, days | Median TotalInventoryAge | Same as above | Current snapshot and sold cohort | IM | Inventory lifecycle facts |
| `INV_DAYS_TO_FRONTLINE` | Median acquisition-to-frontline, days | Median first valid frontline-ready time minus financial acquisition time | Units never frontline are reported in WIP, not treated as zero | Trailing 30/90 days | IM | Lifecycle event history |
| `INV_FRONTLINE_WITHIN_TARGET` | Frontline target attainment, % | Units reaching frontline by applicable target / units reaching frontline | Policy-exempt units shown separately | Trailing 30 days | IM | Lifecycle + policy snapshots |
| `INV_STAGE_DELAY_RATE` | Delayed active units, % | Active units beyond current stage target / active units with applicable target | Missing target counted in data-quality metric | Current snapshot | IM | Lifecycle age projection |
| `INV_IDLE_TIME_SHARE` | Unexplained idle share, % | Idle hours / (active + waiting + idle hours) | Unclassified intervals reported; terminal time after exit excluded | Trailing 7/30 days | VPO | Classified lifecycle intervals |
| `INV_RECON_VARIANCE_RATE` | Absolute recon cost variance, % | Sum abs(actual - approved estimate) / sum approved estimate | Approved estimate <= 0 separated; reversed costs excluded | Closed recon trailing 30 days | IM | Recon plan + cost ledger |
| `INV_FRONTLINE_READINESS` | Ready active units, % | Units passing every applicable critical/noncritical gate / evaluated active units | Units with insufficient dimensions reported separately | Current snapshot | IM | Readiness decisions/evidence |
| `INV_AGED_EXPOSURE` | Aged capital exposure, currency | Sum governed capital exposure for units above configured age band | Age band and policy version required | Current snapshot | GM | Age + cost projection |
| `INV_TURN_RATE` | Inventory turns, annualized turns | Eligible period cost of units sold / average eligible inventory cost, annualized | Requires reconciled cost basis; otherwise `INSUFFICIENT` | Trailing 90/365 days | OM | Reconciled sale/cost snapshots |
| `INV_GROSS_PER_DAY` | Realized gross per day, currency/day | Sum realized gross / sum days held for sold/disposed eligible cohort | Projected gross prohibited; missing reconciled actuals excluded/reported | Trailing 30/90 days | GM | Sale + reconciled cost ledger |
| `INV_DISPOSITION_RATE` | Non-retail disposition share, % | Authorized non-retail dispositions / all terminal inventory exits | Reversals and voids excluded | Trailing 90 days | GM | Disposition command history |

## 4. Shop and repair KPIs

| Code | Name and unit | Formula | Required exclusions / qualification | Default window | Owner | Drill-through source |
| --- | --- | --- | --- | --- | --- | --- |
| `SHOP_OPEN_RO` | Open repair orders, count | Count non-terminal RepairOrders at cutoff | Voided/test ROs | Current snapshot | SM | RepairOrder projection |
| `SHOP_CYCLE_TIME` | Median RO cycle time, hours | Median closed time minus intake time | Customer/inventory origin and work class must remain filterable | Trailing 30 days | SM | RO event history |
| `SHOP_DIAG_TO_APPROVAL` | Median diagnosis-to-authorization, hours | Median first estimate-ready to applicable authorization | Declined/abandoned shown separately | Trailing 30 days | SA | Estimate/approval history |
| `SHOP_READY_TO_START` | Median ready-to-repair start, hours | Median first ready time to first valid labor start | Scheduled future start and customer hold separated | Trailing 30 days | SM | Job readiness + labor ledger |
| `SHOP_PRODUCTIVITY` | Technician productivity, % | Repair-order clocked hours / eligible hours present | Approved leave, training, and policy-defined nonproductive categories disclosed | Daily/weekly | SM | Labor/presence ledgers |
| `SHOP_EFFICIENCY` | Technician efficiency, % | Billable labor hours earned / actual clocked hours on those jobs | Requires consistent labor-guide/version and comparable work class | Weekly/30 days | SM | Labor ledger + closed job billing facts |
| `SHOP_PROFICIENCY` | Technician proficiency, % | Billable labor hours earned / eligible hours present | Same eligibility rules as productivity | Weekly/30 days | SM | Labor/presence ledgers |
| `SHOP_FIRST_PASS_YIELD` | First-pass yield, % | Eligible jobs without attributable comeback/rework / eligible completed jobs | Comeback review window and definition required; open review is not a pass | Trailing 30/90 days | SM | Quality + comeback records |
| `SHOP_QA_PROFICIENCY` | Quality-adjusted proficiency, % | Non-comeback billable hours / eligible hours present | Same work-class and review-window controls | Weekly/30 days | SM | Labor + comeback records |
| `SHOP_QC_PASS_RATE` | First QC pass rate, % | Jobs passing first applicable QC / jobs entering QC | N/A QC policies excluded with reason | Trailing 30 days | SM | QualityReview history |
| `SHOP_PROMISE_ATTAINMENT` | Completion promise attainment, % | Eligible visits completed within accepted promise window / eligible completed visits | Customer-approved promise changes use latest version before breach | Trailing 30 days | SA | Promise + completion events |
| `SHOP_RACK_IDLE_SHARE` | Bay occupied without productive work, % | Occupied nonproductive bay hours / total occupied bay hours | Approved cure/wait that requires bay remains separately categorized | Daily/weekly | SM | Bay booking + labor/wait facts |
| `SHOP_REPAIR_AUTH_RATE` | Estimate authorization rate, % | Authorized presented amount / total eligible presented amount | Warranty/internal/customer-pay segmented; expired/unpresented excluded | Trailing 30 days | SA | Estimate/approval versions |
| `SHOP_REVENUE_HOURS` | Billable hours produced, hours | Sum reconciled billable labor hours | Reversed/voided billing facts excluded | Daily/weekly/monthly | SM | Closed job billing facts |

Production metrics are operational signals. They may not autonomously discipline employees and must be reviewed with work class, data quality, approved nonproductive time, safety, training, and comeback context.

## 5. Parts and procurement KPIs

| Code | Name and unit | Formula | Required exclusions / qualification | Default window | Owner | Drill-through source |
| --- | --- | --- | --- | --- | --- | --- |
| `PART_FILL_RATE` | Demand fill rate, % | Quantity filled by required time / eligible demanded quantity | Cancelled/duplicate demand excluded; substitutions identified | Trailing 30 days | PM | Demand/allocation ledger |
| `PART_FIRST_TIME_ACCURACY` | Correct-part first-time rate, % | Demand lines fulfilled without wrong-part correction / fulfilled demand lines | Customer scope changes not counted as wrong part | Trailing 30 days | PM | Demand/issue/return history |
| `PART_STOCKOUT_RATE` | Stockout incidence, % | Eligible demand lines encountering no available approved part / eligible demand lines | Special-order/nonstock segmented | Trailing 30 days | PM | Demand + balance snapshots |
| `PART_INVENTORY_ACCURACY` | Count accuracy, % | Counted lines within approved tolerance / completed count lines | Unfinished counts excluded; tolerance/version required | Count cycle/month | PM | Count + ledger reconciliation |
| `PART_VALUE_VARIANCE` | Absolute count variance, currency | Sum absolute approved adjustment value from counts | Costing method/version required | Month | PM/OM | Count adjustments ledger |
| `PART_SUPPLIER_ONTIME` | Supplier on-time line rate, % | PO lines usable by confirmed due time / due received PO lines | Buyer-caused changes segmented; partial quantities evaluated by policy | Trailing 90 days | PM | PO/receipt history |
| `PART_PO_CYCLE_TIME` | Median request-to-order, hours | Median issued PO time minus approved demand/request time | Waiting for required business approval separately classified | Trailing 30 days | PM | Demand/PO events |
| `PART_EMERGENCY_ORDER_RATE` | Emergency order share, % | Emergency PO lines / all issued PO lines | Emergency reason required | Trailing 30 days | PM | PO lines |
| `PART_BACKORDER_EXPOSURE` | Backordered jobs, count/value | Count jobs and governed value blocked by backordered demand | Duplicate/resolved demand excluded | Current snapshot | PM | Job/demand/PO projection |
| `PART_CREDIT_RECOVERY` | Recoverable credit rate, % | Actual reconciled credit / eligible expected recoverable credit | Open/unmatured recovery shown separately | Trailing 90/180 days | PM/OM | Core/warranty/vendor return records |
| `PART_OBSOLETE_VALUE` | Obsolete stock value, currency | Sum stock value meeting approved obsolescence policy | Policy/version and costing method required | Month-end snapshot | PM | Stock age/demand/cost projection |
| `PART_TURN_RATE` | Parts turns, annualized turns | Annualized eligible issued cost / average eligible stock cost | Requires reconciled costing; categories filterable | Trailing 90/365 days | PM/OM | Ledger snapshots |

## 6. Customer, quality, and workflow KPIs

| Code | Name and unit | Formula | Required exclusions / qualification | Default window | Owner | Drill-through source |
| --- | --- | --- | --- | --- | --- | --- |
| `CX_APPROVAL_RESPONSE` | Median estimate response time, hours | Median customer-visible response minus successful presentation time | Delivery failures and unreachable state separated | Trailing 30 days | SA | Communication + approval history |
| `CX_STATUS_PROMISE` | Status-update SLA attainment, % | Required status updates delivered by policy due time / due updates | Consent/channel failure reason disclosed | Trailing 30 days | SA | Promise/communication events |
| `CX_DELIVERY_READINESS` | Ready at promised delivery, % | Eligible vehicles fully ready at promise start / eligible promised deliveries | Customer-requested deferment segmented | Trailing 30 days | SA | Readiness + promise history |
| `WORK_OWNED_RATE` | Active work with owner, % | Active governed records with valid accountable owner / active governed records | Invalid/inactive owner counts as unowned | Current snapshot | VPO | Cross-domain ownership projection |
| `WORK_NEXT_ACTION_RATE` | Active work with next action, % | Active governed records with valid next action and due/review time / active records | Free-text note alone is insufficient | Current snapshot | VPO | Cross-domain action projection |
| `WORK_BLOCKER_AGE` | Median blocker resolution time, hours | Median close time minus blocker open time | Cancelled/duplicate blockers excluded; active aging separately shown | Trailing 30 days | VPO | Blocker events |
| `WORK_ESCALATION_REOPEN` | Reopened escalation rate, % | Escalations reopened for same unresolved condition / closed escalations | Reclassified distinct condition excluded | Trailing 90 days | VPO | Escalation history |

## 7. Decision and data-quality KPIs

| Code | Name and unit | Formula | Required exclusions / qualification | Default window | Owner | Drill-through source |
| --- | --- | --- | --- | --- | --- | --- |
| `DEC_ACCEPTANCE_RATE` | Recommendation acceptance, % | Accepted recommendations / recommendations receiving final decision | Expired/no-decision shown separately | Trailing 30 days | VPO | Decision/outcome records |
| `DEC_OVERRIDE_RATE` | Override rate, % | Authorized overrides / recommendations receiving final decision | Override reason required; not inherently negative | Trailing 30 days | VPO | Decision/override records |
| `DEC_OUTCOME_COVERAGE` | Outcome coverage, % | Mature decisions with recorded governed outcome / mature decisions | Not-yet-mature excluded with expected date | Trailing 90 days | DATA | Decision/outcome records |
| `DEC_ERROR_RATE` | Material recommendation error, % | Reviewed materially incorrect recommendations / reviewed recommendations | Error definition/version required | Trailing 90 days | VPO | Calibration review |
| `DATA_REQUIRED_COMPLETENESS` | Required field completeness, % | Present valid required facts / applicable required facts | N/A applicability retained | Current snapshot | DATA | Data-quality projection |
| `DATA_FRESHNESS_RATE` | Fresh governed facts, % | Facts within policy freshness / applicable facts | Unknown retrieval time counts stale/unknown | Current snapshot | DATA | Lineage/freshness projection |
| `DATA_CONFLICT_RATE` | Active conflict rate, % | Active unresolved conflicts / governed active records | Conflicts retain severity/source | Current snapshot | DATA | Integration/conflict queue |
| `DATA_DUPLICATE_RATE` | Suspected duplicate vehicle rate, % | Unresolved duplicate candidates / active canonical vehicles | Confirmed legitimate relationships excluded | Current snapshot | VPO | Duplicate-review queue |
| `OPS_PROJECTION_LAG` | Projection lag, seconds | Cutoff time minus latest successfully applied event time | Per projection; never averaged across failed projections | Current/continuous | SO | Projection checkpoints |
| `OPS_JOB_SUCCESS` | Background-job success, % | Successful terminal attempts / terminal attempts | Cancelled-by-operator segmented | Trailing 24h/7d | SO | Job attempt ledger |

## 8. Metric quality grades

| Grade | Meaning | Display rule |
| --- | --- | --- |
| `A — RECONCILED` | Complete authoritative facts; totals reconcile; definition and projection current. | May support governed decisions. |
| `B — COMPLETE` | Required operational facts present; external/accounting reconciliation not required or pending within SLA. | Display normally with provenance. |
| `C — PARTIAL` | Known missing/stale subset, partial period, or incomplete outcome maturity. | Display with warning and missing/exclusion count. |
| `D — INSUFFICIENT` | Required inputs, sample, authority, or lineage insufficient. | Do not show a numeric conclusion; show required remediation. |

No target, trend color, ranking, alert, or recommendation may be based on grade D. Employee-level operational metrics require grade A/B and contextual review.

## 9. Target governance

Targets are not embedded in formulas. Each target record requires:

- metric code and catalog version
- organization/location/work-class scope
- baseline period and observed distribution
- target, warning, and critical threshold
- owner and approver
- effective/expiry date
- rationale, pilot, review cadence, and rollback condition

The 72-hour recon, 30-day prime-retail, 45-day disposition-review, and technician performance values remain policy defaults/hypotheses until approved target records exist.

## 10. Reconciliation and publication gates

A metric may be published only when:

1. its source events/tables and inclusion logic are implemented
2. unit, edge, time-zone, reversal, and zero-denominator tests pass
3. a fixed fixture reconciles by hand
4. the API returns the required envelope and drill-through query
5. permissions match the underlying source records
6. freshness and failure states are visible
7. a business owner signs off on one pilot-period result

## 11. Change control

Changing a formula, inclusion rule, denominator, unit, time window, work-class mapping, or source requires a new catalog version. Historical snapshots keep their original version. Restatement requires a separately identified restatement run; it never silently rewrites a published period.

## 12. Acceptance evidence

`VEH-005` is satisfied because this catalog defines:

- formulas, units, exclusions, windows, owners, quality grades, and drill-through sources
- inventory, shop, parts, customer/workflow, decision, data-quality, and operational metrics
- comparison, zero-denominator, time-zone, reconciliation, publication, target, and change-control rules

