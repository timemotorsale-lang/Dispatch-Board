# Shop Optimization Implementation and Pilot Roadmap

**Status:** Proposed implementation sequence; no slice authorized by this document

## 1. Delivery rule

Each slice is end-to-end: approved policy, domain model, persistence, server-side decision logic, permission, command/event/audit, API, role UX, degraded state, tests, telemetry, runbook, and pilot evidence. A formula-only or dashboard-only implementation is incomplete.

## 2. Slice sequence

| Slice | Name | Included algorithms | Activation ceiling | Exit evidence |
| --- | --- | --- | --- | --- |
| 0 | Instrumentation and Truth Baseline | `060`, `061` plus event/clock/data quality | `L0 Observe` | Reliable facts, reconciliation, baseline measures |
| 1 | Job-Start Readiness and WIP Control | `001`-`006`, `020` | `L2 Recommend` | Unready work blocked; owned resolution; staff usability |
| 2 | Capacity and Human-Confirmed Dispatch | `010`-`016` | `L3 Confirmed execute` for assignment only | Eligibility, forecast and concurrency tests; no invalid starts |
| 3 | Parts/Changed Scope/Sublet/QC Risk | `021`-`025` | `L2 Recommend` | Parts truth, changed-scope and failed-QC recovery |
| 4 | Pricing and Margin Governance | `030`-`034` | `L2 Recommend`; exact human price approval | Reproducible matrices, authority, disclosures, reconciliation |
| 5 | Technician/Advisor Assistance | `040`-`044` | `L1 Draft` | Grounded outputs, confirmation, privacy/security, unsafe-output tests |
| 6 | Heat Cases and Communication Support | `050`-`052`, `054` | `L1 Draft`/`L2 Recommend` | Consent, false-alert, manager-response and suppression evidence |
| 7 | Predictive Service Opportunity | `053`, `054` | `L2 Recommend` opportunity only | Valid mileage ranges, calibration, consent and outreach review |
| 8 | Controlled Calibration and Expansion | `060`-`062` | Approved per algorithm | Stable outcomes, drift monitoring, tested rollback |

## 3. Recommended first code boundary

Start with Slice 0 and Slice 1 only. They create the trustworthy foundation for later capacity optimization:

```text
authoritative RO/job/resource/parts/authorization facts
-> job-start readiness evaluation
-> exact missing-prerequisite reason
-> accountable resolution task
-> WIP/queue visibility
-> verified outcome and data-quality measurement
```

Do not start with predictive CRM or generative drafting. Those depend on consent, integrations, service history, reliable mileage, structured findings, and outcome data.

## 4. Environments and modes

```text
design/tabletop -> automated tests -> historical replay -> live shadow
-> limited staff preview -> manager-confirmed pilot -> monitored expansion
```

- `OFF`: no evaluation.
- `SHADOW`: evaluate and record; staff action unaffected.
- `PREVIEW`: selected users see result; cannot execute from it.
- `MANAGER_CONFIRMED`: authorized user confirms exact bounded command.
- `BOUNDED_AUTOMATIC`: separately approved low-impact behavior only.
- `PAUSED`/`ROLLED_BACK`: recommendations/automation disabled while durable work remains accessible.

## 5. Test layers

- Pure policy/formula and boundary tests.
- Eligibility, permission, authority, idempotency and concurrency tests.
- State-machine, source freshness, conflict and reconciliation tests.
- Role-based UI and accessibility tests.
- Scenario regression for all `SRO-SCN-*` cases.
- Historical replay without future-data leakage.
- Shadow evaluation, staff tabletop and monitored pilot.
- Failure injection for integrations, AI provider, messages, evidence upload and projection lag.

## 6. Pilot gates

Before pilot:

- all affected `SRO-APR-*` decisions are approved;
- exact algorithm/policy versions and cohort are registered;
- training and staff challenge/correction path are complete;
- manual fallback, support, incident, pause and rollback are rehearsed;
- baseline data quality and measures meet approved thresholds;
- no critical scenario failure remains open.

During pilot, monitor daily control failures, eligibility, false alerts, source conflicts, overrides, execution errors, staff burden, queue effects, quality, promise reliability, and customer impact. Financial outcome review follows reconciliation, not a preliminary estimate.

## 7. Automatic-action boundary

The planning baseline permits later consideration of bounded, reversible internal task/alert creation after separate approval. Autonomous assignment, scheduling commitment, purchase, price, discount, customer message, diagnosis, completion, QC, release, compensation, discipline, or model change remains prohibited.

## 8. Rollback

Rollback disables the affected version, cancels pending nonexecuted automatic actions, preserves all decisions/events, restores the last approved policy or manual procedure, identifies in-flight cases, reconciles external effects, communicates operator instructions, and requires signed resume criteria. It never deletes evidence or pretends executed customer/financial actions did not occur.

## 9. Definition of done per slice

A slice is done only when implemented behavior matches approved documentation, permissions are server-enforced, commands are idempotent, events/audit are durable, facts/estimates/predictions are visibly distinct, degraded operation is safe, scenarios pass, metrics are reproducible, staff accept the workflow, and rollback has been tested. Documentation alone is never implementation evidence.
