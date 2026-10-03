CREATE TABLE "DealDeskDraft" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "pathway" TEXT NOT NULL,
    "vehicleReference" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DealDeskDraft_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DealDeskDraft_organizationId_ownerUserId_updatedAt_idx" ON "DealDeskDraft"("organizationId", "ownerUserId", "updatedAt");
CREATE INDEX "DealDeskDraft_organizationId_ownerUserId_customerId_idx" ON "DealDeskDraft"("organizationId", "ownerUserId", "customerId");
