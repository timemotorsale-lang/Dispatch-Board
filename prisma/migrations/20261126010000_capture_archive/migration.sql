CREATE TABLE "CaptureArchiveBatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaptureArchiveBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaptureArchiveItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "position" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "storageReference" TEXT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "businessDetails" JSONB,
    "ownerType" TEXT,
    "ownerId" TEXT,
    "ownerLabel" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "searchText" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "CaptureArchiveItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CaptureArchiveItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CaptureArchiveBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CaptureArchiveItem_batchId_position_key" ON "CaptureArchiveItem"("batchId", "position");
CREATE INDEX "CaptureArchiveItem_organizationId_createdAt_id_idx" ON "CaptureArchiveItem"("organizationId", "createdAt", "id");
CREATE INDEX "CaptureArchiveItem_organizationId_ownerType_ownerId_created_idx" ON "CaptureArchiveItem"("organizationId", "ownerType", "ownerId", "createdAt");
CREATE INDEX "CaptureArchiveItem_organizationId_createdByUserId_createdAt_idx" ON "CaptureArchiveItem"("organizationId", "createdByUserId", "createdAt");
