# Technician Troubleshooting Console Architecture

**Status:** Adopted planning baseline  
**Date:** 2026-07-25  
**Parent console:** Enterprise Diagnostics Console  
**Primary UI source:** [`../TECHNICIAN_TROUBLESHOOTING_CONSOLE_UI_SOURCE_OF_TRUTH.md`](../TECHNICIAN_TROUBLESHOOTING_CONSOLE_UI_SOURCE_OF_TRUTH.md)

## 1. Product boundary

The Technician Troubleshooting Console is the technician-facing workspace for structured diagnostic investigation.

It owns:

- symptom intake normalization;
- diagnostic case context presentation;
- vehicle intelligence checks;
- common-cause and known-issue matching;
- test-plan recommendation;
- evidence and measurement capture;
- hypothesis support and contradiction tracking;
- advisor handoff readiness;
- post-repair verification prompts;
- AI-readiness surface for future Master Technician assistance.

It does not own:

- final customer authorization;
- estimate pricing authority;
- repair-order accounting;
- parts purchasing;
- labor guide publishing;
- OEM service-information ownership;
- autonomous cause confirmation;
- autonomous repair approval.

## 2. Architectural principle

Use one troubleshooting engine with multiple domain rule packs.

```text
Technician input / vehicle context / repair history / scan evidence
        |
        v
Troubleshooting Engine
        |
        +--> Identity and applicability resolver
        +--> Symptom language interpreter
        +--> Vehicle intelligence checker
        +--> Domain rule-pack selector
        +--> Evidence gate evaluator
        +--> Hypothesis and cause candidate generator
        +--> Next-best-test planner
        +--> Measurement interpreter
        +--> Advisor handoff builder
        +--> Learning and review loop
```

The engine must be shared across mechanical, electrical, drivability, HVAC, brake, body, ADAS, network, programming, and intermittent-fault domains. Domain differences belong inside rule packs, not separate console logic.

## 3. Core modules

| Module | Responsibility |
| --- | --- |
| Case Context Adapter | Reads the diagnostic case, RO, vehicle, customer concern, prior history, and permissions. |
| Symptom Language Interpreter | Converts advisor/technician wording into normalized symptoms, systems, conditions, and severity markers. |
| Vehicle Intelligence Checker | Checks recall, service bulletin, campaign, warranty extension, known issue, pattern failure, and prior repair context. |
| Domain Rule-Pack Registry | Selects applicable mechanical, electrical, body, ADAS, HVAC, brake, drivability, network, or programming rules. |
| Evidence Gate Evaluator | Determines whether the console has enough quality evidence to rank, suggest, hand off, or abstain. |
| Hypothesis Builder | Creates possible cause candidates with support, contradiction, missing evidence, and source lineage. |
| Test Planner | Recommends the next best safe diagnostic action and eligible alternatives. |
| Evidence Capture | Captures observations, measurements, scans, photos, videos, files, and technician notes. |
| Measurement Interpreter | Interprets values against expected ranges, operating conditions, and test prerequisites. |
| Advisor Handoff Builder | Produces advisor-safe summaries and estimate/authorization prompts without overclaiming. |
| Master Technician Gate | Holds future AI/chat assistance behind readiness, licensing, and authority gates. |
| Learning Loop | Feeds confirmed outcomes into reviewable shop knowledge without silently changing production behavior. |

## 4. Domain rule-pack contract

Every rule pack must define:

1. domain identity and version;
2. vehicle applicability requirements;
3. supported symptom vocabulary and synonyms;
4. system/component hierarchy;
5. known safety hazards;
6. prerequisite checks;
7. required and optional evidence types;
8. common causes;
9. vehicle-known-issue references;
10. recall/service-bulletin check requirements;
11. test definitions and tool requirements;
12. expected measurement ranges and operating conditions;
13. contradiction rules;
14. cause-support rules;
15. advisor handoff language;
16. post-repair verification rules;
17. source lineage and licensing state.

## 5. Data objects

| Object | Description |
| --- | --- |
| Troubleshooting Session | A focused investigation instance inside a diagnostic case. |
| Symptom Profile | Normalized concern, system, condition, frequency, trigger, severity, and customer wording. |
| Vehicle Intelligence Result | Recall, TSB, known issue, warranty, history, and applicability findings. |
| Domain Candidate | A system or component family selected for diagnostic focus. |
| Evidence Item | Observation, measurement, scan result, media, attachment, or note. |
| Hypothesis Candidate | Possible cause with support, contradiction, missing evidence, and next-test relationship. |
| Test Recommendation | Suggested action with reason, tools, safety, expected result, and alternatives. |
| Handoff Packet | Advisor-safe diagnostic status, customer explanation, needed authorization, and next step. |
| Review Finding | Manager/master-tech review note, confirmed learning, or rejected pattern update. |

## 6. Authority and gating

Authority should remain layered:

| Action | Allowed authority |
| --- | --- |
| Normalize language | Deterministic engine |
| Suggest known issue check | Deterministic engine |
| Recommend next test | Deterministic engine, with technician choice |
| Capture evidence | Technician |
| Interpret measurement | Engine can assist; technician reviews |
| Suspect cause | Engine may rank with explanation |
| Confirm cause | Qualified technician only |
| Create advisor handoff | Engine may draft; technician/advisor reviews |
| Approve repair or estimate | Advisor/manager/customer authorization workflow |
| Ask AI assistant | Future gated capability only |

## 7. Integration points

The console should integrate with:

- Diagnostics case lifecycle;
- Repair Order Workbench;
- Vehicle 360 and repair history;
- scan/live-data/network labs;
- electrical/waveform labs;
- estimate and labor guide intelligence;
- parts demand intelligence;
- task/dispatch workflows;
- manager review and quality controls;
- future licensed service-data connectors;
- future AI provider gateway.

## 8. Source and licensing posture

The architecture must support four source classes:

| Source class | Use |
| --- | --- |
| Internal shop-authored | Allowed after review and versioning. |
| User-entered evidence | Allowed as case evidence with author/time lineage. |
| Publicly available safety recall data | Allowed when accessed through lawful source/integration. |
| Licensed OEM/third-party service data | Allowed only when the business has the required license or connector rights. |

No implementation should embed proprietary diagrams, OEM procedures, OEM part numbers, labor guide times, or third-party service data unless the license is confirmed.

## 9. AI readiness

The architecture should make a future AI assistant possible by preparing:

- clean case context packets;
- source-attributed retrieval;
- evidence/cause separation;
- abstention rules;
- prompt and response audit;
- role-aware redaction;
- technician review before action;
- evaluation scenarios;
- kill switch and provider independence.

AI is not part of the first required correctness path.
