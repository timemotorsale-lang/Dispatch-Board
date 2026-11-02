# Cash retail vehicle sale packet

The Retail Cash / One Pay preset uses the existing saved `retail-sale` deal and document jacket. The finance retail desk remains available through its own presets. No new deal is created to mark a cash sale sold.

## Staff flow

1. Select the shared customer and inventory vehicle. Confirm the buyer address, dealer license, VIN, mileage, sale date and amounts.
2. Use **Mark deal sold** when the sale is agreed. This requires the existing customer/vehicle identity, not generated or signed paperwork. Status is yellow while paperwork is pending.
3. Open **Cash sale packet**, check applicable forms, generate, then preview the actual saved PDFs. The default set includes the limited power of attorney. The four baseline purchase/disclosure/tax documents cannot be unchecked. Generation is validated on the server too.
4. Download the combined print PDF or print a form from the preview. Individual archived PDFs stay fillable and unsigned. The combined print copy is flattened to preserve appearances and prevent duplicate field names.
5. Use the existing paperwork checklist to upload signed forms, insurer-issued proof, the assigned title/lien releases, official DVS application/VTAP and filing receipt. Review the required files, then finalize to turn green. Generation alone does not accept documents, record cleared funds, transfer title, release inventory, or finalize the deal.

## Forms

- Cash purchase agreement / buyer's order with itemized price, tax, fees, payment declaration and remaining balance.
- Binding contract disclosure, in bold 10-point type adjacent to the buyer signature on the purchase agreement as well as the separate acknowledgment.
- Supplemental odometer and damage disclosure. Use the required title/secure odometer instrument where applicable.
- Title/registration intake worksheet and original title/lien-release control sheet. These are explicitly dealership worksheets, not official DVS applications or replacement titles.
- Price/tax/fee itemization, staff-entered payment record, insurance record, warranty disclosure, promised repairs/we-owe and actual-delivery acknowledgment.
- Limited motor vehicle POA: identified principal, named agent, VIN, transaction and expiration; administrative title/registration scope only. Excludes new sales/loans/liens, changed ownership/pricing, sale proceeds, and signing both sides of odometer disclosures. Required secure authority is separate. Signature/acknowledgment spaces are blank.
- Official FTC Buyers Guide, keeping one front and the required reverse, with the recorded vehicle, dealership and warranty terms. No-warranty selection requires explicit exemption basis; it cannot waive Minnesota statutory rights. Warranty coverage/duration must be entered, not invented by generation.
- Trade-in support is added when a trade VIN is recorded. No installment contracts, credit applications or reference requests are added to the cash packet.

## Calculations and safeguards

Money is parsed as non-negative integer cents. The vehicle tax is 6.875% of vehicle price plus taxable accessories/labor less eligible motor-vehicle trade allowance and rebate. Document/title/registration fees are separately stated. Trade payoff affects the cash balance, not the trade tax allowance. Tax overrides require a reason. Payment references/date/method are required when staff enter a payment amount; the payment record explicitly does not verify clearing/settlement or create a ledger payment. Fees must be confirmed for the actual transaction; the $300 document-fee default is a dealer fee, not a government fee.

Invalid dates, missing dealer license/buyer address/VIN, missing odometer or warranty terms, unsupported amounts, overpayments and incomplete POA agent/expiration produce actionable generation errors. Signed files and financial actions remain governed by the existing lifecycle/permissions. Existing archive errors remain visible with a retry; changed details show a regenerate reminder.

## Source provenance and limits

Reviewed 2026-11-01. Public sources:

- Minnesota sales-file requirements: https://www.revisor.mn.gov/rules/7400.5200/
- Binding-contract notice and signature placement: https://www.revisor.mn.gov/statutes/cite/168.277
- Used-vehicle statutory coverage: https://www.revisor.mn.gov/statutes/cite/325F.662
- Motor vehicle tax, trade allowances, rebate and fee treatment: https://www.revenue.state.mn.us/guide/motor-vehicle-sales
- FTC source: https://www.ftc.gov/system/files/documents/plain-language/cfr_buyers_guides_english.pdf (stored as `public/forms/minnesota-retail-sale/ftc-buyers-guide-source.pdf`; source has alternative front pages; generator removes the unused front and its fields).
- DVS entry point for current official forms/VTAP: https://dps.mn.gov/divisions/dvs
- DVS secure-authority restrictions: https://s3.us-east-2.amazonaws.com/assets.dps.mn.gov/s3fs-public/migrated-files/divisions/dvs/forms-documents/Documents/TransferGuide.pdf (older guide; current filing-office instructions govern).

The current DVS PS2000 download returned 403 during implementation. An accessible migrated PDF was dated 01/2024, so it was not bundled as a current official form. Staff have a prefilled dealership worksheet and DVS link; official PS2000/VTAP completion and original secure instruments remain explicit filing steps. Store-specific agreement/POA terms and applicability must be reviewed before adoption; generated dealership documents are not represented as agency-approved instruments.

FTC source SHA-256: `532e7887b9e5180800952ad53cc75ac43c7d84e42b2fc318ef33ae2760dd9769`.
