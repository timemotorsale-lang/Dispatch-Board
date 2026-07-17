# Slice 1 Decision Execution Gate

**Slice:** Acquisition and Transportation through accepted Receipt/Custody handoff  
**Status:** 50 applicable decisions `OPEN`; implementation not authorized

## How to use this gate

For each row, enter the valid approval-record ID from the [`Decision Signature Journal`](DECISION_SIGNATURE_JOURNAL.md). `DEFER_SAFE` passes this gate only when the excluded capability, safe alternate, owner, conditions and closure/review evidence are explicit. A blank record remains `OPEN`.

## Program, scope and pilot decisions

| Decision | Required outcome for Slice 1 | Recommended | Approval record | State |
| --- | --- | --- | --- | --- |
| `ITF-APR-001` | Adopt outcome, precedence and authority boundaries | APPROVE | — | OPEN |
| `ITF-APR-002` | Adopt lifecycle and first boundary | APPROVE | — | OPEN |
| `ITF-APR-003` | Shadow/manual starts only | APPROVE | — | OPEN |
| `ITF-APR-004` | Accept staff questions/options for controlled validation | APPROVE | — | OPEN |
| `ITF-APR-005` | Adopt non-waivable critical gates | APPROVE | — | OPEN |
| `ITF-APR-006` | Separate cancellation/reversal/recovery commands | APPROVE | — | OPEN |
| `ITF-APR-010` | Confirm organization/location | APPROVE | — | OPEN |
| `ITF-APR-011` | Confirm eligible acquisition sources | APPROVE | — | OPEN |
| `ITF-APR-012` | Confirm vehicle classes/exclusions | APPROVE | — | OPEN |
| `ITF-APR-013` | Name receiving/containment locations/capabilities | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-014` | Approve movement modes; internal driving excluded | APPROVE | — | OPEN |
| `ITF-APR-015` | Approve calendar/after-hours coverage | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-070` | Approve participants/tabletop scope | APPROVE | — | OPEN |
| `ITF-APR-071` | Treat shadow thresholds as hypotheses | APPROVE | — | OPEN |
| `ITF-APR-072` | Approve future manager-confirmed pilot cohort | APPROVE | — | OPEN |
| `ITF-APR-073` | Approve success/zero-critical-failure rule | APPROVE | — | OPEN |
| `ITF-APR-074` | Name monitoring/pause/rollback authorities | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-075` | Require separate automatic-start authorization | APPROVE | — | OPEN |

## Roles and separation

| Decision | Required outcome for Slice 1 | Recommended | Approval record | State |
| --- | --- | --- | --- | --- |
| `ITF-APR-020` | Name policy, workflow/service and pilot owners | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-021` | Complete capability/access/backup records | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-022` | Name transport/receiving roles and coverage | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-023` | Name identity reviewer and reversal authorities | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-024` | Approve separation/independent routes | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-025` | Separate administrator and policy publisher | APPROVE_WITH_CHANGE | — | OPEN |

## Financial authority

| Decision | Required outcome for Slice 1 | Recommended | Approval record | State |
| --- | --- | --- | --- | --- |
| `ITF-APR-030` | Approve currency/exposure/cost classes | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-031` | Set command-specific limits | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-032` | Approve quote requirements | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-033` | Set reapproval/material-change rules | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-034` | Aggregate exposure; prohibit splitting | APPROVE | — | OPEN |
| `ITF-APR-035` | Define emergency category/limit/review | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-036` | Define economics/disposition human review | APPROVE_WITH_CHANGE | — | OPEN |

## Timing, escalation and notifications

| Decision | Required outcome for Slice 1 | Recommended | Approval record | State |
| --- | --- | --- | --- | --- |
| `ITF-APR-040` | Set acquisition-validation targets | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-041` | Set transport plan/quote/approval targets | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-042` | Set pickup/arrival variance and response | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-043` | Approve pause/review/age rules | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-044` | Name escalation coverage/targets | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-045` | Approve channels/quiet/retry/fallback | APPROVE_WITH_CHANGE | — | OPEN |

## Evidence, safety, privacy and security

| Decision | Required outcome for Slice 1 | Recommended | Approval record | State |
| --- | --- | --- | --- | --- |
| `ITF-APR-050` | Approve first-slice evidence manifest | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-051` | Exclude internal driving until roadworthiness policy | DEFER_SAFE | — | OPEN |
| `ITF-APR-052` | Exclude internal driving until driver/insurance policy | DEFER_SAFE | — | OPEN |
| `ITF-APR-053` | Approve comparable condition evidence | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-054` | Approve classification/access/minimal eligibility | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-055` | Approve retention/hold/export/disposal rules | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-056` | Preserve originals and correction/quarantine lineage | APPROVE | — | OPEN |

## Source authority and integration

| Decision | Required outcome for Slice 1 | Recommended | Approval record | State |
| --- | --- | --- | --- | --- |
| `ITF-APR-060` | Approve acquisition field/source/freshness map | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-061` | Preserve canonical identity/duplicate controls | APPROVE | — | OPEN |
| `ITF-APR-062` | Approve movement/arrival/custody state sources | APPROVE_WITH_CHANGE | — | OPEN |
| `ITF-APR-063` | Keep provider integration manual until mapped/tested | DEFER_SAFE | — | OPEN |
| `ITF-APR-064` | Preserve external system boundaries | APPROVE | — | OPEN |
| `ITF-APR-065` | Approve freshness/conflict/degraded/reconciliation | APPROVE_WITH_CHANGE | — | OPEN |

## Critical closure checklist

- [x] AE-0 authority/session gate entered with documented safe deferrals.
- [ ] Exactly 50 applicable decisions have valid journal records.
- [ ] Three proposed safe deferrals explicitly exclude internal driving and live provider integration.
- [ ] Roles, locations, movement modes, financial limits, evidence and source mappings are exact.
- [ ] No critical safety, identity, custody, authority, privacy or evidence gap is uncontained.
- [ ] Applicable Slice 1 tabletop cases pass or are accepted with exact changes.
- [ ] Slice 1 handoff requirements and acceptance evidence are owned.
- [ ] Implementation, pilot and activation remain separately authorized.

**Current result:** `FAIL — 50 OPEN; 0 valid approval records`.
