# Automobile and Light-Truck Brake Baseline

Version: `brakes-light-duty-v1`, 2026-10-16.

## Scope and review locations

The shared catalog contains 119 internally authored operations in eight groups, covering the 21 audited brake families below. Both `/diagnostics/labor-guide` and `/prototype/repair-explorer` consume this definition for new selections. This is a catalog-coverage baseline, not a claim that every vehicle configuration or every possible repair has been independently verified.

Passenger cars, SUVs, minivans, pickups and light trucks are in scope, including passenger diesel, hybrid/EV and electronic brake configurations. Vehicle-side light-truck trailer controllers/output are included; trailer brake assemblies, heavy commercial air brakes, semis and construction vehicles are not. Old heavy/trailer preview definitions remain in the legacy source, but are no longer offered in the active brake browser. Existing saved line descriptions, hours and prices are not migrated or repriced.

## Coverage matrix

All rows have catalog coverage. All labor allowances remain **unvalidated internal planning assumptions**. No row is a verified OEM book time or measured technician-hour standard.

| Audited family | Included catalog coverage | Important boundary |
| --- | --- | --- |
| Pads | Front/rear pad-only and combined pad/rotor packages; wear sensors | Axle sets versus separately serviceable sensors; inspect applicability |
| Rotors | Front/rear rotor-only, thickness/runout measurements and machining | Machining only when permitted and within vehicle-specific limits |
| Calipers | All four corners plus the existing unpositioned front reference | One caliper, not an axle pair; specify side for legacy reference |
| Caliper service | Brackets, slides/pins/boots, serviceable bleeders, rebuild kits, dust shields | Only separately serviceable units; seized extraction is revised scope |
| Drum components | Shoes, drums, wheel cylinders, hardware, adjusters and backing plates | Axle versus individual-unit quantities stated in scope |
| Drum measurement | Diameter/runout measurement and permitted machining | Manufacturer maximum diameter and surface limits required |
| Master/reservoir | Master cylinder and fluid reservoir | Required preparation/affected-circuit bleed included |
| Lines/hoses | Flexible hoses, routed fabricated sections, fittings/unions and proportioning valves | Specify routing, section length, affected unit and materials |
| Bleeding/fluid | Full exchange, affected-circuit bleed and electronic ABS bleed | Distinct scopes; no automatic full-exchange charge for a caliper/master/HCU replacement |
| Conventional assist | Vacuum booster/pump/hose/check valve, hydroboost and its hoses; supply test | Confirm assist type and applicable procedure |
| Electronic assist | Servo/booster, integrated assembly, serviceable simulator/accumulator and fault diagnosis | Equipment, trained staff, safe deactivation and supported procedures required |
| Mechanical parking | Cables, shoes, pedal/lever, equalizer/linkage, switch and adjustment | Configuration and holding/release checks required |
| EPB | Actuator/module, service mode, initialization and diagnostic paths | Review included service-mode/reset work before adding standalone operations |
| ABS | Hydraulic unit, separate control module, wiring and programming/init | HCU includes required supported bleed/init; no duplicate included scope |
| Wheel-speed sensing | Sensor, serviceable tone ring, wiring/connector and encoder inspection | Integrated hub/encoder replacement is cross-referenced to Tires & wheels |
| Stability control | Steering angle, yaw and pressure sensors; applicable calibrations | Match exact vehicle equipment and calibration requirements |
| Pedal controls | Pedal/pivot, stop-light switch, pedal sensor, adjustment/calibration and signal diagnosis | Unit/configuration review; related network faults may need Electrical |
| Symptom diagnosis | Noise/vibration, drag/pull, soft/hard pedal, leaks, fade/stopping distance, warnings, contamination, intermittent/communication concerns, plus subsystem faults | Findings do not automatically add repairs; deeper testing needs revised scope |
| Regeneration | Friction/regen coordination diagnosis and calibration | Hybrid/EV configuration, supported tools and safe procedures required |
| Final verification | Brake inspection/measurement record and standalone post-repair verification | Verification plans are not completed technician release records; do not double-charge included checks |
| Light-truck towing | Vehicle controller replacement/configuration, output wiring and output diagnosis | Vehicle side only; no trailer assemblies or heavy-truck systems |

## Staff workflow and estimating safeguards

1. Choose a brake group, then a repair or diagnostic path. The regular guide no longer truncates groups at 12 operations. Existing diagram targets now also link rotor-only, measurement/machining, brackets and permitted rebuild options. The original drawing remains a generic front-disc schematic, not an illustration of every brake subsystem or vehicle.
2. Open **Scope, parts & safety checks** only when needed. It states unit/axle/side, inclusions, exclusions, parts quantities, applicability, verification expectations, related systems and labor provenance. Procedure steps, torque values and OEM part numbers are not fabricated.
3. Component parts enter the regular estimate as pending-price placeholders without invented part numbers. Confirm or replace quantities/materials against the exact vehicle and price them. Diagnostic-only operations do not automatically add replacement parts. Editing a policy-generated pending part now persists that line instead of losing its changes; a stored requirement key preserves its association if the description is changed.
4. Before official presentation, staff must record brake configuration/unit/side and shop capability, an applicable procedure/labor-basis reference, and a verification/materials plan. Existing vehicle, labor-source, part-fitment/pricing, tax and shared-access reviews still apply. A vehicle/work/reference change requires review again. Transferring proposed work to another RO clears brake references along with the other applicability reviews.
5. Included-package and incompatible-alternative guards run in preview selection/draft loading, regular selection and server estimate controls. Examples: combined pads/rotors versus its individual replacements, rotor replacement versus machining, caliper replacement versus rebuild, HCU versus its included ABS bleed, actuator versus included initialization. A shared-labor note cannot override duplicate included scope. Legitimate caliper plus pad/rotor work remains possible with shared-access review; deductions are not guessed automatically.
6. Presentation records the shared baseline version, internal/unvalidated provenance, proposed minutes, scope definition and staff reviews. Presented estimates and saved prices are not automatically rewritten. Existing customer-authorization and approved-job services remain the downstream execution boundary.

## Validation and limitations

Unit coverage checks all 21 families, operation identity uniqueness, parity between both guides, planning/source labels, parts quantities/pending pricing, line-key limits, package conflicts, draft compatibility and brake review invalidation. Server tests exercise required references and ensure failures occur before persistence. Isolated browser checks cover editable pending parts, removal of automatic fluid exchange, operations beyond the old 12-row limit, review payloads, cleared references on vehicle transfer, responsive layout and control accessibility. Browser fixture APIs do not write live customer, estimate or RO data.

Read-only comparison with the committed preview catalog confirms every prior core brake operation ID is still recognized and all eleven other system definitions are unchanged. The active preview totals 12 systems, 82 groups and 925 operations after the brake expansion and removal of heavy/trailer brake groups from browsing.

Remaining work is explicit: vehicle-specific applicability/service-procedure evidence, verified supplier/fitment integration, measured completed-job labor studies and independent approval of standards. The existing completed-job reporting preview remains browser-local; these catalog changes do not create a centralized validated labor database, confirm shop training/equipment, add OEM diagrams, or enforce a new technician-completion/release workflow. The separate guided brake-workflow preview retains its editable illustrative quote fixture; it is not the canonical catalog or a live RO execution system.

**Next slice:** apply the same coverage-and-scope audit to Steering & suspension after brake review. No steering/suspension catalog revision is included in this baseline.
