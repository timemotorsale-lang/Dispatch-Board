# Manager Review Command Center Rollout Roadmap

**Version:** v0.1.0 planning baseline  
**Last updated:** 2026-07-12  
**Status:** Planned

## 1. Rollout Goal

Evolve the existing `/manager-review` page into a trusted operational control center that helps managers make faster, better-supported decisions while preserving human authority and the working daily Dispatch Board.

Day-one success means a manager can:

- see the few items that genuinely require intervention
- understand why each item matters
- inspect definition of done, evidence, dependencies, and history
- approve, return, request evidence, reassign, or escalate safely
- establish the next owner and deadline
- trust queue counts, SLA state, and audit history

## 2. Product Guardrails

- Exception-first, not task-first.
- Decision support, not automated management.
- One primary queue per item.
- Evidence-backed approval.
- Durable outcomes, not vague completion buttons.
- Server-authoritative rules and permissions.
- Operational review and employee performance remain separate.
- Build additive vertical slices and retain compatibility.
- Prove workflow trust before advanced analytics or predictive features.

## 3. Success Measures

Primary:

- median and 90th-percentile time from ready-for-review to decision
- percentage of reviews completed within SLA
- time from blocker threshold to management intervention
- first-pass approval rate
- rework discovered after approval
- percentage of review submissions with sufficient evidence
- downstream delay attributable to pending management decisions

Balancing:

- false critical rate
- queue volume per manager
- number of duplicated items across headline counts
- manager ranking override rate and reasons
- time spent per review
- staff blocker-reporting rate, monitored for chilling effects

Baseline these before changing the workflow so improvement is measurable.

## 4. Rollout Sequence

| Phase | Outcome |
| --- | --- |
| MR-0 | Stakeholders approve vocabulary, policy, scenarios, and success measures. |
| MR-1 | Durable review cycles and decision records exist behind compatible workflows. |
| MR-2 | Structured evidence and definition-of-done gates make submissions reviewable. |
| MR-3 | Review SLA and deterministic attention evaluation operate in shadow mode. |
| MR-4 | Command-center read model and three-pane workspace are live. |
| MR-5 | All five formal decisions and intervention workflows are complete. |
| MR-6 | Operational reporting and calibration support continuous improvement. |
| MR-7 | Day-one rollout gate proves reliability, usability, and operating ownership. |

## 5. MR-0 — Policy And Design Gate

Decide:

- review categories
- which work requires formal approval
- risk dimensions and critical conditions
- required evidence types by category
- review SLA and evidence-request timer behavior
- decision reason codes
- queue taxonomy and precedence
- manager and override permissions
- representative acceptance scenarios
- success-measure baselines

Deliverables:

- approved architecture and algorithm specifications
- review policy matrix
- scenario catalog with expected queue and order
- approved [`MANAGER_REVIEW_UI_SOURCE_OF_TRUTH.md`](MANAGER_REVIEW_UI_SOURCE_OF_TRUTH.md) and canonical desktop mockup
- migration compatibility decision

Exit gate:

- two managers can classify representative scenarios consistently
- ambiguous policy cases are documented rather than left to implementation guesswork

## 6. MR-1 — Durable Review Foundation

Build:

- additive review-cycle and decision schema
- review lifecycle repository and service
- idempotent decision commands
- transaction-backed task transition plus decision plus activity event
- concurrency protection
- compatibility adapter for current approve/return behavior

Exit gate:

- current Manager Review workflow still works
- every new-path decision has reviewer, time, reason, prior state, resulting state, and audit evidence
- retries cannot create duplicate decisions

## 7. MR-2 — Evidence And Definition Of Done

Build:

- evidence requirement policies
- evidence submission and review state
- evidence completeness evaluation
- Request Evidence workflow
- approval gate and authorized override path
- staff response surface for evidence requests

Exit gate:

- every review category has an explicit definition of done
- incomplete mandatory evidence cannot be accidentally approved
- manager and staff can see precisely what is missing

## 8. MR-3 — SLA And Attention Engine Shadow Mode

Build:

- separate review SLA clock
- eligibility and primary-queue classifier
- critical override rules
- MAE-1 weighted factors
- evaluation snapshots and explanation codes
- re-evaluation triggers
- scenario and property-focused tests
- shadow comparison view or diagnostics

Shadow mode means evaluations are calculated and assessed without making the new ranking the sole operational queue.

Exit gate:

- deterministic scenario results match approved policy
- no item appears in multiple primary counts
- false critical and missed critical rates are accepted for assisted rollout
- managers understand the explanations

## 9. MR-4 — Command Center Workspace

Build:

- command-center read model
- executive action summary
- review-health strip
- queue rail and saved system views
- sortable, filterable worklist
- persistent selected-item workbench
- evidence, history, dependencies, and recommendation panels
- fast refresh, selection continuity, and stale/error states
- desktop, tablet, mobile, keyboard, and accessibility behavior

Exit gate:

- a manager can process successive items without opening separate detail pages
- summary, queue, worklist, and workbench agree after every decision
- the interface remains usable under realistic queue volume

## 10. MR-5 — Full Decision And Intervention Workflows

Complete:

- Approve
- Return to Work with corrective actions and revised due time
- Request Evidence with timer policy
- Reassign with preserved ownership history
- Escalate with severity, owner, reason, and executive visibility
- blocker intervention and help-request resolution
- downstream release where approved workflows require it

Exit gate:

- every outcome has validated required fields and predictable state transitions
- permissions and concurrency are proven at API and browser level
- activity and audit histories explain the full decision chain

## 11. MR-6 — Reporting And Calibration

Build:

- operational review snapshots or event-backed reporting
- inflow, throughput, age, SLA, first-pass, returns, evidence, and blocker trends
- reason-code analysis
- recommendation/manager disagreement analysis
- engine version comparison tooling
- policy administration restricted to authorized users

Exit gate:

- measures can be reproduced from durable records
- reporting identifies process pressure without presenting a covert employee ranking
- weight/policy changes require explicit version and approval

## 12. MR-7 — Day-One Rollout Gate

Prepare:

- seed/configuration for dealership review categories
- manager and staff operating instructions
- production migration and rollback runbook
- monitoring and support ownership
- permission audit
- realistic end-to-end rehearsal
- baseline and target dashboard
- known limitations and deferred work

Day-one acceptance:

- no critical workflow blocker remains
- representative tasks can move through submission, evidence, decision, correction, resubmission, and final approval
- queue order and explanations are trusted
- managers know how to override and report policy problems
- staff know how to respond without avoiding blocker disclosure

## 13. Deferred Until After Day One

- autonomous review decisions
- machine-learned production ranking
- natural-language risk inference as an authoritative signal
- formal employee performance scoring
- complex cross-location routing
- external DMS/CRM integration requirements
- predictive staffing or capacity optimization
- advanced workflow-builder UI

These may be evaluated later only after reliable data, governance, and operating need exist.
