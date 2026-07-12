ALTER TABLE "ConcernCase" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org-time-motor-sales';
ALTER TABLE "ConcernCase" ADD COLUMN "customerId" TEXT;
ALTER TABLE "ConcernCase" ADD COLUMN "severityScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ConcernCase" ADD COLUMN "severityBand" TEXT NOT NULL DEFAULT 'LOW';
ALTER TABLE "ConcernCase" ADD COLUMN "lastDecisionId" TEXT;
ALTER TABLE "ConcernCase" ADD COLUMN "firstResponseDueAt" TIMESTAMP(3);
ALTER TABLE "ConcernCase" ADD COLUMN "firstRespondedAt" TIMESTAMP(3);
ALTER TABLE "ConcernCase" ADD COLUMN "resolutionDueAt" TIMESTAMP(3);

CREATE TABLE "CustomerPromise" (
    "id" TEXT NOT NULL, "concernCaseId" TEXT NOT NULL, "ownerUserId" TEXT NOT NULL,
    "promiseType" TEXT NOT NULL, "promisedAt" TIMESTAMP(3) NOT NULL, "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN', "fulfillmentNotes" TEXT, "fulfilledAt" TIMESTAMP(3),
    "fulfilledByUserId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CustomerPromise_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConcernCase_organizationId_status_priority_dueAt_idx" ON "ConcernCase"("organizationId", "status", "priority", "dueAt");
CREATE INDEX "ConcernCase_customerId_createdAt_idx" ON "ConcernCase"("customerId", "createdAt");
CREATE INDEX "CustomerPromise_status_dueAt_idx" ON "CustomerPromise"("status", "dueAt");
CREATE INDEX "CustomerPromise_ownerUserId_status_dueAt_idx" ON "CustomerPromise"("ownerUserId", "status", "dueAt");
CREATE INDEX "CustomerPromise_concernCaseId_createdAt_idx" ON "CustomerPromise"("concernCaseId", "createdAt");

ALTER TABLE "ConcernCase" ADD CONSTRAINT "ConcernCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConcernCase" ADD CONSTRAINT "ConcernCase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerPromise" ADD CONSTRAINT "CustomerPromise_concernCaseId_fkey" FOREIGN KEY ("concernCaseId") REFERENCES "ConcernCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerPromise" ADD CONSTRAINT "CustomerPromise_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPromise" ADD CONSTRAINT "CustomerPromise_fulfilledByUserId_fkey" FOREIGN KEY ("fulfilledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
