# AE-3 — Receipt, Custody, Inspection, and Safety Approval

**Status:** Ready for execution; Slice 2 non-code execution packet implemented; approval session not conducted
**Decisions:** `ITF-APR-080`-`099` (20 total)  
**Slices:** 2 and 3  
**Source:** [`Approval Workshop 03`](../APPROVAL_WORKSHOP_03_RECEIPT_CUSTODY_INSPECTION_SAFETY.md)

## Required outcomes

Approve distinct arrival/control/custody/receipt states; receiving people and locations; identity, property and condition evidence; placement, hazard, discrepancy and handoff controls; inspection templates, qualifications and resources; result/finding/triage meanings; correction/reinspection; and Recon or alternate-route handoff.

## Execution sequence

1. Receipt state, roles and custody (`080`-`083`).
2. Condition, placement, hazard and discrepancy (`084`-`089`).
3. Inspection templates, qualifications, resources and safety (`090`-`094`).
4. Results, findings, triage, correction and handoff (`095`-`099`).
5. Separate Slice 2 and Slice 3 readiness decisions.

## Safe defaults

Observed arrival is not accepted custody; unspecified/unattended receipt is unavailable; critical discrepancy blocks receipt; unqualified or unresourced inspection cannot start; incomplete/invalid evidence cannot pass; critical restrictions remain active; unapproved alternate routes are unavailable.

## Exit gate

AE-3 exits only when all 20 decisions have authorized dispositions, applicable AE-1/AE-2 prerequisites are resolved or safely deferred, tabletop evidence is accepted, and Slices 2 and 3 receive separate design-readiness outcomes. Current result: both slices `NO-GO FOR CODE`.

## Slice 2 execution packet

The Slice 2 operating flow, staff playbook, ten-decision gate, open-input register, tabletop cases and separate authorization record are maintained in the [`approval-decisions workspace`](../approval-decisions/README.md). Their preparation changes no `OPEN` policy state and authorizes no technical design, code, shadow, pilot or activation.
