ALTER TABLE "Vehicle"
  ADD COLUMN "licensePlateState" TEXT,
  ADD COLUMN "licensePlateNormalized" TEXT,
  ADD COLUMN "canonicalOrigins" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "specificationSnapshot" JSONB;

CREATE INDEX "Vehicle_organizationId_licensePlateState_licensePlateNormalized_idx"
ON "Vehicle"("organizationId", "licensePlateState", "licensePlateNormalized");
