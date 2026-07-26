# Technician Troubleshooting Console Roadmap and Milestones

**Status:** Adopted planning baseline  
**Date:** 2026-07-25  
**Implementation style:** Safe vertical slices, evidence-gated rollout

## 1. Safe implementation strategy

Do not build the entire elite console in one prompt or one large change.

The safe approach is:

1. build the console shell and read-only context;
2. add deterministic intake normalization;
3. add vehicle intelligence checks;
4. add common-cause and known-issue scaffolding;
5. add next-best-test recommendations;
6. add evidence capture;
7. add advisor handoff readiness;
8. add review/learning loops;
9. prepare AI surface while keeping it gated.

Each slice should be independently testable and shippable behind feature flags or controlled pilot gates.

## 2. Release phases

### Phase 0 — Documentation and approval

Goal: lock product direction before code.

Deliverables:

- approved mockup;
- architecture;
- roadmap;
- algorithm and diagnostic logic catalog;
- workflow/rulebook;
- implementation acceptance criteria.

Exit gate:

- product owner accepts evidence-first and AI-gated design.

### Phase 1 — Console shell and case context

Goal: create the troubleshooting workspace without diagnostic automation.

Deliverables:

- route or panel entry point;
- case header;
- RO/vehicle/concern context;
- technician role boundary;
- read-only vehicle/repair history placeholders;
- gated Master Technician panel placeholder.

Acceptance:

- technicians can open the console from a diagnostic case;
- no cause is suggested without rules;
- AI panel is visible as future/gated only.

### Phase 2 — Diagnostic intake and language normalization

Goal: make vague concern wording useful without AI.

Deliverables:

- symptom vocabulary;
- synonym dictionary;
- system/category matcher;
- concern condition parser;
- severity/frequency/trigger capture;
- missing-information prompts.

Acceptance:

- “engine issue,” “engine noise,” “transmission issue,” “won’t shift,” “grinding while braking,” and similar broad phrases route to useful next questions rather than “no issue found.”

### Phase 3 — Vehicle intelligence check

Goal: require known-information review before deep diagnosis.

Deliverables:

- recall check slot;
- service bulletin / campaign / warranty extension slot;
- known vehicle issue library;
- prior repair history review;
- source/applicability status;
- “clue, not conclusion” labels.

Acceptance:

- console can show known intelligence status;
- unavailable licensed sources are clearly marked;
- no known issue auto-confirms a cause.

### Phase 4 — Common-cause and hypothesis scaffolding

Goal: rank possible diagnostic directions transparently.

Deliverables:

- common-cause library schema;
- support/contradiction/missing-evidence model;
- domain rule-pack selector;
- qualitative ranking states;
- explanation panel.

Acceptance:

- every ranked candidate explains why it appears;
- contradictions reduce or block candidate strength;
- unknown remains allowed.

### Phase 5 — Next-best-test planning

Goal: guide the technician toward efficient evidence collection.

Deliverables:

- test definitions;
- prerequisites;
- tools and safety requirements;
- expected observations;
- alternative eligible tests;
- override reason capture.

Acceptance:

- tests are recommended only when prerequisites are met;
- unsafe or inapplicable tests are blocked or marked unavailable;
- technician can choose a valid alternative.

### Phase 6 — Evidence and measurement capture

Goal: make evidence easy to record and hard to confuse with conclusions.

Deliverables:

- observations;
- measurements with units;
- scan/DTC/live-data summaries;
- media/attachment linkage;
- author/time/source lineage;
- correction/supersession handling.

Acceptance:

- evidence is traceable;
- units are validated;
- edited evidence preserves lineage.

### Phase 7 — Advisor handoff readiness

Goal: turn diagnostic progress into safe advisor language.

Deliverables:

- handoff readiness states;
- customer-safe summary;
- authorization request wording;
- estimate/labor-guide bridge;
- “needs more diagnosis” handoff.

Acceptance:

- advisor sees what is known, suspected, confirmed, and still needed;
- no handoff overstates certainty.

### Phase 8 — Review, training, and learning

Goal: improve the shop knowledge base safely.

Deliverables:

- manager/master-tech review queue;
- confirmed outcome capture;
- common-cause update proposals;
- rejected pattern records;
- replay scenarios.

Acceptance:

- new rules require review before production activation;
- outcomes can be audited.

### Phase 9 — AI-ready Master Technician assistant

Goal: prepare, not activate, AI help.

Deliverables:

- context packet builder;
- retrieval-source boundary;
- prompt/response audit shape;
- abstention policy;
- gated UI state.

Acceptance:

- AI remains disabled unless separately approved;
- app behavior remains useful without AI.

## 3. Milestone list

| Milestone | Name | Primary outcome |
| --- | --- | --- |
| TTC-001 | Official documentation package | Architecture, roadmap, algorithms, and workflows adopted. |
| TTC-002 | Console shell | Case-aware troubleshooting surface exists. |
| TTC-003 | Intake intelligence | Concern wording maps to symptoms and missing questions. |
| TTC-004 | Vehicle intelligence check | Recall/TSB/known issue/history panel exists with source status. |
| TTC-005 | Rule-pack foundation | Domain packs can be registered and selected. |
| TTC-006 | Common-cause ranking | Candidates display support, contradiction, and missing evidence. |
| TTC-007 | Next-best-test engine | Safe, explainable tests and alternatives appear. |
| TTC-008 | Evidence capture | Measurements and observations are traceable. |
| TTC-009 | Advisor handoff | Diagnostic status becomes advisor-safe. |
| TTC-010 | Review and learning | Confirmed outcomes can propose future library updates. |
| TTC-011 | AI-ready gate | Master Technician assistant remains gated but structurally prepared. |

## 4. Pilot safety gates

Before live pilot:

- no AI cause confirmation;
- no licensed-source placeholder shown as real data;
- all recommendations show source and reason;
- technician can reject or override suggestions with reason;
- uncertainty states are visible;
- advisor handoff distinguishes suspected from confirmed cause;
- audit trail exists for evidence and recommendations.
