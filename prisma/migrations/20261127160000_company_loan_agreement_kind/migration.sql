ALTER TABLE "VendorBillingAgreement" DROP CONSTRAINT "VendorBillingAgreement_values_check";
ALTER TABLE "VendorBillingAgreement" ADD CONSTRAINT "VendorBillingAgreement_values_check"
  CHECK ("amountCents" > 0 AND ("principalCents" IS NULL OR "principalCents" > 0)
    AND "direction" IN ('RECEIVABLE','PAYABLE')
    AND "kind" IN ('RENT','SERVICE','REPAYMENT','COMPANY_LOAN')
    AND ("kind" <> 'COMPANY_LOAN' OR ("direction" = 'RECEIVABLE' AND "principalCents" IS NOT NULL)));
