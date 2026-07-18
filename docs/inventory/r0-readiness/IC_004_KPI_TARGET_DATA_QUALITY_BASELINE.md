# IC-004 — KPI, Target, and Data-Quality Baseline

**State:** `BLOCKED FOR TARGET APPROVAL`  
**Definition source:** [Vehicle Operations KPI Catalog v1](../governance/VEHICLE_OPERATIONS_KPI_CATALOG.md)

## Governing metric envelope

Every metric fact must carry metric/catalog version, organization/location scope, time zone, period and cutoff, value/unit/currency, numerator, denominator, sample size, status, confidence/quality grade, source projection version, exclusions, drill-through query, and calculation time.

The browser must not be the sole calculator for production KPIs. Drill-through permissions must equal or narrow the source fact population.

## Console metric baseline

| Surface | Metric family | Governing fact | Approval state |
| --- | --- | --- | --- |
| Home | Active inventory | `INV_ACTIVE_UNITS` | Definition baseline exists; target not applicable |
| Home / Lifecycle | Inventory capital | `INV_CAPITAL_EXPOSURE` | Definition/cost-source approval required |
| Home / Lifecycle | Days to frontline | `INV_DAYS_TO_FRONTLINE` | Definition exists; target/window approval required |
| Lifecycle | Frontline readiness | `INV_FRONTLINE_READINESS` | Checklist/version approval required |
| Lifecycle | Aged exposure | `INV_AGED_EXPOSURE` | Age band, currency, policy approval required |
| Lifecycle | Stage delays | `INV_STAGE_DELAY_RATE` | Stage target and pause policy required |
| Home / Shop | Shop load/cycle/promise | `SHOP_*` catalog family | Work-class, windows, quality approval required |
| Home / Shop / Parts | Parts fill/readiness/accuracy | `PART_*` catalog family | Demand/ledger/source and target approval required |
| All | Ownership/blocker/review/approval | `WORK_*` plus CT-05/07/08 facts | Deduplication, SLA and scope approval required |
| All | Recommendation outcomes | `DEC_*` catalog family | Maturity window and non-disciplinary boundary required |
| All | Data/integration health | CT-12 + reconciliation facts | Freshness/materiality/incident thresholds required |

## Quality grades and availability states

Metric quality uses the approved catalog grades:

- `A — RECONCILED`: complete authoritative facts, current definition/projection, and reconciling totals;
- `B — COMPLETE`: required operational facts present, with permitted reconciliation pending or not applicable;
- `C — PARTIAL`: disclosed missing/stale subset, partial period, or incomplete outcome maturity;
- `D — INSUFFICIENT`: inputs, sample, authority, or lineage cannot support a numeric conclusion.

Availability is reported separately as current, stale with last-good cutoff, unavailable, or reconciliation-required. UI labels must not compress grade C, grade D, stale, unavailable, and reconciliation-required into one generic error. Grade D cannot drive a target, trend color, ranking, alert, or recommendation; employee metrics require grade A/B plus contextual review.

## Target policy register

| Proposed policy | Current treatment | Required approval |
| --- | --- | --- |
| 72-hour recon | Hypothesis/default only | Cohort, clock, pauses, target, owner, effective date |
| 30-day prime-retail aging | Hypothesis/default only | Inventory class, start clock, band, action, owner |
| 45-day disposition review | Hypothesis/default only | Eligibility, exceptions, action, owner, escalation |
| Technician/production values | Planning signals only | Work class, paid/productive time, quality/context, non-disciplinary rule |
| Freshness and projection-lag limits | Not approved | Per source/projection threshold and last-good behavior |
| Reconciliation materiality | Not approved | Quantity, currency, identity, state, and aggregate tolerances |

No proposed target may be hard-coded or presented as policy until an effective target record is approved. Historical facts retain the policy version used; changes do not silently rewrite published history.

## Publication and restatement gate

Before a KPI is labeled authoritative:

1. its canonical events/records and exclusions are fixed;
2. a hand-calculated fixture matches the produced fact;
3. numerator, denominator, exclusions, and drill-through reconcile;
4. source/projection freshness and quality meet approved thresholds;
5. privacy and field restrictions pass;
6. an owner signs one pilot-period result;
7. corrections create a separately identified restatement rather than silent historical replacement.

## Decisions required

- Exact default Home and landing-page metrics.
- Metric/catalog versions and organization/location/cohort scope.
- Windows, comparison periods, targets, units/currency, and cost basis.
- Quality grade thresholds, freshness, lag, exclusions, and minimum sample sizes.
- Reconciliation materiality, restatement, publication, and suppression rules.
- Privacy/differencing controls and employee-metric restrictions.
- Alert, pause, rollback, and outcome thresholds for the pilot.

**Gate result:** Definitions can guide fixture and conformance work. Production targets, authoritative labels, alerts, and outcome claims are blocked.
