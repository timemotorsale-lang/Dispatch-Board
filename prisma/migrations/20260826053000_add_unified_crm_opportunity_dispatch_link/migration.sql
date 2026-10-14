-- CreateTable
CREATE TABLE "UnifiedCrmOpportunityDispatchLink" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "targetKind" TEXT NOT NULL,
    "repairOrderId" TEXT,
    "repairJobId" TEXT,
    "repairOrderNumberSnapshot" TEXT,
    "repairJobNumberSnapshot" TEXT,
    "titleSnapshot" TEXT NOT NULL,
    "targetVersionSnapshot" INTEGER NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "commandId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnifiedCrmOpportunityDispatchLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnifiedCrmOpportunityDispatchLink_opportunityId_repairOrderId_key" ON "UnifiedCrmOpportunityDispatchLink"("opportunityId", "repairOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "UnifiedCrmOpportunityDispatchLink_opportunityId_repairJobId_key" ON "UnifiedCrmOpportunityDispatchLink"("opportunityId", "repairJobId");

-- CreateIndex
CREATE INDEX "UnifiedCrmOpportunityDispatchLink_organizationId_createdAt_idx" ON "UnifiedCrmOpportunityDispatchLink"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "UnifiedCrmOpportunityDispatchLink_repairOrderId_idx" ON "UnifiedCrmOpportunityDispatchLink"("repairOrderId");

-- CreateIndex
CREATE INDEX "UnifiedCrmOpportunityDispatchLink_repairJobId_idx" ON "UnifiedCrmOpportunityDispatchLink"("repairJobId");

-- CreateIndex
CREATE INDEX "UnifiedCrmOpportunityDispatchLink_createdByUserId_createdAt_idx" ON "UnifiedCrmOpportunityDispatchLink"("createdByUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "UnifiedCrmOpportunityDispatchLink" ADD CONSTRAINT "UnifiedCrmOpportunityDispatchLink_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "UnifiedCrmOpportunityRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiedCrmOpportunityDispatchLink" ADD CONSTRAINT "UnifiedCrmOpportunityDispatchLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiedCrmOpportunityDispatchLink" ADD CONSTRAINT "UnifiedCrmOpportunityDispatchLink_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiedCrmOpportunityDispatchLink" ADD CONSTRAINT "UnifiedCrmOpportunityDispatchLink_repairJobId_fkey" FOREIGN KEY ("repairJobId") REFERENCES "RepairJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiedCrmOpportunityDispatchLink" ADD CONSTRAINT "UnifiedCrmOpportunityDispatchLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
