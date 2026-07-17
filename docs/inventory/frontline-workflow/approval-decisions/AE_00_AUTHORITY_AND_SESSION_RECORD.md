# AE-0 Authority and Approval Session Record

**Status:** `ENTERED_WITH_SAFE_DEFERRALS`  
**Purpose:** Establish who may decide what before any `ITF-APR-*` state changes

## Session identity

| Field | Required value |
| --- | --- |
| Session ID | `ITF-AE0-2026-01` |
| Date, start/end time and timezone | 2026-07-16; exact start/end time not captured; America/Chicago |
| Organization and location | Time Motor Sales; Minneapolis |
| Workflow/source package version | `ITF-1.0` approval baseline |
| Facilitator | Eli Aswan |
| Decision recorder | Eli Aswan, with Codex documentation support |
| Evidence repository/reference | `codex/inventory-frontline-approval-decisions`; user confirmation in this Codex conversation |
| Decisions scheduled | 50 Slice 1 prerequisite decisions |

## Authority roster

| Authority domain | Participant | Title/role | Authority source and scope | Backup | Conflict/recusal | Confirmed |
| --- | --- | --- | --- | --- | --- | --- |
| GM/Operations policy | Eli Aswan | General/Operations and ultimate approval authority | User-provided company assignment; formal source/scope evidence pending | Eli Aswan is designated ultimate backup; no independent self-backup | Consolidated with finance, safety/insurance, privacy/security/data and pilot authority; independent-required self-review is unavailable | ROLE PROVIDED |
| Inventory workflow/service | Brock Harris | Inventory workflow owner | User-provided company assignment; formal source/scope evidence pending | Eli Aswan — ultimate reviewer/backup | Also transport/receiving; Eli reviews disputed or independence-required handoffs not originated by Eli | ROLE PROVIDED |
| Acquisition/transport | Brock Harris | Transportation authority | User-provided company assignment; formal source/scope evidence pending | Eli Aswan — ultimate reviewer/backup | Also Inventory and receiving; Eli reviews conflicts, disputes and exceptions not originated by Eli | ROLE PROVIDED |
| Receiving/custody/location | Brock Harris | Receiving authority | User-provided company assignment; formal source/scope evidence pending | Eli Aswan — ultimate reviewer/backup | Brock cannot independently accept his own disputed movement/custody handoff; route to Eli | ROLE PROVIDED |
| Financial/controller | Eli Aswan | Financial and ultimate approval authority | User-provided company assignment; exact limits and formal source/scope evidence pending | Eli Aswan is designated ultimate backup; no independent self-backup | Transactions originated/executed by Eli that require independent review must hold or use an external qualified reviewer | ROLE PROVIDED |
| Shop/safety/roadworthiness | Eli Aswan | Shop safety and ultimate review authority | User-provided company assignment; qualified roadworthiness scope/evidence pending | Eli Aswan is designated ultimate backup; no independent self-backup | Safety review cannot be displaced by financial or pilot objectives; qualified independent checks remain separate where required | ROLE PROVIDED |
| Insurance/driver eligibility | Eli Aswan | Insurance and ultimate review authority | User-provided company assignment; insurer/policy scope evidence pending | Eli Aswan is designated ultimate backup; no independent self-backup | Internal driving remains deferred until decisions `051` and `052` close | ROLE PROVIDED |
| Evidence/privacy/security/records | Eli Aswan | Privacy/security and ultimate review authority | User-provided company assignment; records/retention scope evidence pending | Eli Aswan is designated ultimate backup; no independent self-backup | Self-grant, self-publication or self-review of an incident he originated must hold or use an external reviewer | ROLE PROVIDED |
| Data/source/integration | Eli Aswan | Data and ultimate review authority | User-provided company assignment; source/integration scope evidence pending | Eli Aswan is designated ultimate backup; no independent self-backup | Consequential source-policy publication requires an external route when Eli is also administrator/originator | ROLE PROVIDED |
| Qualified legal/compliance where applicable | — | — | Not provided; do not infer from another role | — | Applicable legal/title determinations remain safely blocked | NOT PROVIDED |
| Pilot monitoring/pause/rollback | Eli Aswan | Pilot control and ultimate review authority | User-provided company assignment; exact scope evidence pending | Eli Aswan is designated ultimate backup; no independent self-backup | Eli may pause immediately; his own resume decision requires objective exit evidence and an external reviewer if approved policy requires independence | ROLE PROVIDED |

One person may represent several domains only when actual authority and separation rules permit it. Self-grant, self-publication, conflicted independent review and unsupported delegated authority are invalid.

### Consolidation review required

- Eli Aswan is the user-designated ultimate reviewer and backup for all company approval roles. This is not automatically invalid for a small dealership, but it does not create independent self-review. When Eli originates, executes or administers an action that approved policy requires another person to verify, the action must hold or route to an external qualified reviewer.
- Brock Harris holds Inventory, transportation and receiving authority. Eli Aswan is the ultimate reviewer/backup for Brock's identity conflicts, disputed condition/custody, rejection/return, claims and independence-required handoffs.
- No qualified legal/compliance participant was provided. Slice 1 may continue only where legal/compliance review is not applicable or is explicitly safely deferred; Slice 7 cannot be authorized without the qualified applicability authority required by `ITF-APR-130`.

## Entry-gate confirmations

| Confirmation | Required result | Recorded result | Evidence |
| --- | --- | --- | --- |
| Canonical package/version agreed | YES | YES | User confirmed all proposed AE-0 values |
| Decision method accepted | YES | YES | `APPROVE`, `APPROVE_WITH_CHANGE`, `DEFER_SAFE`, `REJECT` method confirmed |
| Participants understand recommendation versus approval | YES | YES | AE-0 statement explicitly preserves all decision states |
| Required authority represented for scheduled decisions | YES or explicit safe deferral | YES WITH SAFE DEFERRALS | Eli/Brock roster plus documented exclusions |
| Conflicts/recusals recorded | YES | YES | Multi-role and independent self-review restrictions recorded |
| Exact policy values can be supplied or safely deferred | YES | YES WITH SAFE DEFERRALS | Missing exact values remain OPEN during decision execution |
| Decision records will be attributable and immutable | YES | YES | Signature-journal contract accepted for execution |
| No code/pilot/activation inferred | YES | YES | Explicit condition of entry disposition |

## Entry disposition

Choose one only:

- [ ] `ENTER_APPROVAL_EXECUTION`
- [x] `ENTER_WITH_SAFE_DEFERRALS`
- [ ] `HOLD`

Exact conditions, excluded decisions and safe defaults:

1. Internal vehicle driving remains unavailable; use onsite/no-movement, approved carrier, tow or seller-delivery routes.
2. Live transportation-provider integration remains advisory/manual with attributable monitoring and later reconciliation.
3. Eli Aswan cannot independently review an Eli-originated action when approved policy requires genuine independence; the action holds or routes to an external qualified reviewer.
4. Legal/title determinations requiring qualified interpretation remain deferred to qualified review.
5. Automatic workflow starts remain disabled.
6. Entry authorizes decision review only; it does not authorize design, code, shadow operation, pilot or production activation.

## Authorization record

| Approving authority | Disposition | Scope | Conditions | Date/time | Signature/evidence |
| --- | --- | --- | --- | --- | --- |
| Eli Aswan — ultimate General/Operations authority | `ENTER_WITH_SAFE_DEFERRALS` | Time Motor Sales Minneapolis; Slice 1 approval execution; `ITF-1.0` | Six exclusions and safe defaults listed above; each individual decision remains OPEN until validly decided | 2026-07-16; exact time not captured | User confirmed all AE-0 values in this Codex conversation; chat-user identity/signature not independently verified |

**Current result:** `ENTERED_WITH_SAFE_DEFERRALS`. AE-0 permits formal review of the 50 Slice 1 decisions. It approves none of those decisions and provides no design, implementation, shadow, pilot or activation authority.
