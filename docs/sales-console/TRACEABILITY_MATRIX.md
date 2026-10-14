# Sales Console Traceability Matrix

| Outcome | Workflows | Algorithms | Primary services | Milestones | Proof |
| --- | --- | --- | --- | --- | --- |
| Fast, owned lead response | SAL-WF-001–003 | SAL-ALG-001–004, 012 | Opportunity, Routing, Priority | SAL-030–050 | Intake replay, assignment eligibility, SLA, structured outcome |
| Every active record has next action | SAL-WF-002, 017 | SAL-ALG-003, 009, 014 | Opportunity, NextAction | SAL-030, 050, 060 | Transition invariants and stale recovery |
| Appointment continuity | SAL-WF-004–005 | SAL-ALG-003, 007 | Appointment bridge, Showroom | SAL-080–090 | Schedule, arrival, no-show, outcome follow-up |
| Customer-fit vehicle selection | SAL-WF-006 | SAL-ALG-005 | InventoryMatch | SAL-110 | Eligibility, conflicts, exact/alternative explanation |
| Governed trade valuation | SAL-WF-007 | SAL-ALG-014 | Deal, Inventory bridge | SAL-120 | Freshness, authority, changed-fact scenario |
| Observable deal progress | SAL-WF-008 | SAL-ALG-006, 009 | Deal, Read, Intervention | SAL-100, 130 | State, blocker, stall, intervention cases |
| Authorized commercial offers | SAL-WF-009–010 | SAL-ALG-011, 014 | Scenario, Quote, Approval | SAL-140–160 | Version, expiry, delta, authority, concurrency |
| Controlled downstream completion | SAL-WF-011–014 | SAL-ALG-003, 014 | Deal, Promise, bridges | SAL-170–180 | Handoff acceptance, readiness, promise proof |
| Explainable revenue forecast | SAL-WF-015 | SAL-ALG-006, 008–009 | Forecast, Performance | SAL-190–200 | Backtest, bias, calibration, change history |
| Recover lost demand | SAL-WF-013 | SAL-ALG-010, 015 | Cadence, Priority | SAL-210–220 | Eligibility, suppression, continuity, conversion |
| Efficient repeatable selling | SAL-WF-002, 013, 018 | SAL-ALG-003, 012, 015 | Cadence, NextAction, Intervention | SAL-020, 210, 230 | Time-on-work, acceptance, override, guardrails |
| Trusted connected data | SAL-WF-016–017 | SAL-ALG-014 | Integration, Read | SAL-240–250 | Replay, retry, reconciliation, freshness |
| Enterprise governance | All | All | Policy, Audit, Admin | SAL-010, 250–260 | Permissions, audit, flags, rollback, cohort rollout |

## Scenario families required before rollout

1. New high-intent web lead for an available vehicle.
2. Duplicate lead from a second source.
3. Existing customer returning with a new vehicle interest.
4. Customer requests contact at a later time.
5. Opted-out or restricted channel.
6. No eligible salesperson at the source location.
7. Salesperson becomes unavailable after assignment.
8. Appointment set, rescheduled, cancelled, arrived late, or no-show.
9. Walk-in without an existing customer record.
10. Requested vehicle sold, reserved, restricted, or not frontline-ready.
11. Strong alternative vehicle with disclosed compromises.
12. Trade valuation becomes stale after condition changes.
13. Discount inside and outside seller authority.
14. Approval expires after scenario revision.
15. Customer counters a specific quote.
16. Finance handoff rejected for missing information.
17. Accepted deal with document or vehicle readiness blocker.
18. Customer promise becomes at risk or missed.
19. Lost lead re-engages after matching inventory arrives.
20. Deal repeatedly moves close date without evidence.
21. Integration sends duplicate or out-of-order outcome.
22. Market/inventory feed becomes stale.
23. Two managers attempt conflicting decisions.
24. Feature is disabled during an in-progress workflow.
25. Optional AI is unavailable or produces an unsupported proposal.

