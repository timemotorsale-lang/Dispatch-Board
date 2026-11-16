# Collections: Open Questions

Questions the software can't answer for you. Nothing here is legal or tax
advice, and the module does not guess. Until each item is answered, the module
uses the safest choice (noted next to each question).

## For a Minnesota dealer attorney (spec section 12)

1. **Late fee.** Minn. Stat. § 53C.08 subd. 1(c) (as quoted in the spec) allows a
   delinquency charge only on an installment at least 10 days in arrears, capped
   at 5% of the installment or $5, whichever is greater. Today's practice is $10
   after 5 days. Is that allowed for these contracts?
   *Safe choice now:* the module only **displays** fees. DealerCenter charges them.
   Grace days and fee amount are settings you can change.
2. **GPS starter-interrupt disclosure** (§ 53C.08 subd. 1a). Is the current
   contract's disclosure enough? *Safe choice now:* each account shows
   "GPS disclosed in contract" and the disable screen warns when it isn't "Yes".
3. **Lease-to-own treatment.** Are lease-to-own deals where the customer owns the
   car after the last payment treated as retail installment contracts (§ 53C.01)?
4. **Repossession and starter-disable notices.** What notices are required before
   and after repossession, and before a starter disable? Please provide approved
   wording for the pre-repo and post-repo letters. *Safe choice now:* letters
   print with a large "DRAFT – attorney-approved wording required" banner.
5. **Texting consent.** Does the call/text consent in the customer contract cover
   automated texts? *Safe choice now:* all texting stays OFF or DRY_RUN.

## For a bankruptcy attorney

6. Confirm the **full freeze** procedure when a customer files bankruptcy, and
   which documents are enough to lift it (relief-from-stay order, dismissal,
   discharge, attorney note).

## For the owner

7. Should collectors see **all accounts** or **only assigned accounts**?
   *Safe choice now:* a setting, default "all accounts" (you are the only user).
