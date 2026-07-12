ALTER TYPE "TaskSourceType" ADD VALUE 'LEAD';

CREATE TYPE "CustomerLeadStage" AS ENUM ('NEW', 'CONTACT_ATTEMPTED', 'ENGAGED', 'APPOINTMENT_SET', 'ON_SITE', 'QUALIFIED', 'NEGOTIATION', 'NURTURE', 'WON', 'LOST');

CREATE TABLE "CustomerLead" (
    "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "customerId" TEXT NOT NULL,
    "leadNumber" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
    "sourceCode" TEXT NOT NULL, "stage" "CustomerLeadStage" NOT NULL DEFAULT 'NEW',
    "ownerUserId" TEXT NOT NULL, "vehicleInterest" TEXT, "nextActionCode" TEXT NOT NULL,
    "nextActionAt" TIMESTAMP(3) NOT NULL, "priority" TEXT NOT NULL, "score" INTEGER NOT NULL,
    "confidence" TEXT NOT NULL, "lastDecisionId" TEXT, "qualificationSnapshot" JSONB NOT NULL,
    "closedReason" TEXT, "closedAt" TIMESTAMP(3), "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerLeadTaskLink" (
    "id" TEXT NOT NULL, "leadId" TEXT NOT NULL, "taskId" TEXT NOT NULL,
    "actionCode" TEXT NOT NULL, "decisionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerLeadTaskLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerLead_organizationId_leadNumber_key" ON "CustomerLead"("organizationId", "leadNumber");
CREATE UNIQUE INDEX "CustomerLead_organizationId_idempotencyKey_key" ON "CustomerLead"("organizationId", "idempotencyKey");
CREATE INDEX "CustomerLead_organizationId_stage_nextActionAt_idx" ON "CustomerLead"("organizationId", "stage", "nextActionAt");
CREATE INDEX "CustomerLead_organizationId_ownerUserId_nextActionAt_idx" ON "CustomerLead"("organizationId", "ownerUserId", "nextActionAt");
CREATE INDEX "CustomerLead_customerId_createdAt_idx" ON "CustomerLead"("customerId", "createdAt");
CREATE UNIQUE INDEX "CustomerLeadTaskLink_taskId_key" ON "CustomerLeadTaskLink"("taskId");
CREATE UNIQUE INDEX "CustomerLeadTaskLink_leadId_actionCode_decisionId_key" ON "CustomerLeadTaskLink"("leadId", "actionCode", "decisionId");
CREATE INDEX "CustomerLeadTaskLink_leadId_createdAt_idx" ON "CustomerLeadTaskLink"("leadId", "createdAt");

ALTER TABLE "CustomerLead" ADD CONSTRAINT "CustomerLead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerLead" ADD CONSTRAINT "CustomerLead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerLead" ADD CONSTRAINT "CustomerLead_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerLead" ADD CONSTRAINT "CustomerLead_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerLeadTaskLink" ADD CONSTRAINT "CustomerLeadTaskLink_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CustomerLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerLeadTaskLink" ADD CONSTRAINT "CustomerLeadTaskLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
