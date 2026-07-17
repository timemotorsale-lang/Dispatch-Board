# Shop and Repair Algorithm Catalog

**Status:** Fully modeled planning catalog; algorithms not activated  
**Identifier family:** `SRO-ALG-*`

## 1. Standard decision contract

Every algorithm follows:

```text
purpose -> data sufficiency -> eligibility -> hard gates -> classification
-> ranking/forecast/draft -> explanation -> human decision -> execution
-> verified outcome -> controlled calibration
```

Every result includes subject, lane, policy/algorithm version, evaluation time, source freshness, eligible/excluded alternatives, hard rules, recommendation, reasons, confidence, missing inputs, approval requirement, override state, and outcome correlation.

## 2. Registry

| ID | Algorithm | Trigger | Output | Human authority |
| --- | --- | --- | --- | --- |
| `SRO-ALG-001` | Intake and Lane Classifier | Appointment, walk-in, tow-in, internal request, recon handoff | Customer-pay, inventory recon, internal/fleet, or conflict | Advisor/manager confirms conflicts |
| `SRO-ALG-002` | Class of Service | Valid intake or material condition change | Safety-critical, customer-waiting, promise recovery, standard, planned | Manager controls policy/override |
| `SRO-ALG-003` | Job-Start Readiness | Job created/changed; part/resource/authorization event | Ready state and missing prerequisites | Dispatcher starts; gates cannot be waived casually |
| `SRO-ALG-004` | WIP and Queue Health | Work event or periodic evaluation | WIP excess, starvation, aging, unowned wait | Manager sets limits; staff resolve |
| `SRO-ALG-005` | Blocker and Next-Best Resolution | Blocked/unready work | Ranked valid resolution actions | Owner selects; consequential actions approved |
| `SRO-ALG-006` | Bottleneck Detection | Queue/resource/flow change | Current and emerging constraint with evidence | Manager decides intervention |
| `SRO-ALG-010` | Technician Eligibility | Dispatch or reassign request | Qualified candidate set and exclusions | Dispatcher chooses eligible candidate |
| `SRO-ALG-011` | Bay/Tool/Equipment Eligibility | Schedule/dispatch request | Valid resource combinations | Dispatcher chooses; safety gates fixed |
| `SRO-ALG-012` | Capacity Forecast | Booking, absence, job/ETA change | Available productive-hour range by skill/resource | Scheduler/advisor uses range |
| `SRO-ALG-013` | Dispatch Sequencer | Ready work/resource change | Ranked job-technician-resource combinations | Dispatcher confirms |
| `SRO-ALG-014` | Promise and Completion Forecast | Commitment or material progress change | Completion range, confidence, risk drivers | Advisor/manager owns promise |
| `SRO-ALG-015` | Dynamic Resequencing | Delay, emergency, absence, changed scope | Impact-ranked recovery alternatives | Manager approves disruption |
| `SRO-ALG-016` | Workload Fairness | Dispatch recommendation/reporting window | Load/complexity/opportunity imbalance flags | Manager reviews; no autonomous discipline |
| `SRO-ALG-020` | Parts Demand and Kit Readiness | Authorized job/part event | Complete/partial/unavailable kit state | Parts lead resolves |
| `SRO-ALG-021` | Parts Source and ETA Risk | Demand or vendor change | Eligible source options, landed cost, ETA confidence | Purchase authority selects |
| `SRO-ALG-022` | Substitute/Interchange Review | Exact part unavailable | Candidate substitute requiring technical approval | Qualified reviewer + financial authority |
| `SRO-ALG-023` | Changed-Scope Impact | New finding/failed part/procedure deviation | Cost/time/parts/promise/QC impact | Customer/internal authority approves scope |
| `SRO-ALG-024` | Internal vs Sublet Support | Capability/capacity/quality constraint | Valid options with cost, time, custody, quality risk | Manager authorizes vendor path |
| `SRO-ALG-025` | QC/Rework/Comeback Risk | Finish, failed QC, repeat concern | Required verification and risk indicators | QC/manager decides; model cannot pass work |
| `SRO-ALG-030` | Parts Price Recommendation | Estimate line created/changed | Policy-valid sell price/margin range | Advisor presents approved price |
| `SRO-ALG-031` | Labor Matrix Recommendation | Labor operation selected | Approved time/rate/minimum-charge result | Advisor/manager; never hidden |
| `SRO-ALG-032` | Estimate Margin Integrity | Estimate/update/discount | Leakage, below-floor, mismatch, approval need | Authorized manager approves exceptions |
| `SRO-ALG-033` | Discount/Goodwill Authority | Discount, refund, recovery request | Eligible options and required approver | Named financial authority decides |
| `SRO-ALG-034` | Realized Margin Reconciliation | RO close/correction/credit | Estimate-to-actual variance and cause | Finance/shop review |
| `SRO-ALG-040` | Technician Dictation Structurer | Technician submits voice/text finding | Structured draft, uncertainty, clarification prompts | Technician confirms |
| `SRO-ALG-041` | Finding-to-Operation Assistant | Confirmed structured finding | Candidate labor operations, parts, procedures | Technician/advisor validates |
| `SRO-ALG-042` | Estimate Draft Assistant | Confirmed findings/operations | Advisor draft with source lineage | Advisor edits/approves |
| `SRO-ALG-043` | Customer Explanation Draft | Approved estimate/status | Plain-language communication draft | Advisor approves sending |
| `SRO-ALG-044` | Evidence Completeness Assistant | Inspection/repair/QC handoff | Missing/invalid evidence prompts | Staff supplies evidence; assistant cannot fabricate |
| `SRO-ALG-050` | Heat-Case Detection | Customer interaction or commitment risk | Risk band, reasons, intervention task | Advisor/manager responds |
| `SRO-ALG-051` | Communication Next-Best Action | Open RO/customer event | Contact/update/escalation recommendation | Authorized staff sends |
| `SRO-ALG-052` | Declined-Service Follow-up | Decline/defer and policy interval | Eligible follow-up window/content | Advisor approves; consent enforced |
| `SRO-ALG-053` | Predictive Usage and Service Opportunity | New mileage/service-history observation or scheduled run | Mileage range, service window, confidence | Advisor reviews; customer authorizes work |
| `SRO-ALG-054` | Outreach Suppression/Frequency | Any proposed outbound | Allow, delay, suppress, or consent review | Policy/authorized staff |
| `SRO-ALG-060` | Outcome Attribution | Decision reaches measurable outcome | Recommendation/action/outcome linkage | Algorithm owner reviews |
| `SRO-ALG-061` | Drift and Data-Quality Monitor | Scheduled evaluation/source change | Drift, bias, freshness, missingness alerts | Owner pauses/revalidates |
| `SRO-ALG-062` | Calibration Proposal | Approved review cycle | Versioned threshold/weight proposal | Governance board approves; no self-change |

## 3. Deterministic priority baseline

After eligibility and hard gates, `SRO-ALG-013` may use an approved bounded score:

```text
Dispatch Value =
  25 * commitment urgency
+ 20 * readiness confidence
+ 15 * downstream unblocking
+ 15 * safety/quality recovery priority
+ 10 * skill continuity
+ 10 * flow efficiency
+  5 * economic release
```

Penalties may reflect context switching, bay blocking, uncertain duration, fragile ETA, or workload imbalance. The UI must disclose material factors. Economic release cannot outrank safety or authorization.

## 4. Capacity baseline

Capacity is a range, not a single advertised number:

```text
Eligible productive capacity =
sum(available technician time * approved skill-efficiency assumption)
constrained by bays, lifts, tools, equipment, procedures, parts and operating calendar
minus protected buffers and committed eligible work
```

Efficiency assumptions are versioned planning inputs, not judgments of employee worth. Absence, training, diagnostic uncertainty, rework, parts volatility, and emergency buffers affect the forecast.

## 5. Pricing baseline

Parts and labor recommendations use approved matrices with floors, ceilings, effective dates, customer/program eligibility, taxes/fees boundaries, and explanation. The system distinguishes:

- labor time adjustment;
- labor rate adjustment;
- minimum labor charge;
- parts cost-to-price curve;
- shop supplies/fees;
- documented difficulty or changed scope;
- authorized discount or goodwill.

No single formula is universal. A proposed inverse labor curve is a policy option, not an approved default:

```text
recommended rate = bounded(base rate + slide constant / max(book hours, floor hours))
```

The approved result must remain within configured bounds and cannot disguise added time or charges.

## 6. Predictive service baseline

`SRO-ALG-053` uses authorized observed mileage records, not presumed live telemetry:

```text
daily mileage estimate = robust slope of valid mileage observations over time
predicted service date range = interval threshold adjusted for uncertainty and time rule
```

It rejects decreasing, implausible, conflicting, stale, wrong-unit, or non-authoritative observations; labels the output as a prediction; shows a range and confidence; honors OEM time/mileage rules and customer consent; and never creates authorized work.

## 7. AI-assistance boundary

Generative or probabilistic assistance may structure or draft only after retrieval from authorized sources. It must cite the technician observation, procedure/catalog version, labor source, part source, and estimate version used; surface uncertainty; ask clarifying questions; and require confirmation. Unsupported component, cause, urgency, price, part, labor, safety, or promise claims are prohibited.

## 8. Algorithm exit gate

An algorithm is eligible for implementation only when its owner, policy version, exact inputs, source authority, trigger, eligibility, hard rules, output, reason codes, confidence, human action, audit, outcome, scenarios, shadow thresholds, pause criteria, and rollback procedure are approved.
