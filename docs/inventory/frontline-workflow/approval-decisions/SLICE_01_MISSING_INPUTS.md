# Slice 1 Missing-Input Completion Packet

**Status:** 28 processed decisions remain `OPEN_REQUIRED_INPUT`  
**Purpose:** Collect only the company-specific facts required to finish Slice 1 approvals

Complete values may be supplied in plain language. Unknown values may be explicitly `DEFER_SAFE`; they must not be invented.

## Scope, locations and calendar (2)

| Decision | Required input | Safe default while open |
| --- | --- | --- |
| `ITF-APR-013` | Exact Minneapolis receiving address/area, secure holding, quarantine, after-hours drop location, hours and capability limits | No unattended or unspecified arrival route |
| `ITF-APR-015` | Normal operating days/hours, holidays/closures, after-hours contact and containment procedure | America/Chicago; no automated SLA calendar |

## Roles, access and separation (6)

| Decision | Required input | Safe default while open |
| --- | --- | --- |
| `ITF-APR-020` | Confirm Eli as policy/pilot owner and Brock as workflow/service owner; exact scope | No additional ownership-dependent command grant |
| `ITF-APR-021` | For Eli/Brock: location scope, vehicle scope, qualifications, availability, access and backup behavior | Least privilege; unavailable action holds |
| `ITF-APR-022` | Name who schedules, executes/coordinates, monitors, receives and accepts transport handoff in ordinary and backup cases | Brock operates; Eli reviews exceptions; unresolved handoff holds |
| `ITF-APR-023` | Confirm Eli as identity-conflict and cancellation/reversal reviewer; define when Brock must escalate | Identity conflict/cancellation holds |
| `ITF-APR-024` | List role combinations allowed and actions requiring another/external reviewer | Independence-required action holds |
| `ITF-APR-025` | Name system administrator and consequential policy publisher; define external route if both would be Eli | No consequential policy publication/self-grant |

## Financial controls (6)

| Decision | Required input | Safe default while open |
| --- | --- | --- |
| `ITF-APR-030` | Currency; included transport/acquisition cost classes; gross versus net exposure treatment | USD may not be assumed as approved; no automated financial commitment |
| `ITF-APR-031` | Exact dollar limits for Brock, Eli and any vendor/provider action; per vehicle/order/period | No amount-based approval or purchase command |
| `ITF-APR-032` | Required quote count, quote sources, expiry period and permitted single-source exceptions | No automated quote sufficiency/provider selection |
| `ITF-APR-033` | Dollar and percentage change requiring reapproval; material source/scope changes | Any changed cost/scope/source holds |
| `ITF-APR-035` | Emergency categories, maximum amount, evidence and independent retrospective review route | Existing manual emergency process only |
| `ITF-APR-036` | Carrying cost, margin, age, forecast and risk inputs plus human disposition-review thresholds | No automatic disposition |

## Timing, escalation and notification (6)

| Decision | Required input | Safe default while open |
| --- | --- | --- |
| `ITF-APR-040` | Acquisition-validation warning, due and overdue durations | Display elapsed age only |
| `ITF-APR-041` | Transport plan, quote, approval, confirmation and pickup target durations | No automatic SLA breach/escalation |
| `ITF-APR-042` | Pickup/arrival warning, material/severe delay and stale/unknown thresholds; after-hours response | Manual monitoring |
| `ITF-APR-043` | Allowed pause reasons, who approves, maximum review interval and expiry | Waiting does not pause age automatically |
| `ITF-APR-044` | E1-E5 meaning, recipients/backups and acknowledgement/response/resolution targets | Eli receives manual escalation; no claimed SLA |
| `ITF-APR-045` | Approved notification channels, quiet hours, critical exceptions, retry/fallback and minimal data | In-app/manual only; no external notification automation |

## Evidence, privacy and records (4)

| Decision | Required input | Safe default while open |
| --- | --- | --- |
| `ITF-APR-050` | For each first-slice evidence item: applicability, source, criticality, freshness, access, retention and correction owner | No live evidence-based automatic gate |
| `ITF-APR-053` | Required pre/post condition photos/video/fields by onsite, carrier, tow and seller-delivery route | Route requiring unapproved proof holds |
| `ITF-APR-054` | Public/internal/restricted/highly restricted classifications and who may view/change/export each | Restricted evidence unavailable by default |
| `ITF-APR-055` | Retention duration, legal hold, export, backup/provider and disposal rules for each evidence class | No automated disposal or bulk export |

## Source authority and degraded operation (3)

| Decision | Required input | Safe default while open |
| --- | --- | --- |
| `ITF-APR-060` | Actual acquisition sources and authoritative source for VIN, seller, cost, date, intent, origin and destination | No authoritative automatic start/prefill |
| `ITF-APR-062` | Who/source establishes planned, in-transit, observed arrival, custody and placement states | Provider report alone cannot move/receive vehicle |
| `ITF-APR-065` | Freshness periods, conflict decision owner, degraded levels, fallback, reconciliation frequency and return-to-normal | Stale/conflicting facts cannot pass gates |

## Pilot control (1)

| Decision | Required input | Safe default while open |
| --- | --- | --- |
| `ITF-APR-074` | Confirm Eli as monitor/pause/rollback/resume authority; define backup/external route, immediate pause triggers and resume evidence | Pilot remains off |

## Completion rule

Each response is converted into exact proposed policy and returned for confirmation. Only then can the decision receive `APPROVE_WITH_CHANGE`. If a value cannot yet be supplied, choose `DEFER_SAFE` and preserve the stated safe default and excluded capability.
