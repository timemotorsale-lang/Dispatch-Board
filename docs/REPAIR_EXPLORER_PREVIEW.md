# Repair Explorer preview

Open `/prototype/repair-explorer` while signed in. This optional page has its own
full-width layout; current Labor Guide pages, navigation, services and catalog are
unchanged. The existing application login is required. No additional permission is
needed to explore fictional sample work.

## Review flow

1. Open Brakes → Pads, rotors & calipers → Front brakes.
2. Add front pads & rotors. At the sample $150/hour rate the subtotal is $520.
3. Try the pads-only alternative: the preview prevents overlapping friction work.
4. Switch to Diagnose a concern and inspect the noise or drag assessment.
5. Search across systems using `P0300`, `no start`, `grinding`, or `rear caliper`.
6. Review the estimate, change hours, parts or shop rate, and remove work.
7. Save a sample draft, reload the page, and choose Load saved sample.
8. Try the same flow at phone width and using the keyboard.
9. Return to the current Labor Guide using either return link.
10. Open Engine → Engine assembly & mounts → Replace engine assembly. This new
    operation has no assumed price. Add it, review the estimate, enter hours and
    parts, then confirm that the incomplete-pricing notice clears.
11. Explore the group overview for every system. Switch between repair operations
    and diagnostic checks within each group; search also finds this expanded work.

## Scope and boundaries

- Twelve systems now contain broad repair-group catalogs, including engine
  assembly replacement, long/short blocks, internal engine work, diesel systems,
  commercial vehicle work, ADAS, body equipment, hybrid and EV work.
- Clicking a system opens a group overview; clicking a group exposes its repair
  operations and diagnostic checks. The sidebar expands only the selected system.
- This is a broad, editable taxonomy, not a guarantee of every make/model repair
  or vehicle fitment. Some operations apply only to particular vehicle classes.
  Custom work remains available for gaps. Diagnostics do not imply a repair.
- Original demo operations retain their illustrative amounts and stable IDs.
  Expanded operations have null hours and parts until explicitly priced in review.
  Unpriced lines display an incomplete-pricing notice; confirmed zero and unknown
  are distinct. A subtotal with unpriced lines is labeled Priced subtotal.
- Engine assembly, long-block, short-block and overhaul alternatives share an
  overlap guard. This does not replace production overlap or included-labor rules.
- Custom work, estimates and totals live in client state. Saving is an explicit
  localStorage operation with a versioned key scoped to the signed-in user. Loading
  validates the saved data and confirms before replacing a nonempty sample estimate.
- Browser drafts are device/browser specific. Removing site data removes drafts.
- No estimate, repair order, approval or customer mutation endpoint is called.
- Taxes, fees, overlapping diagnostic labor, fitment, location-specific rates,
  authorizations and licensed labor data are deliberately not production features.
- No default navigation entry or redirect adopts the preview automatically.

## Adoption after review

Keep the presentation isolated. Once staff approve the interaction, adapt this
interface to the existing authorized catalog, parts and estimate services. Resolve
vehicle and repair-order context on the server and reuse current validation,
permissions, tax rules, overlap rules and approval workflow. Use an opt-in rollout
before changing defaults. Do not build a second production estimate engine from
the sample calculation helpers.

## Reference boundaries

The catalog descriptions are original navigation labels, not copied service
procedures. [MOTOR data products](https://www.motor.com/products-services/data-products/)
illustrate the licensed-data path for vehicle-specific labor. The
[Tesla service manual](https://service.tesla.com/docs/ModelY/ServiceManual/en-us/index.html)
provides an OEM reference for distinct electric propulsion service areas. No
supplier feed, licensed labor time, OEM repair procedure or fitment claim is
embedded in this preview.
