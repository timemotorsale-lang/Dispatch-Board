# Manager Review Command Center Implementation Milestones

**Version:** v0.1.0 planning baseline  
**Last updated:** 2026-07-12  
**Status:** Planned execution guide

## 1. Execution Rules

- Work one small vertical slice at a time.
- Preserve the current Manager Review route until replacement behavior is proven.
- Prefer additive migrations and compatibility reads.
- Keep business policy server-side.
- Every decision slice includes validation, policy, service, repository, API, event/audit, and tests as applicable.
- Do not claim a milestone complete because a UI mock exists.
- Update `docs/CURRENT_IMPLEMENTATION_STATUS.md` only after evidence exists.
- Review unrelated worktree changes before editing and do not overwrite user work.
- Use the formal algorithm document as the source of truth for MAE behavior.

## 2. Status Legend

- `PLANNED` — accepted direction, not started
- `IN PROGRESS` — implementation has begun but exit gate is not met
- `READY FOR REVIEW` — implementation and required evidence exist
- `COMPLETE` — accepted and reflected in the implementation baseline
- `DEFERRED` — intentionally postponed with rationale

All slices below begin as `PLANNED`.

## 3. MR-0 — Readiness And Design Gate

| ID | Slice | Depends on | Evidence |
| --- | --- | --- | --- |
| MR-001 | Approve review category and required-review matrix | None | Stakeholder-approved matrix |
| MR-002 | Approve risk taxonomy and hard critical rules | MR-001 | Scenario decisions and source facts |
| MR-003 | Approve evidence requirement catalog | MR-001 | Category/evidence matrix |
| MR-004 | Approve review SLA and timer behavior | MR-001 | SLA examples including evidence request |
| MR-005 | Approve decision reason codes and permissions | MR-001 | Outcome/role matrix |
| MR-006 | Approve queue precedence and MAE-1 shadow weights | MR-002, MR-004 | Ranked scenario set |
| MR-007 | Approve command-center interaction source of truth | MR-001–006 | Desktop/mobile interaction states |

Gate: no unresolved rule materially changes schema or command semantics.

## 4. MR-1 — Durable Review Foundation

| ID | Slice | Depends on | Primary validation |
| --- | --- | --- | --- |
| MR-101 | Add review-policy, review-cycle, and decision schema | MR-0 | Migration and schema tests |
| MR-102 | Add review read/write repositories | MR-101 | Repository integration tests |
| MR-103 | Open review cycles on eligible ready-for-review transitions | MR-102 | Lifecycle integration tests |
| MR-104 | Implement idempotent Approve command | MR-103 | Service, API, concurrency tests |
| MR-105 | Implement reasoned Return to Work command | MR-103 | Required reason/correction/deadline tests |
| MR-106 | Emit authoritative activity/audit evidence transactionally | MR-104, MR-105 | Rollback and event tests |
| MR-107 | Adapt current UI actions to explicit command boundary | MR-104–106 | Existing workflow regression tests |

Gate: current workflow is preserved and every decision is durable, reasoned, idempotent, and auditable.

## 5. MR-2 — Evidence And Definition Of Done

| ID | Slice | Depends on | Primary validation |
| --- | --- | --- | --- |
| MR-201 | Add evidence requirement and submission schema | MR-1 | Migration and repository tests |
| MR-202 | Resolve evidence requirements from policy/template/category | MR-201 | Deterministic policy tests |
| MR-203 | Add staff evidence submission workflow | MR-202 | Permission and upload/reference tests |
| MR-204 | Add evidence completeness read model | MR-202, MR-203 | Missing/rejected/stale scenarios |
| MR-205 | Implement Request Evidence command | MR-204 | Timer, notification intent, audit tests |
| MR-206 | Enforce approval evidence gate | MR-204 | Bypass and override authorization tests |
| MR-207 | Add workbench evidence panel and staff response UI | MR-203–206 | Component and browser workflows |

Gate: reviewers and staff see the same evidence truth, and mandatory deficiencies safely block approval.

## 6. MR-3 — Review SLA Foundation

| ID | Slice | Depends on | Primary validation |
| --- | --- | --- | --- |
| MR-301 | Add versioned review SLA policy | MR-1 | Policy validation tests |
| MR-302 | Calculate review warning, due, and breach state | MR-301 | Boundary/timezone tests |
| MR-303 | Apply approved evidence-request timer behavior | MR-205, MR-302 | Pause/continue/switch-clock scenarios |
| MR-304 | Emit SLA threshold and escalation events idempotently | MR-302 | Retry and boundary tests |
| MR-305 | Expose SLA state in review read models | MR-302–304 | API contract tests |

Gate: task due time and review due time are distinguishable, reproducible, and visible.

## 7. MR-4 — Manager Attention Engine

| ID | Slice | Depends on | Primary validation |
| --- | --- | --- | --- |
| MR-401 | Define typed MAE-1 policy and reason-code catalog | MR-0 | Configuration validation |
| MR-402 | Implement candidate eligibility rules | MR-401, MR-3 | Rule table tests |
| MR-403 | Implement one-primary-queue classifier | MR-402 | Precedence and deduplication tests |
| MR-404 | Implement structured critical hard rules | MR-403 | Critical ordering and source tests |
| MR-405 | Implement normalized factors and bounded scoring | MR-403 | Formula/property tests |
| MR-406 | Implement stable ordering and explanations | MR-404, MR-405 | Tie, boundary, explanation tests |
| MR-407 | Persist evaluation snapshots/fingerprints | MR-406 | Repository and reproducibility tests |
| MR-408 | Add event/time-based re-evaluation service | MR-407 | Idempotency and freshness tests |
| MR-409 | Run shadow-mode scenario and live comparison | MR-408 | Calibration report and approval |

Gate: MAE-1 passes formal test contract and shadow-mode acceptance before controlling the default queue order.

## 8. MR-5 — Command Center Read Model And Shell

| ID | Slice | Depends on | Primary validation |
| --- | --- | --- | --- |
| MR-501 | Build summary and mutually exclusive queue counts | MR-4 | Count reconciliation tests |
| MR-502 | Build paginatable ordered worklist read model | MR-501 | Ordering/filter/API tests |
| MR-503 | Build selected-item workbench read model | MR-2, MR-502 | Evidence/history/action contract tests |
| MR-504 | Implement command-center desktop shell | MR-501–503 | Component tests and visual QA |
| MR-505 | Implement queue navigation, filters, and saved system views | MR-504 | URL/state and count tests |
| MR-506 | Implement persistent workbench and selection advance | MR-503–505 | Interaction/browser tests |
| MR-507 | Add loading, empty, stale, error, and conflict states | MR-506 | Failure-path tests |
| MR-508 | Add responsive, keyboard, and accessibility behavior | MR-506 | Browser/a11y verification |

Gate: managers can process realistic queues quickly without context loss or count inconsistency.

## 9. MR-6 — Full Intervention Commands

| ID | Slice | Depends on | Primary validation |
| --- | --- | --- | --- |
| MR-601 | Complete Return to Work corrective checklist behavior | MR-2, MR-5 | Lifecycle/browser tests |
| MR-602 | Implement review-aware Reassign command | MR-1, MR-5 | ownership/audit/permission tests |
| MR-603 | Implement structured Escalate command | MR-4, MR-5 | severity/owner/audit tests |
| MR-604 | Implement blocker intervention acknowledgement/resolution | MR-5 | state and accountability tests |
| MR-605 | Release authorized downstream work after approval | MR-104 | transaction/dependency tests |
| MR-606 | Wire all five decisions into persistent workbench | MR-601–605 | end-to-end decision suite |

Gate: every visible action uses an explicit authoritative command with safe failure behavior.

## 10. MR-7 — Operational Trends And Governance

| ID | Slice | Depends on | Primary validation |
| --- | --- | --- | --- |
| MR-701 | Define event-backed metric contracts and baseline | MR-1 | metric fixture reconciliation |
| MR-702 | Add review throughput, age, and SLA measures | MR-701 | known-dataset tests |
| MR-703 | Add first-pass, return-reason, and evidence measures | MR-2, MR-701 | known-dataset tests |
| MR-704 | Add blocker/downstream-delay measures | MR-6, MR-701 | known-dataset tests |
| MR-705 | Add MAE override and version-comparison reporting | MR-4, MR-701 | comparison tests |
| MR-706 | Add authorized policy administration and change audit | MR-3, MR-4 | permission/version/rollback tests |
| MR-707 | Add operational trend panel | MR-702–705 | UI and accessibility tests |

Gate: metrics are reproducible, operationally useful, and do not present covert employee scoring.

## 11. MR-8 — Day-One Readiness

| ID | Slice | Depends on | Primary validation |
| --- | --- | --- | --- |
| MR-801 | Production configuration and dealership policy seed | MR-7 | configuration review |
| MR-802 | Migration, rollback, and data compatibility rehearsal | MR-7 | rehearsal evidence |
| MR-803 | Permission and audit review | MR-7 | access matrix verification |
| MR-804 | Realistic end-to-end operating rehearsal | MR-801–803 | signed scenario results |
| MR-805 | Manager/staff runbook and training | MR-804 | owner acceptance |
| MR-806 | Performance, reliability, and accessibility gate | MR-804 | release evidence |
| MR-807 | Update implementation status and release checklist | MR-801–806 | synchronized documentation |

Gate: production owners accept workflow, policy, recovery plan, measures, and known limitations.

## 12. Branch And Merge Sequence

Recommended first branch:

`codex/manager-review-command-center-foundation`

Suggested later branches:

```text
codex/manager-review-evidence
codex/manager-review-sla
codex/manager-attention-engine
codex/manager-review-command-center-ui
codex/manager-review-interventions
codex/manager-review-insights
codex/manager-review-day-one
```

Do not keep the entire program on one long-lived branch. Merge accepted, compatible vertical slices before starting dependent work.

## 13. Definition Of A Completed Slice

A slice is complete only when applicable items are true:

- schema change is additive and migration is verified
- validation and permission checks are server-side
- transaction and idempotency behavior are proven
- activity/audit evidence is created
- read models return authoritative state
- loading, empty, error, stale, and concurrency states are handled
- focused unit/integration/browser tests pass
- existing Dispatch Board and Manager Review regressions pass
- documentation distinguishes implemented from planned behavior
- the diff contains no unrelated changes

## 14. Program-Level Release Gate

The Command Center is ready for day-one use only when:

- review policy is approved and versioned
- all five decision outcomes are durable
- evidence gates are trustworthy
- review SLA behaves as documented
- MAE-1 has passed shadow calibration
- critical items cannot be hidden by numeric scoring
- counts reconcile across summary, queues, and worklist
- managers can explain why top items are top items
- staff can report blockers without punitive ranking
- rollback and support ownership are documented
