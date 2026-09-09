CREATE TABLE "GrowthPolicyVersion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "policyCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "launchPosture" TEXT NOT NULL DEFAULT 'Locked by default',
    "settings" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "createdReason" TEXT NOT NULL,
    "activatedByUserId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthPolicyVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthPolicyAuditEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "policyVersionId" TEXT,
    "eventType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "snapshot" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthPolicyAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrowthPolicyVersion_organizationId_policyCode_version_key" ON "GrowthPolicyVersion"("organizationId", "policyCode", "version");
CREATE INDEX "GrowthPolicyVersion_organizationId_policyCode_status_updatedAt_idx" ON "GrowthPolicyVersion"("organizationId", "policyCode", "status", "updatedAt");
CREATE UNIQUE INDEX "GrowthPolicyAuditEvent_organizationId_idempotencyKey_key" ON "GrowthPolicyAuditEvent"("organizationId", "idempotencyKey");
CREATE INDEX "GrowthPolicyAuditEvent_organizationId_eventType_occurredAt_idx" ON "GrowthPolicyAuditEvent"("organizationId", "eventType", "occurredAt");
CREATE INDEX "GrowthPolicyAuditEvent_policyVersionId_occurredAt_idx" ON "GrowthPolicyAuditEvent"("policyVersionId", "occurredAt");

ALTER TABLE "GrowthPolicyAuditEvent" ADD CONSTRAINT "GrowthPolicyAuditEvent_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "GrowthPolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
