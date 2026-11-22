-- CreateTable
CREATE TABLE "DealerCenterReportImport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "dataAsOf" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "basisId" TEXT,
    "resultId" TEXT,
    "rows" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" TIMESTAMP(3),
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DealerCenterReportImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerCenterReportedSale" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "dealNumber" TEXT NOT NULL,
    "soldDate" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "vin" TEXT NOT NULL,
    "stock" TEXT NOT NULL,

    CONSTRAINT "DealerCenterReportedSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealerCenterReportImport_organizationId_locationId_kind_com_idx" ON "DealerCenterReportImport"("organizationId", "locationId", "kind", "committedAt");

-- CreateIndex
CREATE INDEX "DealerCenterReportImport_organizationId_actorUserId_created_idx" ON "DealerCenterReportImport"("organizationId", "actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "DealerCenterReportedSale_organizationId_locationId_soldDate_idx" ON "DealerCenterReportedSale"("organizationId", "locationId", "soldDate");

-- CreateIndex
CREATE UNIQUE INDEX "DealerCenterReportedSale_organizationId_dealNumber_key" ON "DealerCenterReportedSale"("organizationId", "dealNumber");

-- AddForeignKey
ALTER TABLE "DealerCenterReportImport" ADD CONSTRAINT "DealerCenterReportImport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerCenterReportImport" ADD CONSTRAINT "DealerCenterReportImport_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerCenterReportImport" ADD CONSTRAINT "DealerCenterReportImport_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerCenterReportedSale" ADD CONSTRAINT "DealerCenterReportedSale_importId_fkey" FOREIGN KEY ("importId") REFERENCES "DealerCenterReportImport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
