# Workshop 2 Gap Register

**Status:** Baseline gap inventory; all closures require authorized evidence  
**Prepared:** 2026-07-16  
**Parent:** [`APPROVAL_WORKSHOP_02F_CONSOLIDATED_DECISION_READOUT.md`](APPROVAL_WORKSHOP_02F_CONSOLIDATED_DECISION_READOUT.md)  

## 1. Purpose

This register converts every unresolved Workshop 2 control into owned, testable work. A gap is not closed by discussion, a document draft, an assumed job title, or a future implementation promise. Closure requires exact evidence and acceptance by the named authority.

## 2. Severity and state

| Severity | Meaning |
| --- | --- |
| `G0 CRITICAL` | Unresolved identity, safety, custody, privacy, legal/title, authority, evidence, or release control; affected action must not proceed |
| `G1 HIGH` | Material financial, operational, coverage, source, integration, or audit control missing; affected pilot/design scope remains constrained |
| `G2 MODERATE` | Important usability, efficiency, reporting, or later-slice dependency with safe containment available |

| State | Meaning |
| --- | --- |
| `OPEN_UNCONTAINED` | No acceptable safe behavior yet; blocks affected scope |
| `OPEN_CONTAINED` | Affected action is explicitly unavailable/restricted |
| `IN_REMEDIATION` | Owner is producing the required control/evidence |
| `READY_FOR_REVIEW` | Closure evidence awaits eligible acceptance |
| `CLOSED_ACCEPTED` | Eligible authority accepted closure for exact scope |
| `WONT_DO_SAFE` | Capability remains excluded with approved containment |
| `REOPENED` | New facts invalidated prior closure |

## 3. Baseline gap inventory

All owners and target dates remain `TBD` until Workshop 2F. Candidate roles do not become accountable merely because they are listed.

| Gap | Severity | Missing control | Affected decisions/slices | Safe current behavior | Closure evidence | Owner/target | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `W2-GAP-001` | G0 | Named policy owner and exact authority not approved | `020`; all slices | No policy activation/publication | Signed scope/authority record | `TBD` | OPEN_CONTAINED |
| `W2-GAP-002` | G0 | Service, workflow, and pilot ownership/combination not approved | `020`; all slices | Planning only; no live case/pilot ownership inferred | Named roles, workload/conflict review, backups | `TBD` | OPEN_CONTAINED |
| `W2-GAP-003` | G0 | Named-person capability/location/vehicle/qualification mapping incomplete | `021`; all slices | Commands unavailable without exact grant | Completed role/grant sheets and qualification evidence | `TBD` | OPEN_CONTAINED |
| `W2-GAP-004` | G0 | Transport planner/executor/monitor/receiver and accepted-handoff coverage unapproved | `022`; slices 1-2 | No automated/live transport workflow | Primary/backup/coverage and handoff sign-off | `TBD` | OPEN_CONTAINED |
| `W2-GAP-005` | G0 | Independent material identity-conflict reviewer unnamed | `023`,`024`,`061`; all slices | Identity conflict quarantines/holds | Qualified reviewer/backup and procedure | `TBD` | OPEN_CONTAINED |
| `W2-GAP-006` | G0 | Cancellation/acquisition-reversal authorities unapproved | `023`; slice 1 | No workflow cancellation/reversal command | Exact commands, roles, scopes, recovery evidence | `TBD` | OPEN_CONTAINED |
| `W2-GAP-007` | G0 | Separation matrix not approved for real staffing combinations | `024`; slices 1-9 | Required independent actions hold or external-route | Signed combination matrix and alternates | `TBD` | OPEN_CONTAINED |
| `W2-GAP-008` | G0 | Workflow administrator and independent publisher unnamed | `025`; all slices | No consequential configuration publication | Named roles, access grants, four-eyes test | `TBD` | OPEN_CONTAINED |
| `W2-GAP-009` | G1 | Accounting currency/cost classifications unapproved | `030`; slices 1,4-8 | No financial commitment automation | Approved catalog/currency/gross rules | `TBD` | OPEN_CONTAINED |
| `W2-GAP-010` | G0 | Exact authority limits and upper boundary blank | `031`; slices 1,4-8 | No amount-based approvals/commitments | Published limit matrix with backups | `TBD` | OPEN_CONTAINED |
| `W2-GAP-011` | G1 | Quote sources/count/exceptions and comparison rules blank | `032`; slices 1,4-7 | No automated quote sufficiency/selection | Approved quote matrix and sample validation | `TBD` | OPEN_CONTAINED |
| `W2-GAP-012` | G1 | Reapproval amount/percentage/expiry/material-change thresholds blank | `033`; slices 1,4-8 | Material changes require higher manual review; no execution | Approved thresholds and changed-scope tests | `TBD` | OPEN_CONTAINED |
| `W2-GAP-013` | G1 | Correlated exposure/anti-splitting dimensions blank | `034`; slices 1,4-7 | Hold uncertain correlated commitments | Approved aggregation rules and stress tests | `TBD` | OPEN_CONTAINED |
| `W2-GAP-014` | G0 | Emergency spend categories/limit/on-call review blank | `035`; slices 1-6 | Protect people/property only through existing approved process; no workflow authority | Signed emergency policy, coverage, retrospective review | `TBD` | OPEN_CONTAINED |
| `W2-GAP-015` | G1 | Economics/disposition-review inputs and threshold blank | `036`; slices 1,4-9 | No automatic disposition; route to existing management process | Approved inputs/sources/threshold/alternatives | `TBD` | OPEN_CONTAINED |
| `W2-GAP-016` | G1 | Operating/coverage calendars remain draft | `040`-`045`; all slices | No automated SLA/escalation based on draft calendar | Approved calendar versions/owners | `TBD` | OPEN_CONTAINED |
| `W2-GAP-017` | G1 | Acquisition and transport target values blank | `040`-`042`; slices 1-2 | Display elapsed age only; no policy breach claim | Segmented clock sheets and tabletop validation | `TBD` | OPEN_CONTAINED |
| `W2-GAP-018` | G1 | Pause reasons/max review/expiry unapproved | `043`; all slices | Waiting does not pause policy clocks automatically | Approved reason catalog and pause tests | `TBD` | OPEN_CONTAINED |
| `W2-GAP-019` | G0 | Escalation recipients/backups/on-call and response targets unnamed | `044`; all slices | No automated critical escalation; use existing manual emergency process | Coverage roster and delivery/response drill | `TBD` | OPEN_CONTAINED |
| `W2-GAP-020` | G1 | Notification channels/quiet/fallback/delivery rules unapproved | `045`; all slices | Durable in-app planning only; no external notifications | Channel policy, consent/security, failure drill | `TBD` | OPEN_CONTAINED |
| `W2-GAP-021` | G0 | Sixteen first-slice evidence requirements/criticality not approved | `050`; slice 1 | No live first-slice gate evaluation | Completed evidence manifests and owner sign-off | `TBD` | OPEN_CONTAINED |
| `W2-GAP-022` | G0 | Roadworthiness/legal-operation source/validity missing | `051`; slices 1,3,5-6 | Internal driving disabled | Qualified source/procedure/validity/alternate | `TBD` | OPEN_CONTAINED |
| `W2-GAP-023` | G0 | Driver/insurance eligibility source/validity/privacy missing | `052`; slice 1 | Internal driving disabled | Minimal eligibility source, scope, revoke test | `TBD` | OPEN_CONTAINED |
| `W2-GAP-024` | G0 | Pre/post condition requirements by source/method/risk unapproved | `053`; slices 1-2 | Movement requiring condition proof unavailable | Capture matrix, safety/privacy/tabletop evidence | `TBD` | OPEN_CONTAINED |
| `W2-GAP-025` | G0 | Classification and role/action visibility unapproved | `054`; all slices | Restricted evidence unavailable beyond existing approved controls | Classification/access matrix and access tests | `TBD` | OPEN_CONTAINED |
| `W2-GAP-026` | G0 | Retention/hold/export/disposal schedules and owner absent | `055`; all slices | No automated disposal/bulk export | Approved schedules, hold/export/disposal drill | `TBD` | OPEN_CONTAINED |
| `W2-GAP-027` | G0 | Correction/rejection/supersession/conflict/quarantine authority unapproved | `056`; all slices | Suspect evidence restricted; no accepted overwrite | Authority matrix and dependency-invalidation tests | `TBD` | OPEN_CONTAINED |
| `W2-GAP-028` | G0 | Actual acquisition systems/sources not inventoried by field | `060`; slice 1 | No automated authoritative start/prefill | Source inventory and field mappings | `TBD` | OPEN_CONTAINED |
| `W2-GAP-029` | G0 | Canonical VIN verification/duplicate/conflict policy unapproved | `061`; all slices | Unverified/conflicting identity holds | Approved identity process and duplicate tests | `TBD` | OPEN_CONTAINED |
| `W2-GAP-030` | G0 | Location/custody source matrix unapproved | `062`; slices 1-2 and release | No movement/receipt based only on reported state | Field matrix and custody/arrival tests | `TBD` | OPEN_CONTAINED |
| `W2-GAP-031` | G1 | Actual carrier/provider status mappings/freshness/idempotency unknown | `063`; slice 1 | Provider states manual/advisory; no live command reliance | Provider inventory, mapping, timeout/duplicate drills | `TBD` | OPEN_CONTAINED |
| `W2-GAP-032` | G1 | DMS/accounting/website field boundaries/directions unknown | `064`; slices 1,7-9 | No implied posting/payment/publication | Approved boundary matrix and reconciliation tests | `TBD` | OPEN_CONTAINED |
| `W2-GAP-033` | G0 | Field freshness/conflict/degraded/fallback rules absent | `065`; all slices | Stale/conflicting facts cannot satisfy gates | Freshness matrix, conflict/fallback/recovery drill | `TBD` | OPEN_CONTAINED |
| `W2-GAP-034` | G0 | Independent QC/peer/road-test coverage not proven | `024`; slices 5-6 | Completed repair remains held for eligible QC | Qualification, separation, coverage evidence | `TBD` | OPEN_CONTAINED |
| `W2-GAP-035` | G0 | Qualified title/document reviewer and legal applicability owner unnamed | `021`,`024`,`054`; slice 7 | Title readiness unavailable | Qualified roles, access, jurisdiction decision path | `TBD` | OPEN_CONTAINED |
| `W2-GAP-036` | G0 | Content/claim, pricing, channel, and final release independent authorities not proven | `021`,`024`,`031`; slices 8-9 | Draft only; no public price/publish/frontline release | Named roles, limits, separation, coverage | `TBD` | OPEN_CONTAINED |

## 4. Gap closure contract

A closure request must include:

- gap ID and exact affected scope;
- implemented/approved control and version;
- documentary/configuration/qualification/test evidence;
- owner assertion and independent reviewer where required;
- impact on decisions, catalogs, requirements, acceptance cases, and slices;
- residual risk and ongoing monitoring;
- effective/review/expiry dates;
- closure authority and Approval Register link.

Closing a global gap does not automatically close a slice-specific decision. Later evidence may reopen a gap.

## 5. Current gap result

- Critical gaps: 25 (`G0`) — all currently contained by non-execution/restriction.
- High gaps: 11 (`G1`) — all currently contained.
- Uncontained gaps: 0 in this planning baseline.
- Closed gaps: 0.

The absence of uncontained gaps means the planning package has explicit safe behavior. It does not mean Workshop 2, Workshop 3, code design, or pilot activation is ready.
