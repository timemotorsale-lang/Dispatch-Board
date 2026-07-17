# Slice 1 Future Handoff — Acquisition and Transportation

**Status:** Prepared; `NO-GO FOR DESIGN/CODE/PILOT/ACTIVATION`  
**Direct approvals:** `ITF-APR-001`-`006`, `010`-`015`; applicable `020`-`075`  
**Catalog:** [`Acquisition and Transportation`](../../ACQUISITION_TRANSPORT_DECISION_CATALOG.md)

## Outcome and boundary

Accept one authoritative acquisition, validate identity/intent/authority, decide whether transportation is required, safely plan and monitor the approved movement, and produce an attributable handoff for Receipt/Custody acceptance. This slice does not complete physical receipt.

## Slice contract

| Requirement | Slice-specific contract |
| --- | --- |
| Entry trigger/gate | Authoritative acquisition fact; canonical vehicle/cycle; eligible source/cohort; no duplicate active workflow |
| Authoritative inputs | Acquisition source, VIN/identity, seller/source, ownership intent, location, movement need, financial authority, vehicle/condition evidence |
| Staff questions/options | Confirm acquisition; transportation arranged Y/N/Not required/Unknown; select carrier/tow/seller delivery/no movement; resolve quote/authority; monitor/recover/cancel |
| Conditional route | Not required/onsite → receipt scheduling; arranged → validate plan; not arranged → source/quote/approve; unknown → owner/evidence task; unsafe/internal-drive unavailable → carrier/tow |
| Roles | Acquisition owner, transport coordinator, movement authority/provider, monitor, receiving consumer, finance approver, identity reviewer |
| Permissions/financial | Server-side command authority; quote/limit/reapproval/cumulative exposure; no implied purchase/movement |
| Evidence | Acquisition, identity, location, condition, quote/approval, provider plan/acknowledgement, custody, pickup/delivery observations, discrepancy/recovery |
| Safety/legal/privacy | Movement mode, roadworthiness/driver/insurance if ever approved, minimal provider data, incident/claim containment |
| States | Validated → transport not required/planning/approved/scheduled/in transit/delivered observed → handoff offered/accepted; explicit cancel/reverse/recover |
| Dependencies/effects | Creates expected arrival and owned commitment; never changes receipt/custody from provider report alone |
| Timing/escalation | Original acquisition age; segmented plan/quote/approval/pickup/arrival targets; stale/unknown provider state; after-hours coverage |
| Notifications | Durable owner queue; minimal-data escalation; actionable acknowledgement; deduplicated delivery state |
| Exceptions/recovery | Identity conflict, no quote/authority, cancellation, no-show, delay, damage, unsafe movement, wrong destination, provider outage |
| Correction/reversal | Preserve original acquisition/plan/events; supersede or reverse; recover commitments/custody/cost; re-evaluate handoff |
| Degraded/manual | Approved manual provider/contact procedure with attributable observations and later idempotent reconciliation |
| Exit gate | Accepted Receipt/Custody handoff with current identity, acquisition, expected/observed arrival, location, condition, custody/restrictions and evidence |
| Tabletop | `ITF-AE-TT-002`-`006`,`023`-`026` plus catalog cases |
| Pilot eligibility | Minneapolis, approved sources/vehicles/movement modes, trained roles; manager-confirmed only |
| Monitoring | Duplicate starts, unauthorized movement/spend, plan time, pickup/arrival variance, evidence/owner gaps, provider reconciliation |
| Pause/rollback/resume | Pause affected version; retain manual safe path/in-flight ownership; reconcile external commitments; resume by named authority |

## Future build order

Policy → state/commands → persistence/versioning → permissions → events/audit/evidence/idempotency → provider/reconciliation adapters → staff workbench → degraded states → scenario tests → tabletop → shadow → manager-confirmed pilot → outcome review → rollback rehearsal → separate activation.

## Readiness blockers

Exact roles, locations, calendars, financial limits, evidence/source mappings, provider behavior, safety/insurance decisions and approval signatures remain open. First code boundary ends only when the Receipt/Custody consumer accepts the handoff.
