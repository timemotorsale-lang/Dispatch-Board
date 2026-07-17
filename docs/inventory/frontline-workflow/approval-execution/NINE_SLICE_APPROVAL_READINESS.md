# Nine-Slice Approval Readiness Matrix

**Status:** All slices `NO-GO FOR CODE`, pilot and activation

| Slice | Direct approvals | Global prerequisites | Entry gate | Exit gate | Cancellation/correction/degraded | Pilot/rollback | Current readiness |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 Acquisition/Transportation | `001`-`006`,`010`-`015`; relevant `020`-`065` | AE-1/AE-2 | Authoritative acquisition, identity, scope | Accepted Receipt/Custody handoff | Separate cancellation/reversal/recovery; manual provider; carrier/tow | `070`-`075`; manager-confirmed | NO-GO |
| 2 Receipt/Custody | `080`-`089` | AE-1/AE-2 + Slice 1 handoff | Observed arrival and valid expected context | Complete accepted receipt and Inspection handoff | Discrepancy, rejection/return, correction, containment, manual intake | Separate shadow/pilot/rollback | NO-GO |
| 3 Inspection/Triage | `090`-`099` | AE-1/AE-2 + Slice 2 | Accepted receipt/custody and applicable template | All findings disposed; Recon/alternate accepted | Stop, transfer, reinspection, supersession, offline evidence recovery | Separate shadow/pilot/rollback | NO-GO |
| 4 Recon Planning | `100`-`109` | AE-1/AE-2 + Slice 3 | Accepted findings/diagnosis context | Current authorized executable plan/jobs accepted | Expire/revoke/cancel/change/replan; manual approval evidence | Separate shadow/pilot/rollback | NO-GO |
| 5 Parts/Repair | `110`-`119` | AE-1/AE-2 + Slice 4 | Current job, authority, parts/resource/procedure readiness | Evidence-complete QC handoff | PO/part discrepancy, stop, change scope, sublet, cancellation, reconciliation | Separate shadow/pilot/rollback | NO-GO |
| 6 Quality/Safety | `120`-`129` | AE-1/AE-2 + Slice 5 | Accepted QC envelope and completed execution | All applicable verification passes; downstream accepts release | Fail/rework/reinspect/invalidate; road-test alternate; manual evidence | Separate shadow/pilot/rollback | NO-GO |
| 7 Title/Documents | `130`-`139` | AE-1/AE-2 + qualified applicability + predecessor | Applicable requirement set and custody context | Qualified final readiness and Merch/alternate acceptance | Reject/resubmit/correct/special process/constrained state/provider outage | Separate shadow/pilot/rollback | NO-GO |
| 8 Merch/Pricing | `140`-`149` | AE-1/AE-2 + Slices 6/7 requirements | Eligible facts/physical/document state | Reconciled package accepted by Frontline Review | Correct/pause/remove/republish; price expiry; manual channel fallback | Separate shadow/pilot/rollback | NO-GO |
| 9 Frontline Release | `150`-`159` | All applicable upstream/global decisions | Current frozen whole-package inputs | Atomic authorization plus reconciled availability; ongoing verification | Immediate hold, suspension, correction, full re-review/reinstatement | `159`; distinct pilot/activation | NO-GO |

## Readiness meanings

- `DOCUMENTED`: planning content exists.
- `APPROVAL_READY`: exact decisions can be presented to authorized people.
- `DESIGN_READY`: applicable policy is approved/safely deferred and handoff inputs are exact.
- `IMPLEMENTATION_READY`: design, acceptance, ownership and rollout authority are approved.
- `PILOT_READY`: implemented version passed tests/tabletop/shadow and named pilot is authorized.
- `ACTIVATION_READY`: pilot exits and separate activation approval are complete.

No slice currently exceeds `APPROVAL_READY`.
