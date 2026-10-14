# Acquisition and Transportation Decision and Scenario Catalog

**Status:** Proposed first vertical-slice catalog  
**Catalog ID:** `INV-ITF-AT`  
**Version:** `0.1.0`  
**Activation:** Not approved; documentation only

## 1. Outcome and boundary

This catalog begins with a claimed authoritative acquisition event and ends when the vehicle is either:

- handed to Receipt and Custody at the intended location;
- verified already present and handed to Receipt and Custody;
- placed in an owned, time-bounded hold or recovery path;
- routed to disposition/acquisition review;
- safely cancelled before dealership control; or
- closed as a verified duplicate or invalid trigger.

It does not declare receipt complete, perform an inspection, or make the vehicle frontline-ready.

## 2. Trigger catalog

| Trigger ID | Claimed event | Required authority/evidence | Initial disposition |
| --- | --- | --- | --- |
| `AT-TRG-001` | Purchase approved and accepted | Approved acquisition record, effective time, amount/currency, vehicle identity, approving authority | Evaluate workflow eligibility |
| `AT-TRG-002` | Trade accepted | Accepted trade/ownership evidence, effective time, vehicle identity, receiving location or plan | Evaluate workflow eligibility |
| `AT-TRG-003` | Consignment accepted | Effective agreement, custody/sale authority, vehicle identity, scope and expiry | Evaluate workflow eligibility |
| `AT-TRG-004` | Inter-location inventory transfer authorized | Source/destination, custody owner, transfer authority, inventory-unit relationship | Use existing unit; do not create an acquisition cycle unless domain policy requires one |
| `AT-TRG-005` | Manager manual intake | Manager capability, reason code, source evidence, effective time | Create validation work; never treat manual entry alone as proof |
| `AT-TRG-006` | External acquisition import | Provider/source identity, idempotency key, lineage, freshness, mapped authority | Validate or reconcile before start |
| `AT-TRG-007` | Existing inventory recovery | Canonical vehicle/unit match, reason, effective state, migration/pilot authority | Create an explicitly labeled recovery instance |

### Trigger rejection and reconciliation

| Rule ID | Condition | Result |
| --- | --- | --- |
| `AT-RULE-001` | No authoritative financial/control boundary | Reject start; retain as opportunity/appraisal only |
| `AT-RULE-002` | Open inventory unit already exists for vehicle and organization | Reuse/correlate existing unit or create duplicate exception; never create a second open unit |
| `AT-RULE-003` | Active workflow already exists for inventory unit | Return existing instance idempotently |
| `AT-RULE-004` | VIN or identity conflicts with canonical record | Stop movement decisions and create restricted identity reconciliation |
| `AT-RULE-005` | Acquisition is cancelled before dealership control | Record attributable cancellation; do not start operational work |
| `AT-RULE-006` | Intended disposition is confirmed wholesale/non-retail | Route to approved disposition workflow; do not run retail frontline preparation |
| `AT-RULE-007` | Source is stale, incomplete, conflicting, or unauthoritative | Create data-quality reconciliation; automatic start remains disabled |

## 3. Decision-entry contract

Before showing a question, the decision surface displays:

- vehicle identity and confidence;
- acquisition type, source, effective time, and authority;
- current physical location and source/freshness;
- intended destination and retail intent;
- current owner, clock, outstanding blockers, and related evidence;
- why the decision is being asked and what it will change.

The system preselects nothing that could create a financial, safety, legal, custody, or cancellation consequence. Recommended options are labeled as recommendations and show their reasons.

## 4. Acquisition validation decisions

### `AT-DEC-001` — Is this an authoritative acquisition?

**Appears when:** A trigger claims dealership financial or custody responsibility but validation is not complete.  
**Eligible respondents:** Inventory Manager; General/Operations Manager for exception authority.

| Response | Required evidence | Result |
| --- | --- | --- |
| Confirmed purchase | Approved acquisition reference and authority | Continue validation |
| Confirmed accepted trade | Accepted trade/ownership reference | Continue validation |
| Confirmed consignment | Effective agreement and authority scope | Continue with consignment-specific controls |
| Proposed/not finalized | Proposal/appraisal reference | Stop workflow start; return to acquisition decision process |
| Cancelled/reversed | Cancellation authority and reason | Close or reverse safely; cancel only unstarted work |
| Duplicate/incorrect | Candidate matching record and explanation | Open duplicate reconciliation |
| Unknown or evidence missing | Missing-evidence reason | Create acquisition-evidence task; block start |

**Hard rules:** A staff assertion without required source evidence cannot convert a proposal into an acquisition. Cancellation cannot erase accepted financial/custody history.

### `AT-DEC-002` — Is the vehicle identity verified?

**Appears when:** Canonical vehicle match is absent, low confidence, or conflicting.  
**Responses:** Verified VIN; verified documented non-standard identity; identity needs physical verification; source conflict; suspected duplicate; unable to verify.

**Results:**

- verified identity advances;
- physical verification creates a VIN/identity capture task assigned to an eligible person at the vehicle location;
- conflict/duplicate creates a restricted reconciliation exception;
- suspected tampering or fraud invokes policy-controlled critical escalation without accusing the reporter.

### `AT-DEC-003` — What is the intended disposition?

**Responses:** Retail; retail pending manager confirmation; wholesale; return/reject; inter-location transfer; undecided.

| Response | Result |
| --- | --- |
| Retail | Continue Inventory-to-Frontline |
| Retail pending | Create manager decision request; transport may proceed only if policy explicitly permits |
| Wholesale | Route to disposition workflow |
| Return/reject | Create acquisition reversal/recovery review |
| Transfer | Use transfer/custody path and preserve existing inventory cycle |
| Undecided | Create time-bounded disposition decision; block retail-specific downstream work |

### `AT-DEC-004` — Who owns the acquisition case?

**Responses:** Eligible named inventory owner; eligible location queue; manager assignment required.

The result establishes one accountable internal case owner. An external auction, seller, carrier, or vendor may be responsible for an action but cannot be the internal accountable owner.

## 5. Location and movement decisions

### `AT-DEC-010` — Where is the vehicle now?

| Response | Required details | Result |
| --- | --- | --- |
| At intended dealership location | Exact lot/bay/receiving area and evidence/source | Evaluate no-transport receipt handoff |
| At another dealership location | Approved source location and custody owner | Offer internal transfer methods |
| At auction | Auction, release status, storage deadline | Offer auction pickup/delivery methods |
| At seller/customer location | Address/location reference, availability contact | Offer seller delivery, internal pickup, or carrier |
| At carrier/storage/vendor | Facility and custody/release reference | Determine onward movement |
| In transit | Carrier/driver, departure, destination, ETA | Enter monitoring/recovery path |
| Unknown | Last known source and attempted verification | Create high-priority location exception |
| Location disputed | Conflicting sources/evidence | Create reconciliation; block unsafe movement commands |

Privacy rule: staff see only the address/contact detail required for their assigned work and capability.

### `AT-DEC-011` — What is the intended destination?

**Responses:** Approved dealership location; approved temporary receiving/storage location; another organization location; undecided; change requested.

Destination eligibility checks organization/location scope, capacity constraints, operating hours, receiving capability, security, and policy. A change after transport confirmation requires impact preview and authorized reschedule rather than silent field editing.

### `AT-DEC-012` — Is transportation required?

| Response | Result |
| --- | --- |
| Yes | Continue to arrangement decision |
| No—verified at intended location | Create Receipt and Custody handoff |
| No—external party will deliver | Record external responsibility; continue arrangement monitoring |
| Destination undecided | Create destination decision; transport blocked |
| Not yet—authorized hold | Require reason, owner, review time, and maximum duration |
| Unknown | Create location/transport determination task |

Allowed hold reasons: acquisition/release incomplete; identity concern; safety/condition concern; legal/compliance hold; destination constraint; manager-directed hold; severe external disruption; other policy-approved reason.

## 6. Transportation arrangement decisions

### `AT-DEC-020` — What is the transportation status?

| Response | Required fields | Result |
| --- | --- | --- |
| Arranged and confirmed | Method, responsible party, confirmation, pickup window, ETA, destination, cost/authority | Create pickup and arrival monitoring |
| Requested; awaiting confirmation | Recipient, requested time, expected response, follow-up owner | Create confirmation follow-up and timeout |
| Not arranged | Reason if known | Present eligible methods |
| Seller/auction arranging | External party, commitment, contact, internal monitor | Monitor external commitment |
| Internal pickup planned | Driver plan and method | Run internal-pickup eligibility |
| Already in transit | Movement evidence and ETA | Enter transport monitoring |
| Unable to arrange | Structured reason and attempts | Create transport exception and recovery options |
| Unknown | Information source/owner | Create information task |
| Transportation not required | Evidence of current destination | Verify and hand to Receipt |

### `AT-DEC-021` — Which transportation method will be used?

Potential options are filtered before presentation:

- approved third-party carrier;
- approved tow or trailer;
- internal dealership driver;
- internal trailer/tow;
- seller/auction delivery;
- approved inter-location transfer;
- retain at location under an authorized temporary hold;
- request manager sourcing assistance.

Eligibility considers roadworthiness, legal operation, insurance, distance, weather, driver authorization, vehicle value/class, release status, hours, destination capacity, cost authority, and available resources.

### `AT-DEC-022` — Is the vehicle eligible to be driven?

**Required for:** Any self-driven or dealership-driver method.

| Response | Result |
| --- | --- |
| Verified roadworthy and legally operable | Driving options remain eligible; record evidence/source and expiry |
| Roadworthiness unknown | Remove driving options; create qualified assessment task |
| Not roadworthy | Remove driving options; offer tow/trailer/carrier |
| Documents/insurance insufficient | Remove driving options; create documentation/insurance resolution |
| Condition changed after verification | Suspend driving plan and reevaluate method |

No general override may make an unverified or known-unsafe vehicle eligible to be driven.

### `AT-DEC-023` — Is the vehicle releasable for pickup?

Check:

- payment/release authorization;
- seller/auction release reference;
- keys/access availability;
- identity match;
- pickup hours and instructions;
- required transport documents;
- no active legal, fraud, safety, or manager hold.

Responses: Verified releasable; pending named requirement; blocked; conflicting information; unknown. Pending or blocked results create owned resolution work and suppress dispatch confirmation.

### `AT-DEC-024` — Is transportation cost authorized?

**Responses:** Within respondent authority; approval required; rejected; revised quote required; cost unknown; included/no dealership charge.

The decision records currency, quote, cost type, approver, policy version, cumulative applicable exposure, and expiry. `TBD` dealership limits live in policy configuration, not this catalog. Splitting requests to evade authority is prohibited and detectable through correlated exposure.

### `AT-DEC-025` — Confirm transportation plan

Required before dispatch confirmation:

- verified vehicle and inventory unit;
- source and destination;
- eligible transport method;
- responsible internal owner and carrier/driver;
- release readiness;
- pickup window and ETA;
- cost authority;
- receiving hours and receiver;
- required documents and special handling;
- monitoring and failure-recovery plan.

Confirmation emits a versioned plan snapshot. Later material changes use amend/reschedule/cancel commands with impact preview.

## 7. Monitoring decisions

### `AT-DEC-030` — What is the pickup outcome?

| Response | Result |
| --- | --- |
| Picked up successfully | Record attributable departure; enter In Transit |
| Pickup scheduled but not yet due | Continue monitor; no task completion |
| Driver/carrier late | Create/update correlated delay exception and follow-up |
| Pickup missed | Present reschedule, replace method/provider, release resolution, or acquisition review |
| Vehicle not releasable | Reopen release decision and preserve failed attempt |
| Vehicle/identity/condition differs | Stop movement if safe; create discrepancy/identity/condition exception |
| Carrier/driver cancelled | Present eligible replacement options |
| Pickup cancelled by dealership | Require authority, reason, impact, and recovery disposition |
| Unable to confirm | Create verification work; elapsed time does not imply pickup |

### `AT-DEC-031` — What is the in-transit status?

Responses: On time; delayed with revised ETA; delayed without ETA; incident/damage; breakdown; rerouted; custody/contact lost; delivered; status unknown.

Each non-normal response requires an internal owner, next contact time, containment action, risk band, and escalation. A new ETA never erases the original commitment or delay history.

### `AT-DEC-032` — What is the delivery outcome?

| Response | Evidence/next action |
| --- | --- |
| Delivered successfully | Arrival time, receiver, location, VIN/stock verification; create Receipt and Custody handoff |
| Delivered with apparent new damage | Preserve pre/post condition evidence; create carrier/condition exception; receipt may continue with discrepancy visible |
| Delivered to wrong location | Record custody; create controlled relocation/recovery plan |
| Partial delivery/property missing | Record missing keys/documents/accessories; create receipt discrepancy |
| Delivery delayed | Update correlated delay exception; retain original commitment |
| Carrier cancelled/failed | Return to method selection with failed-attempt evidence |
| Vehicle could not be released | Return to release resolution |
| Vehicle/carrier location unknown | Critical custody/location response according to policy |
| Delivery disputed/unconfirmed | Create verification work; do not advance |

## 8. Recovery and change decisions

### `AT-DEC-040` — Choose transport recovery action

Eligible options:

- reschedule same carrier/method;
- select replacement carrier;
- change to eligible internal pickup;
- change to tow/trailer;
- request seller/auction delivery;
- change destination with authority;
- place time-bounded hold;
- request manager intervention;
- return to acquisition/disposition review;
- cancel transport while retaining acquisition responsibility.

The interface shows expected time, incremental cost, known risks, required approval, and affected commitments. Recommendation ranking cannot include ineligible options.

### `AT-DEC-041` — Amend a confirmed plan

Material changes include method, carrier/driver, destination, pickup/ETA, cost, or special handling. The workflow must:

1. show the prior plan and proposed change;
2. calculate affected tasks, reservations, approvals, and commitments;
3. require changed-condition reason and authority;
4. supersede rather than delete the prior plan;
5. notify only actionable affected owners;
6. create new monitoring deadlines.

### `AT-DEC-042` — Cancel or reverse

Cancellation options are context-sensitive:

- cancel an unconfirmed transport request;
- cancel a confirmed but not-started plan;
- stop/recover an in-transit movement where feasible and safe;
- reverse/cancel acquisition through a separate authorized decision;
- close a duplicate/invalid workflow without changing the valid inventory unit.

Cancellation never implies acquisition reversal, custody return, refund, or liability resolution unless separate authoritative commands verify those outcomes.

## 9. Action catalog

| Action ID | Action | Completion evidence |
| --- | --- | --- |
| `AT-ACT-001` | Complete acquisition evidence | Required source references validated |
| `AT-ACT-002` | Verify physical vehicle identity | Attributable VIN/identity observation and evidence |
| `AT-ACT-003` | Determine current location | Authoritative or verified location observation |
| `AT-ACT-004` | Select/approve destination | Eligible location and authority recorded |
| `AT-ACT-005` | Request transport quote | Provider, request time, scope, expected response |
| `AT-ACT-006` | Approve transport cost | Exact quote/currency, authority, policy version |
| `AT-ACT-007` | Resolve release requirement | Required release evidence verified |
| `AT-ACT-008` | Confirm transportation | Versioned complete transport plan |
| `AT-ACT-009` | Monitor pickup | Attributable pickup outcome |
| `AT-ACT-010` | Monitor arrival | Attributable delivery outcome |
| `AT-ACT-011` | Document transport damage | Condition comparison and linked evidence |
| `AT-ACT-012` | Recover failed transport | Authorized replacement plan or disposition |
| `AT-ACT-013` | Prepare receiving handoff | Receiver, hours, location, expected vehicle/property |
| `AT-ACT-014` | Verify no-transport handoff | Physical presence and custody receiver verified |

## 10. Exception reason catalog

| Reason code | Meaning | Default class |
| --- | --- | --- |
| `AT_EX_ACQUISITION_EVIDENCE_MISSING` | Required authoritative acquisition evidence is missing | Data / hard gate |
| `AT_EX_DUPLICATE_OPEN_UNIT` | Another open inventory unit may represent the same cycle | State / hard gate |
| `AT_EX_IDENTITY_CONFLICT` | Vehicle identity sources disagree | Identity / hard gate |
| `AT_EX_LOCATION_UNKNOWN` | Current physical location cannot be verified | Custody / high |
| `AT_EX_DESTINATION_UNDECIDED` | No eligible receiving destination is approved | Operational |
| `AT_EX_RELEASE_BLOCKED` | Vehicle cannot currently be released | External dependency |
| `AT_EX_NOT_ROADWORTHY` | Driving transport is ineligible | Safety / hard gate |
| `AT_EX_COST_AUTHORITY_REQUIRED` | Proposed cost exceeds respondent authority | Financial / approval |
| `AT_EX_NO_ELIGIBLE_PROVIDER` | No currently eligible method/provider is available | Capacity |
| `AT_EX_PICKUP_MISSED` | Confirmed pickup did not occur | Commitment |
| `AT_EX_DELIVERY_DELAYED` | Delivery exceeded or is expected to exceed commitment | Commitment |
| `AT_EX_TRANSPORT_DAMAGE` | New or disputed damage may have occurred in transport | Custody / financial |
| `AT_EX_WRONG_DESTINATION` | Vehicle arrived at an unintended location | Custody / operational |
| `AT_EX_CUSTODY_LOCATION_LOST` | Responsible party or physical location cannot be confirmed | Critical custody |
| `AT_EX_EXTERNAL_DATA_CONFLICT` | Provider and dealership facts disagree | Data/reconciliation |
| `AT_EX_PLAN_CHANGED` | Material transport condition changed after confirmation | Operational review |

Severity is evaluated from current facts and policy; reason code alone does not permanently determine severity.

## 11. Scenario catalog

| Scenario ID | Scenario | Expected controlled outcome |
| --- | --- | --- |
| `AT-SCN-001` | Confirmed purchase; vehicle already at destination | Verify presence and create Receipt handoff without transport tasks |
| `AT-SCN-002` | Auction vehicle; approved carrier confirmed | Create monitored pickup/arrival work and plan evidence |
| `AT-SCN-003` | Seller will deliver | Maintain an internal monitor and escalate missed commitment |
| `AT-SCN-004` | Internal pickup requested; roadworthiness unknown | Suppress drive option; create assessment or offer tow/carrier |
| `AT-SCN-005` | Internal pickup requested; vehicle unsafe | Hard reject drive method; allow eligible non-driving methods |
| `AT-SCN-006` | Quote exceeds staff authority | Preserve quote and route exact approval; no confirmed plan before approval |
| `AT-SCN-007` | Release documents missing | Create release exception with owner/follow-up; suppress dispatch |
| `AT-SCN-008` | Carrier request awaiting response | Create response deadline; present recovery when expired |
| `AT-SCN-009` | Confirmed pickup missed | Correlate one exception; present reschedule/replacement options |
| `AT-SCN-010` | In-transit delay receives revised ETA | Retain original promise and delay duration; update recovery decision |
| `AT-SCN-011` | Delivered with apparent new damage | Preserve condition evidence; create claim/review; hand to receipt with discrepancy |
| `AT-SCN-012` | Delivered to wrong location | Preserve custody, block normal receipt at intended site, create relocation |
| `AT-SCN-013` | Acquisition event received twice | Return existing inventory/workflow idempotently; no duplicate work |
| `AT-SCN-014` | Conflicting VIN from import and photograph | Stop advancement and create restricted identity reconciliation |
| `AT-SCN-015` | Acquisition cancelled before pickup | Cancel eligible work; preserve audit and distinguish transport cancellation from acquisition reversal |
| `AT-SCN-016` | Acquisition reversed while in transit | Escalate controlled custody/return plan; do not delete history |
| `AT-SCN-017` | Destination changes after confirmation | Preview impacts, require authority, supersede plan and deadlines |
| `AT-SCN-018` | Provider API unavailable after local confirmation | Retain accepted local command, label delivery state unknown, retry/reconcile |
| `AT-SCN-019` | Staff lacks permission to approve cost | Hide/deny approval and offer manager request without losing entered evidence |
| `AT-SCN-020` | Two staff answer same decision concurrently | Accept one expected-version command; return recoverable conflict with latest state |
| `AT-SCN-021` | No response before transport planning target | Escalate actionable work without changing status or inventing an outcome |
| `AT-SCN-022` | Vehicle intended for wholesale | Divert before retail workflow work is generated |
| `AT-SCN-023` | Temporary non-VIN asset exception | Require documented identity authority; maintain duplicate controls |
| `AT-SCN-024` | Staff selected wrong method and corrects it before pickup | Supersede decision, cancel affected work safely, preserve history |
| `AT-SCN-025` | Carrier and receiving staff dispute delivery | Create verification exception; do not advance on carrier assertion alone |

## 12. Catalog exit gate

This catalog is ready for the first code slice only when:

- workflow and policy owners approve the trigger boundary;
- real dealership acquisition and transportation roles are mapped;
- approved locations, methods, provider eligibility, and receiving rules are known;
- evidence requirements and classification are approved;
- cost authority, timing, escalation, cancellation, and hard-stop decisions are completed in the Approval Register;
- staff review the questions and options against at least ten representative cases;
- acceptance scenarios map to planned automated and manual verification;
- rollout remains manager-confirmed/manual-start until shadow evidence supports automation.
