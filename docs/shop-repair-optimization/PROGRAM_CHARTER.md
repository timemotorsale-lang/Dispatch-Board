# Shop and Repair Optimization Program Charter

**Status:** Decision-ready proposal  
**Decision state:** All `SRO-APR-*` decisions remain `OPEN`  
**Initial scope:** Time Motor Sales - Minneapolis; customer-pay and inventory-recon shop operations

## 1. Mission

Create one explainable operating system that helps staff select the best valid next action for every repair order while protecting, in order:

1. people, vehicle safety, law, privacy, and environmental controls;
2. customer authorization, financial authority, evidence, and truthful communication;
3. promised dates and inventory frontline commitments;
4. repair quality, first-pass yield, and recovery from failure;
5. flow, capacity, margin, and customer retention;
6. staff fairness, learning, resilience, and continuous improvement.

No utilization, revenue, gross-profit, billed-hour, cycle-time, or customer-sentiment target may compensate for a failed higher-order gate.

## 2. Included capabilities

- intake classification and class of service;
- WIP limits, queue health, blocker ownership, and job-start readiness;
- technician, bay, lift, tool, equipment, and time-slot eligibility;
- capacity forecasting, dispatch recommendations, resequencing, and promise-risk warnings;
- parts demand, availability confidence, reservation, ETA risk, and job kitting;
- changed-scope, sublet, QC, rework, comeback, and recovery decisions;
- parts and labor pricing recommendations under approved policy;
- technician dictation, structured findings, estimate-draft assistance, and advisor communication drafts;
- customer heat-case detection, manager intervention, declined-service follow-up, and predictive maintenance opportunities;
- outcome measurement, controlled calibration, model monitoring, and policy versioning.

## 3. Excluded authority

The program never independently:

- diagnoses or certifies a vehicle as safe;
- starts unauthorized work, expands scope, orders parts, or commits spend;
- assigns an ineligible technician or permits work without required equipment/procedure;
- changes customer price, discounts, refunds, compensation, payroll, or employee status;
- communicates a diagnosis, price, promise, safety conclusion, or complaint resolution without the required human review;
- marks repair complete, passes QC, closes an RO, releases a vehicle, or declares inventory frontline-ready;
- treats predicted mileage, sentiment, completion time, or model output as an authoritative fact;
- uses protected characteristics, health information, irrelevant private data, or covert employee surveillance;
- self-modifies production weights or policy.

## 4. Operating principles

1. **Eligibility before optimization.** Invalid people, resources, jobs, and time windows are excluded before scoring.
2. **Ready work before bay occupancy.** Do not place a vehicle in a productive bay unless approved work can begin or a documented exception applies.
3. **One current, one staged next.** The planning baseline targets one active and at most one ready-next job per technician.
4. **Finish before starting more.** Control WIP and protect downstream flow unless an authorized interruption has greater lexicographic priority.
5. **Recommendations are bounded.** Staff see alternatives, reasons, confidence, and consequences.
6. **Every wait has ownership.** A blocker requires reason, owner, next action, review time, and customer/commitment effect.
7. **Quality is not averaged.** A failed mandatory QC or safety item cannot be offset by other passed checks.
8. **Facts remain distinguishable.** Observations, calculations, estimates, predictions, and recommendations are labeled.
9. **Overrides are visible.** Authorized changes preserve the original recommendation, chosen action, reason, actor, and result.
10. **Learning is governed.** Calibration proposals are tested, approved, versioned, monitored, and reversible.

## 5. Success definition

The program succeeds only if it produces sustained improvement across a balanced scorecard:

- safer, more reliable job starts and releases;
- fewer unowned blockers and unready bay placements;
- lower active WIP and waiting time without suppressed work reporting;
- improved promised-time reliability and inventory recon cycle time;
- improved first-pass yield and reduced comeback/rework exposure;
- reduced parts-related delays and improved reservation accuracy;
- reduced unauthorized discounting and explainable margin leakage;
- improved response and recovery for at-risk customers;
- useful recommendations with acceptable override and false-alert rates;
- no material deterioration in staff fairness, safety reporting, customer trust, or data quality.

## 6. Roles

| Role | Proposed accountability |
| --- | --- |
| General/Operations Manager | Policy, pilot, pause, rollback, high-impact authority |
| Fixed Operations/Shop Manager | Service owner, WIP/capacity policy, manager interventions |
| Dispatcher/Foreman | Daily sequencing, assignment decisions, blocker recovery |
| Service Advisor | Customer authority, estimates, promises, communication, heat-case response |
| Technician | Findings, execution evidence, blockers, repair completion handoff |
| QC verifier | Independent verification and failed-QC routing |
| Parts lead | Demand, sourcing, reservation, receiving, substitution, ETA confidence |
| Inventory Manager | Inventory-recon priority, target date, economics, downstream handoff |
| Finance/Controller | Labor/parts pricing policy, discounts, refunds, reconciliation |
| Privacy/Security owner | Consent, recording, retention, access, incidents |
| Algorithm owner | Version, monitoring, explainability, validation, calibration proposal |
| IT/integration owner | Source authority, freshness, failures, reconciliation, recovery |

## 7. Initial pilot boundary

Recommended pilot:

- one Minneapolis location;
- trained dispatcher, manager, parts lead, advisors, technicians, and QC staff;
- deterministic recommendations only;
- customer-pay and inventory-recon work clearly labeled and separately measured;
- manager-confirmed assignment/resequencing actions;
- no autonomous pricing, outbound messages, purchases, QC, or release;
- shadow evaluation before staff-facing recommendations;
- automatic pause on safety-gate failure, source conflicts, excessive false alerts, or material outcome deterioration.

## 8. Charter gate

Before code or activation, authorized owners must approve scope, lanes, roles, source authority, financial limits, safety/QC rules, customer consent, staff-use policy, pilot cohort, success thresholds, pause/rollback authority, and the exact algorithm versions included in each slice.
