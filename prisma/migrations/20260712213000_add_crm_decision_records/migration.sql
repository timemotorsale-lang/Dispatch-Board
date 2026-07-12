CREATE TABLE "CrmDecisionRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "decisionType" TEXT NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "customerId" TEXT,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "normalizedInput" JSONB NOT NULL,
    "score" INTEGER,
    "priority" TEXT,
    "recommendedOwnerId" TEXT,
    "recommendedActionCode" TEXT,
    "dueAt" TIMESTAMP(3),
    "reasonCodes" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "missingInputs" JSONB NOT NULL,
    "managerReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overriddenAt" TIMESTAMP(3),
    "overriddenByUserId" TEXT,
    "overrideReason" TEXT,
    "overrideSnapshot" JSONB,
    "finalOutcome" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrmDecisionRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmDecisionRecord_organizationId_decisionType_decidedAt_idx"
ON "CrmDecisionRecord"("organizationId", "decisionType", "decidedAt");

CREATE INDEX "CrmDecisionRecord_organizationId_subjectType_subjectId_idx"
ON "CrmDecisionRecord"("organizationId", "subjectType", "subjectId");

CREATE INDEX "CrmDecisionRecord_customerId_decidedAt_idx"
ON "CrmDecisionRecord"("customerId", "decidedAt");

ALTER TABLE "CrmDecisionRecord"
ADD CONSTRAINT "CrmDecisionRecord_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CrmDecisionRecord"
ADD CONSTRAINT "CrmDecisionRecord_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CrmDecisionRecord"
ADD CONSTRAINT "CrmDecisionRecord_overriddenByUserId_fkey"
FOREIGN KEY ("overriddenByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
