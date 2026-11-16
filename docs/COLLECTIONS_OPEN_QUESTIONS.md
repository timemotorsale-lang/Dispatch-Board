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

## Added while building stages 6–11 (owner decisions; change them anytime)

8. **Pay-online link and Zelle recipient.** The reminder texts say "Pay online at {link}"
   and "by Zelle to {recipient}". Which page and Zelle address should customers use?
   *Safe choice now:* while either is blank, texts that use it are blocked with "missing
   details". Add them in Collections → Settings.
9. **One days-past-due task at a time.** A 75-day account gets only "Repo review", not the
   7/14/30-day tasks as well, so the first import doesn't flood the board. Is that what
   you want?
10. **Insurance with nothing on file** counts as "unknown" and doesn't create a task. Only
    expired, or explicitly missing, insurance does. Should every account without proof
    get a "Get proof of insurance" task?
11. **Disable warning sent as a test (dry run).** In test mode the warning text isn't
    really sent, and the app says not to count it as the warning. Confirm with the
    attorney (question 4) how far ahead of a disable the warning must go out.

## Needed for Release 2 (parallel run)

12. **DealerCenter full data export:** contracts, payment history and notes. Load it on the
    Reconciliation page, then work the differences down to zero.
13. **Accountant:**
    - confirm the payment order (fees, late fees, oldest past-due, current, principal);
    - confirm simple-interest math (actual/365, rounded at each payment);
    - Minnesota sales tax on lease-to-own payments;
    - QuickBooks chart-of-accounts mapping.
14. **Attorney:**
    - late-fee rules (question 1), which payment taking and late-fee assessment need;
    - payoff and paid-in-full letters;
    - deficiency notices;
    - extension agreement wording.
15. **Vendors:** choose the payment processor, and sign up with AACER, the FCC reassigned-
    numbers database, Axle, the Advantage GPS API and Twilio A2P 10DLC. Each plug-in then
    gets its real connection.
16. **Deployment:**
    - add `/api/cron/collections` to the scheduler (I'll ask before changing it);
    - expose only the two text webhooks (`docs/COLLECTIONS_DEPLOY.md`);
    - the Collections tables reach your real database through a normal merge and deploy,
      after a backup.
