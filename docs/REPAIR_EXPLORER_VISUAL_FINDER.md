# Visual part finder: first prototype

Open `/prototype/repair-explorer` and choose **Find it visually** beside search.
The current Brakes or Steering selection opens the corresponding front-wheel
diagram; other systems start at the vehicle overview. The Vehicle overview link
always returns to the location chooser. Only front disc brakes and a generic
MacPherson-strut front suspension are illustrated in this first version.

## Review flow

1. Open the brake diagram and select the disc, pads, caliper, flexible hose,
   wheel-speed sensor or hub. Select a number, component shape or matching list row.
2. Zoom the selected component, then use Fit diagram to restore assembly context.
3. Select a caliper. Adding a replacement requires a vehicle-left/right choice.
4. Switch to Front suspension and identify a spring, damper, mount, lower arm,
   ball joint, wheel carrier, outer tie rod, stabilizer link or hub.
5. Add a repair directly or use View in catalog for the existing operation details.
6. Use Diagnostic checks when the area is known but the repair is not established.
7. Open estimate review and verify that position-scoped work retains its label.
8. Search normally or choose another system to leave the visual finder.

## Catalog and scope

All diagram actions reference existing catalog operations and retain their labor
planning status. No times, parts prices or fitment claims are derived from the
illustration. Axle pad/rotor work remains a both-sides operation. Side-specific
catalog entries are filtered to the chosen corner. Generic repair entries receive
a scoped estimate identity and retain `catalogOperationId` and `position` metadata;
left and right estimates remain distinct. Adding unpositioned and positioned
versions of the same generic operation is blocked to avoid duplicate scope.

Illustrations are original vector schematics. They are identification aids, not
copied supplier drawings, workshop procedures, actual F-150 diagrams or proof of
separate component serviceability. The suspension view is explicitly labeled as
generic MacPherson geometry, which differs from the sample truck's layout. Some
mounts, joints, bearings and bushings are serviced only in assemblies on particular
vehicles. Exact fitment, quantity, access and overlapping labor still need review.

Reference anatomy was checked against primary manufacturer explanations from
[MOOG](https://www.moogparts.com/parts-matter/all-about-ball-joints.html) and
[Brembo](https://www.bremboparts.com/america/en/products/essential/repair-kit).
No diagrams or proprietary part-number data were copied from these sources.

Numbered components support Enter and Space, visible keyboard focus and selection
state. The normal HTML part list exposes the same choices for touch and assistive
technology. SVG zoom is viewBox based; no image-generation or mapping service is
required. No live order or customer mutation endpoint is introduced.
