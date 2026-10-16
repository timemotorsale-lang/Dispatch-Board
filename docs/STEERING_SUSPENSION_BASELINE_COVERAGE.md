# Steering and Suspension: Automobile/Light-Truck Baseline

Version: `steering-light-duty-v1`, 2026-10-16.

## Implemented scope

The regular Labor Guide and Repair Explorer share **150 operations, ten groups and 18 audited coverage families**. Passenger cars, SUVs, minivans, pickups and light trucks are in scope, including their hydraulic/electric steering, conventional/air suspension and adaptive systems. Heavy commercial vehicles, construction equipment and trailer suspension are outside this baseline. Catalog presence does not establish that the shop has the tools, training or authorization to execute specialized work.

This is an internally authored coverage baseline, not proof of every VIN configuration or every imaginable repair. All hours are **unvalidated planning allowances**, not licensed OEM/enterprise book times or measured technician-hour standards.

Review in `/prototype/repair-explorer` → **Steering & suspension**, or `/diagnostics/labor-guide` → **Steering & Suspension**. The existing isolated previews and governed live estimate/authorization/job services remain separate; no new execution system or schema migration is introduced.

## Coverage matrix

Every row is cataloged; vehicle-specific evidence and labor validation remain outstanding for every row.

| Family | Catalog coverage | Boundary / refinement |
| --- | --- | --- |
| Control arms | Generic/side-specific front lower/upper arms; complete lower arms with supplied joint/bushings | Complete-with-components is distinct from an arm with unspecified contents |
| Ball joints | Side-specific lower/upper joints and legacy front-joint reference | Separately serviceable only; confirm pressed/bolted/integrated design |
| Bushings/hardware | Arm pivots, subframe bushings, pivot/eccentric hardware and rear link bushings | Identify pivot, axle/side and supplied contents; one-time-use hardware requires review |
| Knuckles/carriers | Front knuckle and rear suspension carrier operations | Hub/bearing work remains cross-referenced, not automatically added |
| Subframes | Front/generic and rear subframe replacement and mount/bushing scope | Confirm support equipment and drivetrain/battery/structural access |
| Gear/linkage | Rack, gearbox, inner/outer tie rods, boots/mounts, pitman/idler/drag/center links, shaft and steering damper | Side-specific tie rods; supplied rack contents and shared access reviewed |
| Hydraulic assist | Pump, reservoir, pressure/return/suction hoses, cooler, fluid service and circuit bleed | Required affected-circuit bleed included with replacement; no automatic full exchange |
| Electric assist | Serviceable motor/module, wiring, calibration/programming and complete EPS rack | Complete EPS assembly includes supplied motor/module and supported initialization; no duplicate billing |
| Column/wheel | Column, bearing, wheel, tilt/telescope actuator, lock, coupling and diagnostic paths | Follow vehicle-specific restraint/clock-spring precautions; SRS repairs are separate |
| Shocks/struts | Front/rear corner operations, both-side packages, transferred-parts versus complete loaded struts, mounts/bearings/boots | A loaded strut includes supplied spring/mount; opposite corners remain separately selectable |
| Springs | Front/rear coils/isolators, leaf spring, shackle/hanger, U-bolt, bump stop, torsion bar/adjuster | Stored-energy equipment/training required; hanger/structural work needs a separate capability decision |
| Stabilizers | Front/rear links, both rear links, bar/bushings and active anti-roll actuator/calibration | Match axle/side, pressure/electrical precautions and supplied units |
| Rear links | Generic/corner rear arms, toe/camber/lateral/trailing links, track bar and carrier | Specify the exact link/design; no automatic assumption that all geometry is adjustable |
| Air suspension | Spring, compressor, valve block, reservoir, dryer, sensor/linkage, line and height calibration | Passenger/light-truck systems only; safe deactivation, lift/service mode and leak/height verification required |
| Adaptive damping | Electronic damper, controller, wiring and programming | Verify system design and supported tools; no assumed universal relearn |
| Alignment | Four-wheel/front-wheel adjustment, selected-angle adjustment, measurement-only, permitted cam/shim hardware and out-of-range diagnosis | Staff must make and explain an alignment decision; no automatic universal charge |
| Symptom diagnosis | Clunk/noise/play, pull/wander/bind/free play, assist loss/leaks/warnings, bounce/sag/harshness/vibration, rear steer, impact and adaptive faults | Findings do not authorize component replacement; deeper diagnosis needs revised scope |
| Verification | Standalone steering/suspension verification plus operation-specific checks | Estimate verification plan is not a completed technician release record; do not charge included checks twice |

## Staff workflow and controls

1. Choose a group, then a repair or diagnostic path. Open **Scope, parts & safety checks** only when needed for unit/axle/side, included/excluded work, parts quantities, applicability, conditional follow-ups, verification, related systems and provenance. Exact repair-name matches now open ahead of loose matches such as “front/left” in another system.
2. Replacement parts enter the regular estimate as pending-price placeholders with no fabricated OEM part number. Confirm fitment, supplier pricing, quantity, materials and one-time-use hardware. Diagnostic-only operations do not automatically add replacement parts. Existing pending-part editing/requirement association is reused.
3. Before official presentation, record configuration and axle/side/assembly contents/capability, applicable procedure and labor basis, and a verification/calibration plan. References are staff-reviewed, not independently validated or retrieved from an OEM integration.
4. Choose an alignment decision and record the reason/reference: **separate line**, **included in reviewed scope/hours**, **not required**, or **separately scoped referral**. Separate-line selection requires an actual selected alignment operation. Included/not-required/referral decisions cannot coexist with a separate alignment labor line. Referral does not book a vendor, create a quote, authorize work or waive the existing vendor/authorization gates.
5. Guards run in regular/preview selection, preview draft loading and server estimate controls. They distinguish complete loaded struts from transferred-component work, complete arms from supplied joint/bushing work, axle packages from individual corners, generic versus corner aliases, complete EPS assemblies from included module/motor/programming, and alternative alignment packages. An overlap note cannot override duplicate/incompatible scope.
6. Legitimate extra work, such as replacing a worn mount while transferring parts to a bare strut, remains possible. Shared-access warnings require staff explanation/adjusted hours; the system does not invent labor deductions. Generic unspecified-side entries are conservative; choose a scoped/corner operation when working on another location.
7. Work, vehicle, price, reference or alignment-decision changes invalidate reviewed scope. Vehicle/RO transfer clears steering references alongside brake/source/fitment reviews. Readiness uses the same estimate-control validation as presentation rather than merely trusting a checked box.
8. Official presentation snapshots the baseline version, internal/unvalidated provenance, reviewed definition and proposed minutes. Existing saved line amounts and presented estimates are not silently repriced or rewritten.

## Compatibility and validation

A read-only comparison against commit `467230aa` recognizes all 71 prior preview steering operation IDs and confirms all eleven other preview system definitions—including the approved brake baseline—are unchanged. All ten legacy regular-guide steering IDs remain recognized. Moved rear link operations retain legacy aliases. The preview now totals 12 systems, 85 groups and 1,004 operations. Related Tire/Alignment aliases are recognized for conflict checks without rewriting that system's catalog data.

Tests cover the 18 families, unique identities/aliases, regular/preview parity, pending parts and key lengths, historical draft amounts, side-aware package conflicts, shared access, conditional alignment consistency, malformed/stale reviews and server refusal before writes. Isolated browser checks exercise real staff-facing selection, pending-part pricing, required reviews, adding the actual alignment line, duplicate-scope refusal, payloads, mobile layout and field accessibility. Broader preview regression checks retain all-system diagrams, keyboard targets, zoom, draft save/load, technician-report preview and catalog fallback paths. Fixture APIs do not write live customer/RO/estimate data.

## Still not claimed

No verified vehicle-fitment service, OEM procedure subscription, OEM torque instructions, model-specific diagrams, measured-hours database or independently approved labor standards have been added. The illustration remains a generic front MacPherson layout; rear, air/adaptive, column and gearbox work is available through the full catalog, not newly illustrated anatomy. The scope flags do not certify shop equipment/training or replace manufacturer safety procedures. Technician completion/release gates and existing customer authorization are not replaced by estimate-plan checklists.

**Next:** review this steering/suspension slice, then choose the next automobile/light-truck system for the same coverage audit. Other systems have not been declared audited by this change.
