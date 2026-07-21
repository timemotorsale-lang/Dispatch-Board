# DGN-004 — Knowledge Source and License Register

**Status:** Implemented governance register; no content ingestion authorized  
**Date:** 2026-07-20  
**Gate contribution:** `DG-G0`

## Decision

No diagnostic fact, threshold, procedure, diagram, waveform, known fix, case, or external data enters active knowledge until its authority, rights, applicability, version, storage/derivation permissions, update method, reviewer, and withdrawal path are recorded.

Public accessibility is not proof of permission to copy, transform, store, redistribute, or train on content.

## Source classes

| Code | Source class | Authority | Initial disposition |
| --- | --- | --- | --- |
| `SRC-OEM-SUB` | Licensed OEM service subscription | Authoritative within exact vehicle/market/revision | Candidate; contract review required per provider |
| `SRC-OEM-TOOL` | OEM diagnostic tool/session output | Authoritative for supported function/session | Candidate via lawful export/adapter; no scraping/bypass |
| `SRC-REG` | Government recall/campaign/safety data | Authoritative for published regulatory purpose | Candidate; verify terms, freshness, VIN/market scope |
| `SRC-STD` | Standards/specifications | Authoritative within licensed standard scope | Reference only until usage rights confirmed |
| `SRC-COMMERCIAL` | ALLDATA/Bosch/TEXA/other licensed information | Vendor authority and coverage | Candidate only under explicit integration/content rights |
| `SRC-TOOL` | Scan/scope/meter/device data | Observed/measured evidence subject to device quality | Candidate using documented export/API and calibration metadata |
| `SRC-SHOP-PROC` | Shop-created approved procedure | Local operating authority | Candidate after technical/safety review and scenario validation |
| `SRC-ENGINEERING` | App-owned formulas/models from lawful knowledge | Derived engineering authority | Candidate with derivation, units, assumptions, review, tests |
| `SRC-VERIFIED-CASE` | Completed verified diagnostic case | Case evidence, not universal truth | Candidate for governed similar-case retrieval; privacy/rights apply |
| `SRC-COMMUNITY` | Community/peer fix or waveform | Advisory | Never authoritative; validate applicability and evidence |
| `SRC-AI` | Generated output | Draft only | Cannot be source authority or training truth without verified provenance |
| `SRC-UNKNOWN` | Unattributed/unclear source | None | Prohibited from active use |

## Required source record

- source ID, provider/owner, class, product/document/dataset;
- subscription/license/terms reference and legal reviewer;
- permitted access, storage, caching, display, transformation, export, derived-work, model-training, and retention uses;
- prohibited uses and user/location/device/seat constraints;
- revision/release/market/language and retrieval time;
- vehicle/system applicability and exclusions;
- checksum/signature where available;
- update frequency, freshness SLA, expiration, withdrawal signal;
- technical reviewer, rights reviewer, approval state;
- affected-artifact/case query and replacement/rollback route.

## First-workflow source register

| Register ID | Needed content | Planned source strategy | Activation decision |
| --- | --- | --- | --- |
| `DGN-SRC-001` | Vehicle identity/configuration | Canonical Vehicle Registry plus lawful VIN/configuration provider where approved | Internal identity usable; external decode not assumed |
| `DGN-SRC-002` | OEM no-start procedures/specifications | Per-make licensed OEM subscription or licensed aggregator | `HOLD` until provider/terms selected |
| `DGN-SRC-003` | Wiring/connector/terminal data | Licensed OEM/commercial information | `HOLD`; no copying from unsupported sources |
| `DGN-SRC-004` | DTC/live-data/active-test meaning | OEM tool/source or licensed coverage provider | `HOLD`; generic OBD facts separated from OEM meaning |
| `DGN-SRC-005` | Engineering calculations | App-owned reviewed unit-safe library with cited derivation | `APPROVE_FOR_DESIGN`; runtime validation pending |
| `DGN-SRC-006` | Scan-session evidence | Certified/documented adapter export | `HOLD` pending adapter decision |
| `DGN-SRC-007` | Meter/scope/waveform evidence | Device-native raw export with settings/calibration | `HOLD` pending adapter/file contract |
| `DGN-SRC-008` | Known-good waveforms | Licensed vendor or shop-created qualified captures | `HOLD`; community examples advisory only |
| `DGN-SRC-009` | Recalls/campaigns | Official regulator/OEM source | `APPROVE_FOR_DESIGN`; exact API/terms pending |
| `DGN-SRC-010` | Shop no-start procedure | Qualified local authoring from approved sources | `APPROVE_FOR_AUTHORING`, not activation |
| `DGN-SRC-011` | Historical verified cases | App-owned cases under privacy/retention policy | `APPROVE_FOR_SCHEMA`; retrieval deferred |
| `DGN-SRC-012` | Benchmark product observations | Dated hands-on evaluation, no proprietary extraction | `APPROVE_FOR_REQUIREMENTS_ONLY` |

## Data handling rules

- Store citations and safe references even where licensed content cannot be copied.
- Never expose restricted source content to unauthorized users or downstream events.
- Separate provider facts, shop-authored interpretation, derived calculation, case evidence, statistics, and AI output.
- No private/proprietary case or document is used for external model training without explicit governance.
- Retrieval indexes inherit source permissions, expiration, deletion, and withdrawal.
- A generated summary never becomes the authoritative source.

## Withdrawal workflow

`WITHDRAW SOURCE -> SUSPEND DEPENDENT ACTIVE KNOWLEDGE -> IDENTIFY AFFECTED CASES -> BLOCK NEW DEPENDENT CONFIRMATION -> REVIEW PUBLISHED CONCLUSIONS/OPEN WORK -> REPLACE OR RETIRE -> PRESERVE HISTORICAL LINEAGE`

Withdrawal does not silently rewrite a historical case. It marks present applicability and triggers impact review.

## Prohibited acquisition

- scraping behind authentication or contrary to terms;
- copying proprietary databases, diagrams, test plans, or UI assets without rights;
- circumventing secure gateway, subscription, encryption, or technical controls;
- importing anonymous forum claims as facts;
- reverse engineering for security bypass;
- retaining source content after rights expire when the agreement prohibits it.

## Exit result

The source classification, required metadata, initial register, holds, and withdrawal contract are complete. No external source has been selected or ingested. DGN-020 cannot activate vehicle-specific no-start knowledge until the relevant `HOLD` entries are resolved.

**Disposition:** `DGN-004` complete as a source-rights governance milestone.

