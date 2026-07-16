# Inventory-to-Frontline Acceptance and Pilot Plan

**Status:** Proposed validation and rollout contract  
**Version:** `0.1.0`  
**Activation:** No production pilot authorized

## 1. Purpose

Prove that the workflow is correct, safe, usable, explainable, recoverable, and operationally valuable before expanding authority or automation.

Passing automated tests alone is insufficient. Evidence must include policy approval, scenario simulation, staff walkthroughs, shadow comparison, controlled real cases, operational monitoring, and recovery exercises.

## 2. Traceability contract

Every implemented behavior must trace:

```text
business outcome
-> workflow/stage rule
-> decision/action/evidence/exception identifier
-> permission and policy rule
-> acceptance scenario
-> automated/manual test evidence
-> pilot outcome
```

No visible action is acceptable if it only displays a notice or changes client state while implying that a durable workflow command occurred.

## 3. Pre-code documentation gate

Required:

- [ ] Workflow and policy owners named.
- [ ] Workflow lifecycle, nine slice boundaries, and downstream reservation/sales boundary approved.
- [ ] Cross-catalog handoff envelope, authoritative fact ownership, and shared terminology approved.
- [ ] All applicable slice decisions reviewed against real cases.
- [ ] Roles/capabilities and separation of duties approved.
- [ ] Locations, calendars, receiving capabilities, and scope approved.
- [ ] Financial limits, quote rules, and reapproval rules approved.
- [ ] Timing, pause, timeout, and escalation rules approved.
- [ ] Evidence requirements, classification, retention, and access approved.
- [ ] Safety, identity, release, insurance, roadworthiness, custody, title/compliance, disclosure, price, privacy, and frontline hard stops approved.
- [ ] Counsel/compliance approved Title/Document applicability for every live pilot scope.
- [ ] Content, claim, AI/provider, pricing, channel, and publication authority approved.
- [ ] Frontline critical dimensions, permitted noncritical exceptions, release authority, suspension, and reinstatement approved.
- [ ] Cancellation, acquisition reversal, disposition, and recovery authorities approved.
- [ ] Staff terminology and experience walkthrough approved.
- [ ] Handoff, policy, authority, evidence, exception, release, and projection implementation contracts designed from approved decisions.
- [ ] Pilot scope, success, pause, rollback, and incident ownership approved.

Open items remain visible in the Approval Register. `TBD` values must not receive silent technical defaults.

## 4. Planned implementation verification layers

### Domain and policy tests

- trigger eligibility and authoritative-source validation;
- one open inventory unit and one active workflow invariant;
- state-transition, entry, and exit-gate enforcement;
- capability, location, dollar authority, and separation-of-duties checks;
- evidence requirement and expiry/conflict handling;
- clock, pause, waiting, overdue, and escalation behavior;
- cancellation, correction, amendment, reversal, reopening, and recovery;
- reason-code and recommendation explanation determinism.

### Transaction and reliability tests

- command idempotency and replay;
- optimistic-concurrency conflict recovery;
- aggregate mutation, command result, event, audit, state history, and outbox atomicity;
- retry after transaction and provider failures;
- accepted local command with delayed projection;
- dead-letter/reconciliation and operator replay;
- duplicate alert/exception correlation;
- workflow/policy version retention for in-flight cases.

### API and permission tests

- authentication and organization/location tenancy;
- request validation and structured rejection reasons;
- server denial even when a client attempts a hidden command;
- safe redaction of address, contact, identity, insurance, and evidence data;
- stale expected-version response with latest recoverable state;
- provider outage and degraded-state response.

### Staff-interface tests

- progressive question disclosure;
- eligible/ineligible option presentation and explanation;
- authoritative fact source/freshness display;
- required evidence and reason validation;
- consequence preview and approval handoff;
- preservation of entered data across recoverable failures/conflicts;
- loading, empty, stale, partial, denied, conflict, failure, retry, and success states;
- responsive keyboard, screen-reader, contrast, mobile, and evidence-capture use;
- no fictional counts, static selected-detail contradictions, or simulated success controls.

## 5. Catalog acceptance scenarios

The following catalog scenarios are release-blocking:

| Acceptance ID | Catalog scenario | Pass condition |
| --- | --- | --- |
| `AT-ACC-001` | `AT-SCN-001` already at destination | No transport work is created; verified Receipt handoff is created exactly once |
| `AT-ACC-002` | `AT-SCN-002` carrier confirmed | Complete plan snapshot, cost authority, pickup/arrival work, clocks, and audit persist atomically |
| `AT-ACC-003` | `AT-SCN-003` external delivery | An internal monitor always remains accountable |
| `AT-ACC-004` | `AT-SCN-004/005` drive ineligible | Driving commands are server-rejected; eligible safe options remain available |
| `AT-ACC-005` | `AT-SCN-006` cost above authority | Request is preserved and routed; requester cannot self-approve or confirm plan |
| `AT-ACC-006` | `AT-SCN-007` release blocked | Dispatch cannot confirm; owned exception and next review exist |
| `AT-ACC-007` | `AT-SCN-008` confirmation timeout | Actionable recovery is escalated once without inventing a provider outcome |
| `AT-ACC-008` | `AT-SCN-009/010` delay | Original commitment and delay history remain; correlated exception is updated, not duplicated |
| `AT-ACC-009` | `AT-SCN-011` damage | Pre/post evidence and exception persist; receipt handoff includes visible discrepancy |
| `AT-ACC-010` | `AT-SCN-012` wrong location | Custody is preserved and relocation work created; intended-location receipt does not pass |
| `AT-ACC-011` | `AT-SCN-013` duplicate trigger | Same workflow result returns; no duplicate unit, tasks, events, or alerts |
| `AT-ACC-012` | `AT-SCN-014` identity conflict | All unsafe movement/frontline transitions remain blocked pending restricted reconciliation |
| `AT-ACC-013` | `AT-SCN-015/016` cancellation/reversal | Affected work is controlled; transport, acquisition, custody, and financial outcomes remain distinct |
| `AT-ACC-014` | `AT-SCN-017/024` amendment/correction | Prior plan remains auditable; affected work and deadlines change consistently |
| `AT-ACC-015` | `AT-SCN-018` provider outage | Accepted local state remains durable, external state is labeled unknown/stale, retry/reconcile works |
| `AT-ACC-016` | `AT-SCN-019` permission denied | Server rejects action; evidence/proposal remains recoverable for authorized handoff |
| `AT-ACC-017` | `AT-SCN-020` concurrent answers | Only one expected version succeeds; loser receives latest state without data loss |
| `AT-ACC-018` | `AT-SCN-021` no staff response | Due escalation occurs; no automatic completion or clock reset |
| `AT-ACC-019` | `AT-SCN-022` wholesale intent | Retail workflow work is not generated; approved disposition path receives the case |
| `AT-ACC-020` | `AT-SCN-025` disputed delivery | No receipt advancement until verification or authorized resolution |
| `AT-ACC-021` | `AT-SCN-023` temporary non-VIN identity | Documented identity authority and duplicate controls are required; temporary identity cannot bypass canonical reconciliation |

### Receipt and Custody acceptance scenarios

| Acceptance ID | Catalog scenario | Pass condition |
| --- | --- | --- |
| `RC-ACC-001` | `RC-SCN-001/002` normal or no-transport receipt | Exactly one receipt/custody result persists; transport is not invented; Inspection handoff is attributable |
| `RC-ACC-002` | `RC-SCN-003` unverified delivery claim | Carrier claim cannot prove physical arrival or custody acceptance |
| `RC-ACC-003` | `RC-SCN-004/005` after-hours delivery | Minimum safe containment is recorded; full receipt remains owned and incomplete until verified |
| `RC-ACC-004` | `RC-SCN-006` wrong location | Actual location/custody is preserved; intended-location receipt cannot pass |
| `RC-ACC-005` | `RC-SCN-007/009` identity mismatch/unreadable | Identity hard stop prevents normal movement, receipt completion, and inspection advancement |
| `RC-ACC-006` | `RC-SCN-008` stock-reference mismatch | Canonical VIN match remains; correction path does not create a duplicate vehicle/unit |
| `RC-ACC-007` | `RC-SCN-010` replay/duplicate | Same result returns; no duplicate receipt, custody event, tasks, evidence, or alerts |
| `RC-ACC-008` | `RC-SCN-011` odometer discrepancy | Observation and conflict are both preserved; no silent normalization |
| `RC-ACC-009` | `RC-SCN-012/013` missing keys | Physical custody remains accurate; discrepancy has owner, value/recovery action, and target |
| `RC-ACC-010` | `RC-SCN-014/015` missing document/accessory | Receipt records physical absence without overstating title or repair conclusions |
| `RC-ACC-011` | `RC-SCN-016/017` sensitive/hazardous property | Restricted chain of custody and approved response protect staff and sensitive information |
| `RC-ACC-012` | `RC-SCN-018/019/024` damage/dispute | Observations and evidence persist without unsupported blame; correlated exception receives ownership |
| `RC-ACC-013` | `RC-SCN-020/022` mobility limitation | Ineligible staff/movement commands are denied; qualified recovery remains available |
| `RC-ACC-014` | `RC-SCN-021` critical hazard | Hard containment gate and approved specialist/emergency path prevent normal intake advancement |
| `RC-ACC-015` | `RC-SCN-023` no inspection capacity | Receipt may complete only if its gate passes; safe owned waiting handoff remains visible |
| `RC-ACC-016` | `RC-SCN-025/026` abandoned/refused delivery | Physical custody reality is retained; return/rejection remains a separate authorized decision |
| `RC-ACC-017` | `RC-SCN-027` correction | Prior receipt/evidence remains reconstructable and superseding correction is attributable |
| `RC-ACC-018` | `RC-SCN-028` concurrent completion | One expected version succeeds; the other user receives recoverable current state |
| `RC-ACC-019` | `RC-SCN-029/030` upload/provider failure | Missing evidence cannot pass; accepted local facts remain durable and reconciliation is visible |
| `RC-ACC-020` | `RC-SCN-031` unauthorized command | Server denies action and prevents restricted evidence disclosure |
| `RC-ACC-021` | `RC-SCN-032/033` recovery/non-standard identity | Historical confidence and exception authority are explicit; contemporaneous evidence is not fabricated |
| `RC-ACC-022` | `RC-SCN-034` weather containment | Minimum safe response can occur without falsely completing full intake |
| `RC-ACC-023` | `RC-SCN-035` premature inspection | Inspection transition is rejected until receipt gate passes or approved emergency containment applies |

### Inspection and Triage acceptance scenarios

| Acceptance ID | Catalog scenario | Pass condition |
| --- | --- | --- |
| `IT-ACC-001` | `IT-SCN-001/002` normal inspection with carried noncritical receipt exception | Accepted version routes findings once; permitted receipt exception remains visible and owned |
| `IT-ACC-002` | `IT-SCN-003` invalid receipt gate | Normal inspection cannot start; limited containment path requires exact authority/scope |
| `IT-ACC-003` | `IT-SCN-004/005` wrong template or missing supplement qualification | Incorrect scope cannot pass; required supplement is never marked N/A to bypass capability |
| `IT-ACC-004` | `IT-SCN-006/007` prior/imported evidence | Reuse follows approved lineage/freshness; conflicts remain visible and require current verification |
| `IT-ACC-005` | `IT-SCN-008/009` no-start/low-energy condition | Affected tests remain incomplete; preparation/diagnosis work is owned without false pass |
| `IT-ACC-006` | `IT-SCN-010/011` unsafe lift/road test | Server denies prohibited operations; approved alternate/recovery route remains available |
| `IT-ACC-007` | `IT-SCN-012/013` resource or inspector eligibility failure | Consequential commands require current eligible staff/resources and preserve prior safe work |
| `IT-ACC-008` | `IT-SCN-014/015` interrupted/moved inspection | Completed/open scope, custody, clocks, restrictions, and revalidation requirements remain truthful |
| `IT-ACC-009` | `IT-SCN-016/017/018` critical leak/EV/structural condition | Immediate containment creates one correlated exception and suppresses unsafe work |
| `IT-ACC-010` | `IT-SCN-019/020` measured failure or diagnostic code | Observation/evidence persists; diagnosis boundary prevents invented cause/correction |
| `IT-ACC-011` | `IT-SCN-021` cleared codes/monitors not ready | Readiness limitation cannot be presented as a pass |
| `IT-ACC-012` | `IT-SCN-022/023` road-test finding/abort | Partial and failed outcomes remain distinct; required gate cannot pass without approved alternate evidence |
| `IT-ACC-013` | `IT-SCN-024/025/026` stale external risk/flood/fire/modification | Source/freshness and uncertainty remain visible; qualified review/disposition paths are owned |
| `IT-ACC-014` | `IT-SCN-027/028` N/A versus unable to inspect | N/A requires approved applicability reason; inability remains incomplete and owned |
| `IT-ACC-015` | `IT-SCN-029/047` evidence upload/rejection | Evidence gate remains incomplete or is suspended; rejected/quarantined evidence cannot support completion |
| `IT-ACC-016` | `IT-SCN-030/031/032` retry/concurrency/split sections | Idempotency and expected version prevent duplicates; approved collaboration retains attributable section work |
| `IT-ACC-017` | `IT-SCN-033/034` disagreement/correction during inspection | Both observations remain attributable; controlled review/retest determines superseding result |
| `IT-ACC-018` | `IT-SCN-035` attempted safety override | General no-action override is rejected; containment or disposition remains available |
| `IT-ACC-019` | `IT-SCN-036/037/048` cosmetic/no-defect/no-recon routes | No spending or frontline status is implied; exact authority/gates and downstream work remain visible |
| `IT-ACC-020` | `IT-SCN-038/049` economics or intent change | Inspection evidence remains; manager-authorized disposition/scope review controls new route |
| `IT-ACC-021` | `IT-SCN-039/040` diagnosis/specialist required | One internal owner, target, evidence requirement, and external/internal dependency exist |
| `IT-ACC-022` | `IT-SCN-041` title concern observed | Title follow-up is created without inspection declaring title status |
| `IT-ACC-023` | `IT-SCN-042/043` post-completion finding/reinspection | Affected downstream decisions suspend; prior and superseding versions remain reconstructable |
| `IT-ACC-024` | `IT-SCN-044/045` backfill/degraded system | Historical confidence and pending reconciliation are explicit; no contemporaneous evidence is fabricated |
| `IT-ACC-025` | `IT-SCN-046` unauthorized command | Server denies completion/classification and protects restricted evidence |
| `IT-ACC-026` | `IT-SCN-050` missed target | Owned escalation occurs without automatic completion, reassignment fiction, or age reset |

### Recon Planning and Approval acceptance scenarios

| Acceptance ID | Catalog scenario | Pass condition |
| --- | --- | --- |
| `RPA-ACC-001` | `RPA-SCN-001` normal accepted plan | Current findings/diagnoses map to one exact estimate, authorization, jobs, and handoff |
| `RPA-ACC-002` | `RPA-SCN-002/024/035` required safety versus optional/partial/economics | Hard requirements cannot be waived or hidden by options, partial approval, or poor economics |
| `RPA-ACC-003` | `RPA-SCN-003/004/005` finding consolidation/decomposition/duplicate | Source evidence remains complete; no duplicated or untraceable scope/cost |
| `RPA-ACC-004` | `RPA-SCN-006` superseded inspection | Affected plan/authorization readiness suspends and prior evidence remains historical |
| `RPA-ACC-005` | `RPA-SCN-007/008/039` missing/uncertain diagnosis | Correction and estimate cannot claim unsupported cause; owned diagnosis route exists |
| `RPA-ACC-006` | `RPA-SCN-009/010` specialist/procedure dependency | One internal owner/target exists; absent procedure prevents executable plan |
| `RPA-ACC-007` | `RPA-SCN-011/012/013` part fitment/substitute/stale availability | Approved fitment/substitution/freshness rules control plan; availability is not fabricated |
| `RPA-ACC-008` | `RPA-SCN-014/015/016` duration/expired quote/omitted input | Estimate discloses range and complete inputs; stale/incomplete versions cannot authorize |
| `RPA-ACC-009` | `RPA-SCN-017/018` option groups/internal-sublet alternatives | Incompatible options cannot combine; comparisons disclose eligibility/time/cost/risk |
| `RPA-ACC-010` | `RPA-SCN-019/020/021` authority, split requests, separation | Server evaluates exact cumulative exposure and independent authority |
| `RPA-ACC-011` | `RPA-SCN-022` full acceptance | Exact version/lines/amount create each authorized job once |
| `RPA-ACC-012` | `RPA-SCN-023/024` partial acceptance | Only coherent selected scope proceeds; hard dependencies and remaining effects are explicit |
| `RPA-ACC-013` | `RPA-SCN-025/026/027` decline/defer/expiry | No unauthorized execution; alternate/condition/refresh path has owner and target |
| `RPA-ACC-014` | `RPA-SCN-028/029` revocation before/after effects | Unstarted and committed/in-progress effects are distinguished and recovered safely |
| `RPA-ACC-015` | `RPA-SCN-030/031/032` changed finding/price/method | Material increments/method changes trigger exact impact and reapproval; tolerance is explicit |
| `RPA-ACC-016` | `RPA-SCN-033/034` economics and stale market data | Human disposition authority remains; recommendation confidence reflects data freshness |
| `RPA-ACC-017` | `RPA-SCN-036/037` no-recon/cosmetic decline | No repair spending or frontline readiness is implied; downstream route remains controlled |
| `RPA-ACC-018` | `RPA-SCN-038/039/040` job requirements/parts/dependencies | Authorized but unready work cannot dispatch; exact prerequisite work is created |
| `RPA-ACC-019` | `RPA-SCN-041/042` replay/concurrent decisions | Idempotency and expected version prevent duplicate/conflicting authorizations/jobs |
| `RPA-ACC-020` | `RPA-SCN-043` unauthorized command | Server denies authorization/job creation and preserves proposal for authorized handoff |
| `RPA-ACC-021` | `RPA-SCN-044/045` evidence/provider failure | Presentation/readiness gates remain incomplete; local state is durable and reconciliation visible |
| `RPA-ACC-022` | `RPA-SCN-046` historical plan recovery | Historical confidence/authority are explicit; no contemporary quote/approval is fabricated |
| `RPA-ACC-023` | `RPA-SCN-047/048` title/location dependency change | Affected sequence/resources/estimate re-evaluate; only eligible parallel work proceeds |
| `RPA-ACC-024` | `RPA-SCN-049` retail intent changes | Scope, commitments, cancellation/recovery, and disposition remain attributable |
| `RPA-ACC-025` | `RPA-SCN-050` approval target missed | Escalation occurs without automatic approval, estimate mutation, or clock reset |

### Parts and Repair Execution acceptance scenarios

| Acceptance ID | Catalog scenario | Pass condition |
| --- | --- | --- |
| `PRE-ACC-001` | `PRE-SCN-001/002` normal/no-parts job | Exact job truth permits controlled execution and QC handoff without inventing parts demand |
| `PRE-ACC-002` | `PRE-SCN-003/004` missing demand/allocated stock | Unready work cannot dispatch; demand or alternate sourcing work is owned and visible |
| `PRE-ACC-003` | `PRE-SCN-005/006` unusable/partial stock | Only usable available quantity counts; partial reservation cannot imply full readiness |
| `PRE-ACC-004` | `PRE-SCN-007/008` approved/unapproved substitute | Fitment, authorization, and procedure rules permit only an eligible substitute |
| `PRE-ACC-005` | `PRE-SCN-009/012` transfer/vendor delay | Custody, original and revised ETA, schedule effect, and internal owner remain truthful |
| `PRE-ACC-006` | `PRE-SCN-010/011` authority/split orders | Server aggregates related exposure and routes the exact purchase for sufficient authority |
| `PRE-ACC-007` | `PRE-SCN-013/014` backorder/partial receipt | Remainder stays unsatisfied with an owned alternative; usable received quantity is exact |
| `PRE-ACC-008` | `PRE-SCN-015/016` wrong/damaged receipt | Unusable parts are quarantined and reconciled; replacement demand remains open |
| `PRE-ACC-009` | `PRE-SCN-017/023` variance/core or warranty return | Expected and actual value, custody, return, claim, and credit recovery remain attributable |
| `PRE-ACC-010` | `PRE-SCN-018/019` reservation race/release | One serializable allocation succeeds; release reverses availability without erasing history |
| `PRE-ACC-011` | `PRE-SCN-020/021` issue transfer/unused return | Every issued unit has one current custodian and controlled install, return, or disposition |
| `PRE-ACC-012` | `PRE-SCN-022/036/037` installed defect/new or unauthorized scope | Existing effects remain historical; affected work stops for diagnosis and exact reapproval |
| `PRE-ACC-013` | `PRE-SCN-024/025` procedure/qualification failure | Dispatch and start are server-blocked until effective procedure and eligible technician exist |
| `PRE-ACC-014` | `PRE-SCN-026/027` expiring qualification/resource unavailable | Readiness re-evaluates at execution; reassignment or resource work is owned |
| `PRE-ACC-015` | `PRE-SCN-028/029` schedule conflict/active clock | Conflicts require authorized disposition; one technician cannot acquire incompatible active work |
| `PRE-ACC-016` | `PRE-SCN-030/032` staged-next/wrong unit | Only current, identity-matched, freshly validated work may start |
| `PRE-ACC-017` | `PRE-SCN-031/038` failed safety check/incident | Work stops safely, containment and qualified response begin, and evidence does not infer blame |
| `PRE-ACC-018` | `PRE-SCN-033/042` normal finish/missing completion evidence | Complete evidence produces Ready for QC only; incomplete finish is rejected without lost work |
| `PRE-ACC-019` | `PRE-SCN-034/035` pause/resume | Pause preserves truthful clock/custody/blocker state; resume revalidates affected prerequisites |
| `PRE-ACC-020` | `PRE-SCN-039/040` procedure deviation/sublet completion | Deviation needs approval; external completion requires internal custody/evidence verification and QC |
| `PRE-ACC-021` | `PRE-SCN-041/043` reassignment/labor correction | Handoffs and append-only corrections preserve actor, time, custody, reason, and prior events |
| `PRE-ACC-022` | `PRE-SCN-044/045` evidence/provider outage | Durable work is preserved with visible staleness/reconciliation; completion cannot be fabricated |
| `PRE-ACC-023` | `PRE-SCN-046/047` replay/concurrent command | Idempotency and expected version prevent duplicate ledger, custody, labor, or state effects |
| `PRE-ACC-024` | `PRE-SCN-048/049` unauthorized action/revoked authority | Server denies or safely stops work, classifies existing effects, and preserves all evidence |
| `PRE-ACC-025` | `PRE-SCN-050` execution target missed | Owned escalation and revised forecast occur without automatic completion or clock reset |

### Quality and Safety Verification acceptance scenarios

| Acceptance ID | Catalog scenario | Pass condition |
| --- | --- | --- |
| `QSV-ACC-001` | `QSV-SCN-001/002` normal/incomplete handoff | Complete handoff enters QC once; missing execution evidence returns exact owned work |
| `QSV-ACC-002` | `QSV-SCN-003/004` state conflict/template unavailable | Inspection cannot start from conflicting state or without effective applicable rules |
| `QSV-ACC-003` | `QSV-SCN-005/006` supplements/inspector involvement | All applicable hard checks remain visible and required independence is enforced |
| `QSV-ACC-004` | `QSV-SCN-007/008` expired qualification/heavy peer | Server blocks ineligible inspector and requires attributable independent peer verification |
| `QSV-ACC-005` | `QSV-SCN-009/010` resource unavailable/unsafe vehicle | No fabricated check occurs; eligible alternate, wait, stationary, or containment route is owned |
| `QSV-ACC-006` | `QSV-SCN-011/012` identity mismatch/incomplete correction | Wrong unit is stopped; exact failed completion check routes rework |
| `QSV-ACC-007` | `QSV-SCN-013/014` missing evidence/safety failure | Missing proof cannot infer pass and a critical failure cannot be averaged away |
| `QSV-ACC-008` | `QSV-SCN-015/016` intermittent symptom/out-of-tolerance value | Uncertainty routes diagnosis; failed measurement preserves value, unit, tolerance, and provenance |
| `QSV-ACC-009` | `QSV-SCN-017/018` copied evidence/nonindependent peer | Integrity and independence controls reject unsupported verification |
| `QSV-ACC-010` | `QSV-SCN-019/020` peer failure/no road-test applicability | Peer failure creates rework; non-applicability records policy basis without arbitrary driving |
| `QSV-ACC-011` | `QSV-SCN-021/022` road-test pass/unsafe conditions | Only qualified, evidenced test passes; unsafe conditions remain pending or use approved alternative |
| `QSV-ACC-012` | `QSV-SCN-023/024` driver ineligible/new warning | Departure is denied or safely stopped; new warning routes evidence-backed diagnosis/failure |
| `QSV-ACC-013` | `QSV-SCN-025/026` road incident/all checks pass | Incident response protects people/evidence; clean cycle creates one immutable latest pass |
| `QSV-ACC-014` | `QSV-SCN-027/028` one failure/evidence upload outage | Applicable failure blocks pass; draft/local evidence survives outage without fabricated result |
| `QSV-ACC-015` | `QSV-SCN-029/030` deficient work/new scope | Authorized deficiency routes rework; new work requires diagnosis and exact authorization |
| `QSV-ACC-016` | `QSV-SCN-031/032` warranty part/rework return | Parts responsibility remains attributable and rework creates a linked new QC cycle |
| `QSV-ACC-017` | `QSV-SCN-033/034` reinspection pass/repeat failure | Latest valid pass controls projection while prior failure remains; repeat failure escalates |
| `QSV-ACC-018` | `QSV-SCN-035/036` affected adjacent system/stale evidence | Reinspection expands by impact and cannot silently reuse invalidated evidence |
| `QSV-ACC-019` | `QSV-SCN-037/038` unpassed job/paused labor | Order release identifies exact incomplete job and remains blocked while labor is active |
| `QSV-ACC-020` | `QSV-SCN-039/040` custody gap/critical exception | Keys, location, custody, and non-waivable restrictions block operational release |
| `QSV-ACC-021` | `QSV-SCN-041/042` title concern/clean release | QC creates title follow-up without deciding title; clean gates produce immutable routed release |
| `QSV-ACC-022` | `QSV-SCN-043/044` unauthorized command/downstream rejection | Server protects pass/release; rejected handoff remains owned without erasing QC history |
| `QSV-ACC-023` | `QSV-SCN-045/046` post-release defect/replay | New fact suspends affected reliance; replay creates no duplicate inspection or authorization |
| `QSV-ACC-024` | `QSV-SCN-047/048` concurrent command/provider outage | Expected version selects one transition; degraded state stays visible and unsupported release is blocked |
| `QSV-ACC-025` | `QSV-SCN-049/050` correction/missed target | Append-only correction reevaluates gates; escalation revises forecast without auto-pass or clock reset |

### Title and Document Readiness acceptance scenarios

| Acceptance ID | Catalog scenario | Pass condition |
| --- | --- | --- |
| `TDR-ACC-001` | `TDR-SCN-001/002` normal/parallel preparation | Complete packet can become ready; early work remains preparation until final facts revalidate |
| `TDR-ACC-002` | `TDR-SCN-003/004` missing/ambiguous context | No guessed requirements; exact context work or qualified review remains owned |
| `TDR-ACC-003` | `TDR-SCN-005/006` missing template/supplement | Unsupported case blocks safely; approved supplement expands a versioned requirement set |
| `TDR-ACC-004` | `TDR-SCN-007/008` original/scan-only receipt | Receipt and original custody are attributable; a scan cannot satisfy an original requirement |
| `TDR-ACC-005` | `TDR-SCN-009/010` electronic source/unexpected sensitive document | Provider authority/freshness is explicit; unrelated evidence receives restricted handling |
| `TDR-ACC-006` | `TDR-SCN-011/012` incomplete/illegible document | Received version remains historical and cannot pass; correction/replacement is exact and owned |
| `TDR-ACC-007` | `TDR-SCN-013/014` alteration concern/VIN mismatch | Evidence and original are contained; hard identity stop routes qualified reconciliation without accusation |
| `TDR-ACC-008` | `TDR-SCN-015/016` party mismatch/execution defect | Acceptance waits for policy-driven party, signature, assignment, date, or correction evidence |
| `TDR-ACC-009` | `TDR-SCN-017/018` authority uncertainty/odometer conflict | Qualified review receives both facts; no legal authority or mileage fact is invented/overwritten |
| `TDR-ACC-010` | `TDR-SCN-019/020` odometer sequence/brand conflict | Append-only exceptions restrict downstream reliance and route qualified/economics review |
| `TDR-ACC-011` | `TDR-SCN-021/022` ownership gap/duplicate assignment | Non-waivable ownership-chain gate remains blocked until accepted correction exists |
| `TDR-ACC-012` | `TDR-SCN-023/024` no lien/payoff quote | Not-applicable requires evidence basis; payoff quote cannot be treated as lien release |
| `TDR-ACC-013` | `TDR-SCN-025/026` funds acknowledged/electronic release | Intermediate lender state stays open; authoritative final release is separately verified |
| `TDR-ACC-014` | `TDR-SCN-027/028` duplicate-title path/incomplete packet | Special process has owner/target/restrictions; outbound preview blocks a missing attachment |
| `TDR-ACC-015` | `TDR-SCN-029/030` fee authority/original shipment | Unauthorized submission remains draft; authorized shipment preserves packet and custody evidence |
| `TDR-ACC-016` | `TDR-SCN-031/032` delivery conflict/provider correction | Conflicting claims do not complete dependency; correction/resubmission preserves full lineage |
| `TDR-ACC-017` | `TDR-SCN-033/034` obsolete form/provider delay | Current policy rebuilds packet; external wait stays internally owned with original/revised target |
| `TDR-ACC-018` | `TDR-SCN-035/036` issuance in transit/waiver request | Issuance and original receipt remain distinct; aging pressure cannot waive ownership integrity |
| `TDR-ACC-019` | `TDR-SCN-037/038` constrained preparation/expiry | Only expressly permitted actions work and automatically suspend at expiry/review boundary |
| `TDR-ACC-020` | `TDR-SCN-039/040` economics review/expired evidence | Management may choose route but cannot create legal readiness; expired hard evidence blocks ready |
| `TDR-ACC-021` | `TDR-SCN-041/042` clean readiness/reviewer independence | One immutable ready version uses eligible independent reviewer and exact evidence snapshot |
| `TDR-ACC-022` | `TDR-SCN-043/044` rejected handoff/route change | Title history remains; missing context or new applicability suspends affected downstream reliance |
| `TDR-ACC-023` | `TDR-SCN-045/046` post-ready fact/original loss | Append-only invalidation, custody/privacy containment, and recovery block unsupported actions |
| `TDR-ACC-024` | `TDR-SCN-047/048` replay/concurrent decision | Idempotency and expected version prevent duplicate evidence, request, fee, or readiness effects |
| `TDR-ACC-025` | `TDR-SCN-049/050` provider outage/missed target | Staleness and reconciliation stay visible; escalation cannot invent completion or reset age |

### Merchandising and Pricing acceptance scenarios

| Acceptance ID | Catalog scenario | Pass condition |
| --- | --- | --- |
| `MPR-ACC-001` | `MPR-SCN-001/002` normal/constrained preparation | Complete eligible package reaches review; early work cannot publish or imply readiness beyond policy |
| `MPR-ACC-002` | `MPR-SCN-003/004` incomplete handoff/unavailable location | Exact prerequisite or movement work remains owned; no capture/package fact is invented |
| `MPR-ACC-003` | `MPR-SCN-005/006` physical/template blocker | Stale media is evaluated and unsupported template/channel configuration blocks safely |
| `MPR-ACC-004` | `MPR-SCN-007/008` wrong trim/missing option | Proposed decode/equipment claims cannot publish until reconciled with accepted evidence |
| `MPR-ACC-005` | `MPR-SCN-009/010` aftermarket equipment/mileage change | Claims identify equipment truthfully and material mileage changes refresh affected content/media |
| `MPR-ACC-006` | `MPR-SCN-011/012` omitted defect/unsupported claim | Consistency and claim-authority gates block misleading or unverified content |
| `MPR-ACC-007` | `MPR-SCN-013/014` complete/missing media | Attributable approved set requires every applicable hard shot; missing work is exact and owned |
| `MPR-ACC-008` | `MPR-SCN-015/016` wrong/low-quality media | Asset identity and quality review reject publication and route targeted recapture |
| `MPR-ACC-009` | `MPR-SCN-017/018` misleading edit/privacy exposure | Restricted asset cannot publish; truthful lineage and approved redact/recapture path remain |
| `MPR-ACC-010` | `MPR-SCN-019/020` vehicle change/accurate AI draft | Material change invalidates affected approval; accurate generated text still requires human review |
| `MPR-ACC-011` | `MPR-SCN-021/022` invented claim/content conflict | Unsupported claim is removed and exact cross-content conflict blocks approval |
| `MPR-ACC-012` | `MPR-SCN-023/024` channel variant/material edit | Variant preserves meaning/disclosures; material post-approval edit requires a new version/review |
| `MPR-ACC-013` | `MPR-SCN-025/026` complete/uncertain cost basis | Pricing exposes attributable economics and uncertainty; policy determines manual review/block |
| `MPR-ACC-014` | `MPR-SCN-027/028` bad comparables/weak sample | Ineligible observations are excluded and low confidence cannot become autonomous price authority |
| `MPR-ACC-015` | `MPR-SCN-029/030` within authority/floor violation | Exact eligible human approval succeeds; floor violation routes sufficient authority/exception |
| `MPR-ACC-016` | `MPR-SCN-031/032` split exposure/expired price | Related discount exposure is aggregated and stale approval cannot publish |
| `MPR-ACC-017` | `MPR-SCN-033/034` changed inputs/aging recommendation | Affected price/payload revalidates; recommendation never silently reprices inventory |
| `MPR-ACC-018` | `MPR-SCN-035/036` disposition review/clean preflight | Management retains decision authority and publish request snapshots exact approved versions |
| `MPR-ACC-019` | `MPR-SCN-037/038` acknowledgement/rejection | Acknowledgement remains pending; rejection preserves response and routes mapped correction/retry |
| `MPR-ACC-020` | `MPR-SCN-039/040` wrong price/media drift | Desired-versus-observed reconciliation detects and corrects/pause/removes exact variance |
| `MPR-ACC-021` | `MPR-SCN-041/042` partial channels/duplicate listing | Required-channel failure remains visible and unauthorized duplicate is removed/reconciled |
| `MPR-ACC-022` | `MPR-SCN-043/044` provider outage/complete channel boundary | Unknown is never labeled live; approved channel boundary permits independent release review only |
| `MPR-ACC-023` | `MPR-SCN-045/046` rejected handoff/post-publish fact | Package history remains; stale/material facts suspend affected publication/release reliance |
| `MPR-ACC-024` | `MPR-SCN-047/048` replay/concurrent approval | Idempotency and expected version prevent duplicate/conflicting approval or publish effects |
| `MPR-ACC-025` | `MPR-SCN-049/050` unauthorized action/missed target | Server denies protected action; escalation cannot auto-approve, claim live, or reset age |

### Frontline Release Review acceptance scenarios

| Acceptance ID | Catalog scenario | Pass condition |
| --- | --- | --- |
| `FLR-ACC-001` | `FLR-SCN-001/002` normal/incomplete package | Exact current package can authorize once; missing package version returns owned correction |
| `FLR-ACC-002` | `FLR-SCN-003/004` ambiguous policy/identity conflict | No permissive template; duplicate or conflicting identity creates critical block |
| `FLR-ACC-003` | `FLR-SCN-005/006` route change/unknown custody | Retail release stops or blocks until authorized route and custody/location reconcile |
| `FLR-ACC-004` | `FLR-SCN-007/008` missing accessory/QC reversal | Policy controls narrow accessory exception; latest failed QC is a critical block |
| `FLR-ACC-005` | `FLR-SCN-009/010` new warning/expired title evidence | Current safety and title evidence is required; neither prior pass remains sufficient |
| `FLR-ACC-006` | `FLR-SCN-011/012` title conflict/new damage | Non-waivable title stop or physical/media correction prevents release |
| `FLR-ACC-007` | `FLR-SCN-013/014` presentation/content mismatch | Exact physical or package correction remains owned before authorization |
| `FLR-ACC-008` | `FLR-SCN-015/016` expired/wrong public price | Price approval and observed channel state must be current and consistent |
| `FLR-ACC-009` | `FLR-SCN-017/018` channel unknown/prepublish policy | Unknown cannot count as live; expressly approved boundary records owner/target/restrictions |
| `FLR-ACC-010` | `FLR-SCN-019/020` no owner/98-percent score | Operational owner is required and one critical failure defeats any aggregate score |
| `FLR-ACC-011` | `FLR-SCN-021/022` appointment/aging pressure | Customer interest and carrying pressure route management action but cannot bypass gates |
| `FLR-ACC-012` | `FLR-SCN-023/024` eligible/non-waivable exception | Only enumerated noncritical exception can be approved with expiry; critical waiver is denied |
| `FLR-ACC-013` | `FLR-SCN-025/026` expired exception/source change | Frozen package invalidates and must rebuild from current evidence/version |
| `FLR-ACC-014` | `FLR-SCN-027/028` reviewer independence/unauthorized user | Eligible independent authority is enforced server-side and package evidence is protected |
| `FLR-ACC-015` | `FLR-SCN-029/030` clean approval/replay | Authorization and stage transition commit once; replay returns same result without duplicates |
| `FLR-ACC-016` | `FLR-SCN-031/032` concurrent decision/commit failure | Expected version selects one outcome and no unsupported public state escapes atomic recovery |
| `FLR-ACC-017` | `FLR-SCN-033/034` correct/wrong physical placement | Actual custody/location/condition is accepted or reconciled/suspended by policy |
| `FLR-ACC-018` | `FLR-SCN-035/036` correct digital state/ack only | Desired-versus-observed availability is verified; acknowledgement remains pending |
| `FLR-ACC-019` | `FLR-SCN-037/038` rejected handoff/premature reservation | Handoff gap stays owned and commercial intake is denied until canonical readiness commits |
| `FLR-ACC-020` | `FLR-SCN-039/040` clean/new-condition verification | Clean post-check is accepted; new damage/warning causes attributable correction/suspension |
| `FLR-ACC-021` | `FLR-SCN-041/042` listing drift/title-safety change | Channel or full readiness suspends at correct scope with immediate critical containment |
| `FLR-ACC-022` | `FLR-SCN-043/044` unauthorized movement/expiry | Custody and time-bound evidence trigger investigation/review/suspension without hidden reset |
| `FLR-ACC-023` | `FLR-SCN-045/046` retail-intent change/correction complete | Availability suspends and full new package—not correction alone—is required for reinstatement |
| `FLR-ACC-024` | `FLR-SCN-047/048` reinstatement/provider outage | New linked authorization restores status; unknown external/projection state uses safe reconciliation |
| `FLR-ACC-025` | `FLR-SCN-049/050` metadata correction/missed target | Append-only correction reevaluates reliance; escalation cannot auto-release or reset age |

## 6. Simulation suite

Before any live case, execute anonymized scenarios covering:

- acquisition types: purchase, trade, consignment, transfer, recovery;
- sources: dealership, seller, auction, carrier/storage, other location, import;
- distances/methods: no movement, local drive, tow/trailer, carrier, seller delivery;
- vehicle conditions: verified operable, unknown, unsafe, changed condition, identity mismatch;
- authority: within limit, above limit, missing approver, expired quote, revised cost;
- disruptions: release hold, missed pickup, weather, provider cancellation, breakdown, damage, wrong destination, lost contact;
- quality/rework: missing handoff evidence, critical check failure, intermittent symptom, failed measurement, repeated failure, new scope, warranty responsibility;
- verification resources: inspector/peer independence, expired qualification, unavailable/calibration-invalid equipment, unsafe lift/drive condition;
- road test: required, not applicable, unsafe conditions, ineligible driver, failed outcome, new warning, and incident response;
- operational release: one unpassed job, active labor, missing keys/custody, open restriction, downstream rejection, and post-release invalidation;
- title/documents: source/jurisdiction variants, original/electronic custody, lien/payoff/release, odometer/brand conflicts, ownership gaps, external submission, constrained preparation, and post-ready invalidation;
- merchandising/pricing: physical/media readiness, data/claim conflict, privacy, AI/provider drafts, cost/market confidence, price authority/floor, channel rejection/drift/duplicate, and post-publish invalidation;
- frontline release: critical/noncritical gates, score-versus-hard-stop, exception scope/expiry, reviewer independence, atomic authorization, placement/availability mismatch, suspension, and reinstatement;
- data/reliability: missing, stale, conflicting, duplicate, out-of-order, provider outage, retry, concurrent command;
- lifecycle change: destination change, method change, cancellation, acquisition reversal, wholesale diversion;
- access: staff, inventory owner, driver, receiver, manager, unauthorized location/user;
- device/accessibility: desktop, tablet, mobile, keyboard, assistive technology, slow upload/network.

Simulation output includes expected versus actual decisions, unavailable options, tasks, owners, deadlines, evidence, events, exceptions, permissions, explanations, and final case state.

## 7. Pilot stages

### Stage A — Tabletop validation

- Use at least ten anonymized representative past/recent cases.
- Include normal, alternative, failure, safety, authority, cancellation, and recovery paths.
- Participants: Inventory Manager, transportation/receiving staff, Shop/Recon Manager, Parts Manager, qualified technician, QC inspector/peer verifier, road-test authority, Office Manager/title coordinator, counsel/compliance policy authority for title scope, media/content specialist, pricing authority, channel publisher/reconciliation owner, independent frontline release reviewer, lot/sales handoff owner, General/Operations Manager, and implementation owner.
- Revise catalog before code when staff cannot select a truthful response or understand the next action.

**Exit:** All common cases have truthful options and one accountable owner; unresolved policy decisions are explicit.

### Stage B — Simulation in non-production

- Seed controlled cases without external side effects.
- Execute all release-blocking acceptance scenarios.
- Rehearse pause, retry, reconciliation, rollback, evidence access, and audit retrieval.

**Exit:** Required automated/manual evidence passes; no critical or high open defects.

### Stage C — Shadow trigger

- Observe authoritative acquisition events but do not create live staff work automatically.
- Compare proposed workflow starts, questions, options, owners, deadlines, and recommendations with manager decisions.
- Record false starts, misses, duplicates, missing inputs, option disagreements, and data freshness.

**Exit:** Policy-owner-approved thresholds for trigger precision, duplicate rate, data sufficiency, and recommendation usefulness are met. Threshold values are `TBD` in the Approval Register.

### Stage D — Manager-confirmed manual pilot

- Manager confirms each workflow start.
- Restrict to one approved location, acquisition type, vehicle cohort, and trained pilot group.
- Use real tasks and evidence; keep consequential external actions human-executed and confirmed.
- Hold daily review and immediate defect/incident path.

**Exit:** Defined volume and duration complete with no unresolved critical control failure; usability and outcome thresholds pass.

### Stage E — Controlled automatic starts

- Automatically start only high-confidence, duplicate-safe, approved trigger types.
- Keep financial, safety, cancellation, disposition, and release authority human-controlled.
- Monitor live health, data freshness, command errors, exceptions, staff adoption, and outcome variance.

**Exit:** Sustained success across the approved review window; policy owner authorizes scope expansion.

### Stage F — Stage expansion

Each vertical slice requires its own approved catalog, controls, scenarios, and pilot gates. Passing an earlier slice does not activate a later lifecycle stage; passing operational repair release does not activate title, merchandising, pricing, or frontline release.

## 8. Measures

Baseline before claiming improvement. Segment by location, acquisition/source type, transport method, vehicle class, and data sufficiency where sample size permits.

### Control and reliability

- duplicate workflow/task/event rate;
- invalid transition/permission prevention;
- command success, retry, and recovery rate;
- projection freshness and reconciliation backlog;
- missing/conflicting mandatory evidence;
- audit reconstruction success;
- pause/rollback exercise success.

### Workflow and outcome

- acquisition-to-validated time;
- QC handoff-to-inspection start and completion time;
- first-pass QC yield, segmented by repair class and technician/team;
- critical failure, missing-evidence, and peer/road-test failure rates;
- failed-QC-to-rework-start, rework-complete, and reinspection-pass time;
- repeat-failure rate and cycles per job without using the measure for punitive inference;
- order-pass-to-operational-release and downstream-acceptance time;
- release-blocker age, post-release invalidation rate, and audit reconstruction success;
- requirement-selection-to-first-request, document-receipt, verification, correction, and final-ready time;
- external dependency age by provider/type, original versus revised ETA, acknowledgement, rejection, and resubmission rate;
- title first-pass completeness, missing-original, identity/party, ownership-chain, lien, odometer, brand/history, and policy-ambiguity exception rates;
- original-document custody reconciliation, loss/exposure, constrained-state expiry, post-ready invalidation, and downstream-acceptance rate;
- media readiness-to-capture/review/approval time, shot completeness, recapture, privacy, wrong-vehicle, and stale-media rates;
- vehicle-data/claim conflict, AI/provider unsupported-claim, content correction, and approval-cycle rates;
- price-analysis-to-approval time, confidence distribution, floor/authority escalation, expiry/reapproval, and recommendation override reasons;
- channel request-to-acknowledgement/live reconciliation time, rejection, drift, duplicate, partial-publication, unknown-state, and removal success rates;
- package-completion-to-frontline-review acceptance time and post-publication invalidation rate;
- release-handoff-to-package-freeze/evaluation/decision time and first-pass release rate;
- critical failure, stale/conflicting source, noncritical exception request/approval/expiry, and return-to-owner cycle time;
- authorization-to-canonical-status, physical-placement, digital/sales-availability, and downstream-acceptance time;
- post-release verification completion/variance, suspension response, correction, reinstatement, and repeat-suspension rates;
- readiness projection reconciliation, duplicate/concurrent command prevention, and full release-audit reconstruction success;
- validation-to-transport-confirmed time;
- planned versus actual pickup and arrival;
- acquisition-to-receipt time;
- active, waiting, blocked, and unexplained idle time;
- missed pickup/delivery and recovery time;
- transport damage/discrepancy rate;
- incremental recovery cost and cost variance;
- downstream days-to-frontline, without attributing causality prematurely.

### Staff and alert quality

- median time/steps per decision;
- unanswered/abandoned decision rate;
- correction and “option missing” rate;
- recommendation acceptance/override with reasons;
- alert acknowledgement/usefulness, duplicate, and false-positive rate;
- staff-reported clarity, workload, and workaround frequency;
- accessibility defects.

Measures cannot be used to infer employee misconduct or optimize speed at the expense of safety/quality.

## 9. Pause and rollback criteria

Immediate pilot pause for affected scope when any of the following occurs:

- safety-, identity-, legal-, custody-, or financial-authority hard gate can be bypassed;
- duplicate inventory units or material workflow actions are created;
- acknowledged commands or evidence are lost/corrupted;
- unauthorized cross-organization/location or sensitive-data exposure occurs;
- the workflow presents an unsafe option as eligible;
- cancellation/reversal leaves custody or financial responsibility ambiguous;
- critical event/audit reconstruction fails;
- staff must use an undocumented workaround to preserve safety or custody.

Operational pause may also be triggered by unacceptable false starts, alert noise, data conflict, provider instability, unusable mobile/evidence capture, or outcome deterioration according to approved thresholds.

Rollback behavior:

1. stop new automatic starts/actions for affected scope;
2. retain visibility and safe manual operation for in-flight cases;
3. preserve all commands, evidence, events, and audit;
4. identify cases requiring controlled recovery;
5. switch new cases to a prior approved compatible version or manual process;
6. reconcile external effects rather than pretending they were undone;
7. verify recovery and obtain policy-owner authorization before resume.

## 10. Pilot completion evidence

A pilot decision package contains:

- approved scope and policy versions;
- participant/training record;
- scenario and automated test results;
- actual case list and outcomes;
- safety/control incidents and recovery;
- trigger, data-quality, workflow, outcome, staff, and alert measures;
- overrides and disagreements;
- known limitations and open risks;
- continue, revise, expand, pause, or retire recommendation;
- named workflow and policy-owner decisions.
