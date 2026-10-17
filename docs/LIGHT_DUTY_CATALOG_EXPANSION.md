# Ten-system catalog expansion — six implementation groups

## Implementation status

`light-duty-expansion-v1` implements expanded, shared definitions for the **ten remaining catalog systems**. The six entries below are the implementation order, not six additional vehicle systems. Cooling is an Engine subsystem in Repair Explorer; starting/charging is within Electrical; fuel is within Engine. The existing guide retains its familiar system headings and legacy line identities. No new competing catalog database, timer, authorization service or pricing backend is introduced.

The preview now offers **12 systems, 91 subsystem groups and 1,349 operations**: the unchanged approved brake baseline (119), unchanged approved steering/suspension baseline (150), and 1,080 operations across 73 expanded groups. Counts include diagnostic/service/verification work, not just replacement components. Net catalog growth from the prior 1,004-operation preview is 345 after additions, duplicate consolidation and removal of out-of-scope heavy-commercial groups.

**Status: implemented for review; awaiting shop approval.** Neither the catalog nor the generic diagrams assert coverage of every imaginable failure, every VIN or every separately serviceable part. Configurations, procedures, independent shop capability reviews and measured technician-hour evidence remain necessary. The connected pilot still enables only approved brakes and steering/suspension. This implementation does not deploy or activate the remaining ten systems in that pilot.

## Review locations

- `/prototype/repair-coverage`: six expandable implementation groups, subsystem counts, diagram discovery references and direct links into each catalog group.
- `/prototype/repair-explorer`: expanded full-width review experience; search, diagnosis/repair selection, progressive scope disclosures and existing diagram aids.
- `/prototype/repair-explorer?system=engine&group=engine-assembly`: direct engine assembly review, including complete engine, dressed assembly, long block, short block, removal/reinstallation, overhaul, mounts and commissioning boundaries.
- `/diagnostics/labor-guide`: existing guide, using the same expanded definitions and staff-reviewed estimate controls. Existing default navigation and vehicle/customer/RO workflow remain intact.
- `/diagnostics/labor-guide?experience=explorer`: approved two-system connected pilot; disabled systems link reviewers to the expanded coverage page rather than implying they are production-approved.

## Six implementation groups

| Order | Implementation group | Groups | Operations | Representative coverage |
| --- | --- | ---: | ---: | --- |
| 1 | Maintenance and scheduled service | 5 | 53 | Oil/filter service, manufacturer/severe-use schedule, fluids, belts, inspections, spare carrier and light-truck towing readiness. Packages require itemized scope; no universal mileage assumption. |
| 2 | Engine mechanical and performance | 11 | 206 | Complete/dressed engine, long/short block, overhaul, mounts, head/valvetrain, block/bearings, timing, lubrication, air/boost, ventilation, controls and commissioning. Cooling/fuel groups appear in orders 3/5. |
| 3 | Cooling, starting/charging and electrical | 9 | 143 | Cooling pumps/valves/fans/caps, filling and diagnostics; battery/start/charge, power distribution, network/waveform diagnosis, grounds, lighting, security, instruments and tow-vehicle wiring. |
| 4 | Transmission, drivetrain and axles | 8 | 138 | Automatic/CVT/DCT/manual assemblies and internal scope, clutch/hydraulics, transfer/PTU/AWD, differential setup, CV/driveshafts, coding/adaptation and verification. |
| 5 | HVAC, fuel, exhaust and emissions | 14 | 219 | Conventional/heat-pump climate systems, rear HVAC and controls; gasoline/light-duty diesel fuel delivery; exhaust/catalyst, EVAP/EGR, DPF/SCR/DEF and targeted diagnostic tests. |
| 6 | Remaining everyday-vehicle coverage | 26 | 321 | Tires/wheels/TPMS/hubs; body/glass/closures/water leaks/interior/accessories; ADAS/SRS/restraints; hybrid/EV drive, charging, battery/thermal and specialist referral. |

The corresponding ten top-level catalog systems are:

| System | Groups | Operations |
| --- | ---: | ---: |
| Maintenance | 5 | 53 |
| Engine, including cooling and fuel | 14 | 284 |
| Transmission and driveline | 8 | 138 |
| Tires and wheels | 4 | 46 |
| Electrical and starting | 8 | 106 |
| Heating and A/C | 6 | 87 |
| Exhaust and emissions | 6 | 91 |
| ADAS and safety | 5 | 57 |
| Body and interior | 10 | 131 |
| Hybrid and EV | 7 | 87 |

The active expansion excludes commercial PTO, industrial cargo/hydraulic liftgate work, heavy-commercial wheels, construction vehicles, semi-trailers and air-brake systems. Passenger/light-truck diesel, minivans, pickup closures and tow-vehicle electrical work remain in scope. Unsupported variants require custom reviewed scope or referral, not a false catalog match.

## Per-operation contract

Each canonical operation records stable identity/aliases, system and family, initial planning hours, diagnosis versus repair, unit/configuration assumptions, inclusions, exclusions, pending-price parts/material allowances, conditional follow-ups, verification expectations, shared access and approval status. Explicitly added allowances and inherited group profiles are internally authored estimates. Illustrative stage allocations are **not** reverse-engineered observations, licensed book times or measured labor records.

The guides share operation definitions. Old existing-guide IDs and titles are retained through canonical alias projection; new IDs are bounded for estimate and derived part key limits. Equivalent CV axle/shaft labels are consolidated, while opposite corners remain distinct. Existing source data is copied before merging so catalog construction does not mutate the inherited source arrays.

Replacement parts and removal/reinstallation materials start with blank part numbers, zero unpriced amounts and `PRICE_PENDING`. One allowance is not a confirmed kit count, fluid capacity or supplier price. Staff must review specification, actual quantities, supplied contents, fitment and retail price. Generic transmission removal/reinstallation no longer assumes a replacement gearbox, fixed-capacity fluids, invented part numbers or an automatic programming charge.

Package/alternative guards cover engine assembly variants and supplied internal work, short-block internals, both-head gasket scope, timing-belt/water-pump package, clutch/flywheel package, condenser/drier package and heater-core/access package. Other shared access produces a review warning, not a fabricated automatic deduction. This is a conservative rule set, not a complete vehicle-specific overlap engine.

## Simple workflow; server-side authority

1. Staff browse a system/subsystem or describe a concern. Concern-only language returns diagnostic/inspection/measurement candidates, not unproven component replacements. Generic engine/transmission concerns use their general diagnostic starting points. Spelling variance is supported. A bare system name remains browsing, not a diagnosis.
2. A diagram callout offers exact illustrated-unit actions and separately labeled **related subsystem catalogs**. Related links do not infer a physical part, axle/side or assembly contents. Every expanded subsystem has a real existing callout discovery path, but not every unit has custom geometry or an exploded OEM illustration.
3. Open progressive scope/parts/safety details only when needed. Add known work or initial diagnosis; package guards refuse duplicate scope.
4. Before official presentation, the existing server requires configuration/unit/quantity, vehicle-specific procedure/labor basis, verification/conditional materials and capability/referral references for each selected expanded system. These reviews are included in the exact-work digest, invalidated on vehicle transfer, and recorded with source/version and `validatedStandard: false`.
5. Existing pricing, fitment, tax, authorization, dispatch, qualification, clock, QC and release services remain authoritative. A text capability plan is not independent proof of technician qualifications or an execution approval.
6. Persistent actual technician clocks remain the source for future labor studies. Generic estimates and preview-reported medians do not become approved standards automatically.

Search indexing now uses linear document-frequency counting, a direct operation/system lookup and bounded fuzzy matching, avoiding catalog-growth quadratic scans. None of this uses an external language model or sends customer data to another service.

## Saved-work compatibility

Saved browser drafts retain their original amounts and IDs/aliases. Expanded-scope conflicts do not silently discard or reprice historic drafts: they load with an explicit review warning. New selection guards and official presentation validation still reject duplicate/incompatible scope. Existing brake/steering draft guards remain unchanged. Official historical estimate versions are not rewritten.

## Safety references and limits

These primary sources inform capability warnings, **not generic repair times or VIN applicability**:

- [EPA motor-vehicle A/C technician and shop resources](https://www.epa.gov/mvac/technician-and-shop-owner-resources), reviewed 2026-10-16: refrigerant servicing capability and approved equipment.
- [NHTSA electric/hybrid vehicle safety](https://www.nhtsa.gov/vehicle-safety/electric-and-hybrid-vehicles), reviewed 2026-10-16: specialized HV training and battery-damage risks.

Use current, configuration-specific manufacturer procedures for actual repair. No vendor diagrams or licensed labor datasets are copied. The generic aid is identification only, never an instruction for SRS probing, HV isolation, refrigerant handling, tire inflation or damaged-battery work. Missing qualifications, procedure or equipment means hold/referral. Structural/refinish entries are scope-planning/referral candidates, not a declaration that the shop is equipped to perform them.

## Verification and remaining approval

The automated coverage matrix checks ten systems/six implementation groups, unique canonical identities/aliases, every group having repair and diagnostic paths, shared main/preview hours and scope, bounded derived keys, pending prices, diagnosis-only parts behavior, diagram discovery, package/alias conflicts and original saved amounts. Exact-service tests require every expanded system's review before estimate writes and record unvalidated provenance after successful mock presentation.

The isolated browser fixture checks the six-group coverage screen, deep links, all ten systems, engine alternative refusal, saved-draft amounts, diagram-to-subsystem discovery, diagnostic paths, mobile width and accessibility. It has no live DB/customer/authorization effects and does not substitute for staging/recovery proof. The original connected brake/steering fixture remains part of CI.

Verification on 2026-10-16: the broad focused run passed 108 tests across 12 files, and the final scope-boundary/presentation checks passed 43 tests across three files. Both browser fixtures, full lint, local typecheck and the final isolated production build passed. The build reused the existing generated Prisma client because this slice has no schema change; clean release-environment generation remains an operational gate. The full regression run reported 4,645 passes, 31 skips and one unrelated existing failure in `task-activity-events.test.ts` (additional reassignment metadata). That failure still blocks a release; no test was skipped or weakened to hide it.

Shop approval of all ten coverage baselines, vehicle-specific procedure/scope review, measured-hour study validation and the existing deployment gates remain pending. Follow `docs/LABOR_PILOT_PRODUCTION_READINESS.md`; missing operational evidence still means HOLD. No commit, push, migration, deployment, rollout activation or customer action is performed by this expansion.
