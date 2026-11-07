ALTER TABLE "VendorBillingWorkReview"
  ALTER COLUMN "vehicleId" DROP NOT NULL,
  ADD COLUMN "identityBasis" TEXT NOT NULL DEFAULT 'REGISTRY',
  ADD COLUMN "invoiceVehicleReference" TEXT,
  ADD COLUMN "identityReviewReason" TEXT,
  ADD COLUMN "identitySourceDocumentId" TEXT;

ALTER TABLE "VendorBillingWorkReview" ADD CONSTRAINT "VendorBillingWorkReview_identity_check" CHECK (
  ("identityBasis" = 'REGISTRY' AND "vehicleId" IS NOT NULL AND length(trim("vehicleId")) > 0
    AND "invoiceVehicleReference" IS NULL AND "identityReviewReason" IS NULL AND "identitySourceDocumentId" IS NULL)
  OR
  ("identityBasis" = 'INVOICE_REFERENCE' AND "vehicleId" IS NULL AND "repairOrderId" IS NULL
    AND "invoiceVehicleReference" IS NOT NULL AND length(trim("invoiceVehicleReference")) > 0
    AND "identityReviewReason" IS NOT NULL AND length(trim("identityReviewReason")) > 0
    AND "identitySourceDocumentId" IS NOT NULL AND length(trim("identitySourceDocumentId")) > 0)
);
