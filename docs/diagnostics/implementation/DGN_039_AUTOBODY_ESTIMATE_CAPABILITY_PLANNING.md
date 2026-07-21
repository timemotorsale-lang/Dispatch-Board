# DGN-039 — Autobody Estimate Capability Planning

**Status:** Adopted planning only; no runtime implementation  
**Branch:** `codex/diagnostics-dgn-039-autobody-estimate-capability-planning`  
**Date:** 2026-07-21  
**Scope:** Enterprise autobody estimate intelligence planning for body labor, paint/refinish, structural/frame, ADAS/calibration, parts, supplements, insurance/customer-pay workflows, productivity optimization, and repair execution handoff boundaries.

## Executive Decision

Autobody estimating will become a first-class repair domain inside the Release 3 Estimate Intelligence Layer.

It must be designed with the same enterprise standard as mechanical estimating: governed, explainable, source-attributed, advisor-reviewable, financially aware, capacity-aware, and protected from unauthorized execution.

The system should eventually feel like an elite national body-shop estimating console: fast enough for advisor and estimator work, detailed enough for supplements and insurance review, and controlled enough for dealership operations.

This planning record does not implement runtime code, licensed estimating data, insurance integrations, parts ordering, dispatch mutations, repair-job creation, or customer authorization.

## Product Objective

Create an autobody estimate intelligence capability that helps the dealership answer:

- What visible and hidden damage exists?
- Which panels, structures, systems, sensors, trims, and calibrations are affected?
- Which operations are needed: repair, replace, refinish, blend, R&I, R&R, section, measure, pull, calibrate, scan, detail, or sublet?
- What labor categories apply: body, refinish, frame, mechanical, electrical, diagnostic, calibration, glass, trim, detail, or sublet?
- What parts are required, and which are OEM, aftermarket, recycled, remanufactured, LKQ, fastener, clip, adhesive, seam sealer, or material?
- What paint and materials logic applies?
- What supplements are likely?
- What workflow path applies: customer-pay, internal dealership, warranty, insurance, fleet, sublet, or comeback?
- What technician, booth, frame rack, measuring system, scan/calibration, parts, and cycle-time impact should management expect?

## Relationship to Mechanical Estimate Intelligence

Autobody must share the same estimate intelligence architecture as mechanical repairs, but it needs its own repair-domain taxonomy and algorithms.

Shared foundation:

- selected estimate strategy;
- advisor estimate draft contract;
- source/version lineage;
- authority boundaries;
- GP and margin safeguards;
- parts demand boundaries;
- capacity impact model;
- customer explanation;
- audit trail and replay safety.

Autobody-specific extension:

- damage-zone model;
- panel operation graph;
- paint/refinish and blend logic;
- R&I/R&R overlap logic;
- structural/frame measurement logic;
- ADAS and post-repair scan requirements;
- supplement likelihood model;
- insurance/customer-pay workflow rules;
- paint material and consumable logic;
- body-shop capacity and cycle-time optimization.

## Autobody Console Concept

The autobody experience should be a dedicated mode or workspace under Estimate Intelligence / Labor Guide, not a separate disconnected app.

Primary landing zones:

| Zone | Purpose |
| --- | --- |
| Claim / RO / Vehicle Context | VIN, RO, customer, insurer/customer-pay, loss date, claim number when applicable, mileage, trim, color, photos, and intake concern. |
| Damage Map | Vehicle zones, panel selection, photo/evidence attachment, severity, visible damage, hidden damage suspicion, and prior repair evidence. |
| Operation Builder | Repair/replace/refinish/blend/R&I/R&R/section/mechanical/calibration/sublet operation selection. |
| Body Labor Intelligence | Body labor, frame labor, mechanical labor, electrical labor, glass, trim, detail, and diagnostic labor recommendations. |
| Paint & Materials Engine | Refinish hours, blend recommendations, color/tri-coat/material multipliers, booth/load factors, hazardous material fees, and consumable policy. |
| Parts & Procurement | OEM/aftermarket/recycled/LKQ/reman candidate parts, clips/fasteners, adhesives, one-time-use items, availability, ETA, and price confidence. |
| Structural / Frame / Measuring | Frame rack need, measuring setup, pull time, sectioning rules, weld/bond/rivet requirements, corrosion/heat rules, and safety blockers. |
| ADAS / Scan / Calibration | Pre-scan, post-scan, calibration triggers, camera/radar/ultrasonic sensor checks, alignment dependency, road-test and documentation requirements. |
| Supplement Intelligence | likely supplement flags, missing-photo flags, teardown-needed flags, insurer evidence package, and estimator review queue. |
| Capacity / Cycle Time | estimator, body tech, frame tech, painter, booth, parts hold, sublet, calibration, QC, and delivery-readiness impact. |
| Advisor / Estimator Draft | estimate draft lines, customer/insurance explanation, GP safeguard, authority boundary, compare models, and history. |

## Repair Domain Taxonomy

Every autobody estimate operation should be classified by domain:

- `BODY_REPAIR`
- `BODY_REPLACE`
- `REFINISH`
- `BLEND`
- `R_AND_I`
- `R_AND_R`
- `FRAME_STRUCTURAL`
- `MECHANICAL_RELATED`
- `ELECTRICAL_RELATED`
- `ADAS_CALIBRATION`
- `PRE_SCAN`
- `POST_SCAN`
- `GLASS`
- `TRIM`
- `DETAIL`
- `CORROSION_PROTECTION`
- `MATERIALS`
- `SUBLET`
- `ADMIN_DOCUMENTATION`

Every operation must state included work, excluded work, source class, estimate confidence, and whether it is customer-pay, insurance-facing, internal, or supplement-only.

## Core Autobody Algorithms and Logic

### 1. Damage Intake and Severity Classification

Purpose: convert photos, estimator notes, DVI/body inspection notes, and intake concerns into structured damage zones.

Inputs:

- vehicle zone;
- panel/component;
- photo/video evidence;
- estimator notes;
- severity: cosmetic, moderate, severe, structural, safety-critical;
- drivability;
- airbag/SRS indicators;
- ADAS sensor involvement;
- water intrusion;
- prior repair evidence;
- corrosion/rust;
- hidden damage suspicion.

Outputs:

- damage zone record;
- affected panel/component list;
- teardown required flag;
- supplement likelihood;
- safety blocker;
- customer/insurer evidence requirement.

### 2. Repair vs Replace Decision Logic

Purpose: guide whether a panel/component should be repaired, replaced, sectioned, or sent for manager/estimator review.

Decision factors:

- damage area percentage;
- metal/plastic/aluminum/composite material;
- crease/body-line involvement;
- edge/flange damage;
- mounting point damage;
- corrosion;
- prior filler/prior repair;
- structural role;
- OEM repairability guidance availability;
- labor hours versus replacement cost;
- parts availability and ETA;
- cycle-time impact;
- warranty/comeback risk.

Output:

- recommended operation: repair, replace, section, review, or teardown;
- confidence score;
- supporting reasons;
- blocked reasons when unsafe or unsupported.

### 3. Panel Operation Graph

Purpose: prevent missed labor and double-counting across related operations.

The graph tracks:

- primary panel;
- adjacent panels;
- trim removal;
- lamp removal;
- bumper/fascia removal;
- glass/moldings;
- sensors;
- emblems/decals;
- liners/shields;
- clips/fasteners;
- corrosion protection;
- seam sealer;
- weld/bond/rivet dependencies;
- refinishing dependencies.

Output:

- included operations;
- additional required operations;
- overlap deductions;
- missing operation warnings;
- one-time-use material/clip demand.

### 4. R&I / R&R Overlap Logic

Purpose: avoid double-charging and under-charging when multiple operations share teardown.

Examples:

- bumper cover replacement plus headlamp R&I;
- door shell replacement plus mirror/handle/trim R&I;
- quarter panel section plus glass/molding removal;
- radiator support repair plus mechanical cooling stack R&R.

Outputs:

- overlap group;
- included teardown;
- deductible overlap;
- non-overlapping additional labor;
- explanation shown to estimator/advisor.

### 5. Refinish and Blend Logic

Purpose: calculate refinish needs beyond body labor.

Factors:

- panel material;
- panel size;
- partial panel versus full panel;
- adjacent blend panels;
- color type: solid, metallic, pearl, tri-coat, matte, special finish;
- clear coat edge;
- jamb/underside/refinish both sides;
- bumper/plastic prep;
- corrosion protection;
- masking complexity;
- booth cycle;
- tint and spray-out need.

Outputs:

- refinish labor;
- blend labor;
- material charge basis;
- paint complexity multiplier;
- booth/cycle impact;
- customer/insurer explanation.

### 6. Paint Materials and Consumables Engine

Purpose: protect profitability and avoid missing materials.

Includes:

- paint/material rate;
- hazardous material fee;
- seam sealer;
- cavity wax;
- corrosion protection;
- adhesives;
- rivets;
- weld-through primer;
- clips/fasteners;
- masking materials;
- scan/calibration documentation materials;
- detail/cleanup materials.

Rules:

- material fees must be visible;
- no hidden customer-facing charge mutation;
- manager review when material margin falls below policy;
- one-time-use items must be flagged.

### 7. Structural / Frame Logic

Purpose: identify when the repair is beyond cosmetic bodywork.

Triggers:

- rail, apron, pillar, rocker, quarter, floor, roof, radiator support, suspension pickup, or frame involvement;
- uneven panel gaps;
- wheel alignment impact;
- airbag deployment;
- severe impact zone;
- pull/measuring requirement;
- weld/bond/rivet/sectioning operation;
- corrosion in structural repair area.

Outputs:

- frame rack requirement;
- measuring setup requirement;
- pull labor;
- sectioning review;
- OEM procedure requirement;
- manager/structural technician review;
- safety blocker when repair data is insufficient.

### 8. ADAS, Scan, Calibration, and Safety Logic

Purpose: ensure body repairs do not miss modern safety system requirements.

Triggers:

- bumper/fascia removal;
- grille, windshield, mirror, quarter, radar, camera, ultrasonic, blind-spot, lane camera, parking sensor, or ride-height sensor involvement;
- alignment/suspension involvement;
- airbag/SRS light;
- battery disconnect;
- module replacement;
- structural measurement variance.

Outputs:

- pre-scan;
- post-scan;
- static calibration;
- dynamic calibration;
- alignment dependency;
- road-test requirement;
- calibration evidence package;
- blocked delivery until proof is attached.

### 9. Parts Selection and Substitution Logic

Purpose: help estimators choose appropriate parts while protecting authority boundaries.

Part classes:

- OEM;
- aftermarket;
- CAPA/certified aftermarket when applicable;
- recycled/LKQ;
- remanufactured;
- dealer-stock;
- internal inventory;
- clip/fastener kit;
- adhesive/material kit;
- sublet item.

Decision factors:

- customer-pay versus insurance;
- insurer guidelines;
- availability;
- ETA;
- price;
- fitment confidence;
- safety-critical status;
- sensor/calibration compatibility;
- prior supplement risk;
- core/return handling.

Boundary:

- the autobody engine may recommend candidate parts and demand signals;
- only the Parts authority may reserve, order, substitute, or receive parts.

### 10. Supplement Likelihood and Teardown Logic

Purpose: predict when an initial estimate is likely incomplete.

Signals:

- hidden damage zone;
- structural trigger;
- bumper/cover damage with sensor area;
- crushed absorber/reinforcement suspicion;
- prior repair evidence;
- poor photo coverage;
- missing underside photos;
- parts availability uncertainty;
- repair vs replace confidence below threshold.

Outputs:

- supplement risk score;
- teardown recommended;
- required photos/evidence;
- insurer documentation checklist;
- customer expectation language.

### 11. Cycle-Time and Productivity Optimization

Purpose: maximize throughput without overpromising.

Model factors:

- estimator load;
- body technician skill;
- frame technician availability;
- painter/booth load;
- parts ETA;
- sublet ETA;
- scan/calibration availability;
- supplement probability;
- QC/reassembly/detail time;
- delivery deadline;
- rental/loaner pressure;
- bay/parking constraints.

Outputs:

- feasible production path;
- bottleneck flags;
- earliest realistic start;
- earliest realistic completion window;
- parts-hold status;
- booth conflict;
- frame rack conflict;
- calibration conflict;
- manager escalation when promised date is risky.

Boundary:

- capacity output is advisory until the existing dispatch/scheduling authority accepts it.

### 12. Gross Profit and Margin Safeguard Logic

Purpose: protect dealership profitability.

Tracks:

- body labor GP;
- refinish labor GP;
- paint materials GP;
- parts GP;
- sublet markup;
- total repair order GP;
- supplement margin impact;
- discount/override impact.

Rules:

- warn when GP falls below policy floor;
- require review for labor-hour reductions, material-fee removal, heavy discount, low parts margin, or high-risk supplements;
- record manager override reason and checksum;
- never silently reprice customer-facing estimates.

## Workflow Architecture

### Workflow 1 — Customer-Pay Autobody Estimate

```text
Customer concern / visible damage
-> vehicle and RO context established
-> damage zones and photos captured
-> operation graph proposes body/refinish/parts/calibration
-> estimator reviews draft
-> GP and cycle-time safeguards run
-> advisor/customer explanation prepared
-> official estimate authority handles customer presentation and authorization
```

### Workflow 2 — Insurance Claim Estimate

```text
Claim / RO / vehicle context
-> damage photos and claim metadata captured
-> insurer-facing estimate draft prepared
-> repair/refinish/parts/calibration evidence attached
-> supplement risk and teardown needs flagged
-> estimator reviews and exports/hands off through approved insurance workflow
-> supplements are versioned, explained, and audit-linked
```

### Workflow 3 — Internal Dealership / Recon Autobody

```text
Inventory or service vehicle needs bodywork
-> internal RO or work packet context
-> damage map and repair priority captured
-> cost, cycle-time, and sales-readiness impact calculated
-> manager approves scope
-> dispatch/parts/QC authorities execute through existing workflows
```

### Workflow 4 — Supplement Workflow

```text
Teardown or repair reveals additional damage
-> estimator records new evidence
-> affected operation graph recalculates
-> supplement lines are generated as a new draft version
-> insurer/customer explanation is prepared
-> approval authority controls presentation and authorization
```

## Estimate Strategy Support

Autobody must support the same selected-strategy architecture introduced in DGN-038.

Initial strategy modes:

| Strategy | Autobody behavior |
| --- | --- |
| `STANDARD_SHOP_MODEL` | Conservative baseline estimate with visible body/refinish/parts/sublet lines. |
| `THREE_TIER_LABOR_GUIDE_MODEL` | Low/medium/high complexity tiers for body labor, paint/refinish, structural, and calibration operations. |
| `ELITE_ENTERPRISE_MODEL` | Productivity-aware, supplement-aware, margin-protected, cycle-time-aware estimate intelligence. |

## Required Data Contracts

Autobody planning should eventually define these entities:

- damage zone;
- damage photo/evidence link;
- body operation candidate;
- refinish operation candidate;
- R&I/R&R dependency;
- overlap group;
- structural measurement requirement;
- ADAS calibration requirement;
- autobody parts demand candidate;
- paint/material charge model;
- supplement risk evaluation;
- cycle-time projection;
- estimate strategy output;
- estimator review decision;
- manager override decision.

## Authority Boundaries

The autobody estimate intelligence layer may:

- recommend operations;
- generate advisor/estimator draft lines;
- compare strategies;
- calculate overlap;
- flag supplements;
- propose parts demand;
- project capacity/cycle time;
- prepare customer or insurer explanation;
- create audit-linked planning output.

It must not automatically:

- present an official customer estimate;
- submit to insurer;
- request customer approval;
- authorize repairs;
- order parts;
- reserve parts;
- assign body technicians;
- schedule booth/frame/calibration resources;
- promise completion;
- close QC;
- release vehicle.

Those actions remain owned by existing or future Dispatch Board authorities.

## Productivity Optimization Principles

To be elite, the autobody module must optimize for the whole repair flow, not only estimate dollars.

Required optimization principles:

1. Minimize missed operations.
2. Minimize double-counting.
3. Detect hidden-damage and supplement risk early.
4. Protect paint/material profitability.
5. Protect body technician and painter throughput.
6. Avoid booking work before parts and calibration feasibility are known.
7. Separate estimator judgment from automated recommendation.
8. Preserve insurer/customer evidence.
9. Keep every override attributable.
10. Learn from actual cycle time, supplement frequency, comeback, and QC outcomes only through reviewed future adjustment proposals.

## Acceptance Criteria for Future Implementation

Autobody capability should not be considered implementation-ready until planning proves:

- operation taxonomy covers body, paint, structural, mechanical, electrical, ADAS, sublet, and detail work;
- repair/replace/refinish/blend/R&I/R&R/section logic is documented;
- overlap and included-operation rules are explicit;
- paint/material profitability logic is visible;
- structural and ADAS safety triggers are fail-closed;
- supplement workflow is versioned and evidence-backed;
- insurance and customer-pay workflows are separated;
- parts recommendation does not equal parts ordering;
- cycle-time projection does not equal scheduling;
- official estimate/authorization remains downstream;
- no unlicensed proprietary estimating data is copied into the system.

