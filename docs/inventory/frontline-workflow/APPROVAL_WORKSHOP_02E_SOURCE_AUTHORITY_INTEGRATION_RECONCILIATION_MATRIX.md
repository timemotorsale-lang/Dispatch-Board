# Approval Workshop 02E - Source Authority, Integration, Freshness, and Reconciliation Matrix

**Workshop status:** Decision-ready planning draft; not conducted  
**Decision state:** All decisions remain `OPEN` until authorized sign-off  
**Covers:** `ITF-APR-060`-`065`; completes the Workshop 2 planning packets  
**Program:** Inventory-to-Frontline  
**Pilot scope:** Time Motor Sales - Minneapolis, subject to Workshop 1 approval  
**Prepared:** 2026-07-16  

## 1. Workshop outcome

This packet completes the Workshop 2 planning set by defining which source may establish each critical workflow fact, how external identities and statuses map into the canonical vehicle record, how freshness and conflict are evaluated, how integrations exchange commands and events safely, and how the dealership operates and reconciles during provider delay, outage, duplicate delivery, partial success, or manual fallback.

This packet does not:

- approve or claim the existence of any DMS, accounting, carrier, auction, title, VIN, vehicle-history, valuation, parts, website, marketplace, messaging, or payment integration;
- make an external provider authoritative merely because it returns data or accepts a request;
- create a second vehicle, inventory unit, lifecycle, task, evidence, approval, or audit system;
- authorize autonomous acquisition, accounting posting, payment, pricing, publication, title adjudication, transport commitment, or frontline release;
- permit high-impact conflicts to use silent last-write-wins;
- treat cached, derived, manually copied, or stale data as current without visible qualification;
- seed provider mappings, freshness periods, precedence, credentials, endpoints, retries, or manual fallback as production defaults.

Required output:

- approved source classifications and field-level authority matrix;
- approved acquisition-system authority by field;
- approved canonical vehicle identity and VIN verification sources;
- approved location and custody authority rules;
- approved carrier/provider request, acknowledgement, confirmation, tracking, pickup, arrival, cancellation, and failure mappings;
- approved DMS, accounting, and website/channel boundaries;
- approved freshness, staleness, conflict, degraded-operation, manual fallback, and reconciliation rules;
- named source, integration, reconciliation, security, and manual-fallback owners;
- safe behavior whenever a current authoritative fact cannot be proven.

## 2. Source-authority principles

1. **Authority is field- and purpose-specific:** no system is automatically authoritative for every fact it contains.
2. **One canonical vehicle identity:** external records map to the canonical vehicle/inventory cycle; they do not create independent operational truth.
3. **Raw and normalized identity are preserved:** retain original source values, normalized values, source, time, validation, and correction lineage.
4. **Observation is not adjudication:** a staff observation can establish current physical facts within scope but cannot silently resolve a material identity/title/source conflict.
5. **Delivery is not authority:** an integration transports facts/commands; it does not own the business decision unless policy explicitly assigns field authority.
6. **Acknowledgement is not completion:** provider received/accepted/processing/live/completed states remain distinct.
7. **Desired and observed state are separate:** requested internal state is reconciled against authoritative observed external/physical state.
8. **Freshness is explicit:** every material fact has source time, received time, as-of time, validity, and stale/unknown behavior.
9. **Conflicts are controlled:** high-impact facts create owned reconciliation; no silent last-write-wins or favorable-source selection.
10. **Commands are idempotent:** retries cannot duplicate acquisition starts, transport commitments, orders, postings, publications, releases, or notifications.
11. **Events are replayable:** duplicate/out-of-order delivery cannot corrupt current canonical state, and history remains reconstructable.
12. **Manual fallback is governed:** fallback uses the same authority/evidence/audit rules and cannot become an invisible shadow system.
13. **Degraded operation is honest:** stale, partial, unknown, queued, failed, and reconciliation-required states remain visible.
14. **External failure cannot corrupt canonical truth:** adapters fail around the core record rather than mutating it deceptively.
15. **Integration activation is separate:** documentation and adapter existence do not authorize live reads, writes, publication, or accounting effects.

## 3. Source classification vocabulary

| Classification | Meaning | Example | Control boundary |
| --- | --- | --- | --- |
| `CANONICAL_INTERNAL` | Approved internal aggregate owns the current operational fact/history | Canonical vehicle ID, workflow/cycle, accepted custody handoff | Must be changed through governed commands/events |
| `AUTHORITATIVE_EXTERNAL` | Approved external source owns a specific fact/field for a purpose | Agency/provider status where contract/policy assigns authority | Mapping, freshness, identity, evidence, and reconciliation still required |
| `AUTHORITATIVE_OBSERVATION` | Eligible person directly establishes an approved physical fact | Observed VIN, location, condition, keys/custody | Scope/qualification/time/evidence limits apply |
| `VERIFIED_REFERENCE` | Approved source supports verification but does not alone own the operational state | VIN decoder/history/insurance eligibility result | Cannot silently override canonical/physical truth |
| `DERIVED` | Reproducible projection/calculation from disclosed sources | Margin forecast, readiness projection, KPI | Invalidates with sources; never outranks them |
| `ADVISORY` | Recommendation/context with provenance | Market value, ETA prediction, AI extraction | Human/policy decision required for consequential use |
| `DELIVERY` | Transports a request/event/status without owning the business fact | Webhook, message bus, connector | Receipt/delivery does not prove outcome |
| `MIRROR_OR_PROJECTION` | Read model/cache optimized for use | Search index, dashboard projection | Displays freshness; not directly edited as authority |
| `MANUAL_ATTESTATION` | Approved person records a fact when direct/system source is unavailable | Phone-confirmed carrier status | Requires source, time, evidence, expiry, and reconciliation |
| `PLANNED` | No approved source/integration exists yet | Future DMS/accounting/title adapter | Cannot satisfy a live hard gate |
| `UNKNOWN_OR_CONFLICTING` | Authority, identity, freshness, or agreement is unresolved | Two VINs/locations/provider outcomes | Hold affected reliance and assign reconciliation |

Administration governs configuration but does not become authoritative for every domain fact. Analytics and UI do not own the facts they display.

## 4. Source registration contract

Every source must be registered before live reliance:

| Field | Required definition |
| --- | --- |
| Source ID/name/type | Stable internal identifier and provider/system identity |
| Owner and backup | Business owner, technical/integration owner, reconciliation owner |
| Organization/location | Approved operating scope |
| Environment/account | Exact production/test account or manual process boundary |
| Field authority | Fields/facts/purposes the source may establish |
| Prohibited authority | Facts/decisions it must never establish |
| External identity keys | Provider IDs, account, VIN/stock/reference mappings |
| Mapping/version | Status, field, unit, timezone, code, and semantic mapping |
| Occurrence/as-of semantics | Which timestamp means what |
| Freshness/expiry | Expected cadence, stale/expired thresholds, invalidation events |
| Read/write direction | Inbound, outbound, bidirectional with field ownership |
| Command behavior | Idempotency, acknowledgement, confirmation, cancellation, reversal |
| Conflict precedence | Approved comparison and qualified resolution path |
| Security/privacy | Authentication, secrets, data classes, minimum scope, provider handling |
| Reliability | Timeouts, retry/backoff, rate limit, circuit breaker, maintenance |
| Degraded/manual fallback | Permitted actions, evidence, owner, reconciliation obligation |
| Audit/retention | Raw payload/reference, transformation, decision, access, retention |
| Activation/review | Approval, independent publication, effective/expiry/review dates |

An unregistered, disabled, expired, misconfigured, or unhealthy source may be displayed as advisory only if policy permits; it cannot satisfy a hard gate.

## 5. Field-source authority contract

Every material field mapping defines:

- canonical field and business meaning;
- authoritative source(s) and exact purpose;
- alternate/verified-reference sources;
- source field, type, format, unit, timezone, code, and null semantics;
- identity join/mapping and confidence;
- occurred/effective/as-of/received/processed timestamps;
- normalization/transformation and version;
- freshness and invalidation;
- conflict comparison and materiality;
- correction/supersession authority;
- downstream dependencies and invalidation effect;
- manual fallback and reconciliation owner;
- access/classification/retention.

Null, blank, zero, default, “unknown,” “not applicable,” deleted, and absent must have distinct approved semantics where material.

## 6. Acquisition source authority by field (`ITF-APR-060`)

The actual dealership acquisition systems/sources remain `TBD`. Workshop participants must complete this matrix for every included pilot source: onsite trade-in, known seller/dealer purchase, auction purchase, and already-onsite/no-movement case.

| Acquisition field/fact | Proposed authority direction | Required comparison/evidence | Safe unresolved behavior |
| --- | --- | --- | --- |
| Source/acquisition record ID | Approved originating acquisition source | External identity map and immutable source reference | Do not start workflow |
| Organization/location | Approved acquisition context plus dealership organization/location registry | Eligibility and location mapping | Reject/hold pilot start |
| Acquisition type/source type | Approved acquisition source; human correction only through authority | Contract/source evidence | Hold route selection |
| Acquisition accepted/confirmed event | Exact approved acquisition authority/system event | Actor/authority, occurred time, status/version | Do not treat draft/bid as acquired |
| Acquired/accepted time | Source event occurred time with received-time lineage | Event evidence and timezone | Mark unknown/conflict; do not invent age |
| VIN/raw identity | Source raw value plus canonical verification process | Raw/normalized VIN and identity evidence | Temporary identity only if separately approved; otherwise hold |
| Year/make/model/trim | Verified identity/reference source by field; observed facts may supplement | VIN decode/source comparison and correction | Mark unverified; no public reliance |
| Seller/transferor identity | Approved acquisition/office source | Minimum necessary protected evidence | Restrict; hold authority/document steps if missing |
| Acquisition authority | Structured approved authority/record | Approval/evidence and scope | Hard stop |
| Acquisition consideration/principal | Approved financial/acquisition source for workflow economics | Currency, amount, version, correction lineage | Economics unavailable; no accounting inference |
| Fees/taxes/auction charges | Approved acquisition/accounting source by state | Gross components and status | Mark incomplete; re-evaluate exposure |
| Intended inventory route | Authorized Inventory/Operations command | Source context, rationale, policy | Hold workflow route |
| Current reported location | Source-reported fact until physical/custody authority verifies | As-of/source and observation | Do not dispatch movement |
| Release/pickup requirements | Seller/auction/custodian source with internal verification | Reference, expiry, identity/custody match | No pickup |
| Expected keys/documents/accessories | Acquisition record/contract plus receiving verification | Source list and receipt comparison | Carry as expected, not received fact |
| Disclosures/condition claims | Source-provided claims as evidence, not accepted physical truth | Provenance and inspection/receipt comparison | Label unverified; preserve restrictions |

### Acquisition event rules

- bid, appraisal, offer, negotiation, draft deal, pending approval, provider “won,” and accepted acquisition are distinct;
- one source event starts at most one inventory workflow/cycle through an idempotency key and source reference;
- corrected/reversed source events create attributable commands and do not delete the original start/history;
- a late event may not silently backdate ownership/custody or rewrite clock history;
- external consideration/cost does not imply accounting posting or payment;
- source deletion does not automatically delete the canonical vehicle/workflow record.

## 7. Canonical vehicle identity and VIN verification (`ITF-APR-061`)

The canonical `Vehicle` and its inventory cycle remain the internal identity anchor. External records use an identity map; no adapter creates a parallel vehicle solely because an external ID differs.

### Identity record requirements

- internal canonical vehicle ID;
- inventory cycle ID and organization/location scope;
- raw VIN input(s), normalized VIN, and applicability (including nonstandard/missing cases);
- VIN verification method/source, actor/system, time, result, and evidence;
- external system/account/entity IDs and mapping status;
- year/make/model/trim/reference facts with field source/freshness;
- duplicate candidates, merge/link prohibitions, conflicts, and resolution history;
- temporary identity authority, expiry, restrictions, and conversion path where approved;
- correction/supersession without historical deletion.

### Identity states

| State | Meaning | Allowed direction |
| --- | --- | --- |
| `UNVERIFIED` | Candidate identity exists without accepted verification | Restricted preparation only |
| `VERIFIED_CANONICAL` | Eligible process accepts canonical identity for scope | Normal eligible progression |
| `TEMPORARY_RESTRICTED` | Approved temporary identity for bounded containment/preparation | No movement/publication/release unless separately allowed |
| `CONFLICTING` | Relevant sources/observations disagree materially | Quarantine/hold and independent review |
| `DUPLICATE_CANDIDATE` | Possible existing canonical vehicle/cycle | Prevent duplicate start; resolve link/cycle |
| `SUPERSEDED_CORRECTED` | Prior identity fact replaced through controlled correction | Preserve lineage and re-evaluate dependencies |

### VIN verification source policy

Must define:

- who may physically observe and record VIN and which locations/labels are required;
- approved decoder/reference sources and their field authority;
- check-digit/format rules and non-applicable vehicle cases;
- conflict materiality and independent resolution authority;
- duplicate detection across active/historical inventory cycles;
- salvage/rebuilt/flood/nonstandard/specialty routing without treating decoder output as title adjudication;
- evidence freshness/invalidation after correction, tampering concern, or physical mismatch;
- downstream invalidation for acquisition, title, parts/fitment, content, channel, price, and release.

## 8. Location and custody source authority (`ITF-APR-062`)

Location and custody are related but distinct:

- **reported location** — a source/provider says where the vehicle is;
- **observed location** — eligible person/system directly observes it at a time;
- **planned destination** — approved intended location;
- **in-transit state** — verified departure plus active movement, not merely a plan;
- **custody owner** — party/internal role currently responsible for physical control;
- **storage/placement** — exact approved physical area/bay/lot/secure location;
- **key/document/property custody** — may differ from vehicle custody.

### Proposed authority order by fact

| Fact | Proposed authority direction | Conflict behavior |
| --- | --- | --- |
| Planned destination | Authorized internal transport/destination command | Changed plan requires authority/reapproval |
| Pre-pickup reported location | Approved seller/auction/custodian source, internally monitored | Stale/conflict prevents dispatch |
| Pickup/departure | Attributable provider/driver evidence reconciled by transport monitor | Unknown/duplicate/conflict holds `IN_TRANSIT` claim |
| In-transit position/ETA | Provider tracking as reported/advisory unless approved otherwise | Display source/as-of; stale becomes unknown |
| Physical arrival location | Eligible receiver observation/evidence | Provider delivery status cannot override mismatch |
| Accepted vehicle custody | Internal Receiving/Custody command | Requires identity/property/condition/placement rules |
| Secure storage/placement | Eligible internal lot/custody observation | Correct through controlled movement/observation |
| Keys/documents/accessories | Item-level custody records and receiving observations | Maintain discrepancy/claim; not inferred from vehicle arrival |

No source may claim both location and custody merely from GPS, geofence, provider acknowledgement, appointment, invoice, or planned destination.

## 9. Carrier/provider confirmation and tracking (`ITF-APR-063`)

### Provider state model

| Provider/external state | Internal meaning | Must not imply |
| --- | --- | --- |
| `REQUEST_PREPARED` | Internal request exists | Sent or accepted |
| `REQUEST_SENT` | Delivery adapter/provider accepted request transmission | Provider commitment |
| `ACKNOWLEDGED` | Provider recognized/received request | Confirmed price, schedule, pickup, or completion |
| `QUOTED` | Provider supplied exact quoted terms/version | Approval or commitment |
| `CONFIRMED` | Approved mapping/evidence proves provider accepted exact movement terms | Pickup/departure |
| `ASSIGNED` | Provider reports resource/driver assignment | Driver eligibility or physical custody |
| `PICKUP_REPORTED` | Provider claims pickup | Verified departure/in-transit until reconciled |
| `IN_TRANSIT_REPORTED` | Provider reports movement/location | Current physical truth if stale/unverified |
| `DELAYED_OR_EXCEPTION` | Provider reports variance/problem | Cause resolution or revised commitment by itself |
| `DELIVERY_REPORTED` | Provider claims delivery | Arrival evidence, receipt, custody acceptance |
| `CANCEL_REQUESTED` | Internal/provider cancellation request exists | Cancellation accepted/effective |
| `CANCEL_CONFIRMED` | Provider confirms cancellation under mapped terms | No incurred cost or acquisition reversal |
| `FAILED_OR_UNKNOWN` | Outcome not reliable/current | Safe success or automatic retry |

### Tracking/source contract

Approve for each provider:

- account/provider identity and eligible services/methods;
- request, quote, confirmation, assignment, tracking, pickup, delivery, cancellation, invoice, and exception fields;
- source timestamps/timezone and status mapping/version;
- freshness cadence and stale/unknown threshold;
- correlation/reference/idempotency keys;
- webhook/poll/manual-call precedence and duplicates;
- price/terms/ETA change and reapproval behavior;
- driver/vehicle/equipment information that may be trusted versus independently verified;
- after-hours, outage, incident, damage/claim, and support/escalation paths;
- observed-state reconciliation owner and cadence.

Retries after timeout require status reconciliation when the provider may have accepted the original request. Never create a second transport commitment merely to discover the first outcome.

## 10. DMS, accounting, and website boundaries (`ITF-APR-064`)

Actual systems and adapters remain `TBD`. Initial live scope should be selected only after an integration inventory identifies dealership systems, owners, contracts, data access, environments, and operational fallback.

### DMS boundary

Possible future facts require field-level approval:

- stock/unit identifiers and cross-reference;
- acquisition/inventory record status;
- cost components and accounting-facing classifications;
- vehicle facts and sale/reservation/delivery state;
- title/document or customer/deal references;
- accounting/posting acknowledgements.

The workflow must not assume the DMS owns physical location/custody, inspection, repair/QC, listing truth, frontline authorization, or current workflow stage. Direction, conflict precedence, and posting responsibility are field-specific.

### Accounting boundary

- workflow estimates, approvals, commitments, incurred costs, invoices, credits, and recoveries are operational facts;
- they do not equal ledger posting, payable approval, payment, reconciliation, tax treatment, capitalization, or financial statement treatment;
- only a separately approved accounting integration/process may claim submitted/accepted/posted/paid/rejected/reversed states;
- provider acknowledgement is not proof of posting/payment;
- accounting corrections/reversals remain mapped, attributable events and never rewrite operational history;
- no credentials, banking/payment data, or full sensitive payload appears in general workflow logs/tasks.

### Website/channel boundary

- draft content, approved content, approved price, desired payload, publish request, provider acknowledgement, observed live state, drift, pause, removal, and verified removal are distinct;
- the workflow controls only approved desired state and reconciles provider/website observed state;
- provider acceptance does not prove public visibility, accuracy, price, media, disclosure, lead routing, or removal;
- external/public edits require detection, ownership, correction/pause/removal authority, and audit;
- channel availability cannot create frontline authorization; frontline suspension may require approved pause/removal reconciliation.

### Integration directions

| Pattern | Appropriate use | Control |
| --- | --- | --- |
| Read-only reference | Prefill/advisory/verification | Source/freshness label; no canonical overwrite |
| Inbound authoritative event | Approved provider/system owns exact fact | Identity, mapping, idempotency, validation, conflict handling |
| Outbound command | Workflow requests approved external action | Authority/gates, outbox, idempotency, acknowledgement/confirmation |
| Bidirectional field sync | Rare, explicitly partitioned field ownership | Loop prevention, precedence, version/conflict reconciliation |
| Batch import/export | Controlled migration/manual integration | Preview, manifest, validation, partial result, replay/audit |
| Manual fallback | Temporary approved degraded route | Same evidence/authority; reconciliation required |

## 11. Freshness and staleness model (`ITF-APR-065`)

Every material fact records:

- source and authority classification;
- occurred/effective/as-of time;
- received and last-verified/reconciled time;
- expected update cadence;
- fresh-until and expires-at where applicable;
- stale reason and invalidating events;
- last successful sync and current source health;
- confidence/completeness only as secondary context;
- owner and next refresh/reconciliation target.

### Freshness states

| State | Meaning | Permitted direction |
| --- | --- | --- |
| `CURRENT_VERIFIED` | Within approved validity and reconciled where required | May satisfy mapped requirement |
| `CURRENT_UNVERIFIED` | Recent but not accepted/reconciled | Preparation/advisory only unless policy permits |
| `AGING_WARNING` | Approaching stale/expiry threshold | Refresh owner action; warn dependent decision |
| `STALE` | Expected freshness exceeded | Do not present as current; restrict affected actions |
| `EXPIRED` | Validity ended or invalidating event occurred | Cannot satisfy requirement until revalidated |
| `SOURCE_UNAVAILABLE` | Current source cannot be queried/received | Use only approved cached/manual fallback with label/restriction |
| `CONFLICTING` | Relevant current sources disagree | Hold high-impact reliance and reconcile |
| `UNKNOWN` | No approved source/current value | Display unknown; never substitute zero/default/previous silently |

Freshness thresholds remain `TBD` by field/source/risk. A single global “last synced” time is insufficient for field-level authority.

## 12. Conflict detection and resolution

### Conflict classes

- identity/VIN/external mapping;
- acquisition status/time/type/authority;
- physical location, pickup, arrival, custody, keys/property;
- condition/odometer/mileage/vehicle facts;
- cost/price/currency/fees/approval/posting;
- provider request/confirmation/cancellation/delivery/invoice;
- inspection/repair/QC/title/document/readiness;
- content/media/price/channel/live availability;
- policy/template/calendar/role/authority version.

### Resolution contract

Every conflict records:

- conflicting fields, sources, values, versions, and timestamps;
- each source's authority/purpose/freshness;
- materiality and affected gates/decisions;
- immediate containment/restriction;
- one reconciliation owner and qualified decision authority;
- required evidence/source contact/observation;
- allowed correction/supersession/merge/link/route outcomes;
- dependency invalidation and external correction obligations;
- target, escalation, final rationale, and audit.

No high-impact conflict uses most-recent timestamp, highest confidence, majority vote, source priority, or manager preference unless that exact rule is approved for the field and context. Identity, custody, safety, title, public price/content, and release conflicts require their qualified authorities.

## 13. Integration command and event contract

### Outbound command envelope

- command, organization/location, vehicle/cycle, aggregate expected version;
- actor/service, capability/authority, reason, policy/catalog version;
- exact desired action/payload version and evidence references;
- provider/account/external identity mapping;
- idempotency and correlation/causation keys;
- requested/created/sent/acknowledged/confirmed times;
- timeout/retry/cancellation/reversal policy;
- sensitive-data classification and minimum payload;
- owner and reconciliation target.

### Inbound event envelope

- source/provider/account/environment and external event/reference ID;
- event type/schema/mapping version;
- raw payload/reference and integrity/security validation;
- occurred/effective/as-of/received/processed times;
- external and canonical identity mapping;
- duplicate/order/replay status;
- mapped canonical fact/status and authority classification;
- freshness/conflict result;
- correlation/causation and related command;
- processing outcome, exception/dead-letter, and reconciliation owner.

### Idempotency rules

- one business intent uses a stable idempotency key across safe retries;
- the same key with a materially different payload is rejected/conflicted;
- duplicate provider events return the original processing result without repeated effect;
- provider references and internal keys both participate where supported;
- idempotency retention covers the provider's retry/replay window and business risk;
- uncertain outcome is reconciled before a new business intent/key is created;
- cancellation/reversal uses a new linked command, not mutation of the original.

## 14. Inbox, outbox, replay, and ordering

- canonical state change and transactional outbox record commit together where an outbound effect follows an internal command;
- inbox records each inbound external event before/with controlled processing;
- delivery workers may retry transport but not reauthorize the business command;
- per-aggregate expected version/ordering prevents stale events from silently regressing current state;
- systems without ordering guarantees require mapping-specific reconciliation;
- poison/malformed/unauthorized events enter a restricted dead-letter/exception path;
- replay is authorized, scoped, idempotent, audited, and reports per-item results;
- recovery does not flood notifications or duplicate provider commitments;
- raw sensitive payload retention/access follows Workshop 2C, not unrestricted logging.

## 15. Desired-versus-observed reconciliation

Reconciliation compares:

1. approved desired internal state;
2. command request and delivery state;
3. provider acknowledgement/processing state;
4. authoritative observed external/physical state;
5. canonical internal projection;
6. downstream dependencies and restrictions.

### Reconciliation outcomes

| Outcome | Meaning | Response |
| --- | --- | --- |
| `MATCHED` | Desired, provider, observed, and canonical states agree as required | Record success/as-of |
| `PENDING_WITHIN_TARGET` | Outcome incomplete but current/owned | Continue monitoring |
| `STALE_OR_UNKNOWN` | Observation not sufficiently current | Refresh; restrict claims/actions |
| `DRIFT` | Observed state differs from desired/canonical | Assign correction/pause/removal/update |
| `PARTIAL` | Some fields/channels/lines succeeded | Preserve per-item results; retry only safe failures |
| `DUPLICATE` | Multiple external/internal records/effects for one intent | Contain; identify canonical; corrective authority |
| `ORPHAN` | External record lacks valid canonical mapping | Quarantine; do not auto-create high-impact record |
| `REJECTED` | Provider refused request/payload | Preserve response; route mapped correction/reapproval |
| `CONFLICT` | Authoritative sources disagree | Hold affected reliance; qualified resolution |
| `RECOVERED` | Prior discrepancy resolved and verified | Close exception; re-evaluate dependencies |

Each integration defines reconciliation cadence, triggers, batch/on-demand behavior, sampling/full comparison, owner, target, escalation, correction authority, and evidence.

## 16. Degraded operation and manual fallback

### Degraded levels

| Level | Condition | Permitted direction |
| --- | --- | --- |
| `D0 HEALTHY` | Source current and integration within target | Normal approved use |
| `D1 DELAYED` | Elevated latency/retry but freshness remains valid | Continue with visible health/monitoring |
| `D2 STALE_PARTIAL` | Some fields/events unavailable or stale | Restrict affected commands; use unaffected current facts |
| `D3 PROVIDER_UNAVAILABLE` | Source/adapter unavailable beyond approved threshold | Approved manual/cached fallback only; otherwise hold |
| `D4 INTEGRITY_OR_SECURITY` | Mapping, identity, authorization, tampering, isolation, or credential concern | Stop affected integration, quarantine, incident response |
| `D5 RECONCILIATION_CRITICAL` | Duplicate/incorrect high-impact external effect or canonical divergence | Contain scope, Operations/Security escalation, no blind retry |

### Manual fallback contract

A fallback must define:

- triggering degraded state and authority to invoke;
- exact permitted/prohibited actions and data fields;
- approved manual source/contact/method;
- identity, authority, evidence, access, and timing controls;
- how unique references/idempotency prevent duplicate later integration effects;
- owner, start, review, expiry, and return-to-normal criteria;
- queued/backfilled data and reconciliation manifest;
- customer/provider/accounting/public-state communication;
- incident/escalation and audit.

Manual spreadsheets, email, phone calls, portals, or paper may support an approved fallback but cannot silently become the canonical vehicle/workflow record. Staff record the resulting authoritative evidence/attestation in the governed workflow when available and reconcile before resuming automated writes.

## 17. Source correction and write-back rules

- correct the authoritative source when policy/contract permits rather than repeatedly overriding a downstream projection;
- preserve original value/source and create a superseding correction with reason/authority;
- never write an unverified internal observation back into an authoritative external system as accepted truth;
- prevent sync loops by assigning field ownership and change origin;
- outbound correction requires current external identity, expected version where available, and idempotency;
- provider rejection/partial update remains visible and does not mutate canonical state optimistically;
- material correction invalidates/re-evaluates acquisition, transport, title, parts, content, price, channel, release, and reporting dependencies;
- deletion/tombstone semantics are field/entity specific and never assumed to mean business reversal.

## 18. Integration security and privacy boundary

Approve before activation:

- least-privilege provider account, scopes, organization/location, and environment separation;
- secrets outside source control with rotation/revocation/monitoring;
- signed/validated webhooks, transport encryption, allowlisting where appropriate, and replay defense;
- minimum necessary payload and field-level classifications;
- provider subprocessors, retention, deletion, incident, residency, and model-training terms where applicable;
- log/redaction rules preventing secrets and restricted payloads in tasks/errors/telemetry;
- rate-limit/abuse/circuit-breaker behavior;
- credential/integration-owner absence and emergency disable authority;
- security incident containment, evidence preservation, notification, recovery, and reconciliation.

Provider certification or contract claims do not replace dealership configuration, mapping, access, and operational validation.

## 19. Integration observability and operations

For every adapter/source, monitor:

- health and last successful read/write/reconciliation;
- field/source freshness and stale counts;
- request/acknowledgement/confirmation/completion latency;
- retry, timeout, rate-limit, circuit-breaker, and failure rates;
- inbox/outbox backlog, age, duplicate, out-of-order, and dead-letter counts;
- mapping/schema/credential/certificate/version expiry;
- unmatched/orphan external identities;
- conflict, drift, partial, duplicate-effect, and reconciliation age;
- manual-fallback volume/duration/backlog;
- unauthorized/overbroad access and unusual export/payload behavior;
- customer/financial/custody/public-state impact.

Every alert has an internal owner, response target, permitted action, and escalation under Workshop 2D. Technical recovery is not complete until business state is reconciled.

## 20. Staff and manager experience

### Staff

For every prefilled/integrated fact, show as appropriate:

- value and plain-language source;
- as-of/freshness and verified/advisory/reported status;
- conflict/stale/unknown state;
- whether staff may correct, request verification, or report mismatch;
- effect on the current action and approved alternate path;
- no technical provider noise unless actionable.

Do not ask staff a question already answered by current authoritative data. Do not lock staff into a wrong value: provide controlled correction/conflict reporting without unrestricted edits.

### Manager/Integration operations

Provide:

- source/integration health and business impact;
- stale/conflict/orphan/drift/duplicate/partial queues;
- affected vehicles, stages, commitments, restrictions, and public/accounting state;
- retries/replays only where safe and idempotent;
- manual fallback activation/expiry/backlog;
- desired-versus-observed comparison and correction authority;
- history, raw/reference access according to classification, mapping version, and reconciliation evidence.

## 21. Integration inventory capture sheet

Complete one per actual system/provider/manual source.

| Field | Required entry |
| --- | --- |
| Source/provider/system | `TBD` |
| Business/technical/reconciliation owners | `TBD` |
| Contract/account/environment | `TBD` |
| Organization/location scope | `TBD` |
| Direction and operations | `TBD` |
| Field authority/prohibitions | `TBD` |
| External identity mapping | `TBD` |
| Status/schema/unit/timezone mapping | `TBD` |
| Freshness/expiry/invalidation | `TBD` |
| Command/idempotency/cancellation | `TBD` |
| Retry/backoff/rate/circuit breaker | `TBD` |
| Conflict/reconciliation | `TBD` |
| Manual fallback/return-to-normal | `TBD` |
| Security/privacy/retention | `TBD` |
| Monitoring/support/escalation | `TBD` |
| Approval/publisher/effective/review | `TBD` |

## 22. Field authority capture sheet

| Field | Required entry |
| --- | --- |
| Canonical field/meaning | `TBD` |
| Authoritative source/purpose | `TBD` |
| Alternate/reference sources | `TBD` |
| Source field/type/null semantics | `TBD` |
| Identity join | `TBD` |
| Transform/mapping/version | `TBD` |
| Occurred/as-of/received semantics | `TBD` |
| Fresh/stale/expired thresholds | `TBD` |
| Material conflict rule | `TBD` |
| Correction/supersession authority | `TBD` |
| Downstream invalidation | `TBD` |
| Manual fallback/reconciliation owner | `TBD` |
| Classification/retention | `TBD` |

## 23. Decision recommendations

| Decision | Recommended outcome | Required authority | State |
| --- | --- | --- | --- |
| `ITF-APR-060` | Approve actual acquisition sources field by field; distinguish draft/bid/won/accepted/reversed states and require one idempotent canonical workflow start | Inventory + Office/Controller + source owner | OPEN |
| `ITF-APR-061` | Preserve one canonical Vehicle/inventory cycle; map external IDs; require raw/normalized VIN, eligible verification, duplicate/conflict control, and downstream invalidation | Inventory + identity/data owner | OPEN |
| `ITF-APR-062` | Separate reported, observed, planned, in-transit, arrival, accepted custody, placement, and item-custody facts with exact sources and conflict holds | Inventory + Receiving/Custody + data owner | OPEN |
| `ITF-APR-063` | Approve provider-specific request/ack/quote/confirm/assign/pickup/in-transit/delivery/cancel/failure mappings, freshness, idempotency, timeout reconciliation, and internal monitoring | Inventory/Transport + provider/integration owner | OPEN |
| `ITF-APR-064` | Keep DMS/accounting/website boundaries field-specific; prohibit implied posting/payment/publication/frontline truth; require desired-versus-observed reconciliation | GM/Operations + Office/Controller + Merchandising + integration owners | OPEN |
| `ITF-APR-065` | Adopt field-level freshness states, no silent last-write-wins, owned conflict queues, degraded levels, controlled manual fallback, and reconciliation before resumed writes | Data/Integration + Security + functional owners | OPEN |

## 24. Required integration stress tests

Workshop 2E does not pass until participants can determine authority, identity, freshness, mapping, idempotency, conflict, degraded behavior, and reconciliation for each case:

1. Auction source reports `WON`, but acquisition authority has not accepted the purchase.
2. Two acquisition feeds send the same event with different external IDs.
3. A corrected acquisition event arrives after transport planning began.
4. Source VIN differs by one character from physical observation.
5. An external record matches VIN but belongs to a prior inventory cycle.
6. VIN decoder trim conflicts with physical equipment and seller record.
7. Provider reports pickup while seller says vehicle remains onsite.
8. GPS/telematics shows a location but custody owner is unknown.
9. Carrier acknowledgement is mistakenly mapped as confirmation.
10. Transport request times out after provider may have accepted it.
11. Duplicate webhook reports delivery twice.
12. Provider delivery status arrives before receiver observation.
13. Cancellation request succeeds internally but provider outcome is unknown.
14. Provider ETA is older than the approved freshness threshold.
15. DMS stock number conflicts with the canonical external mapping.
16. Accounting provider acknowledges submission but no posted entry can be observed.
17. Invoice amount differs from approved/committed operational cost.
18. Website accepts payload but displays wrong price and missing disclosure.
19. One marketplace updates while another rejects the same package.
20. Frontline status is suspended while provider removal is delayed.
21. Integration writes succeed externally but internal acknowledgement recording fails.
22. Adapter retries an event out of order after a newer correction.
23. An orphan provider record cannot map to a canonical vehicle.
24. Integration credentials are suspected compromised.
25. Source becomes unavailable while cached data remains within freshness.
26. Cached data becomes stale during the outage.
27. Staff use a manual provider portal during outage, then automated writes resume.
28. Batch import partially succeeds and contains duplicate/conflicting rows.
29. Schema/status mapping changes without an approved version.
30. System recovery produces a large outbox/inbox backlog and notification risk.

Expected behavior: protect the canonical vehicle, preserve raw/source lineage, distinguish desired/acknowledged/observed truth, prevent duplicate effect, display freshness, hold high-impact conflict, use only approved fallback, and reconcile before claiming recovery.

## 25. Workshop agenda

### Before the meeting

Bring:

- actual DMS, accounting, acquisition, auction, carrier, title, VIN/history, valuation, parts, website/channel, messaging, and other provider inventory;
- contracts/accounts/environments, owners/support, data dictionaries, sample payloads/statuses, timestamps/timezones, and identifiers;
- current imports/exports/spreadsheets/portals/phone/email fallback practices;
- known duplicates, conflicts, stale data, provider failures, posting/listing discrepancies, and reconciliation reports;
- security/privacy/retention terms and credential ownership;
- representative source records mapped to the same vehicle/cycle.

### In the meeting

1. Name business, technical, reconciliation, security, and fallback owners.
2. Approve source classifications and registration/field contracts.
3. Complete acquisition authority by field/source.
4. Approve canonical identity/VIN/external mapping.
5. Approve location/custody sources and conflicts.
6. Map every carrier/provider state and freshness rule.
7. Approve DMS/accounting/website boundaries and directions.
8. Approve freshness/conflict/degraded/manual/reconciliation rules.
9. Review idempotency, inbox/outbox, replay, partial, and uncertain outcomes.
10. Run stress tests and assign gaps.
11. Record `ITF-APR-060`-`065` dispositions.

## 26. Exit criteria

Workshop 2E is complete only when:

- `ITF-APR-060`-`065` have complete dispositions and metadata;
- actual pilot systems/manual sources and owners are inventoried;
- every first-slice material field has an approved authority, alternate, freshness, conflict, correction, and fallback rule;
- one canonical Vehicle/inventory cycle and external identity map are preserved;
- carrier/provider statuses distinguish request, acknowledgement, confirmation, pickup, tracking, delivery, cancellation, failure, and unknown;
- DMS/accounting/website boundaries cannot imply posting, payment, publication, or frontline truth;
- high-impact conflicts cannot use silent last-write-wins;
- commands/events are idempotent, replayable, ordered/reconciled, and secure;
- degraded/manual operation is bounded, expires, retains evidence, and reconciles before normal writes resume;
- technical recovery includes business-state reconciliation;
- stress tests pass or have safe non-execution behavior with owners and dates.

## 27. Workshop 2 closeout

This packet completes documentation for Workshop 2 decisions:

- Workshop 2A: `ITF-APR-020`-`025` — roles, responsibility, separation, administration;
- Workshop 2B: `ITF-APR-030`-`036` — authority, financial control, economics review;
- Workshop 2C: `ITF-APR-050`-`056` — evidence, privacy, security, records;
- Workshop 2D: `ITF-APR-040`-`045` — timing, escalation, notification, coverage;
- Workshop 2E: `ITF-APR-060`-`065` — sources, integrations, freshness, reconciliation.

The next step is a **Workshop 2 Consolidated Decision Readout and Gap Register**, not code. Authorized participants must record exact approvals, changes, safe deferrals, owners, values, sources, dates, and evidence in the Approval Register. Workshop 2 remains unapproved until that readout is conducted and the exit criteria from all five packets are satisfied.

Only after Workshop 1 and applicable Workshop 2 decisions are formally resolved should the program proceed to **Workshop 3 - Receipt, Custody, Inspection, and Safety approval decisions (`ITF-APR-080`-`099`)**. Documentation approval still does not equal implementation activation.
