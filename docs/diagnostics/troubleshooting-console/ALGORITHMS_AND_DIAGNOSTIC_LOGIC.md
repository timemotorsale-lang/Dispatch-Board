# Technician Troubleshooting Console Algorithms and Diagnostic Logic

**Status:** Adopted planning baseline  
**Date:** 2026-07-25  
**Relationship:** Extends the enterprise [`../DIAGNOSTIC_ALGORITHM_CATALOG.md`](../DIAGNOSTIC_ALGORITHM_CATALOG.md)

## 1. Algorithm philosophy

The console should feel intelligent before AI is added by combining:

- controlled vocabulary;
- synonym and phrase matching;
- vehicle applicability;
- common-cause libraries;
- known vehicle issue libraries;
- recall and service bulletin awareness;
- evidence gates;
- test sequencing;
- measurement interpretation;
- contradiction detection;
- technician review and learning loops.

The goal is not to guess. The goal is to guide.

## 2. Troubleshooting algorithm pipeline

```text
Concern text
  -> normalize language
  -> identify symptoms, systems, conditions, severity
  -> resolve vehicle applicability
  -> select domain rule packs
  -> check known intelligence
  -> evaluate current evidence quality
  -> generate candidate areas
  -> rank candidates qualitatively
  -> choose next best test
  -> capture evidence
  -> revise ranking
  -> hand off, continue testing, or verify repair
```

## 3. Algorithm registry

| ID | Algorithm | Purpose | Output |
| --- | --- | --- | --- |
| TTC-ALG-001 | Concern Text Normalizer | Cleans wording, spelling, pluralization, shorthand, and shop slang. | Normalized tokens and phrases. |
| TTC-ALG-002 | Symptom and System Classifier | Maps text to systems, symptom families, and conditions. | Symptom profile. |
| TTC-ALG-003 | Missing Detail Detector | Finds missing diagnostic intake details. | Follow-up questions. |
| TTC-ALG-004 | Vehicle Applicability Resolver | Confirms make/model/year/engine/trim/configuration relevance. | Applicability state. |
| TTC-ALG-005 | Domain Rule-Pack Selector | Chooses mechanical, electrical, body, ADAS, HVAC, brake, drivability, network, or programming rules. | Eligible rule packs. |
| TTC-ALG-006 | Recall and Bulletin Check Planner | Determines whether recall/TSB/campaign/warranty checks are required or unavailable. | Vehicle intelligence checklist. |
| TTC-ALG-007 | Known Vehicle Issue Matcher | Matches vehicle profile and symptom to known issue library entries. | Known-issue clues. |
| TTC-ALG-008 | Common Cause Matcher | Finds common cause candidates for the symptom/system domain. | Candidate cause list. |
| TTC-ALG-009 | Evidence Sufficiency Gate | Determines what the system can safely say with current evidence. | Abstain, suggest, rank, handoff-ready. |
| TTC-ALG-010 | Contradiction Detector | Detects evidence that conflicts with a candidate cause. | Contradictions and blockers. |
| TTC-ALG-011 | Hypothesis Ranker | Ranks candidates using support, contradiction, applicability, and test value. | Qualitative ranking. |
| TTC-ALG-012 | Next-Best-Test Selector | Selects the safest, highest-value next test. | Recommended test and alternatives. |
| TTC-ALG-013 | Measurement Interpreter | Evaluates readings using units, conditions, and expected ranges. | Pass/fail/inconclusive interpretation. |
| TTC-ALG-014 | Intermittent Fault Tracker | Tracks frequency, trigger, non-detection, and reproduction attempts. | Intermittent investigation state. |
| TTC-ALG-015 | Advisor Handoff Classifier | Determines advisor-safe status. | Handoff readiness and wording. |
| TTC-ALG-016 | Verification Planner | Creates post-repair verification steps. | Verification checklist. |
| TTC-ALG-017 | Learning Proposal Builder | Converts confirmed outcomes into reviewable library updates. | Draft learning proposal. |

## 4. Concern language intelligence

The text box must not require exact repair phrases.

Rules:

- broad terms like “engine,” “transmission,” “brakes,” “door,” or “AC” should open useful system pathways;
- vague terms like “issue,” “problem,” “acting up,” “noise,” “leak,” “light on,” “won’t start,” and “not working” should trigger clarifying questions;
- symptom wording should not be confused with repair operations;
- repair phrases like “replace transmission” should generate repair-area suggestions but still require diagnostic/estimate authority boundaries;
- negative “no issue found” should only appear after controlled matching and evidence review, not because a phrase is broad.

Example behavior:

| Input | Expected behavior |
| --- | --- |
| “engine” | Open engine/drivability symptom questions and common engine concern categories. |
| “engine issue” | Ask for symptom: no-start, misfire, noise, leak, overheating, power loss, warning light, smoke, stall. |
| “transmission issues” | Open transmission/drivetrain concern categories and ask shift/slip/noise/leak/no-move questions. |
| “transmission replacement” | Show replacement-related labor/parts/advisor estimate pathway, while allowing diagnostic verification if needed. |
| “grinding front passenger” | Suggest brake, wheel bearing, axle/CV, suspension, and body-contact investigation paths. |

## 5. Known issue and recall logic

Known intelligence should be checked early, but carefully.

Rules:

- known issue match is a clue;
- recall/TSB match is a source-backed clue;
- prior repair recurrence increases attention but does not prove cause;
- applicability must match vehicle identity and configuration;
- source freshness and license state must be visible;
- unavailable sources should display “not connected” or “license required,” not silently disappear;
- known issues should suggest inspections/tests, not direct repair authorization.

## 6. Ranking model

Use qualitative states:

- `HIGHLY_RELEVANT`;
- `SUPPORTED`;
- `POSSIBLE`;
- `NEEDS_DISCRIMINATION`;
- `LESS_LIKELY`;
- `CONTRADICTED`;
- `OUT_OF_SCOPE`;
- `INSUFFICIENT_EVIDENCE`.

Ranking inputs:

- symptom match strength;
- vehicle applicability;
- common-cause frequency class;
- known-issue match;
- prior repair history;
- current evidence support;
- current evidence contradiction;
- safety risk;
- test cost/time;
- ability of next test to discriminate between candidates.

Do not show numerical probability unless a future validated model has calibrated meaning.

## 7. Next-best-test logic

The next test should maximize useful evidence while minimizing wasted time and risk.

Selection should consider:

- safety prerequisites;
- tool availability;
- skill requirement;
- vehicle state requirement;
- test time;
- diagnostic discrimination value;
- cost of delay;
- ability to confirm or eliminate multiple candidates;
- whether the symptom is currently present;
- whether the fault is intermittent.

The console should show:

- recommended test;
- why this test is next;
- expected evidence;
- required tools;
- safety notes;
- alternatives;
- blocked/ineligible tests and why.

## 8. Evidence gate logic

The console must abstain when evidence is insufficient.

Allowed states:

| State | Meaning |
| --- | --- |
| Intake Needed | Concern is too vague or missing key details. |
| Vehicle Intelligence Needed | Known source checks have not been reviewed or are unavailable. |
| Evidence Needed | No independent observation or measurement exists. |
| Test Recommended | There is enough context to suggest the next test. |
| Suspected Cause | Evidence supports a likely area but confirmation is incomplete. |
| Confirmable Cause | Required evidence supports technician confirmation. |
| Verified Repair | Post-repair verification passed. |

## 9. Diagnostic domain examples

| Domain | Common logic examples |
| --- | --- |
| Starting/Charging | Battery state, voltage drop, starter control, alternator output, parasitic draw. |
| Engine/Drivability | Misfire, fuel, air, ignition, compression, sensor plausibility, overheating. |
| Transmission/Drivetrain | Fluid condition, leaks, slipping, harsh shift, no movement, programming/adaptation. |
| Brake/ABS/Stability | Noise, pulsation, warning lights, wheel speed, hydraulic, pad/rotor condition. |
| HVAC | Refrigerant, pressure, blend doors, compressor command, temperature delta, electrical control. |
| Electrical/Waveform | Power/ground, voltage drop, signal integrity, waveform shape, intermittent capture. |
| Network/Modules | DTC topology, communication loss, gateway, module power/ground, programming status. |
| Body/Collision | Door, panel, latch, window, glass, seal, water leak, structure, refinish, calibration. |
| ADAS/Calibration | Sensor damage, alignment, calibration prerequisites, scan requirements, road test. |

## 10. Learning loop

Confirmed outcomes may propose updates to:

- symptom synonyms;
- common causes;
- known issue entries;
- test sequencing;
- handoff language;
- verification steps.

But learning proposals must go through review before activation. The console should not silently teach itself production rules from a single case.
