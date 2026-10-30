# Autobody Catalog and Diagram Standard

**Status:** Official catalog and diagram standard for `codex/autobody-estimating`, adopted under the [implementation blueprint](README.md). This specifies what must be authored, sourced and verified; it does not claim that the catalog or diagrams already exist.

## Catalog structure

Use the hierarchy **vehicle configuration → area → assembly → component → operation → related work**. Each node has a stable identifier. Display names, synonyms and diagram labels can change without breaking saved estimates. Search supports ordinary words such as fascia/bumper, decklid/trunk and left/driver side, while stored position always uses an explicit vehicle coordinate convention.

Separate structural configuration from cosmetic options and equipment: year/model range, body style, wheelbase where relevant, doors, drivetrain, material, trim, lighting, cameras/sensors and paint system. VIN decoding supplies candidate configuration facts, not proof of every installed option or part fitment. Record the source and verification status of unresolved equipment.

## Comprehensive operation families

| Family | Components and work to cover | Key diagram references |
| --- | --- | --- |
| Bumpers and impact assemblies | Covers, absorbers, beams, brackets, grilles, air guides, liners and sensor mounts | Exterior selection, exploded assembly, attachment and sensor locations |
| Front body | Fenders, hood, hinges, latch, upper/lower supports and front-end trim | Panel relationships, hinges/latch, support assemblies |
| Rear body | Rear body panel, decklid, liftgate, tailgate, truck bed and cargo closures | Rear assembly, closure equipment, bed/attachment variants |
| Doors and closures | Shells, skins, hinges, latches, handles, glass, regulators, seals and component transfer | Door layers, moving components, intrusion/attachment references |
| Side body and roof | Quarters, rockers, pillars, roof skin, rails and associated trim | Side/roof assemblies, material and approved method references |
| Glass and sealing | Windshield, back/quarter/door glass, moldings, adhesives and leak verification | Glass location, bonding boundary and equipment locations |
| Lamps and exterior equipment | Head/tail lamps, mirrors, handles, cameras, brackets and harness sections | Exploded mounting views and relevant sensor locations |
| Interior and trim | Seats, headliner, carpet, trim, instrument panel and access operations | Interior assembly, restraint locations and access relationships |
| Structural and joining | Inspection, measurement, setup, permitted repair/replacement, sectioning, joining and corrosion restoration | Applicable material, datum, attachment and procedure views |
| Refinish and materials | Preparation, repair-area finish, panel refinish, adjacent blend, substrate/paint variants and consumables | Panel boundaries, adjacency, blend area and finish notes |
| Cosmetic and minor damage | Plastic repair, dents, supported PDR, scratches and finish correction | Damage location, substrate and access views |
| Related mechanical and electrical | Cooling, HVAC, suspension, steering, wheel alignment, harnesses and required tests | Impact-area component and dependency diagrams |
| Safety and driver assistance | Relevant inspections, restraints, scans, calibration and verification | System/component locations and applicable procedure references |
| Hybrid and electric vehicles | Impact-related high-voltage precautions, isolation decisions, equipment and verification | Applicable HV zones, components and source procedures |
| Vendor and supporting operations | Glass/calibration/sublet packages, transport where applicable, approved documentation and final verification | Relevant component view or workflow reference; no invented exploded drawing |

For each supported component, enumerate applicable methods rather than generating all method combinations automatically. Repair, Replace, Remove/install, Refinish, Blend, Inspect/measure, Adjust, Section and related methods have different eligibility. Do not offer sectioning, heating, straightening or repairability simply because a generic panel record exists.

## Operation record requirements

Every publishable operation has:

- Stable ID, assembly/component IDs, method, position, customer description, estimator description and search aliases.
- Applicability predicates with explicit unknown/unsupported outcomes.
- Labor category and source class: licensed published allowance, reviewed internal planning allowance, estimator-entered repair allowance, vendor quote or separately reported actual time.
- Source reference/version/effective dates, entitlement/rights status and review evidence.
- Included work, excluded work, related access, alternatives, dependencies and valid shared-work deductions.
- Applicable part candidates, fitment status, quantities, consumables and one-time-use requirements from identified sources.
- Diagram/callout bindings and appropriate technical procedure references.
- Applicable technical reviews, verification requirements and execution capability needs.
- Publication state and replacement/deprecation mapping so old estimates remain readable.

Never treat an internally observed median as a published flat-rate allowance. A vendor quotation can support a sublet amount but does not establish an OEM method. A generic planning operation must retain its generic applicability label.

## Three levels of diagrams

| Level | Staff purpose | Minimum content |
| --- | --- | --- |
| Vehicle damage map | Select where the damage is | Body-style-appropriate outline, front/rear orientation, explicit left/right, selectable zones and photo associations |
| Assembly diagram | Identify the actual component | Recognizable component shapes, separated assembly layers where useful, callouts, fasteners/brackets, zoom/pan and a synchronized component list |
| Operation reference | Understand the selected scope | Highlighted component and relevant attachment/access, material, measurement, sensor or method reference; identify whether it is generic or configuration-specific |

Every supported operation must have at least one suitable visual binding. A single assembly illustration may support many operations when highlighting and callouts make the selected scope clear. Scanning, documentation and vendor operations may use a location or process reference rather than a fabricated exploded view. Technical methods require applicable reviewed source procedures; a detailed-looking picture alone is not sufficient.

## Expandable panel and operation views

Every supported panel operation must open its relevant diagram directly from either the selected panel or the estimate line. Expand the diagram into a full-screen viewer, then return to the same component, operation, estimate and scroll position. Expansion is a viewing action; it must not add work, change hours or discard edits.

Provide visible Zoom in, Zoom out, Fit to view, Reset and Expand/Close controls. Support pointer pan, touch pinch/pan and keyboard equivalents. Keep controls usable on a phone and preserve focus when opening and closing the viewer. Show a named detail view when a technical inset is available; magnifying a low-detail image alone does not satisfy detailed coverage.

For each covered panel, provide the relevant exterior, assembly/interior and operation-detail views as applicable. Selectable layers can expose trim, brackets, attachment points, sensors and adjacent panels. Detail insets may show applicable mounting, access, material, measurement or approved repair references. Only show content supported by its source and vehicle applicability; do not invent technical details to fill a missing layer.

Use vector artwork where appropriate and adequately resolved licensed images where required. Keep callout labels legible independently of zoom and make a component list available alongside the image. The estimator should be able to move from whole vehicle to panel to component to applicable operation, then inspect that same operation from the estimate without repeating the selection journey.

## Diagram asset and binding contract

Store asset ID/version/checksum, source and usage rights, publication state, viewBox/dimensions, vehicle applicability, orientation, component layers, callout IDs, accessible names and related procedure references. Bind components to operation IDs, not text labels. A diagram may have multiple applicable operation bindings and each operation may have several views.

Identify assets as **Generic navigation**, **Reviewed configuration-specific** or **Licensed source content**. A generic bumper drawing must not imply correct fastener counts, sensor locations, joining points or repair boundaries for a selected VIN. Part numbers and prices come from applicable part data, not labels drawn into an illustration.

Use authored SVG/vector assets for selectable outlines and controlled overlays; use permitted source images/PDF references when necessary. Keep semantic mappings separate from image pixels so an illustration revision can be checked without changing estimate identity. AI-generated artwork may help an illustrator explore navigation concepts but cannot establish technical accuracy, dimensions or permissible repair methods.

## Interaction and accessibility acceptance

1. The selected component, name, position and estimate line remain synchronized.
2. Staff can zoom, pan, reset and open an assembly without losing their estimate.
3. Callouts remain legible; small component targets have an enlarged accessible target or a selectable list alternative.
4. Keyboard users can reach components and operations, identify focus, add work and return without a pointer. Color is not the sole damage/status signal.
5. An unavailable image or an unsupported vehicle retains text search, manual draft work and an actionable explanation.
6. Left/right are vehicle left/right, with the viewer orientation shown. A mirrored image cannot silently swap positions.
7. Multiple selected damage areas and prior damage remain distinguishable. Photos are evidence, not automatic confirmation of hidden damage.
8. A component cannot add the same charge twice through separate callouts. Alternative methods and shared access receive the same calculation checks as text search.
9. Every supported panel operation opens the correct detailed visual from its estimate line, including its vehicle side and declared applicability.
10. Expanded and inline viewers support zoom in/out, pan, fit and reset. Opening, closing or changing detail views preserves estimate edits and returns keyboard focus correctly.
11. Detail views reveal additional authored or licensed information where provided; tests distinguish actual additional detail from simple image magnification. Unsupported technical detail is identified as unavailable.

## Content production and review

Publish through Draft → Content reviewed → Validated for declared applicability → Published → Superseded/withdrawn. This is content lifecycle control, not a new global application deployment gate.

The author records source rights and applicability, an illustrator creates or maps the asset, and a qualified body/refinish/technical reviewer checks its relevant content. Record actual reviewer identity and decision; do not fabricate approvals or presume the product owner is the technical reviewer. One person may cover several content roles where appropriate, but their review scope must be explicit.

Publication checks include valid operation/callout IDs, broken references, duplicate bindings, inclusion/dependency cycles, contradictory alternatives, missing source versions, rights restrictions and representative vehicle examples. Updates create new releases; they do not recalculate historical official estimates.

Licensed imports require actual provider agreements and supported access. Do not scrape or redistribute protected diagrams, times or formulas. If storage/redisplay is not permitted, retain approved references and calculation provenance under the applicable entitlement rules.

## Coverage manifest and honest completeness

Maintain a matrix of **family × vehicle configuration × component × method × position × diagram × labor basis × procedure source**. States are Missing, Draft/generic, Conditional, Reviewed supported and Unsupported. Record both tested examples and known exclusions.

Report separately:

- Catalog breadth: supported component/method combinations within the declared scope.
- Diagram coverage: published operations with working visual bindings; target 100 percent for the declared release scope.
- Exact-vehicle coverage: combinations validated against the required configuration and source.
- Procedure and price coverage: which lines have applicable references and current priced candidates.

Do not combine these into a single misleading completeness percentage. Before measuring, freeze the release scope and denominator. Every family must have either declared support with evidence or a visible gap; a generic entry does not count as universal vehicle coverage.

## First complete content slice

Start with front bumper and front fender work on explicitly named pilot configurations. Include the relevant cover/beam/absorber/brackets, trim and access, liner, lamp/sensor relationships, fender methods, adjacent panels, refinish, parts choices and reviewed scan/calibration decisions where applicable. Add a teardown supplement and a shared-access case.

The pilot must prove the entire authoring-to-document journey with representative source data before expanding through every family. Unsupported variants remain clearly labeled; a pilot success is not certification of every model or operation.
