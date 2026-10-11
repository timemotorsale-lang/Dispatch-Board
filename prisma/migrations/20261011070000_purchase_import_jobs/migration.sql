CREATE TABLE "PurchaseImportJob" (
 "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "locationId" TEXT NOT NULL,
 "createdByUserId" TEXT NOT NULL, "assignedToUserId" TEXT NOT NULL, "sourceEvidenceId" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PROCESSING', "fileName" TEXT NOT NULL, "vin" TEXT NOT NULL DEFAULT '',
 "reading" JSONB, "corrections" JSONB, "outcome" JSONB, "failureCode" TEXT,
 "version" INTEGER NOT NULL DEFAULT 1, "attempts" INTEGER NOT NULL DEFAULT 0, "leaseUntil" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "PurchaseImportJob_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "PurchaseImportJob_sourceEvidenceId_organizationId_fkey" FOREIGN KEY ("sourceEvidenceId", "organizationId") REFERENCES "VehicleEvidenceObject"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PurchaseImportJob_organizationId_locationId_status_createdAt_idx" ON "PurchaseImportJob"("organizationId", "locationId", "status", "createdAt");
CREATE INDEX "PurchaseImportJob_organizationId_assignedToUserId_createdAt_idx" ON "PurchaseImportJob"("organizationId", "assignedToUserId", "createdAt");
CREATE INDEX "PurchaseImportJob_sourceEvidenceId_idx" ON "PurchaseImportJob"("sourceEvidenceId");
CREATE TABLE "PurchaseImportTemplate" (
 "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "locationId" TEXT NOT NULL, "createdByUserId" TEXT NOT NULL,
 "name" TEXT NOT NULL, "mapping" JSONB NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "PurchaseImportTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PurchaseImportTemplate_organizationId_locationId_createdByUserId_name_key" ON "PurchaseImportTemplate"("organizationId", "locationId", "createdByUserId", "name");
