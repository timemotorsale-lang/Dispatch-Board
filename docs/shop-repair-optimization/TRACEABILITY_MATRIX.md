# Shop Optimization Traceability Matrix

**Status:** Complete planning traceability baseline

## 1. Workstream coverage

| Workstream | Algorithms | Decisions | Primary workshop | Scenarios | Roadmap slice |
| --- | --- | --- | --- | --- | --- |
| Shop Flow and WIP | `001`-`006` | `001`-`019` | 1-2 | `001`-`009`, `016`, `018`-`020`, `041`-`045` | 0-1 |
| Capacity, Dispatch and Scheduling | `010`-`016` | `020`-`029` | 3 | `014`-`019`, `043`-`048` | 2 |
| Parts and Repair Execution | `020`-`025` | `030`-`039` | 4 | `010`-`013`, `020`-`025`, `041`-`044` | 3 |
| Pricing and Margin Governance | `030`-`034` | `040`-`049` | 5 | `026`-`029`, `048` | 4 |
| Technician and Advisor Assistance | `040`-`044` | `050`-`059` | 6 | `030`-`032`, `041`, `044`, `049` | 5 |
| Customer Intelligence and Retention | `050`-`054` | `060`-`069` | 7 | `033`-`040`, `048` | 6-7 |
| Measurement and Calibration | `060`-`062` | `070`-`079` | 8 | `042`-`050` | 0 and 8 |

## 2. Attached concept coverage

| Source concept | Catalog implementation | Guardrail |
| --- | --- | --- |
| Predictive car-age CRM | `SRO-ALG-053`, `054` | Authorized mileage observations, range/confidence, consent, no presumed NHTSA/CARFAX telemetry |
| Dynamic bay-capacity optimization | `SRO-ALG-003`, `010`-`016` | Skills/resources/parts/authorization constrain capacity before ranking |
| Linear labor bump | `SRO-ALG-031`-`034` | Time/rate/minimum remain distinct; floors/ceilings, disclosure and approval |
| Voice-to-text diagnostic mapping | `SRO-ALG-040`-`044` | Draft, clarify, source, technician/advisor confirmation; no autonomous diagnosis |
| Heat-case sentiment detection | `SRO-ALG-050`, `051` | Multi-signal review, context, correction, human response, no automatic concession |

## 3. Existing platform mapping

| Existing foundation | This package use |
| --- | --- |
| Enterprise Optimization Constitution | Objective hierarchy, decision envelope, human authority, explainability |
| Common Work and Service Model | Work, commitment, resource, dependency, evidence, event and outcome envelopes |
| Vehicle Operations Architecture | Canonical vehicle, repair order, shop, resource, parts, customer and policy boundaries |
| Inventory-to-Frontline workflow | Inventory-recon trigger, financial/target context, QC return and frontline boundaries |
| Appointment foundation | Demand, promises, availability and booking conflicts |
| Tasks Console | Accountable resolution, intervention, review and follow-up work |
| Manager Review | Consequential approvals, exceptions, overrides and incidents |
| Customer/CRM foundation | Identity, consent, interactions, cases and customer outcomes |

## 4. Control coverage

| Control | Documents |
| --- | --- |
| Safety/QC | Charter, Operating Model, Guardrail Matrix, Scenario Catalog, Workshops 2/4/8 |
| Financial authority | Guardrail Matrix, Algorithm Catalog, Workshops 4/5, Approval Register |
| Privacy/security | Guardrail Matrix, Data Matrix, Staff Experience, Workshops 6/7 |
| Data authority/freshness | Data Matrix, Algorithm Catalog, Workshop 8 |
| Employee fairness | Charter, Guardrail Matrix, Algorithm `016`, Measurement, Workshops 3/8 |
| Explainability/override | Algorithm Catalog, Staff Experience, Guardrail Matrix, Measurement |
| Degraded operation | Operating Model, Data Matrix, Scenarios `041`/`049`/`050`, Roadmap |
| Pilot/rollback | Charter, Measurement, Workshop 8, Roadmap |

## 5. Completeness statement

All six workstreams, 37 algorithms, 17 staff decisions, 50 scenarios, 79 approval decisions, eight workshops, eight implementation stages plus baseline, and the five supplied advanced concepts have a documented relationship. The current approval state remains `OPEN`, and the implementation state remains planning-only.
