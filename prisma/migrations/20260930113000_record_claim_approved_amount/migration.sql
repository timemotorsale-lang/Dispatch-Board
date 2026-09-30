ALTER TABLE "InsuranceClaim"
ADD COLUMN "approvedAmountCents" INTEGER,
ADD COLUMN "approvedAmountConfidence" TEXT,
ADD COLUMN "approvedAmountRecordedAt" TIMESTAMP(3),
ADD COLUMN "approvedAmountSourceDocumentId" TEXT,
ADD COLUMN "approvedAmountSourceEvidenceId" TEXT;

CREATE INDEX "InsuranceClaim_organizationId_approvedAmountRecordedAt_idx"
ON "InsuranceClaim"("organizationId", "approvedAmountRecordedAt");
