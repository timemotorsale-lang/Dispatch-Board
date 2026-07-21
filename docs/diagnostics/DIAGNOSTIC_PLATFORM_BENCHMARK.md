# Diagnostic Platform Capability Benchmark

**Version:** 1.0 research baseline  
**Date:** 2026-07-20  
**Status:** Product benchmark; not a procurement recommendation or implementation claim

## 1. Benchmark Position

There is no single universally most sophisticated automotive diagnostic product. The leading capability is distributed across several product classes:

- OEM diagnostic platforms provide the deepest brand-specific authority, test plans, configuration, programming, and security-controlled functions;
- premium multi-brand platforms provide broad coverage, guided troubleshooting, topology, live data, active tests, service information, and known-fix intelligence;
- measurement platforms provide high-fidelity waveform and physical-signal proof;
- repair-information platforms provide OEM procedures, wiring, bulletins, diagnostic flowcharts, probable causes, and verified fixes;
- shop-management platforms coordinate commercial workflow but generally do not own deep evidence-based diagnostic reasoning.

Dispatch Board Diagnostics should benchmark against the **combined capability envelope**, not imitate one product's interface, data, brand, or proprietary implementation.

## 2. Representative Sophisticated Platforms

The following examples are based on official manufacturer/product information available on the benchmark date.

| Platform class | Representative examples | Capability pattern to learn from |
| --- | --- | --- |
| OEM diagnostic ecosystems | BMW ISTA, Mercedes-Benz XENTRY, Toyota Techstream, Ford FDRS/IDS | Exact vehicle applicability, OEM test plans and procedures, fault-code/live-data/active-test workflows, configuration, calibration/programming, secure access, and strict tool/procedure requirements. |
| Broad multi-brand guided diagnostics | Bosch ESI[tronic], TEXA IDC6 | Vehicle identification, broad ECU coverage, guided troubleshooting, interactive wiring, technical bulletins, known/solved problems, service data, secure gateway access, and remote expert escalation. |
| Premium integrated scan/measurement | Snap-on ZEUS+, Autel MaxiSYS Ultra S2 | Whole-vehicle scan, relevant PID filtering, out-of-range highlighting, known fixes, bi-directional controls, network topology, scope/meter integration, protocol support, and digital inspection. |
| Precision measurement | PicoScope Automotive | Guided test setup, high-fidelity waveform capture, known-good waveform comparison, probe/settings validation, and advanced intermittent/mechanical/electrical diagnosis. |
| OEM information and diagnostic intelligence | ALLDATA Repair and Diagnostic Intelligence | Unedited OEM information, interactive wiring, DTC/TSB/flowchart access, probable causes, shortcut tests, known fixes, community evidence, and grounded assistance. |

### Official benchmark references

- [Bosch ESI[tronic]](https://www.boschaftermarket.com/me/en/equipment/ecu-diagnosis/esitronic-software/esitronic/)
- [TEXA IDC6](https://www.texa.com/idc6-software/)
- [Snap-on ZEUS+](https://www.snapon.com/EN/US/Diagnostics/Products/ZEUS-Plus)
- [Autel MaxiSYS Ultra S2](https://autel.com/mk3/4272.jhtml)
- [PicoScope Automotive guided tests](https://www.picoauto.com/library/automotive-guided-tests/)
- [ALLDATA Repair](https://www.alldata.com/us/en/repair)
- [ALLDATA Diagnostic Intelligence](https://www.alldata.com/us/en/support/diagnostic-intelligence/article/diagnostic-intelligence-overview)
- [BMW technical information / ISTA](https://bmwtechinfo.bmwgroup.com/)
- [Toyota TIS / Techstream](https://www.techinfo.toyota.com/techInfoPortal/appmanager/t3/ti?_nfpb=true&_pageLabel=ti_whats_tis)
- [Mercedes-Benz XENTRY description](https://www.mbusa.com/en/certified-collision-repair-center/insurance)

Vendor claims, coverage counts, features, pricing, and licensing change. Product decisions require a dated revalidation and hands-on workflow evaluation.

## 3. Composite Capability Standard

### A. Vehicle and network intelligence

Top-tier target:

- automatic and manual vehicle identification with confidence and conflict handling;
- exact VIN/configuration/market/calibration applicability;
- whole-vehicle module inventory and health scan;
- network topology with module, bus, gateway, and communication state;
- pre-scan/post-scan comparison;
- protocol-ready adapter boundary for OBD-II, CAN/CAN FD, DoIP, J2534, and future approved interfaces;
- secure gateway and credentialed OEM access through lawful, approved integrations.

Dispatch Board position: canonical vehicle/configuration and case correlation belong in the platform; hardware communication should use certified adapters rather than an unsafe home-grown VCI.

### B. Scan, live data, and active testing

Top-tier target:

- DTCs with status, freeze-frame, occurrence context, module, timestamp, and source;
- relevant live-data selection, graphing, recording, comparison, and out-of-range explanations;
- bi-directional controls and functional tests with prerequisites and warnings;
- service functions, relearns, resets, calibrations, coding, and programming only through authorized tool/provider boundaries;
- session capture that becomes structured, attributable evidence.

Dispatch Board position: the console should orchestrate, interpret, preserve, and govern these actions. It must not claim unsupported ECU-writing capability.

### C. Measurement and waveform proof

Top-tier target:

- guided multimeter, current, pressure, vacuum, temperature, and oscilloscope tests;
- automatic or validated channel/probe/range/time-base setup;
- unit-safe calculations and expected tolerances;
- known-good reference waveforms with exact applicability and source;
- cursors, math channels, serial/network decoding, annotations, and comparison;
- raw capture retention plus derived measurement lineage.

Dispatch Board position: hardware-neutral evidence contracts first; Pico/VCMI/scope imports or adapters only after source, file, calibration, and rights validation.

### D. Guided diagnostic reasoning

Top-tier target:

- symptom and DTC entry without equating a code to a failed part;
- system descriptions, wiring, component locations, connector/terminal data, specifications, and test procedures in context;
- ranked hypotheses/known fixes with evidence and applicability;
- step-by-step test plans that adapt to actual results;
- relevant-data filtering and abnormal-value highlighting;
- contradictions, missing evidence, uncertainty, alternatives, and abstention;
- remote expert escalation with the full case, not a lossy note.

Dispatch Board differentiator: expose the entire reasoning chain—support, contradiction, test value, version, and human decision—rather than only presenting a probable fix.

### E. Repair information and knowledge operations

Top-tier target:

- OEM procedures, diagnostic flowcharts, TSBs, recalls/campaigns, wiring, specifications, labor, and calibration information;
- uniform cross-make search while preserving original source meaning;
- known fixes and similar cases separated from authoritative OEM facts;
- daily/versioned content updates, source freshness, withdrawal, and affected-case visibility;
- qualified author/reviewer workflow for shop-created guidance.

Dispatch Board differentiator: every recommendation retains source, license, applicability, version, retrieval time, and exact case usage.

### F. Enterprise workflow and execution

Top-tier target:

- concern-specific diagnostic cases linked to canonical repair orders;
- technician skill/certification, bay, tool, time, and safety readiness;
- test-time tracking separated from repair labor;
- parts/estimate/authorization/dispatch/job/QC handoffs;
- customer-update and promise-risk context;
- post-repair verification against the original concern;
- comeback linkage and outcome attribution;
- manager review, immutable audit, replay safety, monitoring, recovery, and multi-location controls.

Dispatch Board opportunity: this is the principal area in which an integrated operating platform can exceed standalone scan tools and repair-information products.

### G. Assistance, learning, and AI

Top-tier target:

- verified-fix frequency and similar-case retrieval;
- diagnostic time/skill estimates and common-mistake warnings;
- dictation structuring, case summaries, missing-evidence detection, and source-grounded explanations;
- model/rule confidence separated from factual confirmation;
- outcome-based calibration with human approval;
- prompt/model/tool/source versioning, privacy controls, evaluation, monitoring, and kill switch.

Dispatch Board position: AI may draft and explain; qualified people and deterministic gates retain authority.

## 4. Capability Parity and Differentiation Gates

| Roadmap gate | Required benchmark outcome |
| --- | --- |
| `DG-G1` | Case navigation and vehicle/RO context are at least as coherent as a professional diagnostic session manager. |
| `DG-G2` | Evidence/test execution can preserve scan, physical measurement, image, document, and waveform classes with professional provenance. |
| `DG-G3` | Guided no-start workflow matches the clarity of leading guided-test platforms and exceeds code-to-fix tools in evidence/contradiction transparency. |
| `DG-G4` | Diagnostic result connects to estimate, authorization, dispatch, parts, job, QC, and verification without duplicate entry. |
| `DG-G5` | Knowledge governance demonstrates OEM-grade applicability/version discipline and enterprise change control. |
| `DG-G6` | Shop pilot proves usability under real technician time pressure, degraded connectivity, interruptions, and handoffs. |
| `DG-G7` | New system families can be released with consistent multi-brand UX and source-specific truth. |
| `DG-G8` | Verified outcomes improve guidance without substituting popularity for engineering proof. |
| `DG-G9` | AI assistance is more transparent, governed, and operationally integrated than a generic diagnostic chatbot. |
| `DG-G10` | Certified adapters and licensed sources can integrate without making Dispatch Board dependent on one vendor. |

## 5. Benchmark Evaluation Method

Before each major gate, evaluate representative tools hands-on using the same sanitized scenarios:

1. vehicle identification and configuration;
2. whole-system scan and topology;
3. concern capture and reproduction;
4. code/live-data interpretation;
5. guided test selection;
6. physical measurement/waveform workflow;
7. contradiction and insufficient-evidence handling;
8. conclusion and repair handoff;
9. post-repair scan and verification;
10. documentation, audit, collaboration, interruption recovery, and time-on-task.

Score with evidence across:

- technical correctness;
- coverage/applicability;
- diagnostic efficiency;
- measurement quality;
- explanation and uncertainty;
- safety and authorization;
- technician usability;
- workflow integration;
- provenance and audit;
- degraded operation and recovery;
- maintainability, licensing, and total operating cost.

Competitive feature counts do not establish product quality. A feature is accepted only when it improves a governed diagnostic outcome.

## 6. Lawful Interoperability and Originality

- Do not copy proprietary source code, databases, UI assets, test plans, access controls, or protected content.
- Do not circumvent secure gateways, immobilizer controls, subscriptions, or technical protection measures.
- Use licensed APIs, subscriptions, documented exports, certified pass-through interfaces, and clean-room interoperability processes approved for the jurisdiction.
- Preserve vendor/OEM attribution and contractual usage limits.
- Reverse engineering, where considered for lawful interoperability, requires written legal and security review, isolated clean-room procedures, documented scope, and an explicit prohibition on security bypass.
- Build an original Dispatch Board experience around evidence, reasoning, execution, governance, and outcomes.

