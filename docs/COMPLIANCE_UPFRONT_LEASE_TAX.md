# Compliance: upfront lease-tax preparation

Implemented for review on `compliance-business-obligations`. Not a production release or a legal classification of existing contracts.

## Staff workflow

Open `/compliance` from Command Center > Operations > Compliance with an authorized manager account and one authorized organization.

1. Select the reporting month. Record an executed lease once using its unique contract/deal reference and tax-event date. Search existing customers/vehicles to reuse their IDs, or record historical display labels without creating duplicate master records.
2. Enter agreed vehicle value, eligible rebates, residual, eligible owned trade-in allowance, taxable additions and taxable rent charge. Do not deduct cash down payments. Exclude finance charges attributable to financed tax. Verify tax treatment of each component.
3. Verify principal garaging address and each local reporting code/rate for the transaction date. State rate defaults to 6.875%; no local rate is guessed. Confirm upfront-tax eligibility. Compare calculated tax with the signed contract.
4. Save even with review items pending. The monthly worksheet identifies unresolved eligibility, local verification and missing/mismatched contract tax. Correct these before recording filing confirmation.
5. Review state and individual local tax lines, download CSV or print the lease-only worksheet, then file externally in Minnesota e-Services. Reconcile all other Sales & Use Tax return lines separately.
6. Enter the external filing confirmation/date to lock a permanent snapshot. Record the external payment confirmation and matching lease worksheet amount separately. The tool does not submit returns or move money.

The full tax is counted once in its initial reporting period; subsequent customer installments are not entered as new tax events. Vehicle sales have a separate register and contribute zero to the lease worksheet; MVST/title processing must be reconciled separately through DVS/deputy registrar. Zero recorded lease tax does not establish a zero complete return.

## Boundaries and controls

- All data is durable in PostgreSQL, organization-scoped and manager-restricted at the API. Mutations check origin and request size. Print uses the same authorization.
- Server calculates integer-cent tax per contract/reporting line and stores the input, result and rule version. Rates support five decimal places. This contract-level rounding policy needs accountant acceptance before filing real returns.
- Unique normalized organization/reference/type prevents repeated entry across months. Existing records use optimistic versions; all changes and filing snapshots are serialized with an organization-level PostgreSQL advisory lock.
- Corrections are available only before filing; voiding retains the original record. Immutable audit events capture before/after snapshots and actor IDs. Database triggers protect audit history, voided records and filed worksheets.
- Filing confirmation is an external-evidence assertion, not automatic verification or independent reviewer sign-off. Filed records cannot be edited. Amendments, credits/refunds, reopening periods and payment discrepancies require separate tax review outside this first tool.
- Does not calculate short-term rental, renewable-period, out-of-state, exempt, over-10,000-pound or other exception treatment. Eligibility must be confirmed externally. Does not implement use-tax purchases, all general-return lines, automatic CRM/deal imports, licenses/permit tracking or document uploads. Source references can be recorded in notes.
- Selecting an upfront model does not prove the supplied signed agreement qualifies, that its disclosed tax is correct, or that any tax was paid.

## Setup and validation

Additive migration: `20261021010000_compliance_upfront_tax`. Back up the local development database before applying. No resets. Production schema, deployments and release approvals remain unchanged.

Unit tests: `src/tests/unit/compliance-tax.test.ts`. Database integration tests require a separate loopback database prefixed `compliance_review_` and `RUN_COMPLIANCE_DB_TESTS=1`. Never point integration tests at the working business database.

## Official rule sources (reviewed October 20, 2026)

- [Minnesota Revenue: Motor Vehicle Leases](https://www.revenue.state.mn.us/guide/motor-vehicle-leases)
- [Minnesota Statutes 297A.815](https://www.revisor.mn.gov/statutes/cite/297A.815)

The tool assumes upfront tax, not monthly allocation of a fixed tax amount. Customer repayment of financed tax and the dealership's tax-remittance timing are distinct.
