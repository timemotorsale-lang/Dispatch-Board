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

## Scope and boundaries

- Twelve representative systems; Brakes has deeper component and axle selection.
- Sample operations and amounts are design fixtures, not a comprehensive catalog
  or licensed, vehicle-specific labor guide. Diagnostics do not imply a repair.
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
