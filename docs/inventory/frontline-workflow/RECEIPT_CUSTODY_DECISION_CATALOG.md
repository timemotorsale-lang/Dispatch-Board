# Receipt and Custody Decision and Scenario Catalog

**Status:** Proposed second vertical-slice catalog  
**Catalog ID:** `INV-ITF-RC`  
**Version:** `0.1.0`  
**Activation:** Not approved; documentation only

## 1. Outcome and boundary

This catalog begins when a vehicle is claimed to be physically present at an approved dealership or temporary receiving location. It ends when:

- physical presence, canonical identity, arrival, and internal custody are verified;
- keys, documents, accessories, personal property, condition, damage, and mobility are accounted for;
- the vehicle has a safe, known physical location and accountable internal owner;
- every discrepancy is resolved, contained, or assigned with a next action and review time;
- the vehicle is either handed to Inspection and Triage, held in a controlled exception state, redirected through an authorized recovery path, or closed as an invalid/duplicate receipt attempt.

Receipt does not mean inspection passed, repair scope approved, title ready, or frontline ready. It proves what physically arrived, when, where, in what observed condition, and who accepted responsibility.

## 2. Three distinct receipt facts

The workflow must not collapse these facts into one “Received” checkbox:

1. **Arrival observed:** The vehicle is physically present or an attributable delivery claim exists.
2. **Custody controlled:** An authorized internal owner has accepted or contained physical responsibility at a known location.
3. **Receipt intake complete:** Required identity, property, condition, discrepancy, and handoff gates pass.

A vehicle may be physically present while custody is disputed or intake remains incomplete. The system records physical reality without falsely asserting that all receipt gates passed.

## 3. Relationship to existing inventory records

- The canonical `Vehicle` remains the identity authority.
- The open `InventoryUnit` remains the dealership inventory-cycle authority.
- `VehicleCustodyEvent` remains the attributable location/custody history.
- `InventoryReceipt` remains the receipt evidence record using existing `PLANNED`, `IN_TRANSIT`, `RECEIVED`, `EXCEPTION`, and `CANCELLED` meanings.
- The workflow coordinates decisions and work around those domain facts; it must not create a second receipt or custody source of truth.
- A workflow decision may request a domain command, but only verified domain state may advance the inventory lifecycle from `TRANSPORTATION` to `RECEIVED` and then toward `INSPECTION`.

## 4. Receipt entry triggers

| Trigger ID | Claimed event | Required correlation | Initial response |
| --- | --- | --- | --- |
| `RC-TRG-001` | Transport reports delivery | Transport plan/reference, vehicle/unit, destination, carrier/driver, claimed arrival | Verify physical arrival and receiver |
| `RC-TRG-002` | Authorized receiver confirms arrival | Vehicle/unit candidate, location, observed time, receiver | Begin physical receipt |
| `RC-TRG-003` | No-transport vehicle verified onsite | Acquisition/unit, location observation, observer | Begin physical receipt without transport completion |
| `RC-TRG-004` | Inter-location transfer arrives | Transfer/custody reference, source/destination, vehicle/unit | Begin transfer receipt and reconcile custody |
| `RC-TRG-005` | Unplanned/after-hours vehicle found onsite | Location observation, vehicle identity candidate, reporter | Contain first; reconcile acquisition/transport second |
| `RC-TRG-006` | Existing vehicle requires receipt recovery/backfill | Canonical unit, reason, historical evidence, migration/pilot authority | Create explicitly labeled recovery intake |
| `RC-TRG-007` | External import claims receipt | Provider/source, idempotency key, lineage, claimed receiver/time/location | Reconcile before advancing |

### Trigger rules

| Rule ID | Condition | Required result |
| --- | --- | --- |
| `RC-RULE-001` | Same delivery/receipt trigger is replayed | Return existing receipt/workflow result idempotently |
| `RC-RULE-002` | No open inventory unit or valid recovery authority | Record/contain physical presence if real; create reconciliation; do not invent acquisition |
| `RC-RULE-003` | Receipt already completed for same movement | Show existing result and offer controlled discrepancy/correction path |
| `RC-RULE-004` | Transport claim exists but no physical verification | Keep delivery unverified; create receiver follow-up |
| `RC-RULE-005` | Physical vehicle exists but source records disagree | Preserve physical/custody evidence and open reconciliation |
| `RC-RULE-006` | Vehicle is at wrong location | Record actual custody/location; block intended-location receipt and create recovery |
| `RC-RULE-007` | Existing data is stale, missing, or conflicting | Reduce decision authority and require explicit verification; never fabricate defaults |

## 5. Receipt coordination states

These workflow substates coordinate staff work and must map cleanly to existing domain statuses rather than replacing them:

```text
ARRIVAL_CLAIMED
  -> ARRIVAL_VERIFICATION
  -> IDENTITY_VERIFICATION
  -> CUSTODY_ACCEPTANCE_OR_CONTAINMENT
  -> PROPERTY_AND_CONDITION_INTAKE
  -> DISCREPANCY_REVIEW
  -> RECEIPT_GATE_REVIEW
  -> RECEIPT_COMPLETE
  -> INSPECTION_HANDOFF

Alternate:
  -> AFTER_HOURS_CONTAINMENT
  -> IDENTITY_HOLD
  -> SAFETY_OR_HAZARD_HOLD
  -> CUSTODY_DISPUTE
  -> WRONG_LOCATION_RECOVERY
  -> RETURN_OR_REJECTION_REVIEW
  -> DUPLICATE_OR_INVALID_TRIGGER
```

## 6. Decision-entry contract

Before presenting a receipt question, show:

- expected vehicle identity and confidence;
- inventory number and acquisition type;
- expected source, carrier/driver, destination, ETA, keys, documents, and accessories;
- pre-transport condition evidence and known defects;
- actual current location/source/freshness;
- current workflow/custody owner and open exceptions;
- what the answer will record, release, block, or escalate.

The receiver may report that expected information is wrong without being forced to accept it.

## 7. Arrival and location decisions

### `RC-DEC-001` — Has the vehicle physically arrived?

**Appears when:** A delivery/onsite trigger exists without verified physical presence.  
**Eligible respondents:** Authorized receiver, inventory staff, location manager; system confirmation only from an approved authoritative source.

| Response | Required detail/evidence | Result |
| --- | --- | --- |
| Yes—physically observed | Observed time, location, observer, identity capture requirement | Continue identity verification |
| Delivery claimed; not yet observed | Claim source and expected verification owner/time | Keep unverified; create receiver follow-up |
| No—not present | Search/check evidence and last known source | Reopen/correlate transport exception |
| At a different dealership location | Actual approved location and observer | Record actual custody; create wrong-location recovery |
| At an unapproved/unknown location | Actual/last-known location and risk | Critical location/custody exception |
| Unable to verify | Attempted checks and next resolver | Create verification work |
| Duplicate/previously received | Existing candidate receipt/unit | Reconcile; do not create a duplicate receipt |

An ETA, geofence, carrier message, or elapsed time is not by itself proof of physical arrival unless dealership policy approves that source and still identifies custody acceptance separately.

### `RC-DEC-002` — Is the vehicle at the correct receiving location?

Responses:

- Correct dealership location and approved receiving area;
- correct dealership location but temporary/unapproved area;
- wrong dealership location;
- offsite approved temporary storage;
- location cannot be confirmed;
- vehicle must remain where found for safety/security reasons.

The workflow records actual physical location first. It never changes the fact to the intended destination merely to satisfy the plan.

### `RC-DEC-003` — Is an authorized receiver available?

| Response | Result |
| --- | --- |
| Yes | Assign receipt decision to named receiver |
| No—after-hours procedure available | Start containment checklist and next-business-time intake task |
| No—secure containment unavailable | Escalate location/custody risk; present safe recovery options |
| External party remains with vehicle | Assign internal contact and containment response deadline |
| Unknown who accepted delivery | Create custody verification exception |

## 8. Identity decisions

### `RC-DEC-010` — Does the physical vehicle match the expected identity?

Required observations according to policy:

- physical VIN/chassis identifier;
- stock/inventory reference when present;
- year/make/model/body characteristics as corroborating—not primary—facts;
- license plate or temporary tag when applicable;
- evidence source, capture time, and observer.

| Response | Result |
| --- | --- |
| Exact verified match | Continue custody acceptance |
| VIN unreadable/inaccessible | Secure/contain and assign qualified identity verification |
| VIN differs | Identity hard stop and restricted reconciliation |
| Stock/reference differs but VIN matches | Record operational-reference discrepancy; preserve canonical VIN match |
| Apparent duplicate record | Open duplicate reconciliation; do not merge automatically |
| Non-standard identity approved | Require documented exception authority and alternate identity evidence |
| Suspected alteration/fraud/theft concern | Secure/restrict visibility and invoke approved critical response without accusing reporter |

### `RC-DEC-011` — Is the odometer observation plausible and attributable?

Responses: Captured and consistent; captured but differs from expected; unable to read; display inoperative; unit ambiguity; prior record conflict.

Record the observed value, unit, capture time, source, evidence, and whether it is an observation or corrected authoritative reading. A lower or materially different value creates an odometer discrepancy; it is not silently normalized.

## 9. Custody decisions

### `RC-DEC-020` — Who transferred and accepted custody?

Required:

- custody-from party/source;
- custody-to internal person/location role;
- effective handoff time;
- movement/transport reference where applicable;
- evidence/acknowledgement required by policy;
- exceptions or reservations stated at handoff.

Responses:

- Accepted by authorized receiver;
- physically contained, formal acceptance pending;
- external party left vehicle without handoff;
- custody disputed;
- receiver identity unknown;
- delivery refused/return requested;
- emergency/safety containment only.

Physical possession must still be recorded when a vehicle is left onsite. “Refused” does not erase custody, condition, or security responsibility already created by physical circumstances.

### `RC-DEC-021` — Is the vehicle secured?

Check:

- keys controlled;
- doors/windows/roof secured where possible;
- vehicle immobilized appropriately;
- sensitive documents/property secured;
- location is approved and attributable;
- EV/high-voltage, fuel leak, fire, biohazard, severe damage, or other special conditions contained;
- access restriction and next review defined.

Responses: Secured normally; secured under exception; specialist containment required; unable to secure; security status unknown.

### `RC-DEC-022` — Can custody be accepted for normal intake?

| Response | Result |
| --- | --- |
| Yes | Continue property and condition intake |
| Yes, with discrepancies | Continue while opening owned discrepancies |
| Containment only | Block normal handoff; create resolution plan |
| Return/rejection proposed | Route to authorized return/rejection review; preserve physical custody facts |
| No—identity/safety/legal hard stop | Restrict movement and escalate according to policy |

## 10. Keys, documents, accessories, and property

### `RC-DEC-030` — What keys and access devices were received?

Capture expected and received quantities/types:

- primary keys;
- spare keys;
- remote/fob/smart cards;
- wheel-lock key;
- charging adapters/cards;
- alarm/aftermarket remotes;
- lockbox/source key reference.

Responses: Complete; fewer than expected; more/different than expected; none; count unknown; device not working. Missing or nonfunctional items create a valued discrepancy with an owner and disposition.

### `RC-DEC-031` — Which physical documents were received?

Document types are policy/configuration-driven and may include:

- title/ownership documents;
- odometer disclosure;
- release/bill of sale/auction paperwork;
- temporary registration/tag documents;
- service/history records;
- manuals and warranty materials;
- transport/bill-of-lading documents;
- disclosure or damage records.

For each: expected, received, condition, source, classification, storage location, evidence reference, and discrepancy. Receipt records physical possession only; it does not declare legal/title sufficiency, which belongs to Title/Document Readiness.

### `RC-DEC-032` — Which expected accessories/equipment were received?

Examples based on vehicle/source policy:

- floor mats, cargo cover, headrests;
- spare tire/inflator/jack/tools;
- charging cable/adapters;
- removable roof/body components;
- second-row/third-row equipment;
- navigation/media accessories;
- dealer-installed or acquisition-promised equipment.

Responses: Complete; item missing; wrong item; damaged; not applicable; expectation unknown. Each discrepancy needs an owner, recovery/valuation decision, and target.

### `RC-DEC-033` — Is personal, sensitive, hazardous, or prohibited property present?

Staff select a controlled category without putting sensitive detail in general task titles:

- ordinary personal property;
- identity/financial documents;
- medication;
- weapon or suspected prohibited item;
- hazardous/biological material;
- unknown suspicious material;
- no property observed;
- inspection unsafe/not permitted.

The system presents only approved containment, restricted notification, chain-of-custody, and external-response procedures for that category. Staff are not asked to improvise handling.

## 11. Condition and damage decisions

### `RC-DEC-040` — Is required arrival-condition evidence complete?

Policy may require:

- all exterior sides and corners;
- glass, wheels/tires, roof, underbody where safe;
- interior overview;
- instrument cluster/odometer/warning lights;
- keys/accessories/documents;
- notable existing/new damage;
- pre-transport comparison references.

Responses: Complete; partially complete; cannot capture safely; equipment/network failure; evidence rejected/unclear; not required by approved policy.

Incomplete evidence creates a task or exception. The workflow must distinguish a temporarily pending upload from missing evidence.

### `RC-DEC-041` — Does arrival condition match expected/pre-transport condition?

| Response | Result |
| --- | --- |
| Matches within documented baseline | Continue intake |
| Apparent new transport damage | Open correlated transport-damage exception and preserve comparison evidence |
| Previously undisclosed/pre-existing damage | Open acquisition/condition discrepancy |
| Damage source uncertain | Open verification without assigning blame |
| No usable baseline | Record data limitation and require condition documentation |
| Cannot inspect safely | Enter containment/safety path |

### `RC-DEC-042` — Classify observed damage or condition discrepancy

Capture:

- affected area/component;
- observed severity and immediate safety/mobility impact;
- source classification: apparent new, expected/pre-existing, uncertain;
- evidence and observer;
- carrier/seller/source acknowledgement if available;
- containment action;
- estimate/claim/recon follow-up requirement;
- responsible internal resolver and target.

Staff record observations, not unsupported cause, liability, fraud, or repair conclusions.

## 12. Safety, mobility, and containment decisions

### `RC-DEC-050` — Can the vehicle be safely started or moved for intake?

Options:

- Verified eligible for limited onsite movement;
- movement requires qualified staff;
- tow/dolly/special equipment required;
- do not start or move;
- mobility unknown;
- vehicle will not start;
- keys/access unavailable;
- condition changed after prior transport assessment.

Eligibility may consider obvious leaks, tire/wheel condition, collision damage, warning indicators, steering/braking, high-voltage/EV condition, fire/water exposure, vehicle stability, and applicable policy. This is an intake movement assessment, not the formal inspection or roadworthiness certification.

### `RC-DEC-051` — Is an immediate safety, security, environmental, or hazard response required?

Controlled categories:

- active fuel/fluid leak;
- smoke, heat, fire, high-voltage/EV battery concern;
- severe collision/structural instability;
- biohazard/pest/contamination;
- sharp/broken glass or unsafe cabin;
- airbag/pyrotechnic risk;
- theft/identity/security concern;
- hazardous or prohibited property;
- severe weather/exposure risk;
- none observed;
- unable to assess safely.

Non-normal results create a hard containment gate, restricted instructions appropriate to staff capability, specialist/emergency escalation where policy requires, and a verification requirement before release.

### `RC-DEC-052` — Where should the vehicle be placed?

Only eligible locations are offered:

- receiving/intake lane;
- secure holding area;
- inspection queue/area;
- tow/drop area;
- quarantine/restricted area;
- covered/storage area;
- approved temporary location;
- relocation required because no eligible space exists.

Assignment considers vehicle condition, location capacity, security, accessibility, charger/containment needs, business hours, and downstream inspection readiness. The final placement creates an attributable custody/location event.

## 13. Discrepancy and resolution decisions

### `RC-DEC-060` — Review receipt discrepancies

The review consolidates, rather than duplicates, issues across:

- identity/VIN/stock reference;
- location/destination;
- custody/receiver;
- mileage;
- keys/access devices;
- physical documents;
- accessories/equipment;
- personal/hazardous property;
- condition/damage;
- mobility/safety;
- transport plan/delivery evidence;
- external source conflicts.

Each discrepancy receives a structured reason, materiality, hard-gate flag, resolver, next action, due/review time, evidence, and downstream effect.

### `RC-DEC-061` — Choose discrepancy disposition

Eligible options depend on the discrepancy:

- accept observed fact and correct an operational reference;
- request missing item/document from source;
- create carrier/seller/auction claim or review;
- value missing/damaged property for acquisition/recon review;
- relocate or secure vehicle;
- obtain qualified identity/safety verification;
- return to acquisition/transport recovery;
- propose return/rejection/disposition review;
- accept bounded noncritical risk with authority and expiry;
- confirm false positive or correlate duplicate exception.

Non-waivable identity, safety, legal, or mandatory custody evidence cannot use general risk acceptance.

### `RC-DEC-062` — Correct a receipt fact

Corrections require:

1. exact fact/evidence being corrected;
2. prior value and proposed value;
3. correction reason and authority;
4. superseding evidence where required;
5. impact on custody, tasks, exceptions, lifecycle, and downstream decisions;
6. immutable correction event—never deletion or silent overwrite.

## 14. Receipt completion and handoff

### `RC-DEC-070` — Is Receipt and Custody complete?

The gate evaluates exact conditions:

- physical arrival verified;
- correct actual location recorded;
- physical identity verified or approved non-standard identity path complete;
- attributable odometer observation or owned exception;
- custody-from, custody-to, and effective time recorded;
- vehicle secured at an eligible location;
- keys/access devices accounted for;
- physical documents inventoried without overstating title sufficiency;
- accessories/property accounted for;
- required condition evidence accepted;
- damage and safety observations classified;
- critical containment gates passed;
- every permitted unresolved discrepancy has an owner, next action, and review time;
- receipt record, custody event, workflow event, audit, and downstream handoff can commit consistently.

Gate outputs:

- `PASS_RECEIPT_COMPLETE`;
- `PASS_WITH_OWNED_NONCRITICAL_EXCEPTIONS`;
- `FAIL_IDENTITY`;
- `FAIL_CUSTODY`;
- `FAIL_SAFETY_OR_HAZARD`;
- `FAIL_MANDATORY_EVIDENCE`;
- `FAIL_LOCATION_OR_SECURITY`;
- `FAIL_UNOWNED_DISCREPANCY`;
- `FAIL_DATA_CONFLICT`;
- `FAIL_PERMISSION_OR_CONCURRENCY`.

### `RC-DEC-071` — Assign Inspection and Triage handoff

Required:

- eligible inspection workflow/type based on vehicle class/source/risk;
- accountable inspection owner or qualified queue;
- target and class-of-service reason;
- physical location and movement eligibility;
- known safety, condition, damage, document, and property exceptions;
- required evidence references;
- dependencies preventing immediate inspection;
- explicit statement that receipt completion is not inspection approval.

If no eligible inspector, safe location, or required resource exists, Receipt may remain complete while the inspection handoff becomes an owned waiting/capacity exception. The vehicle must not disappear into an unowned queue.

## 15. Action catalog

| Action ID | Action | Completion evidence |
| --- | --- | --- |
| `RC-ACT-001` | Verify physical arrival | Attributable observer/time/location |
| `RC-ACT-002` | Verify physical identity | Accepted VIN/alternate identity evidence |
| `RC-ACT-003` | Record odometer observation | Value/unit/time/source/evidence or owned exception |
| `RC-ACT-004` | Accept or contain custody | Custody-from/to/time/location and acknowledgement |
| `RC-ACT-005` | Secure vehicle | Eligible placement and custody/location event |
| `RC-ACT-006` | Inventory keys/access devices | Expected/received count, type, condition, discrepancy |
| `RC-ACT-007` | Inventory physical documents | Document possession/status/storage references |
| `RC-ACT-008` | Inventory accessories/property | Expected/received disposition and restricted handling where applicable |
| `RC-ACT-009` | Capture arrival condition | Policy-complete evidence package |
| `RC-ACT-010` | Document damage/discrepancy | Observation, evidence, materiality, resolver |
| `RC-ACT-011` | Assess limited intake mobility | Eligibility/containment outcome and source |
| `RC-ACT-012` | Resolve/own receipt discrepancy | Verified resolution or controlled owned exception |
| `RC-ACT-013` | Complete receipt gate | Versioned gate result and domain events |
| `RC-ACT-014` | Handoff to Inspection and Triage | Owner/queue, target, context, dependencies, evidence |
| `RC-ACT-015` | Correct receipt evidence | Superseding evidence and immutable correction event |

## 16. Evidence catalog

| Evidence ID | Evidence | Required when | Proposed criticality |
| --- | --- | --- | --- |
| `RC-EVD-001` | Physical arrival observation | Every receipt | Mandatory hard gate |
| `RC-EVD-002` | Physical VIN/identity capture | Every receipt unless fresh approved evidence policy permits reuse | Mandatory hard gate |
| `RC-EVD-003` | Arrival time and actual location | Every receipt | Mandatory hard gate |
| `RC-EVD-004` | Odometer observation | Every applicable vehicle | Mandatory or owned exception |
| `RC-EVD-005` | Custody transfer/containment record | Every receipt | Mandatory hard gate |
| `RC-EVD-006` | Keys/access-device inventory | Every receipt | Mandatory inventory; discrepancy may remain owned |
| `RC-EVD-007` | Physical-document inventory | Every applicable acquisition type | Mandatory inventory, not title-readiness proof |
| `RC-EVD-008` | Accessory/equipment inventory | When source/vehicle policy defines expected property | Conditional |
| `RC-EVD-009` | Arrival-condition media/checklist | According to source/method/risk policy | Mandatory where configured |
| `RC-EVD-010` | Pre/post condition comparison | Transport or prior condition evidence exists | Mandatory for damage dispute |
| `RC-EVD-011` | Safety/hazard observation | Non-normal or unable-to-assess condition | Mandatory exception evidence |
| `RC-EVD-012` | Secure placement/location evidence | Every completed custody acceptance | Mandatory hard gate |
| `RC-EVD-013` | Personal/hazardous property custody record | Such property is present/suspected | Restricted mandatory evidence |
| `RC-EVD-014` | Discrepancy disposition/authority | Any material discrepancy | Mandatory before closure/controlled carry-forward |
| `RC-EVD-015` | Receipt gate snapshot | Every completed receipt | Mandatory immutable/versioned output |
| `RC-EVD-016` | Inspection handoff snapshot | Every handoff | Mandatory |

## 17. Exception reason catalog

| Reason code | Meaning | Default control class |
| --- | --- | --- |
| `RC_EX_ARRIVAL_UNVERIFIED` | Delivery claimed but physical presence is not verified | Custody/data hard gate |
| `RC_EX_WRONG_LOCATION` | Vehicle is physically at an unintended location | Custody/operational |
| `RC_EX_NO_AUTHORIZED_RECEIVER` | No authorized receiver is available | Custody/operational |
| `RC_EX_IDENTITY_MISMATCH` | Physical identity differs from expected vehicle | Identity hard gate |
| `RC_EX_IDENTITY_UNREADABLE` | Physical identity cannot be captured/verified | Identity hard gate |
| `RC_EX_ODOMETER_DISCREPANCY` | Observed mileage conflicts or cannot be established | Data/compliance review |
| `RC_EX_CUSTODY_DISPUTED` | Transfer/acceptance responsibility is disputed | Custody hard gate |
| `RC_EX_UNSECURED_VEHICLE` | Vehicle cannot be placed in a secure eligible location | Safety/security hard gate |
| `RC_EX_KEYS_MISSING` | Expected keys/access devices are absent or nonfunctional | Property/financial |
| `RC_EX_DOCUMENTS_MISSING` | Expected physical documents are absent | Evidence/title dependency |
| `RC_EX_ACCESSORY_MISSING` | Expected accessory/equipment is absent/damaged/wrong | Property/financial |
| `RC_EX_PERSONAL_PROPERTY` | Personal or sensitive property requires controlled handling | Privacy/custody |
| `RC_EX_HAZARDOUS_PROPERTY` | Hazardous/prohibited/unknown material requires restricted response | Safety/legal hard gate |
| `RC_EX_CONDITION_EVIDENCE_MISSING` | Required arrival evidence is absent/rejected | Evidence hard/review gate |
| `RC_EX_NEW_DAMAGE` | Apparent new damage exists | Condition/financial |
| `RC_EX_DAMAGE_DISPUTED` | Damage timing/source is disputed or uncertain | Condition/custody |
| `RC_EX_UNSAFE_TO_MOVE` | Vehicle cannot be safely moved for intake | Safety hard gate |
| `RC_EX_HAZARD_CONTAINMENT` | Immediate safety/environmental containment is required | Critical hard gate |
| `RC_EX_RECEIPT_DUPLICATE` | Receipt may already exist for the same movement | State/data hard gate |
| `RC_EX_EXTERNAL_DATA_CONFLICT` | Provider/source facts conflict with physical observation | Data/reconciliation |
| `RC_EX_INSPECTION_CAPACITY` | Receipt complete but no eligible inspection resource is available | Capacity/waiting |

Severity is evaluated from current evidence, time-to-harm, scope, and policy. The reporter is not presumed responsible for the condition reported.

## 18. Scenario catalog

| Scenario ID | Scenario | Expected controlled outcome |
| --- | --- | --- |
| `RC-SCN-001` | Normal daytime delivery with complete property/evidence | Complete receipt once and hand to eligible inspection owner |
| `RC-SCN-002` | Vehicle already onsite; no transportation required | Verify physical/custody facts and complete receipt without transport fiction |
| `RC-SCN-003` | Carrier marks delivered but vehicle is not found | Keep arrival unverified; correlate transport/custody exception |
| `RC-SCN-004` | After-hours unattended drop in secure approved area | Record physical presence/containment; schedule accountable full intake |
| `RC-SCN-005` | After-hours drop with no secure space | Escalate custody/security response; do not claim normal receipt complete |
| `RC-SCN-006` | Delivered to wrong dealership location | Record actual custody/location; create relocation; block intended-site receipt |
| `RC-SCN-007` | VIN mismatch | Hard stop, secure vehicle, restricted identity reconciliation |
| `RC-SCN-008` | VIN matches but stock number differs | Preserve identity, open operational-reference correction |
| `RC-SCN-009` | VIN unreadable/inaccessible | Contain and assign qualified verification; no lifecycle advancement |
| `RC-SCN-010` | Duplicate receipt attempt/replayed webhook | Return existing result; no duplicate receipt, custody event, tasks, or alerts |
| `RC-SCN-011` | Odometer materially differs or is lower than prior | Preserve observation and open discrepancy; no silent correction |
| `RC-SCN-012` | No keys received | Record custody, secure accordingly, create owned key/recovery exception |
| `RC-SCN-013` | One of two expected keys missing | Complete permitted intake with valued owned discrepancy if policy allows |
| `RC-SCN-014` | Title/release paperwork missing | Record physical absence; create title/document dependency without claiming title failure conclusion |
| `RC-SCN-015` | Charging cable or promised accessory missing | Create accessory discrepancy and acquisition/recovery decision |
| `RC-SCN-016` | Personal financial documents found | Use restricted property chain of custody; exclude sensitive details from general tasks |
| `RC-SCN-017` | Weapon, hazardous, or unknown suspicious material found | Present only approved restricted safety/legal response; pause normal intake |
| `RC-SCN-018` | Apparent new transport damage | Preserve pre/post evidence and correlated carrier review; no unsupported blame |
| `RC-SCN-019` | Damage exists but no baseline evidence | Record limitation, condition, and resolver; do not assert cause |
| `RC-SCN-020` | Vehicle will not start | Record custody; use eligible placement/recovery; create inspection/recon context |
| `RC-SCN-021` | Active leak/EV battery/fire concern | Hard containment gate and qualified/emergency response per policy |
| `RC-SCN-022` | Vehicle safe only for qualified movement | Suppress general staff movement; assign eligible resource/equipment |
| `RC-SCN-023` | No eligible inspection capacity after complete receipt | Complete receipt, create owned waiting handoff, preserve safe location/clock |
| `RC-SCN-024` | Carrier and receiver dispute damage/custody time | Preserve both claims and physical evidence; create verification exception |
| `RC-SCN-025` | Vehicle left onsite without formal handoff | Record physical custody reality and secure; create custody/source resolution |
| `RC-SCN-026` | Receiver proposes refusing/returning vehicle | Preserve possession and evidence; route authorized return/rejection decision |
| `RC-SCN-027` | Staff corrects key count or mileage after completion | Supersede evidence with reason/authority; preserve original receipt history |
| `RC-SCN-028` | Two receivers complete intake concurrently | One expected-version command succeeds; other receives recoverable latest state |
| `RC-SCN-029` | Evidence upload fails during receipt | Preserve decision draft/local accepted metadata; show pending/failed upload; do not pass evidence gate |
| `RC-SCN-030` | External system is unavailable | Operate through approved degraded capture, label reconciliation pending, replay safely |
| `RC-SCN-031` | Unauthorized user attempts receipt/correction | Server denies command; captured proposal can be handed to authorized receiver safely |
| `RC-SCN-032` | Existing inventory recovery/backfill | Clearly label historical/recovered facts and confidence; do not imply contemporaneous observation |
| `RC-SCN-033` | Non-standard vehicle identity is approved | Require exception authority and alternate identity evidence; retain duplicate safeguards |
| `RC-SCN-034` | Vehicle arrives with severe weather exposure risk | Contain promptly; allow minimum safe custody actions before full intake |
| `RC-SCN-035` | Inspection begins before receipt is completed | Reject/hold transition unless approved emergency containment workflow applies |

## 19. Catalog exit gate

This catalog is ready for code only when:

- policy owners approve the distinction among arrival, custody, and receipt completion;
- real receiving roles, location scope, hours, and after-hours procedures are mapped;
- physical identity, odometer, custody, condition, key, document, accessory, property, and placement evidence requirements are approved;
- safe-movement and hazard-containment boundaries are approved by qualified authority;
- secure, restricted, quarantine, temporary, and inspection locations are defined;
- discrepancy materiality, carry-forward, correction, return/rejection, and escalation authority are approved;
- staff walk through at least ten representative receipt cases, including after-hours, mismatch, damage, missing property, safety, duplicate, and degraded-system cases;
- acceptance scenarios map to planned automated/manual evidence;
- no workflow behavior is activated merely because this planning catalog exists.
