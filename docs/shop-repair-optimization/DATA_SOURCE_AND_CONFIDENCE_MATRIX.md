# Data Source, Integration, Freshness, and Confidence Matrix

**Status:** Proposed source-authority contract; integrations are not assumed available

## 1. Fact classes

Every material value is labeled as an `AUTHORITATIVE_FACT`, `OBSERVED_SIGNAL`, `CALCULATION`, `ESTIMATE`, `PREDICTION`, or `RECOMMENDATION`. A lower-authority class never silently overwrites a higher-authority fact.

## 2. Source matrix

| Domain | Proposed authoritative source | Secondary input | Freshness expectation | Conflict/degraded behavior |
| --- | --- | --- | --- | --- |
| Vehicle/VIN/ownership lane | Canonical Vehicle/relationship records | DMS/VIN provider | At intake and every ownership transition | Stop lane automation on conflict |
| Odometer observation | Attributable intake/checkout/technician reading | History or consented connected source | At visit boundaries | Preserve all readings; quarantine implausible/conflicting records |
| Customer identity/contact/consent | Canonical Customer/consent records | DMS/CRM | Before every outbound | Suppress outbound if authority/consent uncertain |
| Appointment/promise | Appointment and advisor-authorized commitment | Customer conversation | Live event-driven | Show conflict; named owner resolves |
| RO/job/scope | RepairOrder/RepairJob/versioned estimate | DMS integration | Live event-driven | No execution from stale/unknown version |
| Authorization | Attributable accepted/partial/declined decision | Signed/recorded evidence | Exact estimate version | Hard stop on missing/revoked authority |
| Technician availability | Scheduling/attendance-approved operational availability | Manager adjustment | Live or approved daily snapshot | Remove unavailable candidate; do not infer attendance |
| Skills/certifications | Effective-dated verified qualification record | Manager/HR evidence | At dispatch and start | Expired/missing excludes candidate |
| Bays/tools/equipment | Resource catalog and bookings | Dispatcher observation | Live; revalidate at start | Exclude conflicted/unavailable resource |
| Procedure/labor guide | Approved procedure/catalog version | Qualified expert decision | At estimate/dispatch/start | Stale/missing version lowers authority or blocks work |
| Parts master/fitment | Approved catalog and part master | Vendor catalog | At sourcing/reservation/install | Technical review for conflict/substitute |
| On-hand/reserved/issued parts | Parts ledger and reservation/custody events | Physical verification | Live event-driven | Ledger/physical conflict blocks readiness |
| Vendor offer/ETA | Attributable vendor response | Historical performance | Quote TTL and event updates | Show original/revised ETA and confidence |
| Cost/price/matrix | Approved effective policy and cost ledger | Vendor/catalog cost | At estimate and every cost change | No recommendation when version/authority missing |
| Repair progress/labor | Append-only execution/labor events | Technician status | Live event-driven | Running-clock/conflict is visible and reconciled |
| Findings/evidence | Confirmed inspection/diagnosis/repair/QC record | AI-structured draft | At each handoff | Draft is never authoritative until confirmed |
| QC/road-test result | Qualified verifier event/evidence | Risk model | At release | Failed/missing mandatory item blocks release |
| Communications/sentiment | Authorized interaction record | Sentiment classification | Near-real-time for active RO | Low confidence creates review, not customer conclusion |
| Outcome/financial actual | Closed operational record and accounting reconciliation | Projection | Close plus reconciliation cycle | Mark provisional until reconciled |

## 3. Mileage prediction controls

The program must not describe NHTSA, a history provider, or an event-data recorder as a live mileage telemetry source. Mileage prediction uses only licensed/authorized observations with provenance and customer consent where required.

Validation includes chronological order, units, odometer replacement/rollover, duplicate readings, improbable daily rates, entry errors, not-actual-mileage flags, ownership gaps, and confidence decay. The output is a range with last-observed date, input count, uncertainty, and suppression reasons.

## 4. Freshness bands

| Band | Meaning | Decision effect |
| --- | --- | --- |
| `CURRENT` | Within approved source-specific interval | Eligible for intended use |
| `AGING` | Approaching interval | Recommendation allowed with warning where policy permits |
| `STALE` | Beyond interval | Revalidation required; automation disabled |
| `CONFLICTED` | Sources materially disagree | Hard stop for affected consequential action |
| `UNAVAILABLE` | Source cannot be reached and no durable fact suffices | Safe manual/deferred path |

Freshness is domain-specific. A procedure, authorization, part reservation, technician qualification, and customer consent may require revalidation immediately before execution even if recently read.

## 5. Integration contract

Every adapter declares ownership, direction, identifier mapping, field authority, authentication, rate limits, latency, TTL, idempotency, ordering, retry, dead-letter handling, reconciliation, privacy classification, retention, monitoring, and manual fallback. Vendor schemas cannot become internal domain models.

## 6. Confidence policy

Confidence reflects source authority, freshness, completeness, consistency, sample sufficiency, and model validation. It does not represent certainty or permission. Mandatory-gate inputs cannot be averaged into a usable aggregate confidence score.

Recommended bands:

- `HIGH`: appropriate for the approved decision-support use.
- `MEDIUM`: display recommendation and uncertainty; require explicit review.
- `LOW`: provide investigation actions, not a consequential recommendation.
- `INSUFFICIENT`: do not evaluate; show missing inputs and owner.

## 7. Reconciliation

Scheduled and event-driven reconciliation compares commands, domain events, projections, resource bookings, parts ledger, communications, integration acknowledgements, and accounting/DMS boundaries. Corrections reference original facts and create superseding events; they do not delete history.
