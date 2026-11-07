CREATE TABLE "DocumentReadingJob" (
 "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "createdByUserId" TEXT NOT NULL,
 "purpose" TEXT NOT NULL, "checksumSha256" TEXT NOT NULL, "originalDocumentId" TEXT NOT NULL,
 "fileName" TEXT NOT NULL, "contentType" TEXT NOT NULL, "pageCount" INTEGER NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'QUEUED', "leaseToken" TEXT, "leaseExpiresAt" TIMESTAMP(3),
 "attempts" INTEGER NOT NULL DEFAULT 0, "lastError" TEXT, "reading" JSONB, "review" JSONB,
 "reviewVersion" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, "completedAt" TIMESTAMP(3),
 CONSTRAINT "DocumentReadingJob_originalDocumentId_fkey" FOREIGN KEY ("originalDocumentId") REFERENCES "DocumentLibraryDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "DocumentReadingJob_pageCount_check" CHECK ("pageCount" BETWEEN 1 AND 28),
 CONSTRAINT "DocumentReadingJob_status_check" CHECK ("status" IN ('QUEUED','PROCESSING','READY','FAILED'))
);
CREATE UNIQUE INDEX "DocumentReadingJob_dedup_key" ON "DocumentReadingJob"("organizationId","createdByUserId","purpose","checksumSha256");
CREATE INDEX "DocumentReadingJob_owner_idx" ON "DocumentReadingJob"("organizationId","createdByUserId","purpose","updatedAt");
CREATE INDEX "DocumentReadingJob_queue_idx" ON "DocumentReadingJob"("status","leaseExpiresAt");
CREATE TABLE "DocumentReadingPage" (
 "id" TEXT PRIMARY KEY, "jobId" TEXT NOT NULL, "page" INTEGER NOT NULL,
 "text" TEXT NOT NULL, "method" TEXT NOT NULL, "warnings" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "DocumentReadingPage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DocumentReadingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "DocumentReadingPage_page_check" CHECK ("page" BETWEEN 1 AND 28)
);
CREATE UNIQUE INDEX "DocumentReadingPage_jobId_page_key" ON "DocumentReadingPage"("jobId","page");
CREATE TABLE "DocumentReadingEvent" (
 "id" TEXT PRIMARY KEY, "jobId" TEXT NOT NULL, "actorId" TEXT NOT NULL, "action" TEXT NOT NULL,
 "detail" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "DocumentReadingEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DocumentReadingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DocumentReadingEvent_jobId_createdAt_idx" ON "DocumentReadingEvent"("jobId","createdAt");
