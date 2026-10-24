# Private payment-estimate review

This neutral shared module serves the authenticated Website Console and the separately gated customer sample preview. It imports no staff data, authentication or database. It does not submit applications, contact a lender, save customer inputs, record approvals or enable public finance estimates.

## Draft assumptions

Version `mn-estimate-draft-1` uses the owner-specified 8% **annual interest**, not lender-confirmed APR, and exactly 24/36/48/66/72 months. Down payment is paid upfront; applicable tax and fees are financed. Trade-ins, rebates, exemptions, special tax treatments and optional products are outside the standard scenario.

Reference checks dated October 24, 2026:

- [MN Revenue motor vehicle sales guide](https://www.revenue.state.mn.us/guide/motor-vehicle-sales): 6.875% on vehicle cash price; documentation and registration/license fees excluded.
- [MN documentary-fee statute](https://www.revisor.mn.gov/statutes/cite/168.27#stat.168.27.31): configured $350, limited to 10% of sale value and the $350 statutory maximum.
- [MN DVS buying/selling reference, March 2025](https://assets.dps.mn.gov/files/dvs/BuyingorSellingMotorVehicle_Just_the_Facts.pdf): typical title $8.25, transfer $10, public safety vehicle $3.50, technology $2.25 and filing $12; $2 per recorded lien. The draft adds one lien only when financing is needed.

These are references, not a complete DVS fee engine or legal signoff. Additional registration, plates, wheelage and applicable local excise charges require an explicit checked amount for each example. Blank is unknown, never zero. Explicit zero is allowed only with confirmation. An additional confirmation limits the example to the documented standard scenario. No shopper address or personal information is requested.

## Arithmetic and boundaries

Money inputs use integer cents, bounded at $1 million for this planning tool. The fixed-rate monthly annuity uses annual interest divided by 12. Regular payments round up to cents; a final payoff rounds to cents. Intermediate balances retain precision; this is not a lender-specific daily-simple-interest or contract schedule. Full payment produces no lien or interest. Output includes cash price, fees, amount financed, final payment, interest and total cost.

Budget mode searches the highest cash price whose regular and final payments fit the budget, including the entered down payment and charges. Its inventory link applies only a cash-price ceiling, not lending eligibility or availability. Changes recalculate or remove previous results. Inputs remain local component state and are lost on reload.

## Release boundary

`paymentActivationStatus()` always returns disabled. Final owner and designated finance-manager approvals must cover the same version, validated vehicle-specific fees and reviewed disclosures. Audited approval storage, role-specific approval actions, eligibility rules and public activation remain unimplemented. Do not replace these gates with browser flags or fabricated approvals. Estimate wording does not replace required advertising/compliance review.

Customer access requires the existing server-side PREVIEW snapshot and protected sample environment; public mode retains its unavailable state, including for `?preview=1`. The staff calculator uses the existing manager/delegated-manager authorization. Docker builder targets copy this shared module explicitly.

## Validation

Unit calculations: `npm --prefix apps/dealership test`.

Console authorization and review: `npx vitest run src/tests/unit/website-console.test.tsx src/tests/unit/website-payment-estimates.test.tsx`.

Browser tests: `apps/dealership/tests/e2e/payment-estimates.spec.ts`, using isolated `DEALERSHIP_PRIVATE_TEST_URL` and `DEALERSHIP_PUBLIC_TEST_URL` servers. Coverage includes input guards, both modes, 66 months, fee breakdown, stale-result removal, cash-price links, mobile overflow, calculator accessibility and public isolation. No production provider or real customer data is needed.
