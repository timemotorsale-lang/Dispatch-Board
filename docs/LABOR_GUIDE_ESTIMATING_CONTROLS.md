# Labor Guide estimating controls and administrator rate policy

## Scope

The regular `/diagnostics/labor-guide` now uses the shop-requested $125/hour starting default, optional administrator rate overrides, explicit tax/fitment/shared-labor review, reviewed preliminary-quote transfer and visible lookup failures. Existing ROs, estimates, approvals, jobs and saved preliminary quotes remain the records of authority; no new production repair-order system or database schema was introduced.

## Administrator labor rate

Open **Settings → Labor rate**, or `/settings/labor-rate`. Access uses the existing manager settings policy. Rate changes use existing `VehiclePolicyVersion`, customer-lifecycle command, capability, rollout, event and audit services:

1. Enter a proposed rate and business reason; create a policy draft.
2. Validate the draft.
3. A different authorized administrator independently approves it.
4. Activate the reviewed policy.

The existing policy governance is not bypassed. Author self-approval is disabled in the UI and remains forbidden by the existing repository. A deployment with customer-lifecycle mutations held in rollout cannot activate a rate until its existing rollout requirements are satisfied. The dedicated endpoint pins commands to `SHOP_LABOR_RATE` / `ESTIMATE_PRICING` and cannot edit unrelated policies. Reads select effective ACTIVE versions, not draft, review, approved, superseded or pilot configurations. If no active policy exists, the shop-requested $125 default applies; a database error is not treated as an absent policy.

New Labor Guide estimates inherit the active rate. Staff do not need to enter it every time. Administrator per-estimate overrides require a separate reason and are checked server-side. A loaded historical draft retains its stored pricing; drafts without pricing metadata retain the old $129.02 / 8% assumptions for explicit review rather than silently repricing. The user can choose the current shop rate; parts already selected are not automatically repriced. Presented estimate versions and authorizations are unchanged by rate settings.

## Pricing and review

- The requested 7% rate is a draft shop assumption, **not a declaration of the correct rate throughout Minnesota**. Tax source, jurisdiction/effective-date reference and review are required before the Labor Guide presents an official estimate. Rates and taxable-parts cents are checked on the server. A documented zero rate is supported. There is no automated tax provider.
- Existing 35% parts markup is exposed as a suggestion-pricing setting, not asserted as approved policy. Changing it affects subsequent catalog suggestions only. Existing retail prices must be reviewed separately.
- Catalog part matches are labeled suggestions. Every part requires staff-entered vehicle fitment and price evidence; descriptive search and generic rules do not establish VIN fitment.
- Shared overlap groups trigger explicit review and a resolution note. Staff adjust hours or explain distinct remaining work; no automatic blanket deduction or blocking of all related operations is performed.
- Labor-hour/source review is now required server-side for every labor-containing call to `presentRepairEstimate`, even if the field is omitted. Shop Planning provides corresponding review fields so the safeguard is not confined to the Labor Guide.
- Recognized regular Labor Guide catalog keys additionally require the controls manifest, pricing check and exact vehicle/work review. Staff-entered references are accountability evidence, not independent verification.
- Persisted assumptions include catalog operation identities, source/version, proposed minutes, reviewed pricing/fitment controls and real signed-in presenter attribution. Internal allowances remain explicitly unvalidated; they are not OEM or measured technician standards.

## Workflow continuity

For a preliminary quote without an RO, selecting an RO offers **Save source quote & attach proposed work to this RO**. The source quote must save successfully first. Proposed labor and parts are retained; technical evidence, clinical drafts, pending presentation attempts, customer approvals and applicability/fitment reviews do not transfer. The destination vehicle must be reviewed again before presentation. Existing-RO-to-different-RO switching does not offer this transfer. Failed lookup and unavailable record access are distinguishable from no matching RO.

The guide links to existing estimate revisions, customer authorization and approved-job planning for the selected RO. Presentation alone does not authorize or dispatch work. Pending parts searches are invalidated when work is deleted or RO context changes, so stale responses cannot populate the new vehicle context.

## Remaining enterprise work

These changes do not validate generic labor times, reconcile every cross-system overlap, implement automatic fitment or jurisdiction lookup, or unify every preview operation into a canonical production catalog. Measured-time publication, broad canonical catalog migration, per-location/customer pricing profiles, centrally managed markup/tax policies and licensed/vehicle-specific procedures remain separate work. Existing prototype approvals remain simulations. No existing live estimates were repriced and no live policy was activated while implementing this change.
