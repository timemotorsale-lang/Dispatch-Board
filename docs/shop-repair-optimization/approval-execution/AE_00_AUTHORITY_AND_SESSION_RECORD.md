# SRO AE-0 — Authority and Session Entry Record

**Status:** `READY_FOR_AUTHORIZED_COMPLETION`; not entered
**Purpose:** Establish who may decide what before any `SRO-APR-*` decision is executed

**Active completion record:** [`../approval-decisions/AE_00_AUTHORITY_AND_SESSION_RECORD.md`](../approval-decisions/AE_00_AUTHORITY_AND_SESSION_RECORD.md)

## Known authority context

Prior Inventory-to-Frontline records identify Eli Aswan as ultimate General/Operations reviewer and backup and Brock Harris as Inventory workflow owner. That context may inform participant selection but does not automatically extend either person's authority to every Shop/Recon decision. Exact Shop/Recon authority must be confirmed in this record.

Eli cannot independently review his own originating action where policy requires genuine separation. Such actions hold or route to a qualified independent/external reviewer.

## Session record

| Field | Required entry |
| --- | --- |
| Session ID | — |
| Date/time/timezone | — |
| Organization/location | Time Motor Sales / Minneapolis — confirm |
| Policy version | `SRO-1.0` — confirm |
| Facilitator/recorder | — |
| Decisions in scope | `SRO-APR-001`–`079`, or exact subset |
| Evidence method | Signed record, authenticated system action or other approved evidence |
| Entry selection | `DO_NOT_ENTER`, `ENTER_APPROVAL_EXECUTION`, or `ENTER_WITH_SAFE_DEFERRALS` |

## Required authority roster

| Authority domain | Primary | Backup | Required scope/evidence | Conflict/independence rule | Status |
| --- | --- | --- | --- | --- | --- |
| GM/Operations | Eli Aswan — candidate from prior program | — | Charter, scope, high-impact overrides, pilot/pause/rollback | No self-review where independence is required | UNCONFIRMED_FOR_SRO |
| Shop/Fixed Operations | — | — | Service ownership, WIP, capacity, execution and intervention policy | Operating owner distinct from independent QC where required | OPEN_REQUIRED_INPUT |
| Dispatch/Foreman | — | — | Sequencing, assignment, interruption and blocker recovery | Cannot override ineligibility/safety | OPEN_REQUIRED_INPUT |
| Inventory Recon | Brock Harris — candidate from prior program | Eli Aswan — candidate backup | Inventory priority, economics and ITF handoff | Disputed/high-impact decisions use approved review | UNCONFIRMED_FOR_SRO |
| Service Advisor/Customer | — | — | Authorization, estimates, promises, communication and recovery | Financial/complaint authority separately bounded | OPEN_REQUIRED_INPUT |
| Parts/Purchasing | — | — | Sources, reservations, substitutes, purchasing and recovery | Substitute requires technical authority; limits cumulative | OPEN_REQUIRED_INPUT |
| Finance/Controller | Eli Aswan — candidate from prior program | — | Pricing, discounts, refunds, taxes/fees and reconciliation | Independent approval where thresholds require | UNCONFIRMED_FOR_SRO |
| Shop Safety/Insurance | Eli Aswan — candidate from prior program | — | Movement, road test, lift, EV, environmental and incident controls | Qualified specialist required where applicable | UNCONFIRMED_FOR_SRO |
| QC/Release | — | — | Independent verification, rework, comeback and release evidence | Cannot verify own consequential work where prohibited | OPEN_REQUIRED_INPUT |
| Privacy/Security/Data | Eli Aswan — candidate from prior program | — | Consent, recording, retention, access, providers and incidents | Independent incident/access review where required | UNCONFIRMED_FOR_SRO |
| Algorithm/Policy owner | — | — | Versions, validation, monitoring and calibration | Author/publisher/reviewer separation as approved | OPEN_REQUIRED_INPUT |
| IT/Integration | — | — | Sources, freshness, outages, reconciliation and recovery | Cannot silently promote advisory data | OPEN_REQUIRED_INPUT |
| Customer Experience/Marketing | — | — | Heat cases, outreach, consent and suppression | No automatic compensation/admission | OPEN_REQUIRED_INPUT |
| Qualified legal/compliance/specialist | — | — | Applicable legal, tax, recording, environmental or specialist interpretation | Cannot be inferred from operations authority | OPEN_REQUIRED_INPUT |

## Entry findings

- [ ] Every represented authority is confirmed for the exact scope.
- [ ] Missing roles have an approved safe deferral and unavailable capability.
- [ ] Conflicts, recusals and genuine independent-review routes are explicit.
- [ ] The evidence method and recorder are approved.
- [ ] No participant interprets approval execution as code, pilot or activation authority.

**Current selection:** `DO_NOT_ENTER` until an authorized person completes this record.
