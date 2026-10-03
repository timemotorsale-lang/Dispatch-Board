CREATE TABLE "SalesDocumentJacket" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "packetId" TEXT NOT NULL,
  "dealReference" TEXT NOT NULL,
  "dealNumber" TEXT NOT NULL,
  "pathway" TEXT NOT NULL,
  "customerId" TEXT,
  "customerName" TEXT NOT NULL,
  "vehicleReference" TEXT NOT NULL,
  "vin" TEXT,
  "stockNumber" TEXT,
  "state" TEXT NOT NULL DEFAULT 'WORKING',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "requirements" JSONB NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesDocumentJacket_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SalesDocumentPacketVersion" (
  "id" TEXT NOT NULL,
  "jacketId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "phase" TEXT NOT NULL,
  "disposition" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "finalizedByUserId" TEXT NOT NULL,
  "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesDocumentPacketVersion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SalesDocumentGeneratedPacket" (
  "id" TEXT NOT NULL,
  "jacketId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesDocumentGeneratedPacket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SalesDocumentJacket_packetId_key" ON "SalesDocumentJacket"("packetId");
CREATE UNIQUE INDEX "SalesDocumentJacket_organizationId_dealReference_pathway_key" ON "SalesDocumentJacket"("organizationId", "dealReference", "pathway");
CREATE INDEX "SalesDocumentJacket_organizationId_customerId_idx" ON "SalesDocumentJacket"("organizationId", "customerId");
CREATE INDEX "SalesDocumentJacket_organizationId_pathway_state_idx" ON "SalesDocumentJacket"("organizationId", "pathway", "state");
CREATE INDEX "SalesDocumentJacket_organizationId_updatedAt_idx" ON "SalesDocumentJacket"("organizationId", "updatedAt");
CREATE UNIQUE INDEX "SalesDocumentPacketVersion_jacketId_version_key" ON "SalesDocumentPacketVersion"("jacketId", "version");
ALTER TABLE "SalesDocumentJacket" ADD CONSTRAINT "SalesDocumentJacket_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "DocumentLibraryPacket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesDocumentPacketVersion" ADD CONSTRAINT "SalesDocumentPacketVersion_jacketId_fkey" FOREIGN KEY ("jacketId") REFERENCES "SalesDocumentJacket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesDocumentGeneratedPacket" ADD CONSTRAINT "SalesDocumentGeneratedPacket_jacketId_fkey" FOREIGN KEY ("jacketId") REFERENCES "SalesDocumentJacket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
