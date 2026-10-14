# Slice 1 Decision Execution Gate

**Slice:** Acquisition and Transportation through accepted Receipt/Custody handoff  
**Status:** 19 approved; 3 safely deferred; 28 open required-input decisions; implementation not authorized

## How to use this gate

For each row, enter the valid approval-record ID from the [`Decision Signature Journal`](DECISION_SIGNATURE_JOURNAL.md). `DEFER_SAFE` passes this gate only when the excluded capability, safe alternate, owner, conditions and closure/review evidence are explicit. A blank record remains `OPEN`.

## Program, scope and pilot decisions

| Decision | Required outcome for Slice 1 | Recommended | Approval record | State |
| --- | --- | --- | --- | --- |
| `ITF-APR-001` | Adopt outcome, precedence and authority boundaries | APPROVE | `ITF-AE1-APR-001` | APPROVED |
| `ITF-APR-002` | Adopt lifecycle and first boundary | APPROVE | `ITF-AE1-APR-002` | APPROVED |
| `ITF-APR-003` | Shadow/manual starts only | APPROVE | `ITF-AE1-APR-003` | APPROVED |
| `ITF-APR-004` | Accept staff questions/options for controlled validation | APPROVE | `ITF-AE1-APR-004` | APPROVED |
| `ITF-APR-005` | Adopt non-waivable critical gates | APPROVE | `ITF-AE1-APR-005` | APPROVED |
| `ITF-APR-006` | Separate cancellation/reversal/recovery commands | APPROVE | `ITF-AE1-APR-006` | APPROVED |
| `ITF-APR-010` | Confirm organization/location | APPROVE | `ITF-AE1-APR-010` | APPROVED |
| `ITF-APR-011` | Confirm eligible acquisition sources | APPROVE | `ITF-AE1-APR-011` | APPROVED |
| `ITF-APR-012` | Confirm vehicle classes/exclusions | APPROVE | `ITF-AE1-APR-012` | APPROVED |
| `ITF-APR-013` | Name receiving/containment locations/capabilities | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-014` | Approve movement modes; internal driving excluded | APPROVE | `ITF-AE1-APR-014` | APPROVED |
| `ITF-APR-015` | Approve calendar/after-hours coverage | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-070` | Approve participants/tabletop scope | APPROVE | `ITF-AE1-APR-070` | APPROVED |
| `ITF-APR-071` | Treat shadow thresholds as hypotheses | APPROVE | `ITF-AE1-APR-071` | APPROVED |
| `ITF-APR-072` | Approve future manager-confirmed pilot cohort | APPROVE | `ITF-AE1-APR-072` | APPROVED |
| `ITF-APR-073` | Approve success/zero-critical-failure rule | APPROVE | `ITF-AE1-APR-073` | APPROVED |
| `ITF-APR-074` | Name monitoring/pause/rollback authorities | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-075` | Require separate automatic-start authorization | APPROVE | `ITF-AE1-APR-075` | APPROVED |

## Roles and separation

| Decision | Required outcome for Slice 1 | Recommended | Approval record | State |
| --- | --- | --- | --- | --- |
| `ITF-APR-020` | Name policy, workflow/service and pilot owners | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-021` | Complete capability/access/backup records | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-022` | Name transport/receiving roles and coverage | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-023` | Name identity reviewer and reversal authorities | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-024` | Approve separation/independent routes | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-025` | Separate administrator and policy publisher | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |

## Financial authority

| Decision | Required outcome for Slice 1 | Recommended | Approval record | State |
| --- | --- | --- | --- | --- |
| `ITF-APR-030` | Approve currency/exposure/cost classes | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-031` | Set command-specific limits | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-032` | Approve quote requirements | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-033` | Set reapproval/material-change rules | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-034` | Aggregate exposure; prohibit splitting | APPROVE | `ITF-AE1-APR-034` | APPROVED |
| `ITF-APR-035` | Define emergency category/limit/review | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-036` | Define economics/disposition human review | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |

## Timing, escalation and notifications

| Decision | Required outcome for Slice 1 | Recommended | Approval record | State |
| --- | --- | --- | --- | --- |
| `ITF-APR-040` | Set acquisition-validation targets | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-041` | Set transport plan/quote/approval targets | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-042` | Set pickup/arrival variance and response | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-043` | Approve pause/review/age rules | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-044` | Name escalation coverage/targets | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-045` | Approve channels/quiet/retry/fallback | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |

## Evidence, safety, privacy and security

| Decision | Required outcome for Slice 1 | Recommended | Approval record | State |
| --- | --- | --- | --- | --- |
| `ITF-APR-050` | Approve first-slice evidence manifest | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-051` | Exclude internal driving until roadworthiness policy | DEFER_SAFE | `ITF-AE1-APR-051` | DEFERRED_SAFE |
| `ITF-APR-052` | Exclude internal driving until driver/insurance policy | DEFER_SAFE | `ITF-AE1-APR-052` | DEFERRED_SAFE |
| `ITF-APR-053` | Approve comparable condition evidence | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-054` | Approve classification/access/minimal eligibility | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-055` | Approve retention/hold/export/disposal rules | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-056` | Preserve originals and correction/quarantine lineage | APPROVE | `ITF-AE1-APR-056` | APPROVED |

## Source authority and integration

| Decision | Required outcome for Slice 1 | Recommended | Approval record | State |
| --- | --- | --- | --- | --- |
| `ITF-APR-060` | Approve acquisition field/source/freshness map | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-061` | Preserve canonical identity/duplicate controls | APPROVE | `ITF-AE1-APR-061` | APPROVED |
| `ITF-APR-062` | Approve movement/arrival/custody state sources | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |
| `ITF-APR-063` | Keep provider integration manual until mapped/tested | DEFER_SAFE | `ITF-AE1-APR-063` | DEFERRED_SAFE |
| `ITF-APR-064` | Preserve external system boundaries | APPROVE | `ITF-AE1-APR-064` | APPROVED |
| `ITF-APR-065` | Approve freshness/conflict/degraded/reconciliation | APPROVE_WITH_CHANGE | — | OPEN_REQUIRED_INPUT |

## Critical closure checklist

- [x] AE-0 authority/session gate entered with documented safe deferrals.
- [ ] Exactly 50 applicable decisions have valid journal records.
- [ ] Three proposed safe deferrals explicitly exclude internal driving and live provider integration.
- [ ] Roles, locations, movement modes, financial limits, evidence and source mappings are exact.
- [ ] No critical safety, identity, custody, authority, privacy or evidence gap is uncontained.
- [ ] Applicable Slice 1 tabletop cases pass or are accepted with exact changes.
- [ ] Slice 1 handoff requirements and acceptance evidence are owned.
- [ ] Implementation, pilot and activation remain separately authorized.

**Current result:** `PARTIAL — 19 APPROVED; 3 DEFERRED_SAFE; 28 OPEN; 22 valid approval records`. Slice 1 remains `NOT AUTHORIZED` for design, implementation, shadow, pilot and activation.
