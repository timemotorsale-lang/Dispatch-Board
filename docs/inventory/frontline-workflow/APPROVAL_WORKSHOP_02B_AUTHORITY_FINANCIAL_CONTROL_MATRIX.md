# Approval Workshop 02B - Authority and Financial Control Matrix

**Workshop status:** Decision-ready planning draft; not conducted  
**Decision state:** All decisions remain `OPEN` until authorized sign-off  
**Covers:** `ITF-APR-030`-`036`; supports stage-specific authority decisions
**Program:** Inventory-to-Frontline  
**Pilot scope:** Time Motor Sales - Minneapolis, subject to Workshop 1 approval  
**Prepared:** 2026-07-16  

## 1. Workshop outcome

This packet continues Workshop 2 by defining how authority is granted, checked, exercised, evidenced, aggregated, expired, delegated, revoked, and escalated across the Inventory-to-Frontline lifecycle. It establishes the financial-control structure management must complete before the workflow may present or execute any commitment, approval, changed-scope, price, exception, or release command.

This packet does not:

- approve dollar limits, quote thresholds, price floors, margins, vendors, fees, or emergency amounts;
- grant authority to any current employee merely because the employee is proposed for a role;
- authorize acquisition, movement, repair, purchasing, publication, frontline release, sale, delivery, payment, or accounting posting;
- create a generic manager override;
- allow approval splitting, retrospective approval, stale approval, or a recommendation to substitute for authority;
- treat a budget, estimate, quote, purchase order, invoice, payment, customer price, or accounting entry as the same fact.

Required output:

- approved authority classes and decision hierarchy;
- a named authority tier, primary approver, and backup for each live pilot command;
- approved currency, cost categories, and financial-state vocabulary;
- exact limits by role, command, vehicle, vendor/order, period, and correlated exposure;
- approved quote-source, quote-count, freshness, comparison, and exception rules;
- approved absolute and percentage reapproval thresholds;
- anti-splitting and cumulative-exposure rules;
- narrowly bounded emergency custody/safety expenditure authority;
- prohibited override boundaries and correction/reversal behavior;
- safe behavior whenever current authority cannot be proven.

## 2. Authority principles

1. **Default deny:** no consequential action is available unless an active policy grants the exact capability for the current actor, scope, amount, facts, and time.
2. **Authority is command-specific:** authority to request, plan, approve, commit, receive, verify, pay, publish, release, cancel, or reverse are separate grants.
3. **Assignment does not grant authority:** an assigned owner may coordinate a decision without being allowed to approve it.
4. **Higher title is not universal authority:** management hierarchy does not bypass capability, qualification, separation, legal, safety, privacy, identity, custody, or evidence rules.
5. **Approval is prospective:** approval must exist before commitment or execution unless a narrowly approved emergency-containment rule applies.
6. **Exact scope:** every approval identifies the vehicle/cycle, command, amount or bounded scope, source facts, expiry, approver, and policy version.
7. **Current facts:** a valid approval can become unusable when cost, scope, source, vehicle condition, vendor, method, destination, evidence, or policy materially changes.
8. **Cumulative exposure:** authority is evaluated against the complete correlated exposure, not only the current line item.
9. **No approval splitting:** related requests cannot be divided across lines, orders, vendors, days, stages, users, or retries to avoid a limit.
10. **No silent escalation:** insufficient authority creates one attributable approval request; it does not guess an approver or execute optimistically.
11. **No generic override:** correction, exception, risk acceptance, emergency containment, policy change, revocation, and reversal remain distinct controlled actions.
12. **Immutable history:** revised approvals, costs, and prices supersede prior facts; they do not overwrite or erase them.
13. **Financial authority cannot waive hard gates:** approved spend or margin does not make an unsafe, unidentified, improperly held, legally constrained, or unverified vehicle eligible.
14. **System recommendations are advisory:** automation may calculate, compare, route, and warn, but cannot become the human approver.

## 3. Authority vocabulary

| Authority class | Meaning | Example | Not equivalent to |
| --- | --- | --- | --- |
| Observe | Record a fact witnessed by the actor | Observe VIN or arrival condition | Verify, accept, or resolve conflict |
| Prepare | Build a draft request, plan, estimate, packet, or recommendation | Prepare transport plan | Approve or commit |
| Request | Ask an eligible provider or approver for information/action | Request quote or approval | Accept quote or authorize spend |
| Execute | Perform an already eligible and authorized operational action | Move or repair vehicle | Approve changed scope or verify outcome |
| Verify | Evaluate evidence against an approved standard | QC or document review | Create missing authority or policy |
| Approve | Prospectively authorize an exact bounded action | Approve recon amount | Commit, incur, or pay automatically |
| Commit | Create an external or internal obligation | Confirm carrier/order/sublet | Prove receipt, performance, or invoice correctness |
| Accept | Accept custody, handoff, delivery, evidence, or outcome | Accept receipt handoff | Approve unrelated spend or downstream release |
| Release | Authorize a specific transition after current gates pass | Operational repair release | Final frontline release or sale |
| Suspend | Immediately restrict reliance or availability within approved scope | Safety/title/frontline suspension | Determine fault or permanently dispose |
| Correct | Replace an erroneous fact through attributable supersession | Correct amount/source/reference | Retroactively validate unauthorized action |
| Cancel | Stop future execution of a still-cancellable action | Cancel unperformed transport | Reverse acquisition or erase incurred cost |
| Revoke | Withdraw still-relevant authority prospectively | Revoke unused recon approval | Undo work already performed |
| Reverse | Record an authorized compensating lifecycle/business action | Acquisition reversal | Delete history or accounting reality |
| Exception | Permit a specifically allowed noncritical deviation | Time-bound noncritical release exception | Waive a hard gate |
| Emergency containment | Narrow action to reduce immediate harm | Approved emergency tow/storage | General repair, disposition, or retrospective approval |
| Publish policy | Make an approved rule/version effective | Publish financial limit version | Author the rule or grant self-authority |

## 4. Authority grant contract

Every active authority grant must contain:

| Field | Required definition |
| --- | --- |
| Grant ID and version | Immutable identifier and version |
| Subject | Named person, approved role, or narrowly controlled service identity |
| Capability | Exact command; wildcards prohibited for consequential actions |
| Organization/location | Exact operating scope |
| Lifecycle/stage | Applicable stage(s) and route |
| Vehicle/source/method | Applicable vehicle class, acquisition source, movement/repair method, vendor type, or channel |
| Financial scope | Currency, per-action limit, cumulative exposure limit, and any floor/variance boundary |
| Independence constraints | Actors/actions that disqualify the subject from this approval |
| Required facts/evidence | Current inputs that must be present and accepted |
| Effective period | Start, expiry, schedule/coverage limits, and review date |
| Delegation | Whether allowed, to whom, within what reduced scope, and until when |
| Policy basis | Approved decision and policy version |
| Publisher | Independent publisher and publication record |
| Revocation | Who may revoke and how open work is handled |

Missing, ambiguous, expired, unpublished, conflicting, or out-of-scope authority evaluates as `DENIED_OR_APPROVAL_REQUIRED`; it must never default to allowed.

## 5. Authority evaluation order

Before a consequential command is presented and again immediately before execution, evaluate:

1. Is the workflow/pilot version active for this organization, location, vehicle, stage, and route?
2. Is the actor authenticated, active, assigned where required, and operating under a valid delegation if applicable?
3. Does the actor have the exact command capability?
4. Are role, qualification, independence, and separation rules satisfied?
5. Are identity, custody, safety, legal, privacy, evidence, source, and freshness hard gates satisfied?
6. Is the request complete, current, internally consistent, and at the expected vehicle/workflow version?
7. For money, is the currency valid and are all cost components, taxes, fees, credits, and correlated exposure included?
8. Are quote/source requirements satisfied and unexpired?
9. Does the actor's limit cover both the proposed action and cumulative exposure?
10. Is prior approval still current, unused as prohibited, unrevoked, and within scope?
11. Has a reapproval trigger occurred?
12. Can the command execute idempotently without duplicating a commitment?

Possible outcomes:

- `PERMITTED` — actor may execute the exact command now;
- `APPROVAL_REQUIRED` — one eligible approval path exists;
- `ADDITIONAL_EVIDENCE_REQUIRED` — authority cannot be evaluated yet;
- `REAPPROVAL_REQUIRED` — prior approval is no longer sufficient;
- `CONFLICT_OR_INDEPENDENCE_HOLD` — another eligible actor is required;
- `HARD_STOP` — the action cannot be approved under current policy;
- `POLICY_OR_AUTHORITY_UNAVAILABLE` — keep action unavailable and escalate configuration ownership.

## 6. Authority tiers

Tiers express escalation order, not dollar values. Exact limits remain `TBD` and must be separately approved.

| Tier | Intended use | Typical holder | Boundary |
| --- | --- | --- | --- |
| `T0` | Observe, prepare, request, and execute pre-authorized routine work | Eligible staff/executor | No independent consequential approval |
| `T1` | Narrow routine authority within small exact scope | Specifically delegated coordinator/lead | No implicit authority beyond listed command/limit |
| `T2` | Department/stage authority | Inventory, Shop, Office, Merchandising manager | Subject to cumulative limits and separation |
| `T3` | Dealership executive authority | General/Operations Manager | Still cannot bypass non-waivable gates |
| `T4` | Ownership/board/external qualified authority | Owner/board or qualified external authority | Used where dealership delegation ends; not a universal override |

An employee may occupy different tiers for different commands. For example, a manager may have `T2` transport authority, `T0` title-review authority, and no QC authority.

## 7. Lifecycle command authority matrix

This matrix defines the authority type; named people and exact limits remain subject to Workshop 2A and the capture sheets in this packet.

| Area | Prepare/request | Execute/record | Approve/commit | Verify/release | High-risk authority boundary |
| --- | --- | --- | --- | --- | --- |
| Acquisition | Inventory Coordinator | Inventory Manager records validated context | Acquisition authority confirms exact authoritative event | Independent identity authority resolves material conflict | Acquisition reversal is separate GM/Operations authority |
| Transport | Coordinator plans/requests quotes | Provider/Authorized Driver executes; coordinator monitors | Scoped transport/method/cost authority confirms | Receiving owner accepts arrival/custody separately | Destination/method material change, cancellation, and recovery require exact authority |
| Receipt/Custody | Receiving prepares intake | Receiving staff observe and secure | Custody owner accepts within scope | Material discrepancy/identity authority resolves | Return/rejection, risk acceptance, or disposal cannot be inferred |
| Inspection/Triage | Manager selects template/assigns | Qualified inspector records | Manager approves permitted route/supplement | Evidence reviewer accepts; critical containment remains mandatory | No-action/disposition/specialist routes require exact policy authority |
| Recon Planning | Estimator builds plan/alternatives | Diagnostician/parts contributors record basis | Scoped recon authority approves exact plan/amount | Planning owner verifies executable job creation | Partial approval, changed scope, disposition, revocation are separate |
| Parts | Parts role compares/request quotes | Parts role receives/reserves/issues/returns | Scoped purchase/substitution authority commits | Custody/fitment/discrepancy verifier accepts | Quote/order/receipt/reservation/issue/install remain distinct |
| Repair | Shop dispatches approved job | Qualified technician executes | Changed-scope authority approves before extra work | Independent QC and operational release authority verify/release | Technician finish cannot create QC pass or frontline readiness |
| Title/Documents | Coordinator prepares/submits when eligible | Custodian records originals/status | Fee/filing authority commits exact action | Qualified reviewer evaluates readiness | Legal applicability/stops cannot use generic override |
| Merchandising | Staff prepare media/content/payload | Publisher submits approved payload | Content/claim authority approves content | Reconciliation owner verifies live/current state | Provider acceptance cannot create truth or readiness |
| Pricing | Analyst recommends | Authorized publisher applies approved price | Pricing authority approves exact price/expiry; floor exception separate | Reconciliation verifies public/internal price | Spend authority and customer-price authority are unrelated grants |
| Frontline Release | Reviewer assembles/evaluates | Placement/channel/sales owners record outcomes | Frontline authority authorizes exact frozen package | Independent review and post-release verification | Critical exception prohibited; reinstatement requires full current review |
| Workflow Policy | Author prepares version/diff | Administrator configures draft | Policy owner approves | Independent publisher verifies/publishes | Author/publisher self-combination prohibited for consequential rules |

## 8. Financial-domain boundaries

The workflow must keep the following financial concepts separate:

| Domain | Purpose | Typical examples | Must not be confused with |
| --- | --- | --- | --- |
| Acquisition principal | Authoritative vehicle acquisition consideration | Purchase/trade allowance as supplied by approved source | Authority to initiate acquisition; recon budget; accounting posting |
| Inventory investment | Total controlled capital attributed to the vehicle | Acquisition, transport, fees, recon, parts, labor, sublet, media | Cash paid; book value; customer price |
| Operating spend | New dealership obligation requested during the workflow | Carrier, tow, storage, parts, sublet, filing, media | Quote, estimate, or invoice |
| Estimate | Forecast of expected work/cost | Recon plan estimate | Authorization or incurred cost |
| Budget | Management ceiling or planning allocation | Vehicle recon budget | Approval to spend every dollar within it |
| Commitment | Authorized obligation to a provider/internal source | Confirmed carrier or purchase order | Receipt, invoice validation, or payment |
| Incurred cost | Cost resulting from performed/received service or goods | Completed tow, installed part | Approved estimate or paid invoice |
| Invoice/payable | Provider claim requiring validation/accounting process | Carrier/parts/sublet invoice | Proof of performance or system posting |
| Credit/recovery | Reduction or recovery associated with prior exposure | Return credit, claim recovery | Erasure of original cost/history |
| Customer-facing price | Approved public/internal retail offer | List/advertised price | Inventory cost authority, valuation, or final transaction price |
| Forecast margin | Analytical projection from approved facts | Price minus modeled investment/carrying costs | Guaranteed profit or approval basis by itself |
| Accounting posting | Ledger/DMS entry owned by separate accounting integration/process | AP, inventory capitalization, adjustment | Workflow approval or operational event |

## 9. Financial fact lifecycle

Each cost component must move through attributable states; later states do not overwrite earlier ones.

```text
REQUESTED
-> QUOTED / ESTIMATED
-> PROPOSED
-> AUTHORIZED
-> COMMITTED
-> RECEIVED_OR_PERFORMED
-> INCURRED
-> INVOICED
-> VALIDATED_OR_DISPUTED
-> PAID_OR_CREDITED (external accounting fact when integrated)
```

Rules:

- a request is not a quote;
- a quote is not an authorization;
- authorization is not a commitment;
- commitment is not proof of delivery/performance;
- receipt/performance is not invoice validation;
- invoice validation is not payment;
- accounting-provider acknowledgement is not proof of posted state;
- cancellation affects only cancellable future obligations;
- dispute does not erase custody, performance, or exposure;
- credits and recoveries link to, but never rewrite, the original component.

## 10. Cost classification catalog

Workshop participants must approve which classes apply to the pilot and their accounting/source owner.

| Cost class | Examples | Typical approval dimension | Correlation rule |
| --- | --- | --- | --- |
| Acquisition | Purchase amount, auction buyer fee | Separate acquisition authority; authoritative input for first slice | Same acquisition/vehicle/cycle |
| Transportation | Carrier, tow, fuel, driver, mileage | Per movement plus complete movement exposure | Pickup/destination/movement plan |
| Transport ancillary | Storage, wait, gate, loading, recovery, cancellation | Combined with base transport and recovery | Same provider/event/vehicle/movement |
| Inspection/diagnosis | Inspection, scan, specialist diagnosis | Per inspection/job and vehicle plan | Same finding/system/plan version |
| Recon labor | Internal or external labor | Per job plus recon-plan cumulative | Same vehicle/cycle/plan and changed scope |
| Parts/materials | Part, core, freight, hazardous handling, supplies | Per line/order plus plan cumulative | Same repair requirement/order/vendor family |
| Sublet/vendor repair | Body, glass, alignment, specialty work | Per sublet plus plan cumulative | Same finding/job/vehicle/cycle |
| Title/document | Filing, search, duplicate, lien, courier, provider fee | Per requirement/submission plus cumulative | Same title/document case and external dependency |
| Merchandising | Detail, photography, media, data/content service | Per package/provider plus vehicle cumulative | Same merchandising package/version |
| Channel/listing | Listing, syndication, marketplace fee | Account/vehicle/period as policy defines | Same channel/account/vehicle/period |
| Lot/readiness | Keys, security, minor placement/readiness supply | Per item plus vehicle cumulative | Same readiness package/vehicle |
| Emergency containment | Tow, storage, hazard isolation needed to reduce immediate harm | Separate narrow emergency limit | Same incident/vehicle/custody event |
| Taxes/fees/surcharges | Applicable tax, environmental, shop, processing charge | Included in gross exposure unless policy explicitly states otherwise | Same underlying component |
| Credit/recovery | Return, warranty, claim, vendor credit | Separate approval/validation; never offsets authority invisibly | Linked original cost and recovery event |

Unclassified cost cannot be committed. It routes to the financial policy owner for classification; staff must not choose a lower-risk category to obtain authority.

## 11. Currency and amount rules (`ITF-APR-030`)

Policy must define:

- organization accounting currency;
- permitted transaction currencies, if any;
- approved exchange-rate source and timestamp;
- whether limits evaluate transaction amount, converted gross amount, or both;
- rounding precision and tax/fee treatment;
- gross versus net treatment of credits, rebates, warranty, insurance, and recovery;
- handling of estimated versus final tax/freight/fees;
- source and freshness of acquisition principal, carrying-cost, and margin inputs.

Recommended pilot position:

- use one approved accounting currency;
- do not enable foreign-currency commitments in the first pilot;
- evaluate authority using gross expected exposure including known taxes, fees, freight, surcharges, and nonrecoverable amounts;
- display potential credits/recoveries separately and never rely on an unverified future credit to reduce required authority.

## 12. Authority-limit matrix (`ITF-APR-031`)

All numerical values remain `TBD`. A limit row is not active until every field is approved and published.

| Authority row | Capability | Per action | Per vehicle/cycle | Per correlated plan/order | Per period | Backup/escalation | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Staff transport | `inventory.transport.approve_cost` | `TBD` | `TBD` | Movement exposure `TBD` | `TBD` | `TBD` | OPEN |
| Inventory Manager transport | `inventory.transport.approve_cost` | `TBD` | `TBD` | Movement exposure `TBD` | `TBD` | `TBD` | OPEN |
| General Manager transport | `inventory.transport.approve_cost` | `TBD` | `TBD` | Movement exposure `TBD` | `TBD` | Owner/upper boundary `TBD` | OPEN |
| Recon approval | `inventory.recon.authorize` | `TBD` | `TBD` | Recon plan `TBD` | `TBD` | `TBD` | OPEN |
| Partial recon approval | `inventory.recon.partial_authorize` | `TBD` | `TBD` | Authorized subset `TBD` | `TBD` | `TBD` | OPEN |
| Parts purchase | `inventory.parts.purchase` | `TBD` | `TBD` | Order/plan `TBD` | `TBD` | `TBD` | OPEN |
| Title submission/fee | `inventory.title.submit` / `approve_fee` | `TBD` | `TBD` | Requirement case `TBD` | `TBD` | `TBD` | OPEN |
| Pricing approval | `inventory.pricing.approve` | Price/variance scope `TBD` | Current vehicle/package | Not a spend limit | Expiry `TBD` | `TBD` | OPEN |
| Floor exception | `inventory.pricing.approve_floor_exception` | Floor/margin variance `TBD` | Current vehicle/package | Separate from normal price | Expiry `TBD` | `TBD` | OPEN |
| Noncritical exception | Stage-specific exception capability | Nonfinancial scope `TBD` | Current vehicle/package | Residual risk `TBD` | Expiry/review `TBD` | `TBD` | OPEN |
| Emergency containment | Narrow emergency capability | `TBD` | Incident exposure `TBD` | Same incident aggregation | `TBD` | Retrospective reviewer `TBD` | OPEN |

Limits must define inclusive/exclusive boundary behavior and the upper authority when the highest dealership limit is exceeded. No user receives an unlimited or null-as-unlimited limit.

## 13. Quote and source controls (`ITF-APR-032`)

### 13.1 Quote requirement dimensions

Quote policy may vary only by approved dimensions such as:

- cost class and expected gross exposure;
- standard versus urgent/emergency condition;
- internal, contracted, catalog, market, auction, regulated, sole-source, or specialist source;
- movement distance/method and vehicle characteristics;
- repair/part criticality and fitment risk;
- vendor performance/eligibility and warranty/return terms;
- after-hours, storage, cancellation, lead time, and capacity constraints;
- title/document jurisdiction or fixed statutory fee;
- approved contract/catalog pricing freshness.

### 13.2 Quote comparison contract

Each comparison records:

- provider/source identity and eligibility;
- requested and returned scope;
- price, currency, taxes, fees, freight, surcharge, cancellation, storage, and payment terms;
- availability, lead time, pickup/delivery/performance target;
- method, equipment, part/fitment, warranty, return, and substitution terms;
- quote timestamp, expiry, reference, and evidence;
- material exclusions and assumptions;
- selection recommendation and human rationale;
- conflict-of-interest disclosure where applicable.

Lowest quoted price is not automatically the required selection. Policy may consider safety, legal eligibility, fitment, service level, quality, total landed cost, warranty, returnability, and operational risk. The selected quote still requires exact authority.

### 13.3 Source exceptions

A quote exception must use a defined reason such as fixed statutory fee, active approved contract/catalog, verified sole source, immediate safety/custody containment, or unavailable market after documented attempts. It requires:

- exception authority distinct from the requester where policy requires;
- documented attempted sources and evidence;
- price reasonableness basis;
- exact scope and expiry;
- no use to defeat an approval limit or vendor eligibility rule.

## 14. Reapproval and expiry controls (`ITF-APR-033`)

Reapproval is required when any approved trigger occurs. Policy must define both absolute and percentage tolerances; the stricter applicable result governs.

| Trigger | Required response |
| --- | --- |
| Gross amount increases beyond tolerance | Recalculate exposure and obtain eligible approval before commitment/work |
| Cumulative correlated exposure crosses a limit | Escalate the complete exposure, not only the newest line |
| Scope, quantity, job, method, destination, route, provider, source, part, or material changes | Revalidate eligibility and obtain applicable approval |
| Quote/estimate/price/approval expires | Refresh sources and reapprove as policy requires |
| Taxes, fees, freight, storage, cancellation, or surcharge become material | Include in gross exposure and reapprove if threshold reached |
| Vehicle condition, title, safety, identity, custody, or intended route changes | Suspend reliance and re-evaluate all affected authority |
| Substitution or fitment changes | Revalidate technical eligibility, warranty, cost, and authority |
| Partial approval is expanded | New approval for exact added scope and full cumulative exposure |
| Authorization is revoked or policy/role/delegation expires | Stop uncommitted work; route committed/in-progress work to controlled recovery |
| Customer price/floor basis materially changes | Obtain new pricing approval before publication/use |
| Package/source version changes before frontline release | Re-evaluate affected dimensions and authorization |

Small decreases do not authorize expanded scope. Savings on one component do not automatically fund unrelated work unless the approved policy explicitly evaluates the complete revised plan.

## 15. Correlation and anti-splitting rules (`ITF-APR-034`)

Exposure must be aggregated across the smallest complete business purpose and all policy-defined dimensions. At minimum, evaluate:

- vehicle and inventory cycle;
- acquisition/movement/receipt event;
- recon-plan version and all related jobs;
- finding, system, repair objective, and changed-scope chain;
- order, vendor, provider, sublet, shipment, and invoice family;
- base price, taxes, fees, freight, storage, cancellation, recovery, and ancillary charges;
- requesting/approving actors and time window;
- prior authorized, committed, incurred, disputed, pending, and expected amounts;
- credits/recoveries separately, without prematurely netting them against exposure.

Potential splitting indicators include:

- multiple same-purpose requests just below a limit;
- related orders separated by user, vendor, day, job, or stage;
- cancelled/recreated requests with substantially identical scope;
- parts and labor separated to avoid full-plan authority;
- base service separated from predictable fees/freight/storage;
- changed scope recorded as unrelated new work;
- multiple delegations used to distribute one approval.

When correlation is uncertain, hold commitment, show the suspected related items, and route to the financial authority. Detection is not an allegation of misconduct; it is a control requiring human review.

### 15.1 Acquisition economics and disposition review (`ITF-APR-036`)

Policy must define when current total inventory investment, forecast-to-complete, carrying exposure, expected customer price/margin, condition, title risk, demand, or time-to-frontline requires a fresh human economics/disposition review.

The threshold must specify exact inputs, authoritative sources, freshness, aggregation, confidence/unknown handling, reviewer, alternatives, and re-review triggers. Crossing it does not automatically dispose, wholesale, reduce required work, change customer price, or stop safety/custody action. It creates an owned decision among approved alternatives such as continue current plan, revise scope subject to all gates, seek higher authority, obtain more evidence, hold, return/reject where contractually allowed, transfer route, or initiate a separate disposition process.

Safety, identity, custody, title/disclosure, privacy, and already-incurred obligations remain protected regardless of economics. Uncertain future credits or optimistic price cannot reduce exposure without approved evidence.

## 16. Emergency custody and safety expenditure (`ITF-APR-035`)

Emergency authority is allowed only when delay presents an immediate, credible risk to people, property, vehicle custody, or hazard containment and the normal approval path is unavailable within the safe response window.

### Allowed categories, subject to approval

- immediate tow from an unsafe or unauthorized position;
- minimum necessary secure storage or custody protection;
- hazard isolation or emergency professional response;
- minimum action required to stop active damage or loss.

### Not emergency authority

- routine transport, convenience, schedule recovery, margin protection, or aging reduction;
- full repair, upgrade, reconditioning, discretionary diagnosis, or disposition;
- retroactive approval of an avoidable unauthorized commitment;
- bypass of driver, insurance, legal-operation, identity, or provider eligibility when those controls remain applicable;
- use of emergency limits because an approver is merely busy.

### Required emergency record

- incident/vehicle/location and observed risk;
- actor and basis for emergency eligibility;
- normal approver contact attempts and timing;
- considered alternatives and why delay was unsafe;
- provider/action and minimum necessary scope;
- expected and maximum exposure in approved currency;
- evidence before/during/after containment;
- parties notified and custody outcome;
- retrospective review owner and deadline;
- final amount, variance, incident linkage, and corrective follow-up.

Retrospective review validates handling and determines follow-up; it does not rewrite the original authority state, erase a violation, or transform containment into permission for additional work.

## 17. Override, exception, correction, and reversal matrix

| Mechanism | Proper use | Required authority/evidence | Prohibited use |
| --- | --- | --- | --- |
| Correction | Replace a demonstrably erroneous recorded fact | Correction capability, reason, source evidence, supersession | Rewrite history or manufacture prior authority |
| Noncritical exception | Permit an enumerated bounded deviation | Named exception authority, residual risk, owner, expiry/review | Bypass critical safety/title/identity/custody/privacy/QC/public-price gates |
| Risk acceptance | Accept an explicitly waivable residual operational risk | Named qualified authority, evidence, scope, expiry, monitoring | Generic manager preference or hard-gate bypass |
| Reapproval | Authorize revised current scope/exposure | Full current facts and applicable approver | Treat old approval as elastic |
| Revocation | Withdraw unused/future authority | Revocation authority, reason, effective time, recovery plan | Pretend already incurred obligations never existed |
| Cancellation | Stop a cancellable plan/order/action | Cancellation authority and provider/commitment state | Acquisition reversal, cost deletion, or unsafe abandonment |
| Reversal | Compensating business/lifecycle action | Exact reversal authority, reason, dependencies, audit | Delete evidence/history or avoid accounting/legal process |
| Emergency containment | Minimum action to reduce immediate harm | Narrow emergency grant and retrospective review | Routine operational workaround |
| Policy change | Alter future authority/rules | Policy approval plus independent publication | Resolve one urgent case by changing rules without governance |

There is no `override_all` capability. General Manager authority is broad only within approved scope and remains subordinate to non-waivable gates and external legal/contractual authority.

## 18. Approval-request contract

Every approval request must show the approver:

- vehicle identity, lifecycle stage, case owner, and current restriction;
- exact requested command and consequence;
- requestor, preparer, executor, proposed vendor/provider, and conflicts;
- complete scope and version;
- quote/source comparison and expiry;
- current requested amount, currency, taxes/fees, and gross exposure;
- prior authorized, committed, incurred, disputed, and pending correlated amounts;
- applicable limit, approval tier, and why this approver is eligible;
- changed facts and reapproval reason, when applicable;
- alternatives, operational/customer impact, target, and consequence of no action;
- mandatory evidence and unresolved hard gates;
- permitted responses and whether partial approval is allowed.

Allowed responses:

- `APPROVE_EXACT` — exact scope/amount/expiry only;
- `APPROVE_PARTIAL` — enumerated subset only when policy permits;
- `REJECT` — reason and permitted recovery/alternative;
- `REQUEST_CHANGES_OR_EVIDENCE` — exact deficiency and owner;
- `ESCALATE` — to a named eligible higher authority;
- `DEFER` — with owner, reason, review time, and consequences;
- `REVOKE` — prospective authority withdrawal with recovery behavior.

Approvals cannot be inferred from silence, chat acknowledgement, assignment, historical behavior, budget existence, provider confirmation, or work completion.

## 19. Approval inbox and staff experience

### Staff requester

Staff should see:

- whether they may execute, must request approval, need evidence, or are hard-stopped;
- the amount/scope currently covered and uncovered;
- the exact approver queue and response target;
- what work may safely continue while waiting;
- what changed if reapproval becomes necessary;
- one approval record rather than duplicate tasks/reminders.

### Manager approver

Manager Review should prioritize:

- safety/custody emergencies;
- approvals blocking the critical path;
- expiring quotes/approvals;
- cumulative exposure nearing/crossing authority;
- changed scope and plan variance;
- suspected correlation/splitting;
- aging requests and unavailable approvers;
- high-risk vendor/source or degraded-integration cases.

The manager view must not present an enabled approval button when the manager lacks exact authority or a hard gate prevents approval. It should explain the missing authority and next eligible path.

## 20. Evidence and audit contract

Every consequential authority action records:

- actor and authenticated/delegated authority;
- role/capability/grant and policy version;
- vehicle/cycle, stage, command, request, approval, and correlation IDs;
- source facts/evidence versions and expected aggregate version;
- amount, currency, classification, quote, taxes/fees, gross/cumulative exposure;
- prior/new state and exact approved scope;
- decision, reason, conditions, expiry/review, and residual risk;
- occurrence and recording timestamps;
- independence/conflict evaluation;
- idempotency result and external acknowledgement where applicable;
- correction, supersession, reapproval, revocation, cancellation, reversal, and recovery links.

Audit is immutable and access-controlled. Operational staff may see the explanation needed to act without receiving unrelated payroll, customer, banking, vendor-sensitive, or privileged information.

## 21. Degraded and failure behavior

| Condition | Safe behavior |
| --- | --- |
| Authority service/policy unavailable | Consequential command unavailable; preserve work and escalate |
| Limit or currency missing | Do not treat null/zero/blank as unlimited; request policy resolution |
| Quote source unavailable | Use only approved alternate/manual evidence route; otherwise hold |
| Provider acknowledgement unknown | Do not duplicate commitment; reconcile by idempotency/reference |
| Concurrent approval/scope change | Reject stale command and reload current aggregate |
| Approval notification fails | Approval remains pending; escalate delivery without duplicating request |
| External commitment succeeds but internal recording fails | Contain duplicate risk; reconcile before retry |
| Approval succeeds but commitment fails | Preserve unused approval subject to expiry; record failure and recovery |
| Amount exceeds highest configured authority | Route to named upper authority or hold; never auto-approve |
| Accounting integration unavailable | Operational facts remain controlled; do not claim posted/paid state |

## 22. Decision recommendations

| Decision | Recommended outcome | Required authority | State |
| --- | --- | --- | --- |
| `ITF-APR-030` | Use one approved accounting currency for the pilot; exclude foreign-currency commitments; classify all gross exposure and display unverified credits separately | GM/Operations + Office/Controller | OPEN |
| `ITF-APR-031` | Approve command-specific tiered limits with no null/unlimited grants; complete every row for staff, Inventory Manager, GM, and upper authority | GM/Operations + Owner/Controller boundary | OPEN |
| `ITF-APR-032` | Approve risk- and cost-class-based quote rules, eligible sources, comparison evidence, expiry, and narrowly enumerated quote exceptions | GM/Operations + functional/financial owners | OPEN |
| `ITF-APR-033` | Require reapproval on the stricter approved absolute/percentage variance plus any material scope/source/method/vendor/expiry/gate change | GM/Operations + functional/financial owners | OPEN |
| `ITF-APR-034` | Aggregate gross correlated exposure across the vehicle/cycle, business purpose, plan/job/order/provider chain, and time window; prohibit splitting and premature credit netting | GM/Operations + Office/Controller | OPEN |
| `ITF-APR-035` | Allow only minimum necessary emergency safety/custody containment within an exact limit and category, followed by attributable retrospective review | GM/Operations + Safety/Insurance + Office/Controller | OPEN |
| `ITF-APR-036` | Require a human economics/disposition review when approved current-investment, forecast-to-complete, carrying, margin, age, or risk thresholds are reached; prohibit automatic disposition or gate reduction | GM/Operations + Inventory + Office/Controller | OPEN |

## 23. Financial-policy capture sheet

Complete one sheet per authority capability/tier. Blank fields prevent activation.

| Field | Required entry |
| --- | --- |
| Policy/grant ID and version | `TBD` |
| Capability | `TBD` |
| Authority tier and role | `TBD` |
| Primary and backup people | `TBD` |
| Organization/location/stage | `TBD` |
| Vehicle/source/method/vendor scope | `TBD` |
| Accounting/transaction currency | `TBD` |
| Per-action gross limit | `TBD` |
| Per-vehicle/cycle limit | `TBD` |
| Per-plan/order/provider limit | `TBD` |
| Period and limit | `TBD` |
| Included taxes/fees/freight/surcharges | `TBD` |
| Quote count/source/exception rule | `TBD` |
| Quote/approval expiry | `TBD` |
| Absolute reapproval threshold | `TBD` |
| Percentage reapproval threshold | `TBD` |
| Correlation dimensions/window | `TBD` |
| Separation/conflict rules | `TBD` |
| Delegation allowed and reduced scope | `TBD` |
| Emergency applicability | `TBD` |
| Upper authority/escalation target | `TBD` |
| Evidence/access/retention references | `TBD` in Workshop 2C |
| Approver, publisher, effective/review dates | `TBD` |

## 24. Required authority stress tests

Workshop 2B does not pass until participants can determine permitted action, exposure, approver, evidence, and safe failure for each case:

1. Two transport quotes each fall below a manager limit but are for one vehicle movement.
2. A low quote excludes predictable storage, gate, and fuel surcharges.
3. A carrier quote expires after approval but before confirmation.
4. A destination changes after transport cost approval.
5. A recon plan is partially approved and a technician discovers additional related work.
6. Separate parts and labor requests jointly cross the approval limit.
7. A parts order is cancelled and recreated with another vendor just below the limit.
8. A likely warranty/vendor credit would reduce net cost below the limit but is not confirmed.
9. An invoice exceeds the committed amount after work is complete.
10. An unsafe arrival requires an immediate tow while the normal approver is unreachable.
11. A manager approves via text message without the request/evidence record.
12. Brock requests and attempts to approve the same changed-scope repair.
13. Eli is the highest onsite authority but the request exceeds his published limit.
14. A customer appointment creates pressure to approve price and frontline release quickly.
15. Baraka recommends a customer price below the approved floor.
16. A system/provider reports a commitment timeout after the provider may have accepted it.
17. A cost was incurred without authority and staff request retrospective approval.
18. A safety/title hard gate fails after spend was approved.
19. Current investment and forecast-to-complete cross the approved economics-review threshold while the vehicle remains subject to safety and custody obligations.

Expected behavior: calculate complete current exposure, preserve the original authority state, stop or contain unsafe/unauthorized action, route to the exact eligible authority, and never transform commercial urgency into approval.

## 25. Workshop agenda

### Before the meeting

Bring:

- current delegation and signature/approval authority;
- organization accounting currency and accounting ownership;
- representative transport, parts, recon, title, sublet, merchandising, and channel costs;
- vendor contracts/catalogs, quote practices, taxes, fees, freight, storage, and cancellation terms;
- current budget, purchase, invoice, credit, warranty, insurance, and dispute practices;
- customer-pricing/floor governance;
- emergency tow/storage/hazard procedures and insurance requirements;
- upper authority/ownership boundary and coverage schedule.

### In the meeting

1. Approve authority vocabulary and evaluation order.
2. Confirm command-specific tiers and prohibited combinations.
3. Approve currency and cost classifications.
4. Complete numerical authority rows and upper escalation paths.
5. Approve quote and source rules by cost class/risk.
6. Approve absolute/percentage reapproval and expiry rules.
7. Approve correlation/anti-splitting dimensions.
8. Approve narrow emergency categories, limits, coverage, and review.
9. Validate pricing authority remains separate from spend authority.
10. Run all stress tests and assign unresolved gaps.
11. Record `ITF-APR-030`-`036` dispositions in the Approval Register.

## 26. Exit criteria

Workshop 2B is complete only when:

- `ITF-APR-030`-`036` have recorded dispositions and complete approval metadata;
- all live pilot financial capabilities have named primary/backup authorities and upper boundaries;
- all limits, currencies, cost classes, quote rules, expiries, and reapproval thresholds are exact and published;
- cumulative/correlated exposure and anti-splitting behavior are approved;
- emergency authority is narrow, covered, evidenced, and retrospectively reviewed;
- pricing, spend, exception, release, correction, cancellation, revocation, and reversal authorities remain distinct;
- no generic override or null-as-unlimited authority exists;
- staff and manager approval experiences can explain eligibility, missing evidence, exposure, and escalation;
- all stress tests pass or have safe non-execution behavior with named owners and target dates.

## 27. Next Workshop 2 packet

Workshop 2 continues with the **Evidence, Privacy, and Security Matrix**, covering `ITF-APR-050`-`056`: evidence criticality, capture and verification, access classification, retention, sensitive-document handling, correction/supersession/quarantine, audit access, and privacy/security incident behavior.

Authority/financial approval does not make the first implementation slice ready for code. Applicable role, evidence, timing, source/integration, pilot, and stage-specific decisions must also be approved or safely deferred, and implementation activation remains separately gated.
