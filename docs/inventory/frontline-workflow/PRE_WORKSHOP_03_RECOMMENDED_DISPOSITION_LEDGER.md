# Pre-Workshop 3 Recommended Disposition Ledger

**Status:** Planning-complete recommendations; authorization fields remain unsigned  
**Prepared:** 2026-07-16  
**Coverage:** 18 Workshop 1 decisions + 32 Workshop 2 decisions = 50 prerequisite decisions  

## 1. Purpose

This ledger removes the final planning ambiguity before Workshop 3. Every prerequisite decision now has:

- a recommended disposition;
- the exact policy direction to approve or complete;
- a safe default if authorization is withheld or required facts remain unavailable;
- the authority that must sign the decision.

This ledger does not change the Approval Register. `RECOMMEND_APPROVE` means the planning package recommends approval after the named authority confirms the exact scope and any remaining values. `RECOMMEND_DEFER_SAFE` means the affected action should remain unavailable.

## 2. Workshop 1 recommended dispositions

| Decision | Recommended disposition | Exact direction | Safe default without authorization | Required authority |
| --- | --- | --- | --- | --- |
| `ITF-APR-001` | RECOMMEND_APPROVE | Adopt the documented outcome, precedence, included lifecycle, and excluded authority | Program remains planning-only | GM/Operations |
| `ITF-APR-002` | RECOMMEND_APPROVE | Adopt nine-stage lifecycle; first technical slice ends at accepted Receipt/Custody handoff | No technical design | Workflow + policy owners |
| `ITF-APR-003` | RECOMMEND_APPROVE | Permit shadow and manager-confirmed/manual starts only; automatic start disabled | No workflow start | Inventory Manager |
| `ITF-APR-004` | RECOMMEND_APPROVE | Use catalog questions/options/terms for tabletop with logged versioned changes | No staff-facing activation | Inventory + pilot staff validation |
| `ITF-APR-005` | RECOMMEND_APPROVE | Adopt non-waivable identity, authority, safety, custody, privacy, evidence, and release gates | All affected actions held | GM/Operations policy owner |
| `ITF-APR-006` | RECOMMEND_APPROVE | Keep cancellation, acquisition reversal, transport recovery, and disposition as separate commands | Use existing manual authority process; no workflow command | GM/Operations |
| `ITF-APR-010` | RECOMMEND_APPROVE | Pilot organization Time Motor Sales; Minneapolis location only | No pilot location | GM/Operations |
| `ITF-APR-011` | RECOMMEND_APPROVE | Use narrow onsite trade-in, known seller/dealer, approved auction/carrier, and verified onsite cohort | Excluded source uses existing manual process | Inventory Manager |
| `ITF-APR-012` | RECOMMEND_APPROVE | Standard passenger/light-duty vehicles only with documented exclusions | Excluded vehicle does not enter pilot | Inventory + Shop/Safety |
| `ITF-APR-013` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Approve exact Minneapolis receiving, secure containment, quarantine, and after-hours locations/capabilities | No live arrival routed to an unspecified location | Operations/Location owner |
| `ITF-APR-014` | RECOMMEND_APPROVE | No movement/already onsite, approved carrier/tow, and seller delivery; internal drive deferred | Internal driving unavailable | Inventory + Safety/Insurance |
| `ITF-APR-015` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Use America/Chicago and publish exact calendar, holidays, closures, coverage, and after-hours containment | No automated clock based on draft calendar | Operations owner |
| `ITF-APR-070` | RECOMMEND_APPROVE | Require named cross-functional participants and at least 12 representative tabletop cases | No tabletop sign-off | Pilot owner |
| `ITF-APR-071` | RECOMMEND_APPROVE | Treat shadow thresholds as hypotheses requiring measured evidence before activation | Automatic triggers disabled | Pilot + policy owners |
| `ITF-APR-072` | RECOMMEND_APPROVE | One location, trained cohort, manager-confirmed starts, minimum 20 vehicles and 30 days | No manual pilot | GM/Operations + pilot owner |
| `ITF-APR-073` | RECOMMEND_APPROVE | Zero critical failures plus documented reliability, outcome, usability, ownership, and alert thresholds | No expansion/activation | GM/Operations + pilot owner |
| `ITF-APR-074` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Name monitoring, incident, pause, rollback, and resume primary/backups with exact scope | Pilot remains off | GM/Operations |
| `ITF-APR-075` | RECOMMEND_APPROVE | Automatic starts remain disabled until shadow/manual exits and separate authorization | Manual/automatic activation absent | GM/Operations + Inventory |

## 3. Workshop 2A recommended dispositions — roles and responsibility

| Decision | Recommended disposition | Exact direction | Safe default | Required authority |
| --- | --- | --- | --- | --- |
| `ITF-APR-020` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Confirm Eli or replacement as policy owner; Brock or replacement as service/workflow owner; separately name pilot owner after workload/conflict review | No active workflow ownership | GM/Operations |
| `ITF-APR-021` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Complete named-person capability, location, vehicle, qualification, schedule, backup, and access sheets | No command grant | GM/Operations + role owners |
| `ITF-APR-022` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Name coordinator, movement executor/provider, monitor, receiver, backups, and handoff acceptance coverage | No live transport workflow | Inventory + Operations/Safety |
| `ITF-APR-023` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Name independent identity-conflict reviewer and exact cancellation/reversal authorities | Identity holds; commands unavailable | GM/Operations + Inventory/Office |
| `ITF-APR-024` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Approve separation matrix and actual permissible/prohibited staff combinations | Independent action holds/external-routes | GM/Operations + qualified authorities |
| `ITF-APR-025` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Name administrator and different consequential-policy publisher; prohibit self-grant/publication | No consequential policy publication | GM/Operations + Security/Data |

## 4. Workshop 2B recommended dispositions — authority and financial control

| Decision | Recommended disposition | Exact direction | Safe default | Required authority |
| --- | --- | --- | --- | --- |
| `ITF-APR-030` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Approve one pilot accounting currency, gross-exposure treatment, and every cost class | No financial automation/commitment | GM/Operations + Controller |
| `ITF-APR-031` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Enter command-specific staff/manager/GM/upper limits by action, vehicle, plan/order, and period | No amount-based approval | GM/Operations + Owner/Controller |
| `ITF-APR-032` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Enter quote number/type/source/expiry/comparison and narrow exception rules | No quote sufficiency/selection | Financial + functional owners |
| `ITF-APR-033` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Enter absolute and percentage reapproval thresholds; material scope/source changes always re-evaluate | Changed work cannot proceed | Financial + functional owners |
| `ITF-APR-034` | RECOMMEND_APPROVE | Aggregate gross correlated exposure across vehicle/cycle, business purpose, plan/order/provider, and time; prohibit splitting | Uncertain correlation holds | GM/Operations + Controller |
| `ITF-APR-035` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Define minimum emergency categories, exact limit, coverage, evidence, and retrospective reviewer | Use existing emergency process only | GM/Operations + Safety/Insurance + Controller |
| `ITF-APR-036` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Define investment/forecast/carrying/margin/age/risk inputs and human disposition-review thresholds | No automatic disposition | GM/Operations + Inventory + Controller |

## 5. Workshop 2D recommended dispositions — timing and escalation

| Decision | Recommended disposition | Exact direction | Safe default | Required authority |
| --- | --- | --- | --- | --- |
| `ITF-APR-040` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Enter segmented acquisition-validation warning/due/overdue targets with original total age | Display age only; no SLA claim | Inventory + Operations |
| `ITF-APR-041` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Enter plan/request/quote/approval/confirmation/pickup-commitment targets by movement segment | No automated breach/escalation | Inventory/Transport + Finance |
| `ITF-APR-042` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Enter pickup/arrival warning/material/severe/stale/unknown thresholds and after-hours response | Provider status remains monitored manually | Inventory/Receiving + Operations |
| `ITF-APR-043` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Approve structured pause reasons, authority, maximum review, expiry, and continuing total age | Waiting never pauses automatically | Operations + stage owners |
| `ITF-APR-044` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Name E1-E5 primary/backups/on-call and acknowledgement/response/resolution/dwell targets | Existing manual escalation only | GM/Operations + incident owners |
| `ITF-APR-045` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Approve in-app durable queue plus minimal-data channel, urgency, quiet, retry, fallback, delivery rules | No external notifications | Operations + Security/Privacy |

## 6. Workshop 2C recommended dispositions — evidence, privacy, security, records

| Decision | Recommended disposition | Exact direction | Safe default | Required authority |
| --- | --- | --- | --- | --- |
| `ITF-APR-050` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Complete all 16 first-slice requirement sheets: applicability, criticality, source, role, freshness, access, retention, correction | No live evidence gate | Policy + Inventory + Evidence/Security |
| `ITF-APR-051` | RECOMMEND_DEFER_SAFE | Keep internal driving disabled until roadworthiness/legal-operation source, procedure, validity, invalidation, and alternate are approved | Tow/carrier only | Operations + Shop/Safety + Insurance/legal |
| `ITF-APR-052` | RECOMMEND_DEFER_SAFE | Keep internal driving disabled until driver/insurance source, scope, validity, privacy, and revocation are approved | No internal driver | Operations + Insurance/HR/Privacy |
| `ITF-APR-053` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Approve safe comparable pre/post condition matrix by source/method/risk | Movement requiring unapproved proof unavailable | Inventory + Receiving + Claims |
| `ITF-APR-054` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Approve item/field classification and view/action access; expose minimal eligibility results | Restricted evidence unavailable | Privacy/Security + role owners |
| `ITF-APR-055` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Enter class-specific retention, hold, export, disposal, provider/backup rules and owners | No automated disposal/bulk export | Records + Legal/Privacy + Security |
| `ITF-APR-056` | RECOMMEND_APPROVE | Preserve originals and use attributable supplement/reject/correct/supersede/conflict/quarantine with dependency reevaluation | Suspect evidence quarantines/holds | Evidence + Security/Privacy + decision authority |

## 7. Workshop 2E recommended dispositions — sources and integrations

| Decision | Recommended disposition | Exact direction | Safe default | Required authority |
| --- | --- | --- | --- | --- |
| `ITF-APR-060` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Inventory actual acquisition sources and approve each material field/state/source/freshness mapping | No automated authoritative start/prefill | Inventory + Controller + source owner |
| `ITF-APR-061` | RECOMMEND_APPROVE | Preserve one canonical Vehicle/inventory cycle, raw/normalized VIN, external mappings, duplicate/conflict controls | Unverified/conflicting identity holds | Inventory + Identity/Data |
| `ITF-APR-062` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Approve reported/observed/planned/in-transit/arrival/custody/placement/item-custody sources | No movement/receipt from reported state alone | Inventory + Receiving/Custody + Data |
| `ITF-APR-063` | RECOMMEND_DEFER_SAFE | Keep provider integration advisory/manual until request/ack/confirm/pickup/delivery/cancel/failure mappings and idempotency are approved | Manual monitored provider path | Inventory/Transport + Integration owner |
| `ITF-APR-064` | RECOMMEND_APPROVE | Keep DMS/accounting/website field boundaries explicit; no implied posting/payment/publication/frontline truth | No external write reliance | GM/Operations + Controller + Merchandising |
| `ITF-APR-065` | RECOMMEND_APPROVE_WITH_CHANGE_REQUIRED | Enter field-level freshness, conflict authority, degraded levels, fallback, reconciliation, return-to-normal | Stale/conflicting facts cannot satisfy gates | Data/Integration + Security + functional owners |

## 8. Authorization completion sheet

For each row above, the authorized decision record must add:

| Field | Required value |
| --- | --- |
| Final disposition | `APPROVE`, `APPROVE_WITH_CHANGE`, `DEFER_SAFE`, or `REJECT` |
| Exact approved text/values | `TBD` |
| Approver/authority | `TBD` |
| Effective scope/date/version | `TBD` |
| Evidence/rationale/conditions | `TBD` |
| Safe containment and gap | `TBD` |
| Review/expiry | `TBD` |
| Publisher/sign-off | `TBD` |

## 9. Completion result

Planning recommendations now exist for all 50 pre-Workshop 3 decisions. No decision is left unnamed or without safe fallback. Human authorization remains the sole incomplete action; no further planning catalog or lifecycle slice is required before the Workshop 3 entry gate.

