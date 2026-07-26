# Technician Troubleshooting Console Workflows and Rulebook

**Status:** Adopted planning baseline  
**Date:** 2026-07-25

## 1. Primary technician workflow

```text
Open diagnostic case
  -> review RO, vehicle, VIN, concern, and history
  -> normalize concern into symptoms and systems
  -> complete vehicle intelligence check
  -> review common causes and known issue clues
  -> run next best test or choose valid alternative
  -> capture evidence and measurements
  -> revise candidates
  -> continue, hand off for authorization, confirm cause, or verify repair
```

## 2. Advisor workflow

The advisor should not need to operate the technical console deeply.

Advisor-facing output should include:

- concern summary;
- current diagnostic status;
- what has been checked;
- what still needs authorization;
- suspected or confirmed cause language;
- repair recommendation when available;
- customer-safe explanation;
- expected next step.

Rules:

- advisor summaries must not overstate certainty;
- “suspected” and “confirmed” must remain visually and semantically different;
- if more testing is needed, the handoff should request diagnostic authorization rather than a repair sale.

## 3. Manager/master-tech workflow

Manager or master-tech review should support:

- difficult case review;
- comeback review;
- repeated pattern review;
- rejected recommendation review;
- learning-library approval;
- technician coaching;
- quality and safety audit.

Rules:

- review comments must not overwrite evidence;
- review may create learning proposals;
- production rule changes require approval and versioning.

## 4. Vehicle intelligence workflow

For every troubleshooting session:

1. resolve vehicle identity;
2. check prior repair history;
3. check known issue library;
4. check recall/campaign/warranty extension availability;
5. check service bulletin availability;
6. show source status;
7. ask technician to acknowledge relevant findings.

Vehicle intelligence should never equal root cause by itself.

## 5. Evidence workflow

Evidence must be captured as one of:

- observation;
- measurement;
- scan result;
- DTC/freeze-frame summary;
- live data snapshot;
- test result;
- waveform/scope result;
- photo/video;
- attachment;
- technician note.

Evidence rules:

- every evidence item needs author, time, source, and case linkage;
- measurements need units and operating condition;
- edited evidence must preserve correction lineage;
- conclusions must reference evidence instead of replacing it;
- unsupported notes must remain notes.

## 6. Test workflow

Every recommended test should include:

- test name;
- purpose;
- candidate causes it can support or eliminate;
- prerequisites;
- required tools;
- safety conditions;
- expected normal result;
- expected abnormal result;
- interpretation limits;
- estimated time;
- alternative tests;
- blocked conditions.

The technician may choose another eligible test, but the console should capture why.

## 7. Cause workflow

Cause status should progress cautiously:

```text
Unknown
  -> possible area
  -> suspected cause
  -> confirmable cause
  -> technician-confirmed cause
  -> repair performed
  -> verified repair
```

Rules:

- no automatic confirmed cause;
- no confirmed cause without required evidence;
- contradictions must be visible;
- multiple causes must remain possible when evidence supports them;
- intermittent faults may remain unresolved with documented reproduction attempts.

## 8. Handoff workflow

Advisor handoff packets should be created when:

- more diagnostic authorization is needed;
- a suspected cause requires customer authorization for deeper testing;
- a cause is confirmed and repair planning can begin;
- repair is complete and verification evidence is ready.

Handoff packet states:

- `NEEDS_MORE_DIAGNOSIS`;
- `TEST_AUTHORIZATION_REQUIRED`;
- `SUSPECTED_CAUSE_REVIEW`;
- `CONFIRMED_CAUSE_REPAIR_RECOMMENDED`;
- `REPAIR_VERIFICATION_COMPLETE`;
- `INCONCLUSIVE_ESCALATION_REQUIRED`.

## 9. Safety rules

The console must gate or warn for:

- high-voltage systems;
- fuel pressure;
- airbag/SRS work;
- lift/support hazards;
- rotating components;
- hot surfaces/cooling pressure;
- brake hydraulic safety;
- ADAS calibration prerequisites;
- road-test safety;
- module programming risk;
- hazardous materials.

Safety gates should be clear, short, and unavoidable when risk is material.

## 10. Enterprise diagnostic quality rules

The console should enforce these quality principles:

- The original concern stays visible.
- The next action is always clear.
- Evidence and conclusion stay separate.
- Known issues inform diagnosis but do not replace it.
- Broad language triggers guided clarification.
- Missing evidence triggers abstention.
- Contradictions are never hidden.
- Technician authority remains explicit.
- Advisor output is simplified but truthful.
- Learning is reviewed before activation.
- Licensed-source boundaries are visible.
- AI remains gated until approved.

## 11. Domain workflow examples

### Transmission replacement concern

When the concern is “transmission replacement,” the console should:

- identify transmission/drivetrain domain;
- ask whether this is a confirmed repair, customer request, or diagnostic concern;
- check history, known issues, bulletins, programming requirements, and fluid/service details;
- present related considerations such as seals, fluid, filter, cooler flush, mounts, axle seals, converter, programming/adaptation, road test, and verification;
- avoid assuming replacement is required unless already confirmed.

### Engine issue concern

When the concern is “engine issue,” the console should:

- avoid “no issue found”;
- ask what symptom exists: no-start, misfire, noise, leak, overheating, lack of power, smoke, stall, warning light, rough idle;
- map the response to the appropriate domain rule pack;
- suggest first evidence steps such as scan, visual inspection, fluid check, voltage check, live data, or symptom reproduction depending on context.

### Door repair concern

When the concern is “door repair,” the console should:

- identify body/trim/electrical overlap;
- open a repair-area tree: shell, hinges, latch, handle, lock actuator, wiring harness, glass, regulator, mirror, weatherstrip, trim, speaker, intrusion beam, paint/refinish, blend panels, calibrations if applicable;
- show part/diagram placeholders only when licensed source is connected;
- support estimate/labor-guide handoff without turning body repair into mechanical-only logic.
