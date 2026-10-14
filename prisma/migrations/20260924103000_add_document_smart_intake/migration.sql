CREATE TABLE "DocumentSmartIntakeRecord" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "documentId" TEXT,
  "storageReference" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT,
  "sourceConsole" TEXT,
  "ownerType" TEXT,
  "ownerId" TEXT,
  "ownerLabel" TEXT,
  "classification" TEXT NOT NULL,
  "classificationLabel" TEXT NOT NULL,
  "classificationConfidence" INTEGER NOT NULL,
  "reviewStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  "routingTarget" TEXT NOT NULL,
  "extractedFields" JSONB NOT NULL,
  "sensitiveFieldKeys" JSONB NOT NULL,
  "extractedText" TEXT,
  "extractionMethod" TEXT NOT NULL,
  "warnings" JSONB NOT NULL,
  "createdByUserId" TEXT,
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentSmartIntakeRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentSmartIntakeRecord_organizationId_classification_reviewStatus_idx" ON "DocumentSmartIntakeRecord"("organizationId", "classification", "reviewStatus");
CREATE INDEX "DocumentSmartIntakeRecord_organizationId_ownerType_ownerId_idx" ON "DocumentSmartIntakeRecord"("organizationId", "ownerType", "ownerId");
CREATE INDEX "DocumentSmartIntakeRecord_organizationId_createdAt_idx" ON "DocumentSmartIntakeRecord"("organizationId", "createdAt");
CREATE INDEX "DocumentSmartIntakeRecord_storageReference_idx" ON "DocumentSmartIntakeRecord"("storageReference");

ALTER TABLE "DocumentSmartIntakeRecord" ADD CONSTRAINT "DocumentSmartIntakeRecord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentLibraryDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
