CREATE TABLE "ServiceIntakeReadinessSnapshot" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "customerId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "evaluatedByUserId" TEXT NOT NULL,
  "contractVersion" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "confidence" TEXT NOT NULL,
  "diagnosisOutlook" TEXT NOT NULL,
  "promiseConfidence" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "facts" JSONB NOT NULL,
  "checks" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceIntakeReadinessSnapshot_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ServiceVisit" ADD COLUMN "readinessSnapshotId" TEXT;

CREATE UNIQUE INDEX "ServiceVisit_readinessSnapshotId_key" ON "ServiceVisit"("readinessSnapshotId");
CREATE INDEX "ServiceIntakeReadinessSnapshot_organizationId_locationId_generatedAt_idx" ON "ServiceIntakeReadinessSnapshot"("organizationId", "locationId", "generatedAt");
CREATE INDEX "ServiceIntakeReadinessSnapshot_appointmentId_generatedAt_idx" ON "ServiceIntakeReadinessSnapshot"("appointmentId", "generatedAt");
CREATE INDEX "ServiceIntakeReadinessSnapshot_customerId_vehicleId_generatedAt_idx" ON "ServiceIntakeReadinessSnapshot"("customerId", "vehicleId", "generatedAt");
CREATE INDEX "ServiceIntakeReadinessSnapshot_expiresAt_idx" ON "ServiceIntakeReadinessSnapshot"("expiresAt");

ALTER TABLE "ServiceIntakeReadinessSnapshot" ADD CONSTRAINT "ServiceIntakeReadinessSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceIntakeReadinessSnapshot" ADD CONSTRAINT "ServiceIntakeReadinessSnapshot_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceIntakeReadinessSnapshot" ADD CONSTRAINT "ServiceIntakeReadinessSnapshot_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceIntakeReadinessSnapshot" ADD CONSTRAINT "ServiceIntakeReadinessSnapshot_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceIntakeReadinessSnapshot" ADD CONSTRAINT "ServiceIntakeReadinessSnapshot_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceIntakeReadinessSnapshot" ADD CONSTRAINT "ServiceIntakeReadinessSnapshot_evaluatedByUserId_fkey" FOREIGN KEY ("evaluatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_readinessSnapshotId_fkey" FOREIGN KEY ("readinessSnapshotId") REFERENCES "ServiceIntakeReadinessSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
