CREATE TABLE "AutobodyEstimateDraft" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "locationId" TEXT NOT NULL REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "vehicleId" TEXT REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "repairOrderId" TEXT REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdByUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "title" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT','PRESENTING','PRESENTED','ARCHIVED')),
  "presentation" JSONB,
  "estimateId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "AutobodyEstimateDraftRevision" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "draftId" TEXT NOT NULL REFERENCES "AutobodyEstimateDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "version" INTEGER NOT NULL,
  "content" JSONB NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AutobodyEstimateDraft_organizationId_locationId_updatedAt_idx" ON "AutobodyEstimateDraft"("organizationId", "locationId", "updatedAt");
CREATE INDEX "AutobodyEstimateDraft_repairOrderId_idx" ON "AutobodyEstimateDraft"("repairOrderId");
CREATE UNIQUE INDEX "AutobodyEstimateDraftRevision_draftId_version_key" ON "AutobodyEstimateDraftRevision"("draftId", "version");
